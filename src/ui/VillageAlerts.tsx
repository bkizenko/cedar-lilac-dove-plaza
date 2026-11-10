import { useMemo } from 'react';
import type { Engine } from '../game/engine';
import { SURVIVAL_RULES } from '../game/survivalNeeds';
import { measureVillageWorkload } from '../game/villageWorkload';

export function VillageAlerts({ engine }: { engine: Engine }) {
  const game = engine.game;
  const refreshWindow = Math.floor(performance.now() / 2000);
  const workload = useMemo(
    () => measureVillageWorkload(game).workloadPercent,
    [game, game.state, game.world, refreshWindow],
  );
  let starving = 0, thirsty = 0, freezing = 0;
  for (const resident of game.state.units) {
    if (resident.team !== 0 || resident.hp <= 0) continue;
    if ((resident.hunger ?? 0) >= 60) starving++;
    if ((resident.thirstSeconds ?? 0) >= SURVIVAL_RULES.thirstGraceSeconds) thirsty++;
    if ((resident.coldSeconds ?? 0) >= SURVIVAL_RULES.coldGraceSeconds) freezing++;
  }
  const warnings = [
    starving > 0 && `${starving} starving`,
    thirsty > 0 && `${thirsty} dangerously thirsty`,
    freezing > 0 && `${freezing} freezing`,
    workload !== null && workload > 100 && `Overworked · ${Math.ceil(workload)}% of capacity`,
  ].filter(Boolean);
  return warnings.length > 0
    ? <div className="hud-toast village-alert" role="status">{warnings.join(' · ')}</div>
    : null;
}
