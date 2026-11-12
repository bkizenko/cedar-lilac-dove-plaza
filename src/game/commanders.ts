import type {Game} from './sim';
import type {Unit} from './types';
import type {Riverboat as Boat} from './boats';
import {hash32,makeRng} from './rulerCore';
import {isDependent} from './settlement';
import {hasTaskCommitment} from './workCommitments';
import type {Matchup} from './combatCounters';

/**
 * Named commanders for armies and fleets (UI-free).
 *
 * BLUF: a commander is a real person (a Unit) who is appointed, leads an assigned group inside a limited radius
 * up to a limited capacity, earns experience from what that group actually does, spends it on promotions, and
 * can be lost: killed, captured (aura off until released) or replaced. Auras only reach assigned members that are
 * physically within the command radius, and the total effect is bounded, so no commander is decisive alone.
 * Absent `state.commanders` means no commanders, so old saves are unchanged.
 */
export type CommanderKind='army'|'fleet';
export type CommanderStatus='serving'|'captured'|'fallen'|'retired';
export type AuraEffects={attack?:number;defense?:number;pace?:number;morale?:number;siege?:number;ram?:number;boarding?:number;navalSpeed?:number;supply?:number;radius?:number;capacity?:number};
export type TraitDef={id:string;name:string;kinds:readonly CommanderKind[];effects:AuraEffects};
export type PromotionDef={id:string;name:string;tree:'martial'|'logistics'|'naval';kinds:readonly CommanderKind[];minLevel:number;requires?:string;effects:AuraEffects};
export const COMMANDER_TRAITS:readonly TraitDef[]=[
 {id:'bold',name:'Bold',kinds:['army','fleet'],effects:{attack:.05}},
 {id:'steadfast',name:'Steadfast',kinds:['army','fleet'],effects:{defense:.05}},
 {id:'swift',name:'Swift marcher',kinds:['army'],effects:{pace:.06}},
 {id:'inspiring',name:'Inspiring',kinds:['army','fleet'],effects:{radius:6,morale:.04}},
 {id:'disciplined',name:'Disciplined',kinds:['army','fleet'],effects:{capacity:3}},
 {id:'quartermaster',name:'Quartermaster',kinds:['army','fleet'],effects:{supply:.1}},
 {id:'engineer',name:'Siege engineer',kinds:['army'],effects:{siege:.15}},
 {id:'seawolf',name:'Sea wolf',kinds:['fleet'],effects:{ram:.08,boarding:.08}},
 {id:'navigator',name:'Born navigator',kinds:['fleet'],effects:{navalSpeed:.08}},
];
export const COMMANDER_PROMOTIONS:readonly PromotionDef[]=[
 {id:'drill',name:'Drillmaster',tree:'martial',kinds:['army'],minLevel:2,effects:{attack:.04}},
 {id:'shieldwall',name:'Shield-wall doctrine',tree:'martial',kinds:['army'],minLevel:2,effects:{defense:.05}},
 {id:'forcedmarch',name:'Forced march',tree:'martial',kinds:['army'],minLevel:3,requires:'drill',effects:{pace:.06,radius:4}},
 {id:'warcry',name:'War cry',tree:'martial',kinds:['army','fleet'],minLevel:4,effects:{attack:.05,morale:.05,capacity:2}},
 {id:'foragers',name:'Foraging parties',tree:'logistics',kinds:['army','fleet'],minLevel:2,effects:{supply:.15}},
 {id:'siegetrain',name:'Siege train',tree:'logistics',kinds:['army'],minLevel:3,requires:'foragers',effects:{siege:.2,capacity:2}},
 {id:'ramdrill',name:'Ramming drill',tree:'naval',kinds:['fleet'],minLevel:2,effects:{ram:.15}},
 {id:'boarders',name:'Boarding parties',tree:'naval',kinds:['fleet'],minLevel:2,effects:{boarding:.15}},
 {id:'pilotage',name:'Pilotage',tree:'naval',kinds:['fleet'],minLevel:3,effects:{navalSpeed:.08,radius:8}},
 {id:'flagship',name:'Flagship signals',tree:'naval',kinds:['fleet'],minLevel:4,requires:'pilotage',effects:{defense:.05,capacity:1,radius:10}},
];
export const COMMANDER_RULES=Object.freeze({
 version:1,maximumRoster:32,maximumPerTeam:4,standardWood:6,
 /** XP needed to REACH level index+1; level 1 needs none. */
 levelXp:[0,40,120,260,480] as readonly number[],maximumLevel:5,
 baseRadiusMeters:14,radiusPerLevel:4,maximumRadiusMeters:48,
 baseCapacity:6,capacityPerLevel:2,maximumCapacity:24,
 fleetBaseRadiusMeters:36,fleetBaseCapacity:2,fleetCapacityPerTwoLevels:1,maximumFleetCapacity:8,
 /** Final bounds on any combined aura, per term. */
 maximumBonus:.25,maximumMoraleBonus:.2,
 xpPerMemberExperience:.6,xpPerOwnExperience:1,maximumXpPerTick:20,tickSeconds:1,
 rivalReviewSeconds:60,rivalMinimumSoldiers:5,
});
const R=COMMANDER_RULES;
export type Commander={
 id:number;team:number;unitId:number;name:string;kind:CommanderKind;
 traits:string[];promotions:string[];xp:number;level:number;promotionPoints:number;
 status:CommanderStatus;memberIds:number[];boatIds:number[];
 appointedAt:number;lastSeen?:{x:number;z:number};capturedBy?:number;fellAt?:number;replacedBy?:number;replaces?:number;
 /** Last observed sum of member + own combat experience, so XP follows only new experience. */xpMark:number;
};
export type CommandersState={version:1;roster:Commander[];rivals:boolean;lastRivalReview?:number};
type Holder={commanders?:CommandersState};
const st=(g:Game)=>g.state as Game['state']&Holder;
export const commandersState=(g:Game)=>st(g).commanders;
export function enableCommanders(g:Game,rivals=true){return st(g).commanders??={version:1,roster:[],rivals};}
const traitDef=(id:string)=>COMMANDER_TRAITS.find(t=>t.id===id);
const promotionDef=(id:string)=>COMMANDER_PROMOTIONS.find(p=>p.id===id);
const isLive=(c:Pick<Commander,'status'>)=>c.status==='serving'||c.status==='captured';
const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));

