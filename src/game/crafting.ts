import type { Game } from "./sim";
import type { Building, Unit } from "./types";
export function craftingBenches(b: Building) {
  return b.type === "workshop"
    ? 3
    : b.type === "forge" || b.type === "barracks"
      ? 2
      : b.type === "hearth" || b.type === "townhall" || b.type === "dock"
        ? 1
        : 0;
}
export function craftingQueue(g: Game, b: Building) {
  return g.state.units.filter(u=>{
    const ram=u.siegeRamId?g.state.siegeRams?.assets.find(a=>a.id===u.siegeRamId&&a.makerId===u.id&&a.progress<150&&a.phase!=='paused'&&a.phase!=='broken'):undefined;
    return u.hp>0&&u.team===b.team&&(u.order==='hold'||!!ram)&&[ram?{workplace:ram.workplaceId,paused:false}:undefined,u.weaponWork,u.haulageWork,u.farmToolWork,u.copperStudy,u.practicalHelper?{workplace:u.practicalHelper.workplace,paused:u.practicalHelper.phase==='paused'}:undefined].some(j=>j&&!j.paused&&j.workplace===b.id);
  }).sort((a,b)=>a.id-b.id);
}
export function craftBenchReady(g: Game, u: Unit, b: Building) {
  const index = craftingQueue(g, b).indexOf(u);
  if (index >= 0 && index < craftingBenches(b)) return true;
  u.workReason = "Crafting queued — waiting for a free bench";
  return false;
}
/** Practice accrues only during hands-on crafting, never while travelling or queued. */
export const CRAFTING_WORKPLACE_RATES={townhall:1,workshop:1.25,forge:1,barracks:1,dock:1} as const;
export function craftingWorkplaceRate(b?:Building){return b?.type==='workshop'?CRAFTING_WORKPLACE_RATES.workshop:1;}
export function craftingEffort(u: Unit, dt: number,b?:Building) {
  const seconds = Math.max(0, dt),
    rate = 1 + Math.min(0.3, (u.craftingXP || 0) / 1200);
  u.craftingXP = Math.min(36000, (u.craftingXP || 0) + seconds);
  return seconds * rate * craftingWorkplaceRate(b);
}
export type ToolmakingPractice={workSeconds:number;completedTools:number;completedRepairs:number};
export const TOOLMAKING_PRACTICE_RULES={secondsForMaximumBonus:1200,maximumBonus:.2,maximumWorkSeconds:36000,maximumCompletions:1000000} as const;
/** Personal specialization is earned at the bench, not inherited from general XP.
 * A completed owned output is required before hands-on practice grants speed. */
export function toolmakingPracticeRate(u:Unit){const p=u.craftingPractice?.toolmaking;return p&&(p.completedTools+p.completedRepairs)>0?1+TOOLMAKING_PRACTICE_RULES.maximumBonus*Math.min(1,p.workSeconds/TOOLMAKING_PRACTICE_RULES.secondsForMaximumBonus):1;}
export function toolmakingEffort(u:Unit,dt:number,b:Building,remaining:number,strength:number){
 if(!Number.isFinite(dt)||dt<=0||!Number.isFinite(remaining)||remaining<=0||!Number.isFinite(strength)||strength<=0)return 0;
 const specialization=toolmakingPracticeRate(u),rate=(1+Math.min(.3,(u.craftingXP||0)/1200))*craftingWorkplaceRate(b)*specialization*strength;
 const seconds=Math.min(dt,remaining/rate),work=craftingEffort(u,seconds,b)*specialization*strength;
 const p=(u.craftingPractice??={}).toolmaking??={workSeconds:0,completedTools:0,completedRepairs:0};
 p.workSeconds=Math.min(TOOLMAKING_PRACTICE_RULES.maximumWorkSeconds,p.workSeconds+seconds);
 return work;
}
/** Called only after the actual paid project assigns its owned tool output. */
export function recordToolmakingCompletion(u:Unit,repair:boolean){
 const p=u.craftingPractice?.toolmaking;if(!p)return;
 const key=repair?'completedRepairs':'completedTools';p[key]=Math.min(TOOLMAKING_PRACTICE_RULES.maximumCompletions,p[key]+1);
}
export function validCraftingPractice(value:unknown){
 if(value===undefined)return true;
 const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
 if(!obj(value)||Object.keys(value).some(k=>k!=='toolmaking'))return false;
 const p=value.toolmaking;if(p===undefined)return true;
 return obj(p)&&Object.keys(p).every(k=>['workSeconds','completedTools','completedRepairs'].includes(k))&&typeof p.workSeconds==='number'&&Number.isFinite(p.workSeconds)&&p.workSeconds>=0&&p.workSeconds<=TOOLMAKING_PRACTICE_RULES.maximumWorkSeconds&&['completedTools','completedRepairs'].every(k=>Number.isSafeInteger(p[k])&&Number(p[k])>=0&&Number(p[k])<=TOOLMAKING_PRACTICE_RULES.maximumCompletions);
}
export function craftingReport(g: Game, id: number) {
  const b = g.state.buildings.find((b) => b.id === id);
  if (!b) return "";
  const count = craftingQueue(g, b).length,
    benches = craftingBenches(b);
  return benches
    ? `${Math.min(count, benches)}/${benches} crafting benches reserved${count > benches ? ` · ${count - benches} waiting` : ""}. ${b.type==='workshop'?'Crafting shelter: 25% faster hands-on work than the hall; three shared benches.':'A crafting shelter offers three shared benches and 25% faster hands-on work.'}`
    : "";
}

/** New village priorities release waiting hands without erasing their paid projects. */
export function pauseQueuedCrafting(g:Game,team=0){
 for(const b of g.state.buildings){
  if(b.team!==team)continue;
  const waiting=craftingQueue(g,b).slice(craftingBenches(b));
  for(const u of waiting)for(const job of [u.weaponWork,u.haulageWork,u.farmToolWork,u.copperStudy])if(job)job.paused=true;
 }
}
