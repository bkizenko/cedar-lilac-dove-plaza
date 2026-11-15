import type {Game} from './sim';
/** Clay containers as distinct items. An amphora (liquids) and a storage jar (grain) are made from fired pottery at a potter or kiln;
 * the vessel's clay is the pottery spent, nothing else is created. Owned amphorae raise the liquid store and the carry of liquid trade
 * goods; storage jars raise the grain/flour store and carry of grain. Containers are never consumed by holding, only by being used as
 * the vessel of a pressing batch (amphora) or lost with the cargo they are packed into. */
export const CONTAINER_RULES={version:1,potteryPerAmphora:2,potteryPerJar:1,baseLiquidJars:24,jarsPerAmphora:8,baseGrainUnits:60,grainPerStorageJar:12,carryBonusPerContainer:.1,maximumCarryBonus:.5,maximumBatch:6,maximumHeld:40} as const;
export type ContainerKind='amphora'|'storageJar';
const R=CONTAINER_RULES;
const held=(g:Game,team:number,k:string)=>Math.floor(g.tribe(team)?.items?.[k as 'amphora']||0);
export function containerIssue(g:Game,team:number):string|null{
 const t=g.tribe(team);if(!t)return 'No such society';
 if(held(g,team,'amphora')<1&&held(g,team,'pottery')<1&&(t.wood||0)<3)return 'Need an amphora, a pottery vessel or timber for a cask';
 return null;
}
export function craftIssue(g:Game,team:number,kind:ContainerKind):string|null{
 const t=g.tribe(team);if(!t)return 'No such society';
 if(!g.state.buildings.some(b=>b.team===team&&(b.type==='potter'||b.type==='kiln')&&b.hp>0&&g.finished(b)))return 'Finish a pottery shelter or kiln';
 const need=kind==='amphora'?R.potteryPerAmphora:R.potteryPerJar;if(held(g,team,'pottery')<need)return `Need ${need} fired pottery vessels`;
 if(held(g,team,kind)>=R.maximumHeld)return 'No room to keep more of these';return null;
}
/** Craft containers from real fired pottery. Pottery origin lots (style provenance) are reduced alongside. */
export function craftContainer(g:Game,team:number,kind:ContainerKind,count=1):{accepted:boolean;reason:string}{
 if(kind!=='amphora'&&kind!=='storageJar'||!Number.isSafeInteger(count)||count<1||count>R.maximumBatch)return{accepted:false,reason:'Choose an amphora or storage jar and 1-6'};
 const t=g.tribe(team);let made=0;
 for(;made<count;made++){const issue=craftIssue(g,team,kind);if(issue){if(!made)return{accepted:false,reason:issue};break;}
  const need=kind==='amphora'?R.potteryPerAmphora:R.potteryPerJar,items=t.items??={};items.pottery=(items.pottery||0)-need;
  let left=need;for(const lot of t.potteryOrigins||[]){const take=Math.min(left,lot.count);lot.count-=take;left-=take;if(!left)break;}
  items[kind]=(items[kind]||0)+1;}
 const name=kind==='amphora'?(made===1?'amphora':'amphorae'):(made===1?'storage jar':'storage jars');
 return{accepted:true,reason:`${made} ${name} made from fired pottery`};
}
export const liquidStoreCapacity=(g:Game,team:number)=>R.baseLiquidJars+R.jarsPerAmphora*held(g,team,'amphora');
export const grainStoreCapacity=(g:Game,team:number)=>R.baseGrainUnits+R.grainPerStorageJar*held(g,team,'storageJar');
export const liquidStock=(g:Game,team:number)=>held(g,team,'oliveOil')+held(g,team,'wine');
export function liquidCapacityIssue(g:Game,team:number,adding:number):string|null{
 return liquidStock(g,team)+adding>liquidStoreCapacity(g,team)?`Jar store full (${liquidStoreCapacity(g,team)}); make amphorae to hold more`:null;
}
/** Carry multiplier from owned vessels: +10% per container, at most +50%, only for the goods the vessel suits. */
export function containerCarryBonus(g:Game,team:number,good:string):number{
 const k=good==='oliveOil'||good==='wine'?'amphora':good==='roughGrain'||good==='flour'?'storageJar':null;if(!k)return 1;
 return 1+Math.min(R.maximumCarryBonus,R.carryBonusPerContainer*held(g,team,k));
}
/** Spend one vessel for a pressing batch: amphora first, then pottery (with origin lot), then a timber cask. */
export function takeLiquidVessel(g:Game,team:number):boolean{
 const t=g.tribe(team);if(!t)return false;const items=t.items??={};
 if((items.amphora||0)>=1){items.amphora!--;return true;}
 if((items.pottery||0)>=1){items.pottery!--;const lot=t.potteryOrigins?.find(o=>o.count>0);if(lot)lot.count--;return true;}
 if((t.wood||0)>=3){t.wood-=3;return true;}return false;
}
