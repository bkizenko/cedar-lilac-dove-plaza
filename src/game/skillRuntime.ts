/**
 * Runtime glue for the per-person skill model (skills.ts). Optional: off unless state.skillModel exists (set for new games by enableSkillModel).
 * Old saves have no field and keep the old behaviour exactly. Practice is recorded per step as a cheap counter; xp, forgetting, teaching, injuries and
 * village tradition are all settled in ONE batch per sim day (advanceSkillDay). Effects are time multipliers only: no goods are created or destroyed here.
 */
import type {Game} from './sim';
import type {Unit,GameState} from './types';
import {simulationDaySeconds} from './calendarPacing';
import {lifeEvent} from './communities';
import {isDependent} from './settlement';
import {PRODUCTION_RECIPES,type ProductionRecipe} from './production';
import {SKILL_IDS,SKILL_SPECS,SKILL_RULES,type SkillId,type SkillRecord,newRecord,skillGenome,skillAgeYears,skillSpeed,entryMastery,trainEntry,forgetEntry,teacherQuality,injureRecord,healRecord,topSkills,suggestedJob,isRusty,levelWord,validSkillRecord,skillAptitude} from './skills';

export type TownSkills={trad:Partial<Record<SkillId,number>>;peak:Partial<Record<SkillId,number>>;guilds:SkillId[];lapsed:SkillId[];aff:Partial<Record<SkillId,number>>;affDay:number;n:Partial<Record<SkillId,number>>;masters:Partial<Record<SkillId,number>>};
export type SkillModel={version:1;day:number;towns:Record<string,TownSkills>};
export const TOWN_RULES={maxBonus:.15,buildRate:.06,decayDays:90,lapsedDecayDays:20,guildDecayDays:225,masterSum:2.5,guildPopulation:24,guildPractitioners:4,guildTradition:.5,quarterTradition:.4,quarterPractitioners:3,affinityRadius:120,affinityEvery:8,lapseTradition:.3} as const;
const st=(g:Game)=>g.state as GameState&{skillModel?:SkillModel};
export const skillsEnabled=(g:Game)=>st(g).skillModel?.version===1;
export const dayIndex=(g:Game)=>Math.floor(g.state.time/simulationDaySeconds);
export const unitRecord=(u:Unit)=>u.skills as SkillRecord|undefined;
function ensureRecord(g:Game,u:Unit){if(!u.skills){const seed=g.state.seed|0;u.skills=newRecord(skillGenome(seed,u.id),u.parents?.map(p=>skillGenome(seed,p)));}return u.skills as SkillRecord;}
/** Cheap per-step counter: seconds of real work in a skill since the last daily batch. */
export function recordPractice(g:Game,u:Unit,skill:SkillId,seconds:number){
 if(!skillsEnabled(g)||!(seconds>0)||u.hp<=0)return;const r=ensureRecord(g,u),e=r.x[skill]??(r.x[skill]=[0,dayIndex(g),0,0,0]);e[4]+=seconds;
}
const townOf=(g:Game,team:number)=>st(g).skillModel?.towns[team];
export const townBonus=(g:Game,team:number,skill:SkillId)=>1+TOWN_RULES.maxBonus*(townOf(g,team)?.trad[skill]??0)*(townOf(g,team)?.lapsed.includes(skill)?.5:1);
/** Total time multiplier for one person doing one skill: personal performance times the village tradition. 1 when the model is off. */
export function unitSkillSpeed(g:Game,u:Unit,skill:SkillId){
 if(!skillsEnabled(g))return 1;return skillSpeed(unitRecord(u),skill,skillAgeYears(u))*townBonus(g,u.team,skill);
}
type Node={kind?:string;species?:string;type?:string};
export function gatherSkill(t:string,node:Node):SkillId|null{
 if('species' in node&&node.species)return 'hunting';
 if(node.type==='farm')return 'farming';
 if(node.type==='dock'||node.kind==='fish')return 'fishing';
 if(node.type==='quarry'||t==='stone'||t==='copper'||t==='iron')return 'mining';
 if(t==='wood')return 'woodcutting';
 if(node.kind==='forage')return 'foraging';
 return null;
}
/** Records practice and returns the time multiplier for a gather/field step; 1 when the model is off. */
export function gatherSkillStep(g:Game,u:Unit,t:string,node:Node,dt:number){
 if(!skillsEnabled(g))return 1;const s=gatherSkill(t,node);if(!s)return 1;recordPractice(g,u,s,dt);return unitSkillSpeed(g,u,s);
}
const RECIPE_SKILL:[RegExp,SkillId][]=[[/^(formClay|dryClay|fireClay)/,'pottery'],[/^(spinYarn|spinWool|weave|felt|washWool|twistCordage)/,'weaving'],[/^(smelt|consolidateIron|makeCharcoal)/,'smithing'],[/^(fleshHide|extractTannin|drySkin|tanHide|sew)/,'tanning'],[/^(cook|bake|brew|sproutGrain|airDry|manualSmoke|smoke|ferment|strain|grind|thresh|winnow)/,'cooking'],[/^(author|study)/,'toolmaking']];
export function recipeSkill(recipe:string):SkillId|null{if(!Object.hasOwn(PRODUCTION_RECIPES,recipe))return null;for(const[re,s]of RECIPE_SKILL)if(re.test(recipe))return s;return null;}
export function recipeSkillStep(g:Game,u:Unit,recipe:ProductionRecipe|string,dt:number){
 if(!skillsEnabled(g))return 1;const s=recipeSkill(recipe);if(!s)return 1;recordPractice(g,u,s,dt);return unitSkillSpeed(g,u,s);
}