/** Sum of an effect over traits and promotions. */
export function commanderEffects(c:Pick<Commander,'traits'|'promotions'>):Required<AuraEffects>{
 const out:Required<AuraEffects>={attack:0,defense:0,pace:0,morale:0,siege:0,ram:0,boarding:0,navalSpeed:0,supply:0,radius:0,capacity:0};
 for(const id of c.traits){const t=traitDef(id);if(t)for(const [k,v] of Object.entries(t.effects))out[k as keyof AuraEffects]+=v as number;}
 for(const id of c.promotions){const p=promotionDef(id);if(p)for(const [k,v] of Object.entries(p.effects))out[k as keyof AuraEffects]+=v as number;}
 return out;
}
export const commanderRadius=(c:Commander)=>{const e=commanderEffects(c);return clamp((c.kind==='fleet'?R.fleetBaseRadiusMeters:R.baseRadiusMeters+R.radiusPerLevel*(c.level-1))+e.radius,1,R.maximumRadiusMeters);};
export const commanderCapacity=(c:Commander)=>{const e=commanderEffects(c);return c.kind==='fleet'?clamp(R.fleetBaseCapacity+Math.floor((c.level-1)/2)*R.fleetCapacityPerTwoLevels+e.capacity,1,R.maximumFleetCapacity):clamp(R.baseCapacity+R.capacityPerLevel*(c.level-1)+e.capacity,1,R.maximumCapacity);};
export const nextLevelXp=(c:Commander)=>c.level>=R.maximumLevel?null:R.levelXp[c.level];
const levelFor=(xp:number)=>{let l=1;for(let i=1;i<R.levelXp.length;i++)if(xp>=R.levelXp[i])l=i+1;return Math.min(l,R.maximumLevel);};

