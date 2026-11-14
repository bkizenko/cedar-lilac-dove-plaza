/** Tribute lapse (AUD-SOC-TRIBUTE-LAPSE). A tributary whose installments pile up unpaid (its stores run short, its carrier is killed or cut off, its ruler is gone)
 * does not simply owe forever. Each year at least two installments stand unpaid: the tributary's house nurses a grudge against its patron (the same saved grudge list,
 * cause 'claim'), the patron's house notes the default as its own grudge, and the debt stays on the books. At three unpaid installments with the tributary's grudge
 * past the bar the house throws the burden off: the tribute ends (peaceTerm falls to whitePeace; nothing is paid or forgiven into goods, no envoy teleports) and the
 * chronicle says so. Read-only over peace.ts tribute state: no new saved field, nothing minted. Yearly and behind rulersVersion; old saves have no lapse and run as before. */
import type {Game} from './sim';
import {rulersEnabled,ensureRulers,addGrudge,grudgeOf} from './rulersRuntime';
import {lifeEvent} from './communities';

export const LAPSE_RULES={warnInstallments:2,breakInstallments:3,resent:.15,patronNote:.1,breakGrudge:.3};
/** Unpaid installments standing against a tributary (owed counts cargo in transit, so only a genuinely stalled payment shows). */
export const unpaidInstallments=(g:Game,team:number):number=>{const c=g.tribe(team)?.tribute;return c&&c.amount>0?Math.floor(c.owed/c.amount+1e-9):0;};
export function tributeLapse(g:Game):number[]{
 if(!rulersEnabled(g)||!ensureRulers(g))return [];
 const broke:number[]=[];
 for(const t of g.state.tribes){
  if(t.id===0||t.id===3||!t.alive||!t.tribute||t.hostile)continue;
  const n=unpaidInstallments(g,t.id);if(n<LAPSE_RULES.warnInstallments)continue;
  if(g.state.units.some(u=>u.team===t.id&&u.hp>0&&u.tributeJourney))continue; // a carrier is on the road: late, not lapsed
  addGrudge(g,t.id,0,LAPSE_RULES.resent,'claim');
  if(grudgeOf(g,0,t.id)<.5)addGrudge(g,0,t.id,LAPSE_RULES.patronNote,'claim');
  if(n>=LAPSE_RULES.breakInstallments&&grudgeOf(g,t.id,0)>=LAPSE_RULES.breakGrudge){
   const puppet=t.peaceTerm==='puppet';
   t.tribute=undefined;t.peaceTerm='whitePeace';broke.push(t.id);
   lifeEvent(g,0,`${t.name} has stopped paying and throws off the ${puppet?'yoke':'tribute'}; ${n} unpaid installments stay on the record against them`);
  }else lifeEvent(g,0,`${t.name} is ${n} installments behind on its tribute and mutters against your house`);
 }
 return broke;
}