/** New games: enable the model and migrate older tribe/person-level practice into initial person skills. */
export function enableSkillModel(g:Game){
 const s=st(g);if(s.skillModel)return s.skillModel;s.skillModel={version:1,day:dayIndex(g),towns:{}};migrateLegacySkills(g);return s.skillModel;
}
const seedXp=(r:SkillRecord,skill:SkillId,xp:number,day:number)=>{if(!(xp>0))return;const cap=SKILL_SPECS[skill].tau*SKILL_RULES.xpCapTaus,e=r.x[skill]??(r.x[skill]=[0,day,0,0,0]);e[0]=Math.min(cap,e[0]+xp);e[2]=Math.max(e[2],e[0]);};
export function migrateLegacySkills(g:Game){
 const day=dayIndex(g);
 for(const u of g.state.units){if(u.hp<=0||u.prisoner)continue;
  const legacy=(u.craftingXP||0)>0||(u.combatXP||0)>0||!!u.productionSkills||(u.draftPracticeSeconds||0)>0||((g.tribe(u.team) as {haulagePractice?:number})?.haulagePractice||0)>0;
  if(!legacy)continue;const r=ensureRecord(g,u);
  seedXp(r,'toolmaking',(u.craftingXP||0)*.5,day);seedXp(r,'fighting',(u.combatXP||0)/150*SKILL_SPECS.fighting.tau*.6,day);
  for(const[recipe,sk]of Object.entries(u.productionSkills||{})){const s=recipeSkill(recipe);if(s&&sk)seedXp(r,s,sk.successfulBatches*120+sk.taughtBatches*60,day);}
  seedXp(r,'hauling',(u.draftPracticeSeconds||0)+Math.min(60,(g.tribe(u.team) as {haulagePractice?:number})?.haulagePractice||0)*5,day);
 }
}
const injuredNow=(u:Unit)=>u.hp>0&&u.hp<u.maxHp*.35;
const SAMPLE=40;
/** Order-based practice that has no per-step hook: sampled once a day (credit = SAMPLE work-seconds). */
function sampleOrders(g:Game,u:Unit){
 const w=(s:SkillId)=>recordPractice(g,u,s,SAMPLE);
 if(u.militia&&!u.prisoner)w('fighting');if(u.order==='build'||u.buildOrder)w('building');if(u.haulage&&u.carry>0)w('hauling');
 if(u.boat?.phase==='aboard')w('sailing');if(u.trade||u.envoy||u.visit||u.order==='trade')w('trading');if(u.husbandryWork||u.tamingWork)w('herding');
}
const STYLE=['Reed-banded','Red-slipped','Comb-pressed','Ash-glazed','Knot-patterned','Ochre-dyed','Hammer-pitted','Twill-edged'];
const GOODS:Partial<Record<SkillId,string>>={pottery:'pots',weaving:'cloth',smithing:'metalwork',tanning:'leather',toolmaking:'tools',cooking:'cured food'};
export function townStyle(seed:number,team:number,skill:SkillId){const h=(Math.imul(seed^(team+1)*0x9e3779b1,0x85ebca6b)^Math.imul(SKILL_IDS.indexOf(skill)+17,0x2c1b3c6d))>>>0;return`${STYLE[(h^(h>>>13))%STYLE.length]} ${GOODS[skill]||SKILL_SPECS[skill].label.toLowerCase()}`;}
const AFF_NODES:Partial<Record<SkillId,'trees'|'forage'|'fish'|'stones'>>={woodcutting:'trees',foraging:'forage',fishing:'fish',mining:'stones'};
function affinities(g:Game,team:number){
 const c=g.campOf(team),out:Partial<Record<SkillId,number>>={},R=TOWN_RULES.affinityRadius;
 for(const[skill,key]of Object.entries(AFF_NODES) as [SkillId,'trees'|'forage'|'fish'|'stones'][]){let n=0;for(const x of (g.state as unknown as Record<string,{x:number;z:number;amount?:number}[]>)[key]||[])if((x.amount===undefined||x.amount>0)&&Math.abs(x.x-c.x)<R&&Math.abs(x.z-c.z)<R)n++;out[skill]=Math.min(1,n/(key==='trees'?40:key==='stones'?10:12));}
 out.farming=Math.min(1,g.state.buildings.filter(b=>b.team===team&&b.type==='farm').length/6);
 return out;
}
const blankTown=():TownSkills=>({trad:{},peak:{},guilds:[],lapsed:[],aff:{},affDay:-999,n:{},masters:{}});
function updateTown(g:Game,model:SkillModel,team:number,people:Unit[],day:number,days:number){
 const town=model.towns[team]??(model.towns[team]=blankTown()),pop=people.length;
 if(day-town.affDay>=TOWN_RULES.affinityEvery){town.aff=affinities(g,team);town.affDay=day;}
 const sum:Partial<Record<SkillId,number>>={},n:Partial<Record<SkillId,number>>={},masters:Partial<Record<SkillId,number>>={};
 for(const u of people){const r=unitRecord(u);if(!r)continue;for(const id of Object.keys(r.x) as SkillId[]){const m=entryMastery(r,id);if(m<.25)continue;sum[id]=(sum[id]||0)+m;n[id]=(n[id]||0)+1;if(m>=SKILL_RULES.teacherMastery)masters[id]=(masters[id]||0)+1;}}
 town.n=n;town.masters=masters;const guilds:SkillId[]=[],lapsed:SkillId[]=[];
 const keys=new Set<SkillId>([...Object.keys(town.trad),...Object.keys(sum)] as SkillId[]);
 const maxGuilds=1+Math.floor(pop/40);
 for(const id of [...keys].sort((a,b)=>SKILL_IDS.indexOf(a)-SKILL_IDS.indexOf(b))){
  const old=town.trad[id]||0,aff=town.aff[id]??.6,target=Math.min(1,(sum[id]||0)/TOWN_RULES.masterSum)*(.5+.5*aff),wasGuild=town.guilds.includes(id);
  const isLapsed=(town.peak[id]||0)>=TOWN_RULES.lapseTradition&&!(masters[id]||0);
  let v=old;if(target>old)v=old+(target-old)*(1-Math.pow(1-TOWN_RULES.buildRate,days));else v=old*Math.exp(-days/(isLapsed?TOWN_RULES.lapsedDecayDays:wasGuild?TOWN_RULES.guildDecayDays:TOWN_RULES.decayDays));
  if(v<.005)v=0;if(v>0)town.trad[id]=v;else delete town.trad[id];town.peak[id]=Math.max(town.peak[id]||0,v);
  if(v>=TOWN_RULES.guildTradition&&(n[id]||0)>=TOWN_RULES.guildPractitioners&&pop>=TOWN_RULES.guildPopulation&&guilds.length<maxGuilds)guilds.push(id);
  if(isLapsed)lapsed.push(id);
 }
 for(const id of lapsed)if(!town.lapsed.includes(id)){const label=SKILL_SPECS[id].label.toLowerCase();if(team===0||g.state.tribes[team]?.alive)lifeEvent(g,team,`The last master of ${label} is gone; the craft fades unless someone relearns it`);}
 for(const id of guilds)if(!town.guilds.includes(id))lifeEvent(g,team,`A ${SKILL_SPECS[id].label.toLowerCase()} guild forms`);
 town.guilds=guilds;town.lapsed=lapsed;
}
/** The once-a-day batch. Safe to call every step: it returns at once unless a new sim day began. */
export function advanceSkillDay(g:Game){
 const model=st(g).skillModel;if(!model)return;const day=dayIndex(g);if(day<=model.day)return;
 const days=Math.min(day-model.day,SKILL_RULES.dayWindow);model.day=day;
 const byTeam=new Map<number,Unit[]>();
 for(const u of g.state.units){if(u.hp<=0||u.prisoner||u.type!=='worker'&&!u.militia)continue;let a=byTeam.get(u.team);if(!a)byTeam.set(u.team,a=[]);a.push(u);}
 for(const[team,people]of byTeam){
  const adults=people.filter(u=>!isDependent(g,u)),town=model.towns[team];
  for(const u of adults)sampleOrders(g,u);
  // masters per skill (only those who practised recently): at most maxTeachers, strongest first
  const masters=new Map<SkillId,{u:Unit;m:number;q:number}[]>();
  for(const u of adults){const r=unitRecord(u);if(!r)continue;const yrs=skillAgeYears(u);for(const id of Object.keys(r.x) as SkillId[]){const e=r.x[id]!;if(e[4]<=0&&day-e[1]>2)continue;const m=entryMastery(r,id);if(m<SKILL_RULES.teacherMastery)continue;let a=masters.get(id);if(!a)masters.set(id,a=[]);a.push({u,m,q:teacherQuality(m,yrs)*(town?.guilds.includes(id)?1.25:1)});}}
  for(const a of masters.values())a.sort((x,y)=>y.m-x.m||x.u.id-y.u.id).splice(SKILL_RULES.maxTeachers);
  for(const u of people){
   const r=unitRecord(u);if(!r)continue;const yrs=skillAgeYears(u);
   if(injuredNow(u)&&(!r.inj||r.inj[0]<.1))injureRecord(r,.4+.5*(1-u.hp/u.maxHp));else healRecord(r,days);
   for(const id of Object.keys(r.x) as SkillId[]){
    const e=r.x[id]!;
    if(e[4]>0){
     let q=0;const own=entryMastery(r,id);
     for(const t of masters.get(id)||[]){if(t.u===u||t.m<own+SKILL_RULES.teacherGap||t.q<=q)continue;if(Math.hypot(t.u.x-u.x,t.u.z-u.z)<=SKILL_RULES.teachRadius)q=t.q;}
     trainEntry(r,id,e[4],yrs,day,q);
    }else forgetEntry(r,id,days,day,!!town?.guilds.includes(id));
    if(e[0]<1&&e[2]<5&&e[4]<=0&&day-e[1]>SKILL_RULES.staleDays*10)delete r.x[id];
   }
  }
  updateTown(g,model,team,adults,day,days);
 }
 for(const k of Object.keys(model.towns)){const t=Number(k);if(!byTeam.has(t)&&!g.state.tribes[t]?.alive)delete model.towns[k];}
}

