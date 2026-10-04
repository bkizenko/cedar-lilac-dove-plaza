import { useEffect, useRef } from "react";
import type { Engine } from "@/game/engine";
import { TRACKS } from "@/game/music";
export function PlayTools({ engine }: { engine: Engine | null }) {
  const dialog = useRef<HTMLDialogElement>(null),
    open = !!engine?.keyboard.help;
  useEffect(() => {
    if (!engine || !open) return;
    const wasPaused = engine.game.state.paused;
    engine.game.state.paused = true;
    dialog.current?.showModal();
    return () => {
      dialog.current?.close();
      engine.game.state.paused = wasPaused;
      engine.canvas.focus();
    };
  }, [engine, open]);
  if (!engine) return null;
  return (
    <>
      {engine.keyboard.mode && !engine.game.awaitingStart && (
        <div className="world-reticle" aria-hidden="true">
          <span>+</span>
          <small>{engine.game.state.placing ? "Enter: build" : engine.loggingMode ? "Enter: mark tree · [ / ]: next tree" : "Enter: select · R: order"}</small>
        </div>
      )}
      <dialog
        ref={dialog}
        className="play-guide"
        onCancel={() => {
          engine.keyboard.help = false;
          engine.pushHud();
        }}
      >
        <h2 className="font-display text-2xl text-bronze-bright">Your tribe, at your fingertips</h2>
        <p className="mt-2 text-sm text-parchment-dim">
          The village is paused. Escape returns to the world. L opens the village ledger for food,
          work priorities and neighbor relations.
        </p>
        <dl className="key-guide">
          <dt>WASD / arrows</dt>
          <dd>Pan camera</dd>
          <dt>Q / E · Page Up / Down</dt>
          <dd>Rotate · zoom</dd>
          <dt>C / Shift+C · B / Shift+B</dt>
          <dd>Cycle people · buildings</dd>
          <dt>J · V · I · F</dt>
          <dd>Workers · army · idle worker · home</dd>
          <dt>K · [ / ]</dt>
          <dd>Center target · visible resources</dd>
          <dt>Enter · Shift+Enter</dt>
          <dd>Select or place · add selection</dd>
          <dt>R · Z · period · semicolon</dt>
          <dd>Contextual order · attack-move · stop · hold</dd>
          <dt>1–8 · G · X</dt>
          <dd>Quick build · drill an adult · explore</dd>
          <dt>N · [ / ] · Enter</dt>
          <dd>Mark trees mode · cycle visible trees · mark or clear</dd>
          <dt>Ctrl+1–9 · Alt+1–9</dt>
          <dd>Store group · recall group</dd>
          <dt>P / Space · − / +</dt>
          <dd>Pause · game speed</dd>
          <dt>Tab / Shift+Tab</dt>
          <dd>All menus; Enter / Space activates</dd>
          <dt>Escape · H · M</dt>
          <dd>Cancel · guide · mute</dd>
        </dl>
        <p className="text-sm">
          First steps: C selects a gatherer, ] finds resources, R gathers. Press 1, pan to open
          ground, and Enter to place a hut. Tab reaches jobs, military training, research and
          diplomacy.
        </p>
        <label className="audio-setting">
          Calm soundtrack
          <input
            type="checkbox"
            defaultChecked={engine.audio.score.calm}
            onChange={(e) => {
              engine.audio.score.calm = e.target.checked;
              engine.pushHud();
            }}
          />
        </label>
        <h3 className="mt-5 font-display text-lg text-bronze-bright">Sound of the settlement</h3>
        <label className="audio-setting">
          Music
          <input
            aria-label="Music volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            defaultValue={engine.audio.score.volume}
            onChange={(e) => engine.audio.setMusicVolume(Number(e.target.value))}
          />
        </label>
        <label className="audio-setting">
          Effects
          <input
            aria-label="Effects volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            defaultValue={engine.audio.sfx?.gain.value ?? 0.45}
            onChange={(e) => engine.audio.setSfxVolume(Number(e.target.value))}
          />
        </label>
        <p className="text-sm">
          Now: {TRACKS[engine.audio.score.stage].title} · {engine.audio.score.status}
        </p>
        <button onClick={()=>{engine.audio.unlock();engine.game.muted=false;engine.audio.setMuted(false);if(engine.audio.score.volume===0)engine.audio.setMusicVolume(.2);engine.pushHud();}}>Enable music</button>
        <p className="text-sm">Music continues while you pause or plan. Switching away from the game silences it.</p>
        {engine.audio.score.error && <p role="status">{engine.audio.score.error}</p>}
        <p className="mt-3 text-xs text-parchment-dim">
          “Meditation Impromptu 01”, “Atlantean Twilight”, and “Five Armies” by{" "}
          <a href="https://incompetech.com/" target="_blank" rel="noreferrer">
            Kevin MacLeod (incompetech.com)
          </a>
          . Licensed under{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
            Creative Commons: By Attribution 4.0
          </a>
          . Unedited recordings with gentle fades and quiet gaps. Piano by default; orchestral combat music is optional;
          no commercial game soundtrack.
        </p>
        <button
          className="guide-close"
          onClick={() => {
            engine.keyboard.help = false;
            engine.pushHud();
          }}
        >
          Return to the village
        </button>
      </dialog>
    </>
  );
}