const unitById=(g:Game,id:number)=>g.state.units.find(u=>u.id===id);
const own=(g:Game,u:Unit,team:number)=>u.team===team&&u.hp>0&&!isDependent(g,u)&&(!u.prisoner||u.prisoner.phase==='released')&&!u.emergency&&!u.recalled;
export function commandSlots(g:Game,team:number){
 const posts=g.state.buildings.filter(b=>b.team===team&&b.hp>0&&g.finished(b)&&(b.type==='barracks'||b.type==='keep')).length;
 return Math.min(R.maximumPerTeam,1+posts);
}
export const commandersOf=(g:Game,team:number)=>(st(g).commanders?.roster??[]).filter(c=>c.team===team);
export const activeCommandersOf=(g:Game,team:number)=>commandersOf(g,team).filter(isLive);
export const commanderByUnit=(g:Game,unitId:number)=>st(g).commanders?.roster.find(c=>c.unitId===unitId&&isLive(c));
function pickTraits(g:Game,unitId:number,kind:CommanderKind,team:number){
 const rng=makeRng(hash32('commander',g.state.seed|0,unitId,team)),pool=COMMANDER_TRAITS.filter(t=>t.kinds.includes(kind)).map(t=>t.id),out:string[]=[];
 for(let n=0;n<2&&pool.length;n++)out.push(pool.splice(Math.floor(rng()*pool.length),1)[0]);
 return out;
}
export type CommanderOutcome={accepted:boolean;reason:string;commanderId?:number};
const no=(reason:string):CommanderOutcome=>({accepted:false,reason});
/** Appoint a named commander from a real person. Costs a finite standard of timber; the person stays a physical unit. */
export type CommanderAppointmentOptions={team?:number;replaces?:number;free?:boolean};
/** Exact pure admission shared by owner controls and the authoritative command. */
export function commanderAppointmentIssue(g:Game,unitId:number,kind:CommanderKind,opts:CommanderAppointmentOptions={}):string|null{
 const u=unitById(g,unitId);if(!u)return 'That person is not here';const team=opts.team??u.team,s=st(g).commanders,roster=s?.roster??[];
 if(u.team!==team)return 'Only your own people can be appointed';
 if(!own(g,u,team)||u.prisoner)return 'Only a healthy, free adult can be given command';
 if(hasTaskCommitment(u,kind==='fleet'?'boat':undefined))return 'Finish or release their paid work before giving them command';
 if(roster.some(c=>c.unitId===u.id&&isLive(c)))return 'Already a commander';
 const live=activeCommandersOf(g,team),replacing=opts.replaces!==undefined?roster.find(c=>c.id===opts.replaces&&c.team===team&&c.replacedBy===undefined):undefined;
 if(opts.replaces!==undefined&&(!replacing||replacing.status==='serving'||replacing.status==='retired'))return 'Only a fallen or captured commander can be replaced';
 if(replacing&&replacing.kind!==kind)return 'Replace a field commander with field command, or a fleet commander with fleet command';
 if(kind==='fleet'&&u.boat?.phase!=='aboard')return 'A fleet commander must be aboard one of the hulls';
 const slots=commandSlots(g,team);if(live.length-(replacing&&isLive(replacing)?1:0)>=slots)return `This society can field ${slots} commander${slots===1?'':'s'}; build barracks or a keep for more`;
 if(roster.length>=R.maximumRoster&&!roster.some(c=>!isLive(c)))return 'Too many standing commanders';
 if(!opts.free&&g.tribe(team).wood<R.standardWood)return `A commander's standard needs ${R.standardWood} timber`;
 return null;
}
export function appointCommander(g:Game,unitId:number,kind:CommanderKind,opts:CommanderAppointmentOptions={}):CommanderOutcome{
 const issue=commanderAppointmentIssue(g,unitId,kind,opts);if(issue)return no(issue);
 const u=unitById(g,unitId)!,team=opts.team??u.team,s=enableCommanders(g,st(g).commanders?.rivals??true),replacing=opts.replaces!==undefined?s.roster.find(c=>c.id===opts.replaces&&c.team===team&&c.replacedBy===undefined):undefined;
 if(s.roster.length>=R.maximumRoster){const old=s.roster.findIndex(c=>!isLive(c));s.roster.splice(old,1);}
 if(!opts.free)g.tribe(team).wood-=R.standardWood;
 const c:Commander={id:g.id(),team,unitId:u.id,name:u.name||`Commander ${u.id}`,kind,traits:pickTraits(g,u.id,kind,team),promotions:[],xp:0,level:1,promotionPoints:0,status:'serving',memberIds:[],boatIds:[],appointedAt:g.state.time,lastSeen:{x:u.x,z:u.z},xpMark:u.combatXP||0};
 if(replacing){c.replaces=replacing.id;replacing.replacedBy=c.id;c.memberIds=replacing.memberIds.filter(id=>id!==u.id);c.boatIds=[...replacing.boatIds];{const cap=commanderCapacity(c);c.memberIds.splice(cap);c.boatIds.splice(cap);}c.xpMark+=c.memberIds.reduce((n,id)=>n+(unitById(g,id)?.combatXP||0),0);replacing.memberIds=[];replacing.boatIds=[];if(isLive(replacing))replacing.status='retired';}
 s.roster.push(c);bump(g);
 return {accepted:true,reason:`${c.name} now leads as a ${kind==='fleet'?'fleet':'field'} commander (${c.traits.map(id=>traitDef(id)?.name).join(', ')})`,commanderId:c.id};
}
/** Assign real people (army) or hulls (fleet) to a commander, up to capacity. Everyone is in at most one command. */
export function commanderAssignment(g:Game,commanderId:number,ids:readonly number[]){
 const s=st(g).commanders,c=s?.roster.find(c=>c.id===commanderId);if(!c||c.status!=='serving')return{ids:[]as number[],issue:'Commander is not serving'};
 const cap=commanderCapacity(c),list=c.kind==='fleet'?c.boatIds:c.memberIds,accepted:number[]=[];
 for(const id of ids){if(list.includes(id)||accepted.includes(id))continue;if(list.length+accepted.length>=cap)break;
  if(c.kind==='fleet'){const b=(g.state.boats??[]).find(b=>b.id===id&&b.team===c.team&&b.hp>0);if(!b||s!.roster.some(o=>o.kind==='fleet'&&isLive(o)&&o.boatIds.includes(id)))continue;}
  else{const u=unitById(g,id);if(!u||u.id===c.unitId||!own(g,u,c.team)||u.prisoner||u.boat?.phase==='aboard'||s!.roster.some(o=>o.kind==='army'&&isLive(o)&&o.memberIds.includes(id)||o.unitId===id&&isLive(o)))continue;}
  accepted.push(id);
 }
 return{ids:accepted,issue:accepted.length?null:list.length>=cap?`${c.name} cannot lead more than ${cap}`:'Nobody eligible to add'};
}
export function assignToCommander(g:Game,commanderId:number,ids:readonly number[]):CommanderOutcome{
 const proposal=commanderAssignment(g,commanderId,ids);if(proposal.issue)return no(proposal.issue);const c=st(g).commanders!.roster.find(c=>c.id===commanderId)!,list=c.kind==='fleet'?c.boatIds:c.memberIds;list.push(...proposal.ids);if(c.kind==='army')c.xpMark+=proposal.ids.reduce((n,id)=>n+(unitById(g,id)?.combatXP||0),0);bump(g);return{accepted:true,reason:`${proposal.ids.length} added to ${c.name}'s command (${list.length}/${commanderCapacity(c)})`,commanderId:c.id};
}
export function releaseFromCommander(g:Game,commanderId:number,ids:readonly number[]):CommanderOutcome{
 const c=st(g).commanders?.roster.find(c=>c.id===commanderId);if(!c)return no('No such commander');
 const drop=new Set(ids);const before=c.memberIds.length+c.boatIds.length;
 if(c.kind==='army')c.xpMark=Math.max(0,c.xpMark-c.memberIds.filter(id=>drop.has(id)).reduce((n,id)=>n+(unitById(g,id)?.combatXP||0),0));c.memberIds=c.memberIds.filter(id=>!drop.has(id));c.boatIds=c.boatIds.filter(id=>!drop.has(id));bump(g);
 return before!==c.memberIds.length+c.boatIds.length?{accepted:true,reason:'Released from command',commanderId}:no('None of them were in that command');
}
export function availablePromotions(c:Commander):PromotionDef[]{
 return COMMANDER_PROMOTIONS.filter(p=>p.kinds.includes(c.kind)&&!c.promotions.includes(p.id)&&c.level>=p.minLevel&&(!p.requires||c.promotions.includes(p.requires)));
}
export function commanderPromotionIssue(g:Game,commanderId:number,promotionId:string){const c=st(g).commanders?.roster.find(c=>c.id===commanderId),p=promotionDef(promotionId);if(!c||!isLive(c))return 'No such commander';if(!p)return 'Unknown promotion';if(c.promotionPoints<1)return 'No promotion earned yet';if(!availablePromotions(c).some(a=>a.id===p.id))return 'That promotion is not available at this rank';return null;}
export function promoteCommander(g:Game,commanderId:number,promotionId:string):CommanderOutcome{
 const issue=commanderPromotionIssue(g,commanderId,promotionId);if(issue)return no(issue);const c=st(g).commanders!.roster.find(c=>c.id===commanderId)!,p=promotionDef(promotionId)!;c.promotions.push(p.id);c.promotionPoints--;bump(g);return{accepted:true,reason:`${c.name}: ${p.name}`,commanderId:c.id};
}
/** Award experience from outside the combat tick, e.g. a ramming or a repelled blockade. */
export function awardCommanderXp(g:Game,commanderId:number,amount:number){
 const c=st(g).commanders?.roster.find(c=>c.id===commanderId);if(!c||!isLive(c)||!Number.isFinite(amount)||amount<=0)return;
 c.xp=Math.min(1e6,c.xp+amount);const level=levelFor(c.xp);if(level>c.level){c.promotionPoints+=level-c.level;c.level=level;}
}

