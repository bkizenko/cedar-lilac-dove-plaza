import type { Engine } from "../game/engine";
import { housingPlanIssue, housingStatus, housingQuoteText, HOUSING_RULES } from "../game/housing";
import { GameTooltip } from "./GameTooltip";
/** Selected-site commands only; rendering never mutates projects or inventory. */
export function HousingControls({ engine, buildingId }: { engine: Engine; buildingId: number }) {
  const g = engine.game,
    b = g.state.buildings.find((b) => b.id === buildingId);
  if (!b || b.team !== 0 || b.hp <= 0 || !["hut", "house"].includes(b.type)) return null;
  const p = b.renovation,
    issue = housingPlanIssue(g, b);
  if (p)
    return (
      <div className="space-y-1 text-xs">
        <strong>Timber home · {Math.floor((p.progress / p.duration) * 100)}%</strong>
        <p>{housingStatus(g, b)}</p>
        <button onClick={() => engine.pauseHome(b.id, !b.planPaused)}>
          {b.planPaused ? "Resume housing work" : "Pause housing work"}
        </button>
        <span className="text-parchment-dim">Original shelter stays open during its upgrade.</span>
      </div>
    );
  if (b.type === "hut")
    return (
      <GameTooltip
        title="Improve this home"
        description={`${housingQuoteText()}. One builder collects finite packets from the cache. Adds ${HOUSING_RULES.additionalPlaces} places and ${HOUSING_RULES.shelterWarmthCelsius}°C while sheltered after completion. Existing damage remains.`}
      >
        <button
          disabled={!!issue}
          title={issue || undefined}
          onClick={() => engine.upgradeHome(b.id)}
        >
          Improve home · {housingQuoteText()}
        </button>
      </GameTooltip>
    );
  if (!b.housingReceipt) return null;
  return (
    <GameTooltip
      title="Learn through actual use"
      description="An available adult must walk here and try the paid home for 30 seconds. Residents who learn this method can build timber homes. Ordinary needs continue."
    >
      <button onClick={() => engine.tryHome(b.id)}>Try home · learn its method</button>
    </GameTooltip>
  );
}
