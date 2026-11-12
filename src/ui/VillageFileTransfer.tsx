import {parseStoredSave} from "../game/storageCodec";
import { useEffect, useRef, useState } from "react";
import type { Engine, VillageImportResult } from "../game/engine";

/** File transfer stays visible until its actual asynchronous outcome is known. */
export function VillageFileTransfer({ engine }: { engine: Engine | null }) {
  const [busy, setBusy] = useState(false),
    [result, setResult] = useState<VillageImportResult | null>(null),
    pending = useRef(false),
    generation = useRef(0);
  useEffect(() => {
    pending.current = false;
    generation.current++;
    setBusy(false);
    setResult(null);
    return () => {
      generation.current++;
    };
  }, [engine]);
  const ready = !!engine && !engine.disposed && engine.commandReady,
    disabled = !ready || busy;
  return (
    <details aria-busy={busy}>
      <summary className="px-2 py-2 cursor-pointer">Transfer village file</summary>
      <button
        type="button"
        disabled={disabled}
        className="px-2 py-2 disabled:opacity-50"
        onClick={async () => {
          if(!engine||engine.disposed||pending.current)return;
          const request=++generation.current,epoch=engine.sessionEpoch;
          const current=()=>generation.current===request&&!engine.disposed&&engine.sessionEpoch===epoch;
          pending.current=true;setBusy(true);setResult(null);
          try{
            const outcome=await engine.exportVillage();
            if(!current())return;
            if(outcome.serialized){
              const raw=parseStoredSave(outcome.serialized) as {state:{seed:number;time:number}};
              const url=URL.createObjectURL(new Blob([JSON.stringify(raw)],{type:"application/json"}));
              try{const a=document.createElement('a');a.href=url;a.download=`hearthwild-village-${raw.state.seed}-${Math.floor(raw.state.time)}.json`;a.click();}
              finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}
            }
            setResult({applied:false,saved:outcome.saved,message:outcome.message});
          }catch(error){if(current())setResult({applied:false,saved:false,message:error instanceof Error?error.message:'Could not export village.'});}
          finally{if(generation.current===request){pending.current=false;setBusy(false);}}
        }}
      >
        Export file
      </button>
      <label className={`px-2 py-2 ${disabled ? "opacity-50" : ""}`}>
        {busy ? "Please wait…" : "Import file"}
        <input
          className="sr-only"
          aria-label="Import village file"
          type="file"
          accept=".json,application/json"
          disabled={disabled}
          onChange={async (e) => {
            const input = e.currentTarget,
              file = input.files?.[0];
            if (!file || pending.current || !engine || engine.disposed) return;
            const request = ++generation.current;
            pending.current = true;
            setBusy(true);
            setResult(null);
            try {
              const outcome = await engine.importVillage(file);
              if (generation.current === request) setResult(outcome);
            } catch (error) {
              if (generation.current === request)
                setResult({
                  applied: false,
                  saved: false,
                  message: error instanceof Error ? error.message : "Could not import village.",
                });
            } finally {
              input.value = "";
              if (generation.current === request) {
                pending.current = false;
                setBusy(false);
              }
            }
          }}
        />
      </label>
      {(!ready || busy || result) && (
        <p role="status" aria-live="polite" className="px-2 pb-2 text-xs">
          {!ready ? "Preparing file transfer…" : busy ? "Preparing village file…" : result?.message}
        </p>
      )}
    </details>
  );
}
