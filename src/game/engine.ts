import {linearStructure,constructionLine,placeConstructionLine} from './linearConstruction';
import {buildingCost} from './construction';
import {dragPlot,scalablePlot,type PlotSize} from './plots';
import {planBridge,bridgeHeight,type BridgeSpan} from './transport';
import { soilQuality } from "./ecology";
import { calendar } from "./settlement";
import { cultivationIssue } from "./cultivation";
import { encodeGame, decodeGame } from "./persistence";
import { KeyboardCommands } from "./keyboard";
import { BUILD_ORDER, BUILDINGS, TILE } from "./constants";
import { Game } from "./sim";
import { GameAudio } from "./audio";
import { saveGame, loadRaw, hasSave, protectGame, exportGame } from "./save";
import type { BldType, HudSnapshot } from "./types";
import { WorldView } from "@/scene/world";

type HudFn = (s: HudSnapshot) => void;

export class Engine {
  game: Game;
  private originalGame: Game | null = null;
  startTestSession(){
    if(this.originalGame)return;
    if(!saveGame(this.game,true)){this.game.banner("Save your village successfully before entering test mode",5);return;}
    const copy=decodeGame(encodeGame(this.game));copy.testMode=true;copy.state.paused=true;
    this.originalGame=this.game;this.restoreVillage(copy);this.pushHud();
  }
  endTestSession(){
    if(!this.originalGame)return;
    const original=this.originalGame;this.originalGame=null;original.state.paused=true;
    this.restoreVillage(original);this.pushHud();
  }
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
  loggingMode = false;
  pointer = { x: 0, y: 0 };
  ghostPos = { x: 0, z: 0 };
  plotStart: {x:number;z:number}|null=null;
  plotSize: PlotSize|undefined;
  bridgeSpan: BridgeSpan|undefined;
  plotWidth=1;plotDepth=1;
  plotPreviewKey="";
  resizePlot(delta:number,depth=false){
    if(depth)this.plotDepth=Math.max(1,Math.min(3,this.plotDepth+delta));else this.plotWidth=Math.max(1,Math.min(3,this.plotWidth+delta));
    this.updateGhost();this.game.banner(`Plot ${this.plotWidth} × ${this.plotDepth} · [ ] width · Shift+[ ] depth`,3);this.pushHud();
  }
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
      const saved=loadRaw();
      if(saved){this.game=decodeGame(saved);this.game.quality=this.view.quality;this.game.onSfx=n=>this.audio.play(n);}
      else {this.game.reset();this.game.awaitingStart = true;}
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
        this.running = false;
        throw err2 instanceof Error ? err2 : new Error("The camp could not be raised.");
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

  enterAsBand() {
    this.audio.unlock();
    this.game.enterAsBand();
    this.canvas.focus();
    this.pushHud();
  }

  hasSavedGame() {
    return hasSave();
  }
  saveNow() {
    if(this.game.testMode){this.game.banner("Test copy: saving is disabled. Leave testing to return to your village.",5);return;}
    const saved=saveGame(this.game,true),backup=saved&&protectGame(this.game);
    this.game.banner(saved ? `Village saved · Year ${calendar(this.game).year+1}, ${calendar(this.game).month}${backup?"":" · extra copy unavailable"}` : "Save failed: local storage is unavailable or full. Export your village file.", 5);
    this.pushHud();
  }
  protectVillage() {
    this.game.banner(protectGame(this.game)?"Backup copy saved — automatic saves will not overwrite this copy":"Could not protect the village; storage may be full",4);
    this.pushHud();
  }
  exportVillage() {this.protectVillage();exportGame(this.game);}
  async importVillage(file:File) {
    if(this.originalGame){this.game.banner("Leave test mode before importing a village",4);return;}
    try {
      const restored=decodeGame(JSON.parse(await file.text()));
      if(this.game.started&&!this.game.awaitingStart&&!protectGame(this.game))throw new Error("Could not protect your current village. Download it before importing another save.");
      saveGame(this.game);
      this.restoreVillage(restored);
      if(!saveGame(restored,true))throw new Error("Village imported but local saving failed. Keep the original file.");
      this.game.banner("Backup imported; previous village kept as a protected checkpoint",5);
    } catch(error) {this.game.banner(error instanceof Error?error.message:"Invalid village backup",5);}
    this.pushHud();
  }
  private restoreVillage(restored:Game) {
    restored.onSfx=(n)=>this.audio.play(n);restored.quality=this.game.quality;restored.muted=this.game.muted;
    this.game=restored;this.simAccumulator=0;this.keyboard.groups.clear();
    this.view.rebuild(restored);this.homeLook();this.audio.unlock();this.canvas.focus();
  }
  resumeSaved(protectedOnly=false) {
    if(this.originalGame){this.endTestSession();return;}
    try {
      if(protectedOnly && this.game.started && !this.game.awaitingStart && !saveGame(this.game))throw new Error("Could not save the current village before restoring. Download it first.");
      const raw = loadRaw(protectedOnly);
      if (!raw) throw new Error("No compatible save. Older partial saves cannot be restored.");
      const restored = decodeGame(raw);
      this.restoreVillage(restored);
      if(protectedOnly)saveGame(restored,true);
      restored.banner("Village restored · P to resume", 4);
    } catch (error) {
      this.game.banner(error instanceof Error ? error.message : "Cannot restore save", 4);
    }
    this.pushHud();
  }

