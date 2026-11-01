import type {Game} from './sim';
import type {ResKind,Building} from './types';
import {AGE_COST,BUILDINGS} from './constants';
import {riverboatWaterPoint,riverboatDestination,BOAT_COST} from './boats';
export const COASTAL_BOOTSTRAP_RULES={minimumWorkingAdults:5,retainedWorkers:4,homeMealSeconds:600,maximumHarborDistanceMetres:320,maximumBankRiseMetres:1.8,maximumDocks:2,shoreSampleStepMetres:8,minimumWorkingWoodAfterCanoe:16,maximumDiagnosticReasons:32,recentPartnerSeconds:900,repeatPartnerPenaltyMetres:200} as const;
type Review={reviews:number;blocked:number;lastStage:string;lastReason:string;stages:Record<string,number>;reasons:Record<string,number>};
const reviews=new WeakMap<Game,{state:Game['state'];teams:Map<number,Review>}>();
export function recordCoastalReview(g:Game,team:number,stage:string,reason=''){
 let context=reviews.get(g);if(!context||context.state!==g.state){context={state:g.state,teams:new Map()};reviews.set(g,context);}const row=context.teams.get(team)??{reviews:0,blocked:0,lastStage:'',lastReason:'',stages:{},reasons:{}};row.reviews++;row.stages[stage]=(row.stages[stage]||0)+1;row.lastStage=stage;row.lastReason=reason;if(reason){row.blocked++;if(row.reasons[reason]!==undefined||Object.keys(row.reasons).length<COASTAL_BOOTSTRAP_RULES.maximumDiagnosticReasons)row.reasons[reason]=(row.reasons[reason]||0)+1;}context.teams.set(team,row);
}
/** Runtime review counts are explicitly reset on load; saved commissions and
 * voyages retain their own actual paid-progress/cargo accounting. */
export function coastalStrategyDiagnostics(g:Game){const c=reviews.get(g);return{scope:'current loaded simulation',teams:c?.state===g.state?[...c.teams].map(([team,row])=>({team,...row,stages:{...row.stages},reasons:{...row.reasons}})):[]};}
/** An observed, recorded investment must create ordinary material work instead
 * of repeatedly saying 'collect more' after the age stock target was reached. */
export function coastalMaterialTarget(g:Game,team:number,kind:ResKind){
 if(kind!=='wood'&&kind!=='stone')return 0;const c=g.state.coastalCommissions?.find(c=>c.team===team&&c.phase!=='paused');if(!c)return 0;
 const reserve=Math.max(kind==='wood'?48:24,AGE_COST[g.tribe(team).age+1]?.[kind]||0),dock=c.dockId===undefined,hull=c.projectId===undefined&&c.boatId===undefined;
 return reserve+(kind==='wood'?(dock?BUILDINGS.dock.wood||0:0)+(hull?BOAT_COST.wood:0)+12:hull?BOAT_COST.stone:0);
}
/** Examine only locally observed ground. No foreign stock, hidden hall or
 * unknown resource location participates in candidate choice. */
export function knownCoastalLaunchSites(g:Game,team:number,knows:(x:number,z:number)=>boolean,observedForeignDock?:{x:number;z:number;alternatives?:{x:number;z:number}[]}){
 const rules=COASTAL_BOOTSTRAP_RULES,home=g.campOf(team),residents=g.state.units.filter(u=>u.team===team&&u.hp>0&&u.type==='worker'),seen=new Set<string>(),sites:{x:number;z:number;launch:{x:number;z:number};score:number}[]=[];
 const consider=(x:number,z:number)=>{const key=`${Math.round(x)},${Math.round(z)}`;if(seen.has(key)||Math.hypot(x-home.x,z-home.z)>rules.maximumHarborDistanceMetres)return;seen.add(key);if(!knows(x,z))return;const h=g.height(x,z),water=g.waterAt(x,z);if(h<water+.3||h>water+rules.maximumBankRiseMetres||!g.walkable(x,z)||!residents.some(u=>g.workBoard.connected(g,u.x,u.z,x,z))||!g.placementValid('dock',x,z,team))return;const launch=riverboatWaterPoint(g,x,z);if(!launch)return;if(observedForeignDock&&!(observedForeignDock.alternatives||[observedForeignDock]).some(p=>{const point=riverboatDestination(g,launch,p.x,p.z);return!!point&&Math.hypot(point.x-p.x,point.z-p.z)<=8;}))return;const fish=g.state.fish.filter(n=>n.amount>0&&knows(n.x,n.z)&&Math.hypot(n.x-x,n.z-z)<24).length;sites.push({x,z,launch,score:Math.hypot(x-home.x,z-home.z)-Math.min(3,fish)*8});};
 for(const p of g.world.dockSites||[])consider(p.x,p.z);
 for(let radius=14;radius<=rules.maximumHarborDistanceMetres;radius+=rules.shoreSampleStepMetres)for(let i=0;i<48;i++){const a=i*Math.PI/24;consider(home.x+Math.cos(a)*radius,home.z+Math.sin(a)*radius);}
 return sites.sort((a,b)=>a.score-b.score);
}
/** A small beachable boat needs a surveyed landing, not a foreign port which
 * can itself be waiting for first contact. Every point must already be known. */
