import { decodeGame } from "./persistence";
import { KeyboardCommands } from "./keyboard";
import { BUILD_ORDER, BUILDINGS, TILE } from "./constants";
import { Game } from "./sim";
import { GameAudio } from "./audio";
import { saveGame, loadRaw, hasSave } from "./save";
import type { BldType, HudSnapshot } from "./types";
import { WorldView } from "@/scene/world";

type HudFn = (s: HudSnapshot) => void;

export class Engine {
  game: Game;
  view: WorldView;
  audio: GameAudio;
  canvas: HTMLCanvasElement;
  keys = new Set<string>();
  hud: HudFn;
  running = false;
  last = 0;
  hudAcc = 0;
  saveAcc = 0;
  fpsAcc = 0;
  frames = 0;
  fps = 60;
  drag: { sx: number; sy: number; x: number; y: number } | null = null;
  panDrag: { x: number; y: number } | null = null;
  rotDrag: { x: number; y: number; sx: number; sy: number } | null = null;
  pinch: { d: number; dist: number } | null = null;
  keyboard = new KeyboardCommands(this);
  private simAccumulator = 0;
  moveMode = false;
  pointer = { x: 0, y: 0 };
  ghostPos = { x: 0, z: 0 };
  disposed = false;
  ro: ResizeObserver | null = null;
  failFrames = 0;
  slowFps = 0;

  constructor(canvas: HTMLCanvasElement, hud: HudFn) {
    this.canvas = canvas;
    this.hud = hud;
    this.game = new Game();
    this.view = new WorldView(canvas);
    this.audio = new GameAudio();
    this.game.quality = this.view.quality;
    this.game.onSfx = (n) => this.audio.play(n);
    this.view.onContextLost = () => {
      if (this.game.quality !== "low")
        this.setQuality(this.game.quality === "high" ? "med" : "low");
    };
    this.view.onContextRestored = () => {
      try {
        this.view.rebuild(this.game);
        this.view.resize();
        this.game.banner("The island steadies", 2);
        this.pushHud();
      } catch {
        this.setQuality("low");
        try {
          this.view.rebuild(this.game);
        } catch {
          /* stay paused on lost context */
        }
      }
    };
    this.bind();
    this.view.resize();
    this.ro = new ResizeObserver(() => this.view.resize());
    this.ro.observe(canvas.parentElement || canvas);
    // begin() publishes the first HUD after the tribes and world exist.
    this.installProbe();
    (window as unknown as { __engine?: Engine }).__engine = this;
  }

  begin() {
    if (this.running && this.game.started && !this.game.awaitingStart) {
      this.pushHud();
      return;
    }
    try {
      this.game.reset();
      this.game.awaitingStart = true;
      this.game.state.paused = true;
      this.view.rebuild(this.game);
      this.homeLook();
      this.view.resize();
    } catch (err) {
      console.error(err);
      this.setQuality("low");
      try {
        this.game.reset();
        this.game.awaitingStart = true;
        this.game.state.paused = true;
        this.view.rebuild(this.game);
        this.homeLook();
        this.view.resize();
      } catch (err2) {
        console.error(err2);
      }
    }
    this.running = true;
    this.last = performance.now();
    this.view.renderer.setAnimationLoop((t) => this.frame(t));
    this.pushHud();
  }

  enterIsland() {
    this.audio.unlock();
    this.game.enterIsland();
    this.canvas.focus();
    this.pushHud();
  }

  hasSavedGame() {
    return hasSave();
  }
  saveNow() {
    this.game.banner(saveGame(this.game) ? "Village saved" : "Storage unavailable or full", 3);
    this.pushHud();
  }
  resumeSaved() {
    try {
      const raw = loadRaw();
      if (!raw) throw new Error("No compatible save. Older partial saves cannot be restored.");
      const restored = decodeGame(raw);
      restored.onSfx = (n) => this.audio.play(n);
      restored.quality = this.game.quality;
      restored.muted = this.game.muted;
      this.game = restored;
      this.simAccumulator = 0;
      this.keyboard.groups.clear();
      this.view.rebuild(restored);
      this.homeLook();
      this.audio.unlock();
      this.canvas.focus();
      restored.banner("Village restored · P to resume", 4);
    } catch (error) {
      this.game.banner(error instanceof Error ? error.message : "Cannot restore save", 4);
    }
    this.pushHud();
  }

