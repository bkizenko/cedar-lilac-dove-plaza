import type { Engine } from "../game/engine";
import {
  BUILDING_MAINTENANCE,
  buildingRepairIssue,
  queueBuildingRepair,
  repairQuote,
  pauseBuildingRepair,
  setBuildingRepairPriority,
} from "../game/buildingMaintenance";
export function BuildingMaintenanceControls({
  engine,
  buildingId,
}: {
  engine: Engine;
  buildingId: number;
}) {
  const g = engine.game,
    b = g.state.buildings.find((b) => b.id === buildingId);
  if (!b || !g.finished(b) || ["farm", "trench", "bridge"].includes(b.type)) return null;
  const p = b.repair,
    q = repairQuote(b),
    issue = buildingRepairIssue(g, b.id),
    warning = (b.maintenance?.condition ?? 1) < BUILDING_MAINTENANCE.warningCondition;
  return (
    <details className="text-xs">
      <summary>
        {p
          ? `Repair ${Math.floor((p.progress / p.duration) * 100)}%${p.phase === "paused" ? " · paused" : ""}`
          : warning
            ? "Maintenance needed"
            : "Maintenance"}
      </summary>
      <p>
        {b.maintenance
          ? `Upkeep ${Math.round(b.maintenance.condition * 100)}% · ${b.maintenance.graceRemaining > 0 ? "new-building grace" : `${Number((b.maintenance.lastRate * 360000).toFixed(2))}% wear / simulated hour`}`
          : g.state.buildingMaintenanceVersion === 1
            ? "New building · maintenance grace"
            : "Passive wear off for this older village."}
      </p>
      {p ? (
        <>
          <label>
            Build priority{" "}
            <select
              aria-label="Repair build priority"
              value={b.constructionPriority ?? 1}
              onChange={(e) => {
                setBuildingRepairPriority(g, b, Number(e.target.value) as 0 | 1 | 2);
                engine.pushHud();
              }}
            >
              <option value={0}>Low</option>
              <option value={1}>Normal</option>
              <option value={2}>High</option>
            </select>
          </label>
          <p>
            {p.blockedReason ||
              `${p.phase} · paid materials ${p.parcel.kind === "carrier" ? "carried by builder" : p.parcel.kind === "site" ? "at site" : p.parcel.kind === "ground" ? "at the dropped packet" : "at cache"}`}
          </p>
          <p>
            {Object.values(p.uncollected).reduce((n, v) => n + (v || 0), 0)} at cache ·{" "}
            {Object.values(p.packet).reduce((n, v) => n + (v || 0), 0)} in packet ·{" "}
            {Object.values(p.delivered).reduce((n, v) => n + (v || 0), 0)} delivered
          </p>
          {p.actorId === null ? (
            <button
              onClick={() => {
                const r = queueBuildingRepair(g, b.id);
                if (!r.accepted) g.banner(r.reason, 4);
                engine.pushHud();
              }}
            >
              Resume paid repair
            </button>
          ) : (
            <button
              onClick={() => {
                const u = g.state.units.find((u) => u.id === p.actorId);
                if (u) pauseBuildingRepair(g, u);
                engine.pushHud();
              }}
            >
              Pause repair
            </button>
          )}
        </>
      ) : (
        <button
          disabled={!!issue}
          title={issue || undefined}
          onClick={() => {
            const r = queueBuildingRepair(g, b.id);
            if (!r.accepted) g.banner(r.reason, 4);
            engine.pushHud();
          }}
        >
          Repair
          {q
            ? ` · ${Object.entries(q.materials)
                .map(([k, n]) => `${n} ${k}`)
                .join(" · ")}`
            : ""}
        </button>
      )}
    </details>
  );
}
