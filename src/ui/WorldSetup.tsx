import {useLifecycleAction} from './useLifecycleAction';
import { DIFFICULTIES, difficultyEffects, type Difficulty } from "../game/difficulty";
import { useState } from "react";
import type { Engine } from "../game/engine";
import type { WorldRequest, WorldOptions } from "../game/worldOptions";
import type { SkinRequest } from "../game/skinState";
import { SkinPicker } from "./SkinPicker";
import { PRESETS, type MapPreset } from "../game/mapgen/presets";
export function WorldSetup({ engine }: { engine: Engine }) {
  const [mapType, setMapType] = useState<MapPreset | "random">("random");
  const [size, setSize] = useState<WorldOptions["size"]>(1560);
  const [preset, setPreset] = useState<Difficulty>(engine.game.state.difficulty ?? "normal");
  const [skin, setSkin] = useState<SkinRequest>({ mode: "random" });
  const lifecycle=useLifecycleAction(engine),busy=lifecycle.busy;
  const [wildCraft,setWildCraft] = useState(false);
  const [previewRiverbanks, setPreviewRiverbanks] = useState(false);
  return (
    <div className="world-setup">
      <p className="text-xs">
        {engine.game.testMode
          ? "Test world · your village is kept."
          : "Starts a new world; keeps your current village as a protected checkpoint."}
      </p>
      <label>
        Difficulty
        <select
          aria-label="New world difficulty"
          value={preset}
          onChange={(e) => setPreset(e.target.value as Difficulty)}
        >
          {Object.entries(DIFFICULTIES).map(([id, p]) => (
            <option key={id} value={id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <details>
        <summary>Preset effects</summary>
        <p className="text-xs">{difficultyEffects(preset)}</p>
      </details>
      <label>
        Map type
        <select
          aria-label="Map type"
          value={mapType}
          onChange={(e) => setMapType(e.target.value as MapPreset | "random")}
        >
          <option value="random">Surprise me</option>
          {Object.values(PRESETS).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        World size
        <select
          value={size}
          onChange={(e) => setSize(Number(e.target.value) as WorldOptions["size"])}
        >
          <option value={1040}>Standard</option>
          <option value={1560}>Large · 2.25× area</option>
          <option value={2080}>Huge · 4× area</option>
        </select>
      </label>
      <SkinPicker value={skin} onChange={setSkin} />
      <label><input type="checkbox" checked={wildCraft} onChange={e=>setWildCraft(e.target.checked)}/> Detailed hunting and hide work · experimental</label>
      {engine.game.testMode&&<label>
        <input type="checkbox" checked={previewRiverbanks} onChange={e=>setPreviewRiverbanks(e.target.checked)}/>
        Experimental riverbanks
      </label>}
      <button
        type="button"
        disabled={busy}
        onClick={() => void lifecycle.run(async()=>{
          await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
          return await engine.configureNewWorld({preset:mapType,size,difficulty:preset,skin},previewRiverbanks,wildCraft);
        })}
      >
        {busy ? "Generating…" : "New world"}
      </button>
      {lifecycle.error&&<p role="status" className="text-xs">{lifecycle.error}</p>}
      <span>
        {engine.game.state.skins?.slots["0"]?.name ?? "Village"} ·{" "}
        {engine.game.world.mapgen?.name ?? engine.game.world.options?.layout ?? "Classic island"} ·{" "}
        {Math.round(engine.game.world.size)} m across
      </span>
    </div>
  );
}