  restart() {
    this.simAccumulator = 0;
    this.keyboard.groups.clear();
    try {
      this.game.reset();
      this.game.awaitingStart = false;
      this.game.state.paused = false;
      this.view.rebuild(this.game);
      this.homeLook();
    } catch (err) {
      console.error(err);
      this.setQuality("low");
      this.game.reset();
      this.game.awaitingStart = false;
      this.game.state.paused = false;
      this.view.rebuild(this.game);
      this.homeLook();
    }
    this.audio.unlock();
    this.pushHud();
  }

  private homeLook() {
    const c = this.game.campOf(0);
    this.view.look.set(c.x, this.game.height(c.x, c.z) + 0.55, c.z);
  }

  private bind() {
    const c = this.canvas;
    c.style.touchAction = "none";
    window.addEventListener("resize", this.onResize);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    c.addEventListener("pointerdown", this.onPointerDown);
    c.addEventListener("pointermove", this.onPointerMove);
    c.addEventListener("pointerup", this.onPointerUp);
    c.addEventListener("pointercancel", this.onPointerUp);
    window.addEventListener("wheel", this.onWheel, { passive: false });
    c.addEventListener("contextmenu", (e) => e.preventDefault());
    document.addEventListener("visibilitychange", this.onVis);
  }

  private onResize = () => this.view.resize();
  private onBlur = () => {
    this.keys.clear();
    this.simAccumulator = 0;
  };
  private onVis = () => {
    this.keys.clear();
    this.simAccumulator = 0;
    if (document.visibilityState === "hidden") saveGame(this.game);
    if (document.visibilityState === "visible" && this.audio.ctx?.state === "suspended")
      void this.audio.ctx.resume();
  };

  private onKeyDown = (e: KeyboardEvent) => this.keyboard.key(e);

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onWheel = (e: WheelEvent) => {
    if ((e.target as HTMLElement | null)?.closest("dialog, input, select, textarea")) return;
    e.preventDefault();
    const s = Math.sign(e.deltaY);
    this.view.dist *= s > 0 ? 1.08 : 0.92;
  };