  restart() {
    if(this.originalGame){this.game.banner("Leave test mode before starting another village",4);return;}
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
    window.addEventListener("pagehide",this.onPageHide);
    window.addEventListener("beforeunload",this.onPageHide);
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
  private onPageHide = () => {if(!this.disposed)saveGame(this.game);};

  private onVis = () => {
    this.keys.clear();
    this.simAccumulator = 0;
    this.last = 0;
    if (document.visibilityState === "hidden") saveGame(this.game);
    if (document.visibilityState === "visible") {
      this.view.resize();
      if (this.audio.ctx?.state === "suspended") void this.audio.ctx.resume();
    }
  };

  private onKeyDown = (e: KeyboardEvent) => this.keyboard.key(e);

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onWheel = (e: WheelEvent) => {
    if ((e.target as HTMLElement | null)?.closest("dialog, input, select, textarea, .hud-panel")) return;
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
        this.plotStart=(scalablePlot(this.game.state.placing)||this.game.state.placing==="bridge"||linearStructure(this.game.state.placing))?this.view.groundAt(p.x,p.y):null;
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
      this.plotStart=null;this.plotSize=undefined;
      this.drag = null;
      this.updateGhost();
      this.pushHud();
      return;
    }
    if (this.drag && e.button === 0) {
      const dx = this.drag.x - this.drag.sx;
      const dy = this.drag.y - this.drag.sy;
      if (Math.hypot(dx, dy) > 8) {
        if (!e.shiftKey && !this.loggingMode) this.game.clearSelect();
        const minx = Math.min(this.drag.sx, this.drag.x),
          maxx = Math.max(this.drag.sx, this.drag.x);
        const miny = Math.min(this.drag.sy, this.drag.y),
          maxy = Math.max(this.drag.sy, this.drag.y);
        let picked = 0;
        for (const u of this.game.state.units) {
          if (this.loggingMode || u.team !== 0 || u.hp <= 0) continue;
          const p = this.view.project(u.x, u.y + 0.6, u.z);
          if (p.behind) continue;
          if (p.x >= minx && p.x <= maxx && p.y >= miny && p.y <= maxy) {
            u.selected = true;
            picked++;
          }
        }
        if (picked === 0) {
          const ids: number[] = [];
          for (const tree of this.game.state.trees) {
            if (tree.amount <= 0 || !this.game.visibleAt(tree.x, tree.z)) continue;
            const sp = this.view.project(tree.x, tree.y + 1.2, tree.z);
            if (sp.behind) continue;
            if (sp.x >= minx && sp.x <= maxx && sp.y >= miny && sp.y <= maxy) ids.push(tree.id);
          }
          if (ids.length) this.game.markChop(ids);
        }
      } else {
        this.leftClick(p.x, p.y, e.shiftKey);
      }
      this.drag = null;
    }
  };

