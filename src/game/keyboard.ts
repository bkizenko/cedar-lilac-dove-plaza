import type { Engine } from "./engine";
import { BUILD_ORDER } from "./constants";

/** UI focus and world commands share one keyboard, never the same keystroke. */
export class KeyboardCommands {
  mode = false;
  help = false;
  ledger = false;
  groups = new Map<number, number[]>();
  private cursorId = -1;
  private engine: Engine;
  constructor(engine: Engine) {
    this.engine = engine;
  }
  center() {
    const e = this.engine;
    e.pointer.x = e.canvas.clientWidth / 2;
    e.pointer.y = e.canvas.clientHeight / 2;
  }
  key(event: KeyboardEvent) {
    const e = this.engine,
      g = e.game,
      code = event.code;
    if (code === "Escape") {
      this.help = false;
      this.ledger = false;
      g.state.placing = null;
      g.state.pendingAge = false;
      e.moveMode = false;
      e.canvas.focus();
      e.pushHud();
      return;
    }
    const target = event.target as HTMLElement | null;
    const typing = target?.closest(
      "input,textarea,select,[contenteditable=true],dialog[open],[role=dialog]",
    );
    const ui = target?.closest("button,a,summary");
    const camera = [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "KeyQ",
      "KeyE",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "PageUp",
      "PageDown",
    ].includes(code);
    if (typing || code === "Tab" || event.metaKey) {
      e.keys.clear();
      return;
    }
    if (ui && !camera) return;
    if (ui && camera) {
      event.preventDefault();
      e.canvas.focus();
    }
    if (!g.started) return;
    if (g.awaitingStart) {
      if (code === "Enter" && !event.repeat) {
        event.preventDefault();
        e.enterIsland();
      }
      return;
    }
    const n = /^Digit[1-9]$/.test(code) ? Number(code.slice(-1)) : 0;
    if (event.ctrlKey || event.altKey) {
      if (n && !event.repeat) {
        event.preventDefault();
        if (event.ctrlKey) {
          this.groups.set(
            n,
            g.selectedUnits().map((u) => u.id),
          );
          g.banner(`Group ${n} saved`, 2);
        } else {
          g.clearSelect();
          const ids = this.groups.get(n) || [];
          for (const u of g.state.units)
            u.selected = u.team === 0 && u.hp > 0 && ids.includes(u.id);
          g.banner(`Group ${n}: ${g.selectedUnits().length} people`, 2);
        }
        e.pushHud();
      }
      return;
    }
    e.keys.add(code);
    if (
      [
        "Space",
        "Enter",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "PageUp",
        "PageDown",
      ].includes(code)
    )
      event.preventDefault();
    if (event.repeat) return;
    if (code === "KeyK") this.mode = !this.mode;
    if (code === "KeyH") this.help = !this.help;
    if (code === "KeyL") this.ledger = !this.ledger;
    if (code === "KeyC" || code === "KeyB") {
      const entities = (code === "KeyB" ? g.state.buildings : g.state.units).filter(
        (x) => x.team === 0 && x.hp > 0,
      );
      if (entities.length) {
        const at = entities.findIndex((x) => x.id === this.cursorId);
        const next = entities[(at + (event.shiftKey ? -1 : 1) + entities.length) % entities.length];
        this.cursorId = next.id;
        g.clearSelect();
        next.selected = true;
        if (next.kind === "building") g.state.selBld = next;
        e.view.look.set(next.x, next.y - 1.2, next.z);
        this.mode = true;
      }
    }
    if (code === "KeyJ" || code === "KeyV") {
      g.clearSelect();
      for (const u of g.state.units)
        u.selected =
          u.hp > 0 && u.team === 0 && (code === "KeyJ" ? u.type === "worker" : u.type !== "worker");
    }
    if (code === "BracketLeft" || code === "BracketRight") {
      const s = g.state;
      const nodes = [...s.forage, ...s.trees, ...s.stones, ...s.copper, ...s.iron, ...s.fish]
        .filter((x) => x.amount > 0 && g.visibleAt(x.x, x.z))
        .sort((a, b) => a.id - b.id);
      if (nodes.length) {
        const at = nodes.findIndex((x) => x.id === this.cursorId);
        const next = nodes[(at + (code === "BracketLeft" ? -1 : 1) + nodes.length) % nodes.length];
        this.cursorId = next.id;
        e.view.look.set(next.x, next.y - 1.2, next.z);
        this.mode = true;
        g.banner(`${next.kind} · R to gather`, 2);
      }
    }
    if (["Enter", "KeyR", "KeyZ"].includes(code)) {
      this.mode = true;
      this.center();
      e.view.updateCamera(0);
      const point = e.view.groundAt(e.pointer.x, e.pointer.y);
      if (code === "Enter") {
        if (g.state.placing) e.leftClick(e.pointer.x, e.pointer.y, event.shiftKey);
        else if (point) e.leftClick(e.pointer.x, e.pointer.y, event.shiftKey);
      } else if (code === "KeyZ" && point) g.issueMove(point.x, point.z, true);
      else e.rightClick(e.pointer.x, e.pointer.y);
    }
    if (code === "Period") e.halt();
    if (code === "Semicolon")
      for (const u of g.selectedUnits()) {
        u.order = "hold";
        u.target = null;
        u.attackDestination = null;
      }
    if (code === "KeyI") e.focusIdle();
    if (code === "KeyG") e.trainPeople();
    if (code === "KeyT") e.cycleTrade();
    if (code === "KeyX") e.explore();
    if (code === "KeyP" || code === "Space") g.state.paused = !g.state.paused;
    if (code === "Equal" || code === "NumpadAdd") e.setSpeed(g.state.speed >= 2 ? 4 : 2);
    if (code === "Minus" || code === "NumpadSubtract") e.setSpeed(g.state.speed >= 4 ? 2 : 1);
    if (code === "KeyF") {
      const c = g.campOf(0);
      e.view.look.set(c.x, g.height(c.x, c.z) + 0.5, c.z);
    }
    if (code === "KeyM") e.toggleMute();
    if (n >= 1 && n <= 8) {
      this.mode = true;
      this.center();
      e.setPlacing(BUILD_ORDER[n - 1]);
    }
    e.pushHud();
  }
}