// -- effects on combat ---------------------------------------------------------------------------------------------
type Index={time:number;revision:number;byMember:Map<number,Commander>;byBoat:Map<number,Commander>;pos:Map<number,{x:number;z:number}>};
const indexes=new WeakMap<Game,Index>(),revisions=new WeakMap<Game,number>();
const bump=(g:Game)=>{revisions.set(g,(revisions.get(g)||0)+1);indexes.delete(g);};
function index(g:Game):Index{
 const rev=revisions.get(g)||0;let ix=indexes.get(g);
 if(ix&&ix.revision===rev&&ix.time===g.state.time)return ix;
 ix={time:g.state.time,revision:rev,byMember:new Map(),byBoat:new Map(),pos:new Map()};
 for(const c of st(g).commanders?.roster??[]){
  if(c.status!=='serving')continue;const u=unitById(g,c.unitId);if(!u)continue;
  ix.pos.set(c.id,{x:u.x,z:u.z});for(const id of c.memberIds)ix.byMember.set(id,c);for(const id of c.boatIds)ix.byBoat.set(id,c);
 }
 indexes.set(g,ix);return ix;
}
export type Aura=Required<Pick<AuraEffects,'attack'|'defense'|'pace'|'morale'|'siege'|'ram'|'boarding'|'navalSpeed'|'supply'>>&{commanderId:number;name:string};
const noAura=(c:Commander,e:Required<AuraEffects>):Aura=>({commanderId:c.id,name:c.name,attack:Math.min(R.maximumBonus,e.attack),defense:Math.min(R.maximumBonus,e.defense),pace:Math.min(R.maximumBonus,e.pace),morale:Math.min(R.maximumMoraleBonus,e.morale),siege:Math.min(R.maximumBonus*2,e.siege),ram:Math.min(R.maximumBonus*2,e.ram),boarding:Math.min(R.maximumBonus*2,e.boarding),navalSpeed:Math.min(R.maximumBonus,e.navalSpeed),supply:Math.min(R.maximumBonus*2,e.supply)});
/** Aura for an assigned person who stands inside their commander's radius, else null. Cheap: indexed per time step. */
export function commanderAuraFor(g:Game,u:{id:number;x:number;z:number}):Aura|null{
 if(!st(g).commanders?.roster.length)return null;
 const ix=index(g),c=ix.byMember.get(u.id);if(!c)return null;
 const p=ix.pos.get(c.id);if(!p||Math.hypot(u.x-p.x,u.z-p.z)>commanderRadius(c))return null;
 return noAura(c,commanderEffects(c));
}
/** Same for a hull in a fleet; the fleet commander must be aboard some hull and within radius of it. */
export function fleetAuraFor(g:Game,b:Pick<Boat,'id'|'x'|'z'>):Aura|null{
 if(!st(g).commanders?.roster.length)return null;
 const ix=index(g),c=ix.byBoat.get(b.id);if(!c)return null;
 const p=ix.pos.get(c.id);if(!p||Math.hypot(b.x-p.x,b.z-p.z)>commanderRadius(c))return null;
 return noAura(c,commanderEffects(c));
}
/** Applies attacker and defender auras to a matchup as one bounded factor with a readable reason. */
export function commanderMatchup(g:Game,attacker:Unit,target:Unit,base:Matchup):Matchup{
 if(!st(g).commanders?.roster.length)return base;
 const a=commanderAuraFor(g,attacker),d=commanderAuraFor(g,target);if(!a&&!d)return base;
 const reasons=[...base.reasons];let m=base.multiplier;
 if(a&&a.attack>0){m*=1+a.attack;reasons.push(`${a.name} leads the attack ×${(1+a.attack).toFixed(2)}`);}
 if(d&&d.defense>0){const f=1/(1+d.defense);m*=f;reasons.push(`${d.name} steadies the defence ×${f.toFixed(2)}`);}
 return {multiplier:m,reasons};
}
/** Pace multiplier for an assigned person inside the radius (1 otherwise). */
export function commanderPace(g:Game,u:Unit){const a=commanderAuraFor(g,u);return a?1+a.pace:1;}
/** Siege/ram/boarding/supply helper for other modules: strongest relevant bonus from an assigned member. */
export function commanderBonus(g:Game,u:{id:number;x:number;z:number},key:'siege'|'supply'|'boarding'|'ram'|'navalSpeed'):number{
 const a=commanderAuraFor(g,u)??fleetAuraFor(g,u);return a?a[key]:0;
}

