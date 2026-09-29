import { SettlementLedger } from "./SettlementLedger";
import { PlayTools } from "./PlayTools";
import { useEffect, useRef, useState } from "react";
import type { Engine } from "@/game/engine";
import type { HudSnapshot } from "@/game/types";
import { Hud } from "./Hud";

const EMPTY: HudSnapshot = {
  food: 0,
  wood: 0,
  stone: 0,
  copper: 0,
  iron: 0,
  pop: 0,
  popCap: 0,
  age: 0,
  ages: ["Stone", "Bronze", "Iron", "Classical", "Medieval", "Renaissance"],
  time: 0,
  day: 1,
  clock: "06:42",
  period: "Dawn",
  weather: "Valley mist · 11°C",
  season: "Spring",
  paused: false,
  speed: 1,
  ended: null,
  endReason: "",
  objective: "",
  placing: null,
  placeIssue: null,
  banner: null,
  selection: { name: "No selection", info: "", hp: 0, maxHp: 1, kind: "none" },
  canAge: false,
  ageCost: null,
  nextAge: "Bronze",
  tribes: [],
  trainOptions: [],
  buildOptions: [],
  fps: 0,
  started: false,
  awaitingStart: true,
  founding: false,
  muted: false,
  quality: "high",
  workerSelected: 0,
  militarySelected: 0,
  job: null,
  canRaid: false,
  trade: null,
  rivalX: 82,
  rivalZ: -86,
  homeX: 0,
  homeZ: 38,
  camps: [],
  raidName: null,
  idleWorkers: 0,
  pendingAge: null,
  routeOffer: null,
  routes: [],
  event: null,
  regions: [],
  richRes: "food",
  clusters: [],
  prestige: 0,
  stockCap: 140,
  port: false,
  night: false,
  threat: 0,
  spears: 0,
  bows: 0,
  blades: 0,
  armed: 0,
  raidIn: 0,
};

export function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(EMPTY);
  const [fail, setFail] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ sx: number; sy: number; x: number; y: number } | null>(null);
  const [boot, setBoot] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let engine: Engine | null = null;
    let dragTimer: number | null = null;

    const bootEngine = async () => {
      try {
        const { Engine } = await import("@/game/engine");
        if (cancelled || !canvasRef.current) return;
        engine = new Engine(canvasRef.current, (snap) => {
          if (!cancelled) setHud(snap);
        });
        engineRef.current = engine;
        engine.begin();
        dragTimer = window.setInterval(() => {
          setDrag(engine?.getDragRect() ?? null);
        }, 50);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        console.error(err);
        setFail(msg || "The valley failed to load.");
      }
    };
    void bootEngine();

    return () => {
      cancelled = true;
      if (dragTimer) window.clearInterval(dragTimer);
      engine?.dispose();
      engineRef.current = null;
    };
  }, [boot]);

  return (
    <div
      id="game-root"
      className="game-root relative h-dvh w-full overflow-hidden bg-ink"
      style={{ height: "100dvh", width: "100%" }}
    >
      <canvas
        ref={canvasRef}
        tabIndex={0}
        aria-label="Game world. H for keyboard help; L for village ledger; Tab for menus."
        className="absolute inset-0 size-full touch-none"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
          cursor: hud.placing ? "crosshair" : "default",
        }}
      />
      {drag && (
        <div
          className="pointer-events-none absolute z-20 border border-bronze-bright/80 bg-bronze/10"
          style={{
            left: Math.min(drag.sx, drag.x),
            top: Math.min(drag.sy, drag.y),
            width: Math.abs(drag.x - drag.sx),
            height: Math.abs(drag.y - drag.sy),
          }}
        />
      )}
      <Hud hud={hud} engine={engineRef.current} />
      <PlayTools engine={engineRef.current} />
      <SettlementLedger engine={engineRef.current} />
      {hud.awaitingStart && hud.started && !fail ? (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-ink/55 backdrop-blur-[2px]">
          <p className="font-display text-xs tracking-[0.4em] text-bronze uppercase">
            A band on open ground
          </p>
          <h1 className="mt-3 font-display text-6xl tracking-[0.22em] text-bronze-bright md:text-7xl">
            HEARTH
          </h1>
          <p className="mt-1 font-display text-xl tracking-[0.42em] text-parchment-dim">
            WILD
          </p>
          <p className="mt-8 max-w-sm px-6 text-center text-sm leading-relaxed text-parchment">
            Walk until you find a clump of berries or timber, then plant the hall. Later cornerstones claim
            distant resource clumps. One trade at a time.
          </p>
          <button
            type="button"
            onClick={() => engineRef.current?.enterAsBand()}
            className="mt-8 min-h-12 rounded-lg border border-bronze bg-ink-soft px-8 py-3 font-display text-lg tracking-[0.18em] text-bronze-bright hover:bg-bronze/20"
          >
            Walk the ground
          </button>
          {engineRef.current?.hasSavedGame() && (
            <button
              type="button"
              className="mt-3 rounded-lg border border-bronze px-6 py-2 text-parchment"
              onClick={() => engineRef.current?.resumeSaved()}
            >
              Resume saved village
            </button>
          )}
          {hud.banner && <p role="status">{hud.banner}</p>}
          <p className="mt-4 text-[11px] text-parchment-dim">
            Press Enter to begin · H for keyboard controls
          </p>
        </div>
      ) : null}
      {!hud.started && (
        <div
          id="boot"
          className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_70%_20%,#6a4a20_0%,#1a160e_55%,#0c0e0a_100%)]"
        >
          <p className="font-display text-xs tracking-[0.35em] text-bronze uppercase">
            A band on open ground
          </p>
          <h1 className="mt-3 font-display text-6xl tracking-[0.22em] text-bronze-bright md:text-7xl">
            HEARTH
          </h1>
          <p className="mt-1 font-display text-xl tracking-[0.42em] text-parchment-dim">
            WILD
          </p>
          <p className="mt-6 max-w-md px-6 text-center text-sm leading-relaxed text-parchment-dim">
            {fail ? fail : "Raising the camp…"}
          </p>
          {fail ? (
            <button
              type="button"
              onClick={() => {
                setFail(null);
                setHud(EMPTY);
                setBoot((n) => n + 1);
              }}
              className="mt-5 rounded-lg border border-bronze/40 bg-ink-soft px-5 py-2 text-sm text-bronze-bright hover:bg-ink"
            >
              Raise the camp again
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