  leftClick(cx: number, cy: number, additive: boolean) {
    const boatOrder=this.game.selectedBoat!==null&&!this.game.state.placing;
    const g = boatOrder ? this.view.waterAt(cx,cy,this.game.world.waterY) : this.view.groundAt(cx, cy);
    if (!g) {
      if (this.game.state.placing) this.game.banner("Aim at the valley floor", 1.2);
      return;
    }
    if (this.game.state.placing) {
      this.updateGhost();
      if(linearStructure(this.game.state.placing)&&this.plotStart){
        placeConstructionLine(this.game,this.game.state.placing,this.plotStart,g);
        this.pushHud();return;
      }
      this.game.placeBuilding(this.game.state.placing, this.ghostPos.x, this.ghostPos.z, 0,this.plotSize,this.bridgeSpan);
      this.updateGhost();
      this.pushHud();
      return;
    }
    if (this.loggingMode) {
      const tree = this.game.state.trees.filter(t => t.amount > 0 && this.game.visibleAt(t.x, t.z))
        .filter(t => Math.hypot(t.x - g.x, t.z - g.z) < 8)
        .sort((a, b) => Math.hypot(a.x - g.x, a.z - g.z) - Math.hypot(b.x - g.x, b.z - g.z))[0];
      if (tree) this.game.markChop([tree.id]);
      else this.game.banner("Aim at a visible tree, or drag over a stand", 1.8);
      this.pushHud();
      return;
    }
    if (this.moveMode) {
      this.game.issueMove(g.x, g.z);
      this.moveMode = false;
      return;
    }
    const boat=this.view.pickBoat(cx,cy,this.game);
    if(boat&&boat.team===0){this.game.selectBoat(boat.id);this.pushHud();return;}
    const entity = this.view.pickEntity(cx, cy, this.game);
    if(entity?.kind==="building"&&entity.team===0&&!this.game.finished(entity)&&!additive&&this.game.selectedUnits().length)this.game.orderConstruction(entity);
    else if (entity) this.game.selectEntity(entity, additive, true);
    else {
      const resource=this.view.pickResource(cx,cy,this.game);
      if(resource){if(!additive)this.game.clearSelect();this.game.selectedResource=resource;}
      else if(!additive&&(this.game.selectedUnits().length||this.game.selectedBoat!==null))this.game.issueMove(g.x,g.z);
      else this.game.selectAt(g.x,g.z,additive);
    }
    this.pushHud();
  }

  rightClick(cx: number, cy: number) {
    const g = this.game.selectedBoat!==null ? this.view.waterAt(cx,cy,this.game.world.waterY) : this.view.groundAt(cx, cy);
    if (!g) return;
    if (this.game.state.placing) {
      this.game.state.placing = null;
      this.view.setGhost(null, 0, 0, 0, false);
      return;
    }
    if(this.game.selectedBoat!==null){this.game.issueMove(g.x,g.z);this.pushHud();return;}
    const ent = this.view.pickEntity(cx, cy, this.game) || this.game.entityAt(g.x, g.z);
    if (ent && ent.team !== 0 && this.game.visibleAt(ent.x, ent.z)) this.game.issueAttack(ent);
    else if(ent?.kind==="building"&&ent.team===0&&!this.game.finished(ent))this.game.orderConstruction(ent);
    else {
      const node = this.view.pickResource(cx,cy,this.game) || (this.game.exploredAt(g.x, g.z) ? this.game.resourceAt(g.x, g.z) : null);
      if (node) this.game.issueGather(node);
      else this.game.issueMove(g.x, g.z);
    }
  }