// -- tick: experience, loss, capture ---------------------------------------------------------------------------------
const clocks=new WeakMap<Game,number>();
export function tickCommanders(g:Game,dt:number){
 const s=st(g).commanders;if(!s||!(dt>0))return;
 const acc=(clocks.get(g)||0)+dt;if(acc<R.tickSeconds){clocks.set(g,acc);return;}clocks.set(g,0);
 const byId=new Map(g.state.units.map(u=>[u.id,u]));let changed=false;
 for(const c of s.roster){
  if(!isLive(c))continue;
  const u=byId.get(c.unitId);
  if(!u||u.hp<=0){c.status='fallen';c.fellAt=g.state.time;c.memberIds=[];c.boatIds=[];changed=true;continue;}
  c.lastSeen={x:u.x,z:u.z};
  const held=!!u.prisoner&&u.prisoner.phase!=='released';
  if(held&&c.status==='serving'){c.status='captured';c.capturedBy=u.prisoner!.captorTeam;changed=true;}
  else if(!held&&c.status==='captured'){c.capturedBy=undefined;if(c.replacedBy!==undefined){c.status='retired';c.memberIds=[];c.boatIds=[];}else c.status='serving';changed=true;}
  if(c.status!=='serving')continue;
  const before=c.memberIds.length;c.memberIds=c.memberIds.filter(id=>{const m=byId.get(id);return !!m&&m.hp>0&&m.team===c.team&&!m.prisoner;});
  const boatsBefore=c.boatIds.length;c.boatIds=c.boatIds.filter(id=>(g.state.boats??[]).some(b=>b.id===id&&b.hp>0&&b.team===c.team));
  if(before!==c.memberIds.length||boatsBefore!==c.boatIds.length)changed=true;
  let mark=u.combatXP||0;for(const id of c.memberIds)mark+=byId.get(id)?.combatXP||0;
  const delta=mark-c.xpMark;
  if(delta>0){const award=Math.min(R.maximumXpPerTick,delta*R.xpPerMemberExperience);c.xpMark+=award/R.xpPerMemberExperience;awardCommanderXp(g,c.id,award);}else c.xpMark=mark;
 }
 if(changed)bump(g);
 if(s.rivals)reviewRivalCommanders(g,s);
}
/** Rival societies appoint a commander from a real leader or warden once they have enough soldiers. Deterministic. */
function reviewRivalCommanders(g:Game,s:CommandersState){
 if(g.state.time-(s.lastRivalReview??-1e9)<R.rivalReviewSeconds)return;s.lastRivalReview=g.state.time;
 for(const t of g.state.tribes){
  if(t.id===0||t.id===3||!t.alive||activeCommandersOf(g,t.id).length>=1)continue;
  const soldiers=g.state.units.filter(u=>u.team===t.id&&u.hp>0&&['spearman','archer','swordsman','cavalry','ranger','warden'].includes(u.type)&&own(g,u,t.id));
  if(soldiers.length<R.rivalMinimumSoldiers)continue;
  const lead=soldiers.filter(u=>u.type==='warden'||(u.combatXP||0)>0).sort((a,b)=>(b.combatXP||0)-(a.combatXP||0)||a.id-b.id)[0];if(!lead)continue;
  const r=appointCommander(g,lead.id,'army',{team:t.id,free:true});if(!r.accepted)continue;
  const near=soldiers.filter(u=>u.id!==lead.id).sort((a,b)=>Math.hypot(a.x-lead.x,a.z-lead.z)-Math.hypot(b.x-lead.x,b.z-lead.z)||a.id-b.id).map(u=>u.id);
  assignToCommander(g,r.commanderId!,near);
 }
}