export function observedCoastalLandings(g:Game,team:number,hall:Building){
 const residents=g.state.units.filter(u=>u.team===team&&u.hp>0),sites=g.state.buildings.filter(b=>b.team===team&&['townhall','cornerstone','lumber','quarry'].includes(b.type)&&g.finished(b)),cells=new Set(g.state.rivalKnowledge?.find(m=>m.team===team)?.cells||[]),half=g.world.size/2;
 const knows=(x:number,z:number)=>{if(residents.some(u=>Math.hypot(u.x-x,u.z-z)<26)||sites.some(b=>Math.hypot(b.x-x,b.z-z)<55))return true;const cx=Math.floor((x+half)/g.world.size*32),cz=Math.floor((z+half)/g.world.size*32);return cx>=0&&cx<32&&cz>=0&&cz<32&&cells.has(cz*32+cx);};
 const seen=new Set<string>(),out:{x:number;z:number;dockId?:number}[]=[];
 const consider=(x:number,z:number,dockId?:number)=>{const key=`${Math.round(x)},${Math.round(z)}`;if(seen.has(key)||!knows(x,z))return;seen.add(key);const h=g.height(x,z),water=g.waterAt(x,z);if(h<water+.3||dockId===undefined&&h>water+COASTAL_BOOTSTRAP_RULES.maximumBankRiseMetres||!g.walkable(x,z)||!g.workBoard.connected(g,x,z,hall.x,hall.z)||![[-1,0],[1,0],[0,-1],[0,1]].every(([dx,dz])=>g.walkable(x+dx,z+dz)))return;const sea=riverboatWaterPoint(g,x,z,8);if(sea)out.push({x,z,dockId});};
 for(const d of g.state.buildings)if(d.team===hall.team&&d.type==='dock'&&g.finished(d)&&knows(d.x,d.z))for(let r=0;r<=8;r+=2)for(let i=0;i<16;i++)consider(d.x+Math.cos(i*Math.PI/8)*r,d.z+Math.sin(i*Math.PI/8)*r,d.id);
 for(let r=8;r<=160;r+=8)for(let i=0;i<32;i++)consider(hall.x+Math.cos(i*Math.PI/16)*r,hall.z+Math.sin(i*Math.PI/16)*r);
 return out.sort((a,b)=>Number(a.dockId===undefined)-Number(b.dockId===undefined)||Math.hypot(a.x-hall.x,a.z-hall.z)-Math.hypot(b.x-hall.x,b.z-hall.z));
}

export function coastalPartnerScore(g:Game,team:number,hall:Building,origin:{x:number;z:number}=g.campOf(team)){const recent=g.state.coastalVoyages?.filter(v=>v.team===team&&v.partner===hall.team&&v.phase==='complete'&&g.state.time-v.started<COASTAL_BOOTSTRAP_RULES.recentPartnerSeconds).length||0;return Math.hypot(hall.x-origin.x,hall.z-origin.z)+Math.min(3,recent)*COASTAL_BOOTSTRAP_RULES.repeatPartnerPenaltyMetres;}