  private updateGhost() {
    this.view.setLinePreview([]);
    const type = this.game.state.placing;
    if (!type) {
      const b=this.game.state.selBld;
      if(b?.expansion){this.view.setGhost(b.type,b.x,b.z,b.y,true,undefined,null,b.expansion);return;}
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
    if (type === "quarry" && this.game.height(x,z)<10) {
      const snap = this.game.snapQuarry(x, z);
      if (snap) {
        x = snap.x;
        z = snap.z;
      }
    }
    this.plotSize=scalablePlot(type)&&(this.plotWidth>1||this.plotDepth>1)?{w:BUILDINGS[type].w*this.plotWidth,d:BUILDINGS[type].d*this.plotDepth}:undefined;
    if(this.plotStart&&scalablePlot(type)&&Math.hypot(g.x-this.plotStart.x,g.z-this.plotStart.z)>2){
      const plot=dragPlot(type,this.plotStart,g);x=plot.x;z=plot.z;this.plotSize={w:plot.w,d:plot.d};
    }
    if(scalablePlot(type)){
      const key=type+JSON.stringify(this.plotSize);
      if(key!==this.plotPreviewKey){this.plotPreviewKey=key;const cost=buildingCost(type,this.game,0,this.plotSize);this.game.banner(type==="farm"?`Field · ${cost.seeds} seeds · drag to size`:`Store · ${cost.wood} logs · drag to size`,4);}
    }
    if(linearStructure(type)&&this.plotStart){
      const line=constructionLine(this.plotStart,g),end=line[line.length-1];
      if(!end)return;
      x=end.x;z=end.z;
      let blocked=false;
      this.view.setLinePreview(line.map(p=>{blocked=blocked||!this.game.placementValid(type,p.x,p.z,0);return {...p,y:this.game.height(p.x,p.z),ok:!blocked};}));
      const unitCost=buildingCost(type,this.game),costs=[unitCost.wood?`${(unitCost.wood||0)*line.length} logs`:'',unitCost.stone?`${(unitCost.stone||0)*line.length} stone`:''].filter(Boolean).join(' · ');
      this.game.banner(`${line.length} sections${costs?' · '+costs:''}${blocked?' · red sections blocked':' · leave a gate'}`,2);
    }
    this.bridgeSpan=undefined;
    if(type==='bridge'&&this.plotStart&&Math.hypot(g.x-this.plotStart.x,g.z-this.plotStart.z)>2){
      this.bridgeSpan={ax:this.plotStart.x,az:this.plotStart.z,bx:g.x,bz:g.z};
      x=(this.plotStart.x+g.x)/2;z=(this.plotStart.z+g.z)/2;
      const cost=buildingCost(type,this.game,0,undefined,this.bridgeSpan);
      this.game.banner(`Bridge · ${Math.hypot(g.x-this.plotStart.x,g.z-this.plotStart.z).toFixed(0)} m · ${cost.wood} logs · ${cost.stone} stone`,2);
    }
    const okPlace = this.game.placementValid(type, x, z, 0,this.plotSize,this.bridgeSpan);
    const issue = okPlace ? null : this.game.placementIssue(type, x, z, 0,this.plotSize,undefined,this.bridgeSpan);
    this.game.state.placeIssue = issue;
    this.ghostPos.x = x;
    this.ghostPos.z = z;
    const bridge=type==="bridge"?(this.bridgeSpan??planBridge(this.game,x,z)):null;
    this.view.setGhost(type, x, z, bridge?bridgeHeight(this.game,bridge,x,z):this.game.height(x, z), !issue, type === "farm" ? soilQuality(this.game,x,z) : undefined,bridge,this.plotSize);
  }

  toggleLogging() {
    this.loggingMode = !this.loggingMode;
    this.game.state.placing = null;
    this.moveMode = false;
    this.game.banner(this.loggingMode ? "Mark trees: drag over a stand, or aim and press Enter. Repeat to clear marks. Esc to finish." : "Tree marking finished", 3);
    this.canvas.focus();
    this.pushHud();
  }

  setPlacing(type: BldType | null) {
    this.bridgeSpan=undefined;this.plotStart=null;this.plotSize=undefined;this.plotWidth=1;this.plotDepth=1;
    this.loggingMode = false;
    if (type && this.game.state.ended) return;
    if(type==="farm"&&cultivationIssue(this.game)){
      this.game.banner(cultivationIssue(this.game)!,5);this.pushHud();return;
    }
    this.game.state.placing = this.game.state.placing === type ? null : type;
    if (this.game.state.placing) {
      const t = this.game.state.placing;
      const d = BUILDINGS[t];
      this.game.banner(
        t === "cornerstone"
          ? "Outpost — choose explored dry ground at least 64m from your halls and other outposts. Costs 70 logs; plans can wait for materials."
          : t === "dock"
          ? "Fishing Dock — click the white posts by the water"
          : t === "farm"
            ? "Farm — drag a rectangle. Larger fields need more seeds and workers."
            : t === "warehouse" ? "Storehouse — drag a rectangle. Larger stores cost more and hold more." : t === "quarry"
              ? "Quarry — choose a stone outcrop or gentle mountain slope. Two miners dig and haul stone."
              : t === "bridge"
                ? "Bridge — drag bank to bank (5–28 m), or click a narrow river for an automatic crossing."
              : linearStructure(t) ? "Drag a defensive line. Each section needs materials and builders. Leave room for a gate."
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

  craftFarmTool(kind: Parameters<Game["craftFarmTool"]>[0], workplaceId?:number) {
    this.game.craftFarmTool(kind,workplaceId);
    this.pushHud();
  }

  craftHaulage(kind: "sled" | "cart" | "canoe" | "pack", workplaceId?:number) {
    this.game.craftHaulage(kind,workplaceId);
    this.pushHud();
  }

  craftWeapon(kind: "spear" | "bow" | "blade", workplaceId?:number) {
    this.game.craftWeapon(kind,workplaceId);
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

  clearSelection() {
    this.game.clearSelect();
    this.moveMode=false;
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
    const camp = this.game.world.camps.find((c) => c.team === id);
    if (!camp) return;
    if (id !== 0 && !this.game.exploredAt(camp.x, camp.z)) {
      this.game.banner("That shore is still in fog. Send someone to explore.", 1.8);
      this.pushHud();
      return;
    }
    if (id !== 0) this.game.setTradeTeam(id);
    this.view.look.set(camp.x, this.game.height(camp.x, camp.z) + 0.5, camp.z);
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
    this.game.assignJob("drill");
    this.pushHud();
  }

  focusIdle() {
    const u = this.game.focusIdleWorker();
    if (u) this.view.look.set(u.x, u.y + 0.5, u.z);
    this.pushHud();
  }

  cycleVillager(direction=1) {
    const u=this.game.cycleVillager(direction);
    if(u)this.view.look.set(u.x,u.y+0.5,u.z);
    this.canvas.focus();this.pushHud();
  }

  focusHome() {
    const c = this.game.campOf(0);
    this.view.look.set(c.x, this.game.height(c.x, c.z) + 0.5, c.z);
    this.canvas.focus();
  }

  explore() {
    this.game.issueExplore();
    this.pushHud();
  }

  setPaused(p: boolean) {
    this.game.state.paused = p;
    if(p)saveGame(this.game);
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
      } else {
        this.simAccumulator += dt;
        while (this.simAccumulator >= 1 / 30) {
          this.game.step(1 / 30);
          this.simAccumulator -= 1 / 30;
        }
      }
      this.audio.setMood(
        this.game.musicMood(),
        this.game.tribe(0).age,
        this.game.popNow(),
        dt,
        this.game.state.paused,
        this.game.seasonMix().name,
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
      const type=this.game.state.placing;
      const cost=type?buildingCost(type,this.game,0,this.plotSize,this.bridgeSpan):null;
      const sections=type&&linearStructure(type)&&this.plotStart?constructionLine(this.plotStart,this.ghostPos).length:1;
      const materials=cost?Object.entries(cost).filter(([,amount])=>amount>0).map(([kind,amount])=>`${amount*sections} ${kind==='wood'?'logs':kind}`).join(' · '):'';
      const summary=type?`${sections>1?sections+' sections · ':''}${materials||'Labor only'}`:undefined;
      this.hud({...this.game.snapshot(),plotSummary:summary});
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
    if(this.disposed)return;
    saveGame(this.game);
    this.disposed = true;
    this.running = false;
    this.view.renderer.setAnimationLoop(null);
    this.ro?.disconnect();
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    window.removeEventListener("pagehide",this.onPageHide);
    window.removeEventListener("beforeunload",this.onPageHide);
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
