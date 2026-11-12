import type {Game} from './sim';
import {COPPER_METALLURGY_RULES as R} from './copperMetallurgy';
/** Current physical inventory plus already paid work, never projected income.
 * Paid smelt inputs are represented by its output once, not also by raw ore. */
export function copperIndustrySupply(g:Game,team:number){
 const t=g.tribe(team),people=g.state.units.filter(u=>u.team===team&&u.hp>0);
 const oreAtCache=t.items?.copperOre||0,oreInTransit=people.reduce((n,u)=>n+(u.itemCargo?.copperOre||0),0),legacyMetalInTransit=people.reduce((n,u)=>n+(u.carryType==='copper'?u.carry:0),0);
 const smelts=(g.state.production?.projects||[]).filter(p=>p.team===team&&p.recipe==='smeltCopper'&&!['complete','lost'].includes(p.phase));
 const paidMetal=smelts.length*R.metalPerBatch,ore=oreAtCache+oreInTransit;
 return{oreAtCache,oreInTransit,legacyMetalInTransit,paidMetal,ore,usable:t.copper,effectiveMetal:t.copper+legacyMetalInTransit+paidMetal+Math.floor(ore/R.orePerBatch)*R.metalPerBatch};
}