/* ---------- read models for the HUD ---------- */
export type PersonSkillCard={top:{id:SkillId;label:string;word:string;pct:number;rusty:boolean}[];suggest?:{label:string;job:string};injured?:boolean;note?:string};
export function personSkillCard(g:Game,u:Unit):PersonSkillCard|undefined{
 if(!skillsEnabled(g))return undefined;const r=unitRecord(u),top=topSkills(r,3).map(s=>({id:s.id,label:s.label,word:s.word,pct:Math.round(s.mastery*100),rusty:s.rusty}));
 const best=suggestedJob(r),card:PersonSkillCard={top};
 if(best&&best.score>=.12)card.suggest={label:SKILL_SPECS[best.skill].label,job:best.job};
 if(r?.inj&&r.inj[0]+r.inj[1]>.1)card.injured=true;
 if(!top.length)card.note=isDependent(g,u)?'Learning by watching':'No settled skill yet';
 return card;
}
export type VillageSkillCard={rows:{id:SkillId;label:string;tradition:number;word:string;practitioners:number;masters:number;guild:boolean;lapsed:boolean}[];quarters:string[]};
export function villageSkillCard(g:Game,team:number):VillageSkillCard|undefined{
 const t=townOf(g,team);if(!t)return undefined;
 const rows=(Object.keys(t.trad) as SkillId[]).filter(id=>(t.trad[id]||0)>=.05||t.lapsed.includes(id)).sort((a,b)=>(t.trad[b]||0)-(t.trad[a]||0)||SKILL_IDS.indexOf(a)-SKILL_IDS.indexOf(b)).slice(0,5).map(id=>({id,label:SKILL_SPECS[id].label,tradition:Math.round((t.trad[id]||0)*100),word:levelWord(t.trad[id]||0),practitioners:t.n[id]||0,masters:t.masters[id]||0,guild:t.guilds.includes(id),lapsed:t.lapsed.includes(id)}));
 const quarters=(Object.keys(GOODS) as SkillId[]).filter(id=>(t.trad[id]||0)>=TOWN_RULES.quarterTradition&&(t.n[id]||0)>=TOWN_RULES.quarterPractitioners).map(id=>`${SKILL_SPECS[id].label} quarter: ${townStyle(g.state.seed|0,team,id)}`);
 return rows.length?{rows,quarters}:undefined;
}
/** Hook into the knowledge system: crafts whose last master is gone are listed as needing a teacher. */
export function skillKnowledgeTopics(g:Game){
 const t=townOf(g,0);if(!t)return[];
 return t.lapsed.map(id=>({id:`skill:${id}`,title:`${SKILL_SPECS[id].label} is fading`,need:'The last practised master is gone; without a teacher the village tradition decays and new hands start from nothing.',stage:'need' as const,observation:`${t.masters[id]||0} masters, ${t.n[id]||0} practitioners; tradition ${Math.round((t.trad[id]||0)*100)}%`,experiment:'Keep working at it: practice rebuilds mastery, and a skilled neighbour or a trader can teach it faster.',result:'No recipe is deleted; the village speed bonus for it halves while lapsed.',adoption:'Restored when a resident reaches skilled level again.',metrics:{tradition:t.trad[id]||0},actions:[]}));
}
export function validSkillModel(s:GameState&{skillModel?:SkillModel}){
 const num=(v:unknown,hi=1e9)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=hi,o=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
 const maxDay=s.time/simulationDaySeconds+2;
 for(const u of s.units)if(u.skills!==undefined&&!validSkillRecord(u.skills,maxDay))return false;
 const m=s.skillModel;if(m===undefined)return true;
 if(!o(m)||m.version!==1||!num(m.day,maxDay)||!o(m.towns))return false;
 for(const[k,t]of Object.entries(m.towns)){if(!/^\d+$/.test(k)||!o(t)||!o(t.trad)||!o(t.peak)||!Array.isArray(t.guilds)||!Array.isArray(t.lapsed))return false;
  for(const bag of [t.trad,t.peak])for(const[id,v]of Object.entries(bag))if(!(SKILL_IDS as readonly string[]).includes(id)||!num(v,1))return false;
  for(const list of [t.guilds,t.lapsed])if(list.length>SKILL_IDS.length||!list.every(id=>(SKILL_IDS as readonly string[]).includes(id)))return false;}
 return true;
}
export {isRusty,skillAptitude};