// -- read model --------------------------------------------------------------------------------------------------------
export type CommanderView={
 id:number;unitId:number;name:string;kind:CommanderKind;status:CommanderStatus;level:number;xp:number;nextLevelXp:number|null;promotionPoints:number;
 traits:{id:string;name:string}[];promotions:{id:string;name:string}[];options:{id:string;name:string;tree:string}[];
 radiusMeters:number;capacity:number;members:number;inRadius:number;position:{x:number;z:number}|null;capturedBy?:number;
 aura:{attack:number;defense:number;pace:number;morale:number;siege:number;ram:number;boarding:number;navalSpeed:number;supply:number};
};
export function commanderViews(g:Game,team=0):CommanderView[]{
 return commandersOf(g,team).map(c=>{
  const u=unitById(g,c.unitId),pos=u&&u.hp>0?{x:u.x,z:u.z}:c.lastSeen??null,count=c.kind==='fleet'?c.boatIds.length:c.memberIds.length;
  let inRadius=0;
  if(c.status==='serving'&&u){const r=commanderRadius(c);
   if(c.kind==='army')for(const id of c.memberIds){const m=unitById(g,id);if(m&&Math.hypot(m.x-u.x,m.z-u.z)<=r)inRadius++;}
   else for(const id of c.boatIds){const b=(g.state.boats??[]).find(b=>b.id===id);if(b&&Math.hypot(b.x-u.x,b.z-u.z)<=r)inRadius++;}
  }
  const a=noAura(c,commanderEffects(c));
  return {id:c.id,unitId:c.unitId,name:c.name,kind:c.kind,status:c.status,level:c.level,xp:Math.round(c.xp*10)/10,nextLevelXp:nextLevelXp(c),promotionPoints:c.promotionPoints,
   traits:c.traits.map(id=>({id,name:traitDef(id)?.name??id})),promotions:c.promotions.map(id=>({id,name:promotionDef(id)?.name??id})),
   options:!isLive(c)||c.promotionPoints<1?[]:availablePromotions(c).map(p=>({id:p.id,name:p.name,tree:p.tree})),
   radiusMeters:commanderRadius(c),capacity:commanderCapacity(c),members:count,inRadius,position:pos,...(c.capturedBy!==undefined?{capturedBy:c.capturedBy}:{}),
   aura:{attack:a.attack,defense:a.defense,pace:a.pace,morale:a.morale,siege:a.siege,ram:a.ram,boarding:a.boarding,navalSpeed:a.navalSpeed,supply:a.supply}};
 });
}

