import type {Game} from './sim';
import type {GameState,Unit} from './types';
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const claimWitnesses=(g:Game,team:number)=>g.state.units.filter(u=>u.team===team&&u.hp>0&&(!u.prisoner||u.prisoner.phase==='released'));
/** Last witnessed settlement sites, rather than all current halls of a known society. */
export type ObservedSettlement = {
  version: 1;
  observer: number;
  owner: number;
  siteId: number;
  x: number;
  z: number;
  observedAt: number;
  witnessId: number;
  active: boolean;
};
export const SETTLEMENT_OBSERVATION_RULES = {
  version: 1,
  witnessRadiusMeters: 26,
  maximumMemories: 1024,
  reviewSeconds: 2,
} as const;
const settlementReviews = new WeakMap<
  Game,
  { state: GameState; time: number }
>();
export function refreshSettlementSites(g: Game) {
  const prior = settlementReviews.get(g);
  if (
    prior &&
    prior.state === g.state &&
    g.state.time >= prior.time &&
    g.state.time - prior.time < SETTLEMENT_OBSERVATION_RULES.reviewSeconds
  )
    return;
  settlementReviews.set(g, { state: g.state, time: g.state.time });
  const halls = g.state.buildings.filter(
    (b) => b.team !== 3 && b.type === "townhall" && g.finished(b),
  );
  for (const team of g.state.tribes) {
    if (team.id === 3 || !team.alive) continue;
    const witnesses = claimWitnesses(g, team.id);
    if (!witnesses.length) continue;
    const visible = (x: number, z: number) =>
      witnesses.find(
        (u) =>
          distance(u, { x, z }) <=
          SETTLEMENT_OBSERVATION_RULES.witnessRadiusMeters,
      );
    for (const old of g.state.observedSettlements || []) {
      if (old.observer !== team.id) continue;
      const witness = visible(old.x, old.z);
      if (!witness) continue;
      if (
        !halls.some(
          (h) =>
            h.id === old.siteId &&
            h.team === old.owner &&
            h.x === old.x &&
            h.z === old.z,
        )
      ) {
        old.active = false;
        old.observedAt = g.state.time;
        old.witnessId = witness.id;
      }
    }
    for (const hall of halls) {
      if (hall.team === team.id) continue;
      const witness = visible(hall.x, hall.z);
      if (!witness) continue;
      const fact: ObservedSettlement = {
        version: 1,
        observer: team.id,
        owner: hall.team,
        siteId: hall.id,
        x: hall.x,
        z: hall.z,
        observedAt: g.state.time,
        witnessId: witness.id,
        active: true,
      };
      const memories = (g.state.observedSettlements ??= []),
        index = memories.findIndex(
          (m) => m.observer === team.id && m.siteId === hall.id,
        );
      if (index >= 0) memories[index] = fact;
      else {
        if (memories.length >= SETTLEMENT_OBSERVATION_RULES.maximumMemories) {
          let oldest = 0;
          for (let i = 1; i < memories.length; i++)
            if (
              Number(memories[i].active) < Number(memories[oldest].active) ||
              (memories[i].active === memories[oldest].active &&
                memories[i].observedAt < memories[oldest].observedAt)
            )
              oldest = i;
          memories.splice(oldest, 1);
        }
        memories.push(fact);
      }
      g.state.observedSettlements = memories;
    }
  }
}
export function validObservedSettlements(s: GameState) {
  for(const u of s.units){const m=u.settlementJourney;if(m===undefined)continue;
    if(!m||typeof m!=='object'||Array.isArray(m)||Object.keys(m).some(k=>!['version','owner','siteId','x','z','recordedAt'].includes(k))||m.version!==1||!Number.isSafeInteger(m.owner)||m.owner<0||m.owner===3||m.owner===u.team||m.owner>=s.tribes.length||m.siteId!==undefined&&(!Number.isSafeInteger(m.siteId)||m.siteId<1||m.siteId>=s.nextId)||![m.x,m.z].every(n=>Number.isFinite(n)&&Math.abs(n)<=(s.worldOptions?.size??1040)/2)||!Number.isFinite(m.recordedAt)||m.recordedAt<0||m.recordedAt>s.time)return false;
  }
  const value = s.observedSettlements;
  if (value === undefined) return true;
  if (
    !Array.isArray(value) ||
    value.length > SETTLEMENT_OBSERVATION_RULES.maximumMemories
  )
    return false;
  const half = (s.worldOptions?.size ?? 1040) / 2,
    seen = new Set<string>(),
    keys = [
      "version",
      "observer",
      "owner",
      "siteId",
      "x",
      "z",
      "observedAt",
      "witnessId",
      "active",
    ];
  const validTeam = (n: number) =>
    Number.isSafeInteger(n) && n >= 0 && n !== 3 && n < s.tribes.length;
  for (const m of value) {
    if (
      !m ||
      typeof m !== "object" ||
      Array.isArray(m) ||
      Object.keys(m).some((k) => !keys.includes(k)) ||
      m.version !== 1 ||
      !validTeam(m.observer) ||
      !validTeam(m.owner) ||
      m.observer === m.owner ||
      !Number.isSafeInteger(m.siteId) ||
      m.siteId < 1 ||
      m.siteId >= s.nextId ||
      !Number.isSafeInteger(m.witnessId) ||
      m.witnessId < 1 ||
      m.witnessId >= s.nextId ||
      m.witnessId === m.siteId ||
      ![m.x, m.z].every((n) => Number.isFinite(n) && Math.abs(n) <= half) ||
      !Number.isFinite(m.observedAt) ||
      m.observedAt < 0 ||
      m.observedAt > s.time ||
      typeof m.active !== "boolean"
    )
      return false;
    const key = `${m.observer}:${m.siteId}`;
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}
