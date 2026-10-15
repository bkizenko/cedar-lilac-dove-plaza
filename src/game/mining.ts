import {carryingCapacity} from "./haulage";
import type {Game} from './sim';
import type {Building,Unit} from './types';
import {isDependent} from "./settlement";
import {GATHER,QUARRY_R} from './constants';
/** A mountain quarry is a finite excavation, distinct from loose surface outcrops. */
export function mountainDeposit(g:Game,b:Building){
  if(b.type!=='quarry'||g.height(b.x,b.z)<10)return null;
  if(!b.excavation){
    const hash=Math.abs(Math.imul(Math.round(b.x)*73856093,Math.round(b.z)*19349663)^g.state.seed)>>>0;
    b.excavation={remaining:320+hash%881,dug:0,quality:.65+(hash%100)/100};
  }
  return b.excavation;
}
/** Excavation reveals finite, site-seeded veins; no remote inventory reward. */
export function prospectQuarry(g:Game,b:Building){
  const d=mountainDeposit(g,b);if(!d)return;
  const hash=(Math.imul(Math.round(b.x)*73856093,Math.round(b.z)*19349663)^g.state.seed)>>>0;
  for(const [kind,depth,bit,chance] of [['copper',80,1,65],['iron',200,2,45]] as const){
    if(d.dug<depth||((d.prospected||0)&bit))continue;
    const roll=((hash^(kind==='iron'?0x9e3779b9:0x85ebca6b))>>>0)%100;
    if(roll>=chance){d.prospected=(d.prospected||0)|bit;continue;}
    const list=g.state[kind];
    // Rebuilding on an exhausted vein does not replenish it.
    if(list.some(n=>Math.hypot(n.x-b.x,n.z-b.z)<12)){d.prospected=(d.prospected||0)|bit;continue;}
    let spot:{x:number;z:number}|undefined;
    for(let i=0;i<16;i++){
      const a=i*Math.PI/8,x=b.x+Math.cos(a)*8,z=b.z+Math.sin(a)*8;
      if(g.walkable(x,z)&&g.workBoard.connected(g,b.x,b.z,x,z)&&!g.state.buildings.some(p=>p.hp>0&&!p.plannedCost&&Math.abs(x-p.x)<p.w*.5+1&&Math.abs(z-p.z)<p.d*.5+1)){spot={x,z};break;}
    }
    if(!spot)continue;
    const amount=40+hash%81;
    list.push({id:g.id(),kind,x:spot.x,z:spot.z,y:g.height(spot.x,spot.z),amount,maxAmt:amount,regenT:0,rich:d.quality,scale:1});
    d.prospected=(d.prospected||0)|bit;g.workBoard.reset();
    if(b.team===0)g.banner(`Excavation exposed a ${kind} vein. Select the quarry to assign miners.`,5);
  }
}
export function quarryAvailable(g:Game,b:Building){return (mountainDeposit(g,b)?.remaining||0)>0;}
export function quarryReport(g:Game,b:Building){
  const d=mountainDeposit(g,b);const active=g.state.units.filter(u=>u.team===b.team&&u.hp>0&&u.job==='stone'&&u.order==='gather'&&u.node&&Math.hypot(u.node.x-b.x,u.node.z-b.z)<=QUARRY_R).length;
  const loose=g.state.stones.filter(n=>n.amount>0&&Math.hypot(n.x-b.x,n.z-b.z)<=QUARRY_R).reduce((sum,n)=>sum+n.amount,0);
  const veins=(['copper','iron'] as const).map(k=>{const n=g.state[k].filter(n=>Math.hypot(n.x-b.x,n.z-b.z)<=QUARRY_R&&g.exploredAt(n.x,n.z)).reduce((sum,n)=>sum+n.amount,0);return n>0?`${Math.floor(n)} ${k} exposed`:null;}).filter(Boolean).join(' · ');
  return d?`Mountain seam: ${Math.floor(d.remaining)} stone · ${active}/2 miners · ${(d.dug/40).toFixed(1)} m dug · ${veins||((d.prospected||0)===3?"Prospecting complete — seek other slopes for more ore":"Keep excavating to prospect deeper rock")} · carried to stores`:`Surface outcrops: ${Math.floor(loose)} stone nearby · ${active} miners · assign miners to collect and carry it home`;
}
export function digStone(g:Game,u:Unit,b:Building){
  const d=mountainDeposit(g,b);
  if(!d||d.remaining<=0){u.node=null;u.order=u.carry>0?'return':'idle';u.workReason='This stone seam is exhausted — prospect another slope';g.workBoard.reset();return;}
  const count=Math.min(d.remaining,d.quality>1.2?2:1);d.remaining-=count;d.dug+=count;prospectQuarry(g,b);
  u.carry+=count;u.carryType='stone';u.workReason=`Excavating the mountainside · ${(d.dug/40).toFixed(1)} m into the seam`;
  if(u.carry>=carryingCapacity(u,"stone")||d.remaining<=0)u.order='return';
  if(u.team===0)g.onSfx('chop');
}

export function staffQuarry(g:Game,id:number,kind:"stone"|"copper"|"iron"="stone"){
  const b=g.state.buildings.find(b=>b.id===id&&b.team===0&&b.type==='quarry'&&g.finished(b));if(!b)return 0;
  if(kind!=='stone'&&g.tribe(0).age<(kind==='copper'?1:2)){g.banner(`The ${kind==='copper'?'Bronze':'Iron'} Age unlocks ${kind} extraction. The exposed vein remains available.`,4);return 0;}
  let staffed=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.order==='gather'&&u.job===kind&&u.node&&Math.hypot(u.node.x-b.x,u.node.z-b.z)<=QUARRY_R).length,sent=0;
  const selected=g.selectedUnits(),pool=(selected.length?selected:g.state.units).filter(u=>u.team===0&&u.type==='worker'&&u.hp>0&&!isDependent(g,u)&&u.carry===0&&
    (selected.length||!u.emergency&&!u.scout&&!u.visit&&!u.expedition&&!u.envoy&&!u.foundingJourney&&!u.weaponWork&&!u.haulageWork&&!u.farmToolWork&&!u.studyCrop&&u.drill==null&&['idle','gather','hold'].includes(u.order)));
  for(const u of pool){
    if(staffed>=2)break;
    if(u.job===kind&&u.order==='gather'&&u.node&&Math.hypot(u.node.x-b.x,u.node.z-b.z)<=QUARRY_R)continue;
    const node=kind==='stone'&&quarryAvailable(g,b)?b:(kind==='stone'?g.state.stones:g.state[kind]).filter(n=>n.amount>0&&Math.hypot(n.x-b.x,n.z-b.z)<=QUARRY_R&&g.exploredAt(n.x,n.z)&&g.workBoard.connected(g,u.x,u.z,n.x,n.z)).sort((a,c)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(c.x-u.x,c.z-u.z))[0];
    if(!node||!g.workBoard.connected(g,u.x,u.z,node.x,node.z))continue;
    g.interruptMission(u);u.order='gather';u.job=kind;u.jobLock=true;u.huntOnly=false;u.node=node;u.gatherT=0;u.workReason=`Mining ${kind} for delivery to stores`;staffed++;sent++;
  }
  g.workBoard.reset();g.banner(staffed?`${staffed}/2 miners assigned — ${kind} reaches stores after hauling.`:`No reachable ${kind} or available empty-handed adults. Excavate mountain stone to expose possible metal veins.`,5);return sent;
}