// -- validation ----------------------------------------------------------------------------------------------------------
export function validCommanders(s:any){
 const v=s.commanders;if(v===undefined)return true;
 if(!v||typeof v!=='object'||Array.isArray(v)||v.version!==1||!Array.isArray(v.roster)||typeof v.rivals!=='boolean'||v.roster.length>R.maximumRoster)return false;
 if(v.lastRivalReview!==undefined&&!Number.isFinite(v.lastRivalReview))return false;
 const ids=new Set<number>(),units=new Set<number>(),id=(n:any)=>Number.isInteger(n)&&n>=0&&n<s.nextId;
 const perTeam=new Map<number,number>();
 for(const c of v.roster){
  if(!c||!id(c.id)||ids.has(c.id)||!id(c.unitId)||!Number.isInteger(c.team)||c.team<0||c.team>=s.tribes.length||c.team===3)return false;ids.add(c.id);
  if(typeof c.name!=='string'||c.name.length>80||!['army','fleet'].includes(c.kind)||!['serving','captured','fallen','retired'].includes(c.status))return false;
  if(!Array.isArray(c.traits)||c.traits.length>3||c.traits.some((t:any)=>!traitDef(t)||!traitDef(t)!.kinds.includes(c.kind))||new Set(c.traits).size!==c.traits.length)return false;
  if(!Array.isArray(c.promotions)||c.promotions.length>R.maximumLevel||c.promotions.some((p:any)=>!promotionDef(p)||!promotionDef(p)!.kinds.includes(c.kind))||new Set(c.promotions).size!==c.promotions.length)return false;
  if(!Number.isFinite(c.xp)||c.xp<0||!Number.isInteger(c.level)||c.level<1||c.level>R.maximumLevel||c.level<levelFor(c.xp)||!Number.isInteger(c.promotionPoints)||c.promotionPoints<0||c.promotionPoints+c.promotions.length>c.level-1)return false;
  if(!Number.isFinite(c.xpMark)||c.xpMark<0||!Number.isFinite(c.appointedAt))return false;
  if(!Array.isArray(c.memberIds)||!Array.isArray(c.boatIds)||c.memberIds.length>R.maximumCapacity||c.boatIds.length>R.maximumFleetCapacity||c.memberIds.some((m:any)=>!id(m))||c.boatIds.some((m:any)=>!id(m))||!isLive(c)&&(c.memberIds.length||c.boatIds.length))return false;
  if(c.kind==='army'&&c.boatIds.length||c.kind==='fleet'&&c.memberIds.length)return false;
  if(isLive(c)){if(units.has(c.unitId))return false;units.add(c.unitId);perTeam.set(c.team,(perTeam.get(c.team)||0)+1);}
  for(const k of ['capturedBy','fellAt','replacedBy','replaces'] as const)if(c[k]!==undefined&&!Number.isFinite(c[k]))return false;
  if(c.lastSeen!==undefined&&(!c.lastSeen||!Number.isFinite(c.lastSeen.x)||!Number.isFinite(c.lastSeen.z)))return false;
 }
 const seenMembers=new Set<number>();
 for(const c of v.roster)if(isLive(c))for(const m of c.kind==='fleet'?c.boatIds:c.memberIds){const key=(c.kind==='fleet'?1e9:0)+m;if(seenMembers.has(key))return false;seenMembers.add(key);}
 for(const n of perTeam.values())if(n>R.maximumPerTeam)return false;
 return true;
}
