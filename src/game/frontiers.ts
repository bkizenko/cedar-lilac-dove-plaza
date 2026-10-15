import type {Game} from './sim';
import type {Building,Unit} from './types';
import {soilQuality} from './ecology';
import {isDependent} from './settlement';
import {knownSettlement} from './barter';
import {rivalKnows} from './rivalDevelopment';

const armed=(u:Unit)=>u.hp>0&&(u.militia||!['worker','leader'].includes(u.type));
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
/** Each armed resident backs only the nearest completed frontier post. */
export function frontierStatus(g:Game,b:Building){
 const posts=g.state.buildings.filter(p=>p.team===b.team&&p.type==='cornerstone'&&g.finished(p));
 const halls=g.state.buildings.filter(p=>p.team===b.team&&p.type==='townhall'&&g.finished(p));
 const homeDistance=Math.min(...halls.map(h=>distance(h,b)),500);
 const foreign=g.state.buildings.filter(p=>p.team!==b.team&&p.team!==3&&p.type==='townhall'&&g.finished(p)&&
   (b.team===0?knownSettlement(g,p.team):rivalKnows(g,b.team,p.x,p.z)));
 const nearRival=Math.min(...foreign.map(h=>distance(h,b)),500);
 const needed=Math.min(8,1+Math.floor(Math.max(0,posts.length-1)/2)+Math.floor(homeDistance/180)+(nearRival<110?2:nearRival<180?1:0));
 const guards=g.state.units.filter(u=>u.team===b.team&&armed(u)&&!isDependent(g,u)&&!u.shelterId&&distance(u,b)<32&&
   !posts.some(p=>p!==b&&(distance(u,p)<distance(u,b)||(distance(u,p)===distance(u,b)&&p.id<b.id)))).length;
 const support=Math.min(1,guards/needed),strength=.25+.75*support;
 return {guards,needed,strength,radius:28+28*support,nearRival};
}
/** Only surveyed local land enters a player's appraisal; no remote stockpile inspection. */
export function frontierValue(g:Game,b:Building,observer=b.team){
 const known=(x:number,z:number)=>observer===0?g.exploredAt(x,z):rivalKnows(g,observer,x,z);
 const nearby=(n:{x:number;z:number;amount:number})=>n.amount>0&&distance(n,b)<45&&known(n.x,n.z);
 const timber=g.state.trees.filter(nearby).reduce((sum,n)=>sum+n.amount,0);
 const minerals=[...g.state.stones,...g.state.copper,...g.state.iron].filter(nearby).reduce((sum,n)=>sum+n.amount,0);
 const soil=soilQuality(g,b.x,b.z);
 const trail=g.state.trails?.some(t=>t.wear>.5&&t.x!==undefined&&t.z!==undefined&&distance({x:t.x,z:t.z},b)<25&&known(t.x,t.z))||false;
 const labels=[soil>.75?'fertile soil':null,timber>80?'woodland':null,minerals>40?'minerals':null,trail?'established path':null].filter(Boolean) as string[];
 return {timber,minerals,soil,trail,labels,value:Math.min(1,.15+Math.max(0,soil-.5)*.6+Math.min(.3,timber/1000)+Math.min(.25,minerals/500)+(trail?.2:0))};
}
export function frontierReport(g:Game,b:Building){
 const s=frontierStatus(g,b),v=frontierValue(g,b);
 return `${s.guards}/${s.needed} nearby armed guards · claim strength ${Math.round(s.strength*100)}% · reach ${Math.round(s.radius*1.45)} m · ${v.labels.join(', ')||'surveyed open land'}${s.nearRival<180?' · rival frontier: expansion may raise tensions':''}. Guards eat normal rations and leave civilian work.`;
}
export function guardFrontier(g:Game,id:number){
 const b=g.state.buildings.find(p=>p.id===id&&p.team===0&&p.type==='cornerstone'&&g.finished(p));if(!b)return 0;
 const s=frontierStatus(g,b);let sent=0;
 const choices=g.state.units.filter(u=>u.team===0&&armed(u)&&!isDependent(g,u)&&!u.emergency&&u.carry===0&&!u.expedition&&!u.envoy&&!u.visit&&!u.weaponWork&&!u.haulageWork&&!u.farmToolWork&&!u.scout&&!u.studyCrop&&u.drill==null&&['idle','hold','gather'].includes(u.order)&&distance(u,b)>=32)
   .filter(u=>!g.state.buildings.some(p=>p.team===0&&p.type==='cornerstone'&&g.finished(p)&&distance(u,p)<32))
   .sort((a,c)=>distance(a,b)-distance(c,b));
 for(const u of choices){
  if(sent>=s.needed-s.guards)break;
  const spot=g.interactionSpot(u,b);if(!spot)continue;
  g.interruptMission(u);u.node=null;u.target=null;u.jobLock=false;u.job=null;u.order='move';u.stationOnArrival=true;u.tx=spot.x;u.tz=spot.z;u.workReason='Walking to guard the frontier outpost';sent++;
 }
 g.banner(sent?`${sent} armed residents are walking to the outpost. Claim strength rises when they arrive.`:'No spare armed adults available. Equip residents at a crafting building, then send guards.',5);return sent;
}
const reviews=new WeakMap<Game,{buildings:Building[];time:number}>();
const warnings=new WeakMap<Game,Map<number,number>>();
/** Rivals object to claims they actually know, in land near their own homes. */
export function tickFrontiers(g:Game){
 const old=reviews.get(g);if(old&&old.buildings===g.state.buildings&&g.state.time>=old.time&&g.state.time-old.time<2)return;
 const dt=old&&old.buildings===g.state.buildings&&g.state.time>=old.time?Math.min(2,g.state.time-old.time):0;
 reviews.set(g,{buildings:g.state.buildings,time:g.state.time});if(!dt)return;
 const posts=g.state.buildings.filter(b=>b.team===0&&b.type==='cornerstone'&&g.finished(b));
 for(const t of g.state.tribes){
  if(t.id===0||t.id===3||!t.alive||t.ally||(t.compactUntil||0)>g.state.time)continue;
  const halls=g.state.buildings.filter(b=>b.team===t.id&&b.type==='townhall'&&g.finished(b));
  let grievance=0;
  for(const p of posts){
   if(!rivalKnows(g,t.id,p.x,p.z))continue;
   const d=Math.min(...halls.map(h=>distance(h,p)));if(d>=160)continue;
   const v=frontierValue(g,p,t.id);
   const need=(t.wood<80&&v.timber>80?.3:0)+(t.stone<32&&v.minerals>40?.25:0);
   grievance+=Math.max(0,1-d/160)*(.5+v.value+need+Math.max(0,t.expand)*.3)*(t.trust!==undefined?1-Math.min(.7,t.trust*.5):1);
  }
  if(!grievance)continue;
  const before=t.tension;t.tension=Math.min(1,t.tension+dt*Math.min(.24,grievance*.2));
  t.trust=Math.max(0,(t.trust||0)-dt*Math.min(.006,grievance*.003));
  let warned=warnings.get(g);if(!warned){warned=new Map();warnings.set(g,warned);}
  const last=warned.get(t.id)??-Infinity;
  if(before<.28&&t.tension>=.28&&(g.state.time-last>120||g.state.time<last)){g.banner(`${t.name} disputes your frontier claim. Withdraw the outpost, negotiate or prepare to defend it.`,6);warned.set(t.id,g.state.time);}
 }
}