  private canvasXY(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onPointerDown = (e: PointerEvent) => {
    this.keyboard.mode = false;
    this.canvas.focus();
    this.canvas.setPointerCapture(e.pointerId);
    const p = this.canvasXY(e);
    this.pointer.x = p.x;
    this.pointer.y = p.y;
    if (e.button === 1 || e.buttons === 4) {
      this.panDrag = { x: e.clientX, y: e.clientY };
      return;
    }
    if (e.button === 2) {
      this.rotDrag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY };
      return;
    }
    if (e.button === 0) {
      if (this.game.state.placing) {
        this.drag = null;
        return;
      }
      this.drag = { sx: p.x, sy: p.y, x: p.x, y: p.y };
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    const p = this.canvasXY(e);
    this.pointer.x = p.x;
    this.pointer.y = p.y;
    if (this.panDrag) {
      const dx = e.clientX - this.panDrag.x;
      const dy = e.clientY - this.panDrag.y;
      this.panDrag.x = e.clientX;
      this.panDrag.y = e.clientY;
      const sp = 0.04 * (this.view.dist / 30);
      const fx = -Math.sin(this.view.yaw);
      const fz = -Math.cos(this.view.yaw);
      const rx = Math.cos(this.view.yaw);
      const rz = -Math.sin(this.view.yaw);
      this.view.look.x += -rx * dx * sp + fx * dy * sp;
      this.view.look.z += -rz * dx * sp + fz * dy * sp;
      return;
    }
    if (this.rotDrag) {
      const dx = e.clientX - this.rotDrag.x;
      const dy = e.clientY - this.rotDrag.y;
      this.rotDrag.x = e.clientX;
      this.rotDrag.y = e.clientY;
      this.view.yaw -= dx * 0.005;
      this.view.pitch += dy * 0.004;
      return;
    }
    if (this.drag) {
      this.drag.x = p.x;
      this.drag.y = p.y;
    }
    this.updateGhost();
  };

  private onPointerUp = (e: PointerEvent) => {
    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    const p = this.canvasXY(e);
    this.pointer.x = p.x;
    this.pointer.y = p.y;
    if (this.rotDrag && e.button === 2) {
      const moved = Math.hypot(e.clientX - this.rotDrag.sx, e.clientY - this.rotDrag.sy);
      this.rotDrag = null;
      if (moved < 6) this.rightClick(p.x, p.y);
      return;
    }
    this.rotDrag = null;
    this.panDrag = null;
    if (e.button === 0 && this.game.state.placing) {
      this.leftClick(p.x, p.y, e.shiftKey);
      this.drag = null;
      this.updateGhost();
      this.pushHud();
      return;
    }
    if (this.drag && e.button === 0) {
      const dx = this.drag.x - this.drag.sx;
      const dy = this.drag.y - this.drag.sy;
      if (Math.hypot(dx, dy) > 8) {
        if (!e.shiftKey) this.game.clearSelect();
        const minx = Math.min(this.drag.sx, this.drag.x),
          maxx = Math.max(this.drag.sx, this.drag.x);
        const miny = Math.min(this.drag.sy, this.drag.y),
          maxy = Math.max(this.drag.sy, this.drag.y);
        for (const u of this.game.state.units) {
          if (u.team !== 0 || u.hp <= 0) continue;
          const p = this.view.project(u.x, u.y + 0.6, u.z);
          if (p.x >= minx && p.x <= maxx && p.y >= miny && p.y <= maxy) u.selected = true;
        }
      } else {
        this.leftClick(p.x, p.y, e.shiftKey);
      }
      this.drag = null;
    }
  };

  leftClick(cx: number, cy: number, additive: boolean) {
    const g = this.view.groundAt(cx, cy);
    if (!g) {
      if (this.game.state.placing) this.game.banner("Aim at the valley floor", 1.2);
      return;
    }
    if (this.game.state.placing) {
      this.updateGhost();
      this.game.placeBuilding(this.game.state.placing, this.ghostPos.x, this.ghostPos.z, 0);
      this.updateGhost();
      this.pushHud();
      return;
    }
    if (this.moveMode) {
      this.game.issueMove(g.x, g.z);
      this.moveMode = false;
      return;
    }
    const entity = this.view.pickEntity(cx, cy, this.game);
    if (entity) this.game.selectEntity(entity, additive);
    else this.game.selectAt(g.x, g.z, additive);
    this.pushHud();
  }

  rightClick(cx: number, cy: number) {
    const g = this.view.groundAt(cx, cy);
    if (!g) return;
    if (this.game.state.placing) {
      this.game.state.placing = null;
      this.view.setGhost(null, 0, 0, 0, false);
      return;
    }
    const ent = this.view.pickEntity(cx, cy, this.game) || this.game.entityAt(g.x, g.z);
    if (ent && ent.team !== 0 && this.game.visibleAt(ent.x, ent.z)) this.game.issueAttack(ent);
    else {
      const node = this.game.visibleAt(g.x, g.z) ? this.game.resourceAt(g.x, g.z) : null;
      if (node) this.game.issueGather(node);
      else this.game.issueMove(g.x, g.z);
    }
  }

  private updateGhost() {
    const type = this.game.state.placing;
    if (!type) {
      this.view.setGhost(null, 0, 0, 0, false);
      return;
    }
    const g = this.view.groundAt(this.pointer.x, this.pointer.y);
    if (!g) return;
    let x = Math.round(g.x / TILE) * TILE;
    let z = Math.round(g.z / TILE) * TILE;
    if (type === "dock") {
      const site = this.game.nearestDockSite(g.x, g.z, 14);
      if (site) {
        x = site.x;
        z = site.z;
      }
    }
    if (type === "quarry") {
      const snap = this.game.snapQuarry(x, z);
      if (snap) {
        x = snap.x;
        z = snap.z;
      }
    }
    const okPlace = this.game.placementValid(type, x, z, 0);
    const afford = this.game.canAfford(0, {
      food: BUILDINGS[type].food,
      wood: BUILDINGS[type].wood,
      stone: BUILDINGS[type].stone,
    });
    const storm = this.game.state.weather === "storm";
    let issue: string | null = null;
    if (storm) issue = "The storm holds the builders";
    else if (!afford) {
      const d = BUILDINGS[type];
      const t = this.game.tribe(0);
      const need = [];
      if ((d.food || 0) > t.food) need.push("berries");
      if ((d.wood || 0) > t.wood) need.push("logs");
      if ((d.stone || 0) > t.stone) need.push("stone");
      issue = "Need more " + (need.join(" and ") || "resources");
    } else if (!okPlace) issue = this.game.placementIssue(type, x, z, 0);
    this.game.state.placeIssue = issue;
    this.ghostPos.x = x;
    this.ghostPos.z = z;
    this.view.setGhost(type, x, z, this.game.height(x, z), !issue);
  }

  setPlacing(type: BldType | null) {
    if (type && this.game.state.ended) return;
    this.game.state.placing = this.game.state.placing === type ? null : type;
    if (this.game.state.placing) {
      const t = this.game.state.placing;
      const d = BUILDINGS[t];
      this.game.banner(
        t === "dock"
          ? "Fishing Dock — click the white posts by the water"
          : t === "farm"
            ? "Farm — click the open grass near camp"
            : t === "quarry"
              ? "Quarry — click a grey outcrop. Costs logs only. People haul stone once it stands."
              : "Click the valley to raise a " + d.name + "  ·  Esc cancel",
        2.6,
      );
    }
    this.updateGhost();
    this.audio.play("click");
    this.pushHud();
  }

  recycle() {
    this.game.recycleSelected();
    this.pushHud();
  }

  craftWeapon(kind: "spear" | "bow" | "blade") {
    this.game.craftWeapon(kind);
    this.pushHud();
  }

  callToArms() {
    this.game.callToArms(0);
    this.pushHud();
  }

  standDown() {
    this.game.standDown(0);
    this.pushHud();
  }

  train(type: Parameters<Game["trainSelected"]>[0]) {
    this.game.trainSelected(type);
    this.pushHud();
  }

  assignJob(job: Parameters<Game["assignJob"]>[0]) {
    this.game.assignJob(job);
    this.pushHud();
  }

  trade(deal: Parameters<Game["tryTrade"]>[0]) {
    this.game.tryTrade(deal);
    this.pushHud();
  }

  bankTrade(give: Parameters<Game["bankTrade"]>[0], get: Parameters<Game["bankTrade"]>[1]) {
    this.game.bankTrade(give, get);
    this.pushHud();
  }

  cycleTrade() {
    this.game.cycleTrade();
    this.pushHud();
  }

  focusTribe(id: number) {
    if (id !== 0) this.game.setTradeTeam(id);
    const camp = this.game.world.camps.find((c) => c.team === id);
    if (camp) this.view.look.set(camp.x, this.game.height(camp.x, camp.z) + 0.5, camp.z);
    this.pushHud();
  }

  raidRival() {
    this.game.raidRival();
    this.pushHud();
  }

  offerPact() {
    this.game.offerPact();
    this.pushHud();
  }

  acceptRoute() {
    this.game.acceptRoute();
    this.pushHud();
  }

  declineRoute() {
    this.game.declineRoute();
    this.pushHud();
  }

  halt() {
    this.game.haltSelected();
    this.pushHud();
  }

  ageUp() {
    this.game.tryAgeUp(0);
    this.pushHud();
  }

  pickAge(which: "econ" | "army") {
    this.game.commitAge(0, which);
    this.pushHud();
  }

  cancelAge() {
    this.game.state.pendingAge = false;
    this.pushHud();
  }

  trainPeople() {
    this.game.selectTownHall();
    this.game.trainSelected("worker");
    const hall = this.game.state.selBld;
    if (hall) this.view.look.set(hall.x, hall.y + 0.5, hall.z);
    this.pushHud();
  }

  focusIdle() {
    const u = this.game.focusIdleWorker();
    if (u) this.view.look.set(u.x, u.y + 0.5, u.z);
    this.pushHud();
  }

  explore() {
    this.game.issueExplore();
    this.pushHud();
  }

  setPaused(p: boolean) {
    this.game.state.paused = p;
  }

  setSpeed(s: number) {
    this.game.state.speed = s === 4 || s === 3 ? 4 : s === 2 ? 2 : 1;
  }

  toggleMute() {
    this.game.muted = !this.game.muted;
    this.audio.setMuted(this.game.muted);
  }

  setQuality(q: "low" | "med" | "high") {
    this.game.quality = q;
    this.view.applyQuality(q);
  }

  focusMinimap(nx: number, nz: number) {
    this.view.look.x = nx;
    this.view.look.z = nz;
    this.view.look.y = this.game.height(nx, nz) + 0.4;
  }

  private frame = (t: number) => {
    if (this.disposed) return;
    try {
      const dt = this.last ? Math.min((t - this.last) / 1000, 0.1) : 0.016;
      this.last = t;
      this.frames++;
      this.fpsAcc += dt;
      if (this.fpsAcc >= 0.4) {
        this.fps = this.frames / this.fpsAcc;
        this.game.fps = Math.round(this.fps);
        this.frames = 0;
        this.fpsAcc = 0;
      }

      this.view.pan.x = 0;
      this.view.pan.z = 0;
      if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) this.view.pan.z += 1;
      if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) this.view.pan.z -= 1;
      if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) this.view.pan.x -= 1;
      if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) this.view.pan.x += 1;
      if (this.keys.has("KeyQ")) this.view.yaw += 0.9 * dt;
      if (this.keys.has("KeyE")) this.view.yaw -= 0.9 * dt;

      if (this.view.lost) {
        this.hudAcc += dt;
        if (this.hudAcc > 0.3) {
          this.hudAcc = 0;
          this.pushHud();
        }
        return;
      }

      if (document.hidden) {
        this.simAccumulator = 0;
        return;
      }
      this.simAccumulator += dt;
      while (this.simAccumulator >= 1 / 30) {
        this.game.step(1 / 30);
        this.simAccumulator -= 1 / 30;
      }
      this.audio.setMood(
        this.game.musicMood(),
        this.game.tribe(0).age,
        this.game.popNow(),
        dt,
        this.game.state.paused,
      );
      if (this.keys.has("PageUp")) this.view.dist *= Math.exp(-dt);
      if (this.keys.has("PageDown")) this.view.dist *= Math.exp(dt);
      this.view.updateCamera(dt);
      if (this.keyboard.mode) this.keyboard.center();
      this.updateGhost();
      this.view.sync(this.game, dt);
      this.view.render();
      this.tuneQuality(dt);

      this.hudAcc += dt;
      if (this.hudAcc > 0.12) {
        this.hudAcc = 0;
        this.pushHud();
      }
      this.saveAcc += dt;
      if (this.saveAcc > 18) {
        this.saveAcc = 0;
        saveGame(this.game);
      }
      this.failFrames = 0;
    } catch (err) {
      console.error(err);
      this.failFrames++;
      if (this.failFrames >= 2 && this.game.quality !== "low") {
        this.failFrames = 0;
        this.setQuality(this.game.quality === "high" ? "med" : "low");
        this.game.banner("The valley eases", 1.8);
      }
    }
  };

  private tuneQuality(dt: number) {
    if (this.game.quality === "low") {
      this.slowFps = 0;
      return;
    }
    if (this.fps > 0 && this.fps < 18 && this.frames + this.fpsAcc > 0) {
      this.slowFps += dt;
      if (this.slowFps > 3.2) {
        this.slowFps = 0;
        this.setQuality(this.game.quality === "high" ? "med" : "low");
        this.game.banner("The valley eases", 1.6);
      }
    } else {
      this.slowFps = Math.max(0, this.slowFps - dt * 0.5);
    }
  }

  pushHud() {
    try {
      this.hud(this.game.snapshot());
    } catch (err) {
      console.error(err);
    }
  }

  getDragRect() {
    if (!this.drag) return null;
    if (Math.hypot(this.drag.x - this.drag.sx, this.drag.y - this.drag.sy) < 8) return null;
    return this.drag;
  }

  private installProbe() {
    window.__controlsTest = {
      getYaw: () => this.view.yaw,
      getSpeed: () =>
        Math.hypot(this.view.pan.x, this.view.pan.z) + (this.running ? this.view.dist * 0.001 : 0),
      setKeys: (codes: string[]) => {
        this.keys.clear();
        for (const c of codes) this.keys.add(c);
      },
    };
    (window as unknown as { __engine?: Engine }).__engine = this;
  }

  dispose() {
    this.disposed = true;
    this.running = false;
    this.view.renderer.setAnimationLoop(null);
    this.ro?.disconnect();
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVis);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    window.removeEventListener("wheel", this.onWheel);
    this.view.dispose();
    this.audio.dispose();
  }
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setKeys?: (codes: string[]) => void;
    };
  }
}
