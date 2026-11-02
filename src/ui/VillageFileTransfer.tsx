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
  const ready = !!engine && !engine.disposed,
    disabled = !ready || busy;
  return (
    <details aria-busy={busy}>
      <summary className="px-2 py-2 cursor-pointer">Transfer village file</summary>
      <button
        type="button"
        disabled={disabled}
        className="px-2 py-2 disabled:opacity-50"
        onClick={() => engine?.exportVillage()}
      >
        Export file
      </button>
      <label className={`px-2 py-2 ${disabled ? "opacity-50" : ""}`}>
        {busy ? "Importing…" : "Import file"}
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
          {!ready ? "Preparing file transfer…" : busy ? "Importing village…" : result?.message}
        </p>
      )}
    </details>
  );
}
