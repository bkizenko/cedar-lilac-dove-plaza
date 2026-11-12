import type {GameState,Unit} from './types';
import type {ProductionRecipe} from './production';

/** Personal methods already measured before capture; never a society-wide grant. */
export type CapturedMethodSnapshot={version:1;sourceTeam:number;capturedAt:number;recipes:{recipe:ProductionRecipe;successfulBatches:number;taughtBatches:number}[]};
export type CapturedMethodSource={version:1;kind:'captured';originMakerId:number;sourceTeam:number;capturedAt:number;integratedAt:number;learnedAt:number;successfulBatchesAtCapture:number;taughtBatchesAtCapture:number};
export const CAPTURED_KNOWLEDGE_RULES={maximumRecipes:256,maximumSources:8,maximumBatches:1e9} as const;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const counter=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=CAPTURED_KNOWLEDGE_RULES.maximumBatches;
const time=(v:unknown,now:number):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=now;
const team=(s:GameState,v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>=0&&Number(v)<s.tribes.length;
const id=(s:GameState,v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>0&&Number(v)<s.nextId;
const key=(r:CapturedMethodSource)=>`${r.originMakerId}:${r.sourceTeam}:${r.capturedAt}:${r.integratedAt}`;
const knows=(u:Unit,recipe:ProductionRecipe)=>{const skill=u.productionSkills?.[recipe];return !!skill&&((skill.successfulBatches||0)>0||(skill.taughtBatches||0)>0);};
// A temporary military duty does not erase remembered methods; teaching has its own availability gate.
const free=(u:Unit)=>u.hp>0&&u.type==='worker'&&!u.prisoner&&u.enslavedFrom===undefined;

/** Capture takes no credit for unfinished work or another resident's successes. */
export function snapshotCapturedMethods(s:GameState,u:Unit):CapturedMethodSnapshot{
 const recipes=Object.entries(u.productionSkills||{}).filter(([,skill])=>skill&&counter(skill.successfulBatches)&&counter(skill.taughtBatches)&&(skill.successfulBatches>0||skill.taughtBatches>0))
  .sort(([a],[b])=>a.localeCompare(b)).slice(0,CAPTURED_KNOWLEDGE_RULES.maximumRecipes)
  .map(([recipe,skill])=>({recipe:recipe as ProductionRecipe,successfulBatches:skill!.successfulBatches,taughtBatches:skill!.taughtBatches}));
 return {version:1,sourceTeam:u.team,capturedAt:s.time,recipes};
}
function validSnapshot(s:GameState,v:unknown,validRecipe:(recipe:string)=>boolean):v is CapturedMethodSnapshot{
 if(!object(v)||v.version!==1||!team(s,v.sourceTeam)||!time(v.capturedAt,s.time)||!Array.isArray(v.recipes)||v.recipes.length>CAPTURED_KNOWLEDGE_RULES.maximumRecipes)return false;
 const seen=new Set<string>();
 for(const r of v.recipes){if(!object(r)||typeof r.recipe!=='string'||!validRecipe(r.recipe)||seen.has(r.recipe)||!counter(r.successfulBatches)||!counter(r.taughtBatches)||r.successfulBatches+r.taughtBatches===0)return false;seen.add(r.recipe);}
 return true;
}
function heldPersonalMethodsMatch(u:Unit,snapshot:CapturedMethodSnapshot){
 return snapshot.recipes.every(row=>{const skill=u.productionSkills?.[row.recipe];return !!skill&&counter(skill.successfulBatches)&&counter(skill.taughtBatches)&&skill.successfulBatches>=row.successfulBatches&&skill.taughtBatches>=row.taughtBatches;});
}
/** Validate immutable origin evidence without importing the production runtime.
 * Compacted integration history may be absent; surviving matching history must
 * agree with the exact recipe and capture-time counters. */
export function validCapturedMethodSource(s:GameState,recipe:string,v:unknown):v is CapturedMethodSource{
 if(!object(v)||v.version!==1||v.kind!=='captured'||!id(s,v.originMakerId)||!team(s,v.sourceTeam)||!time(v.capturedAt,s.time)||!time(v.integratedAt,s.time)||!time(v.learnedAt,s.time)||v.capturedAt>v.integratedAt||v.integratedAt>v.learnedAt||!counter(v.successfulBatchesAtCapture)||!counter(v.taughtBatchesAtCapture)||v.successfulBatchesAtCapture+v.taughtBatchesAtCapture===0)return false;
 if(s.buildings?.some(b=>b&&b.id===v.originMakerId))return false;
 const integrations=s.captiveDealings?.integrations||[];if(!Array.isArray(integrations))return false;
 const relevant=integrations.filter(i=>i&&i.unitId===v.originMakerId&&(i.at===v.integratedAt||i.methods?.sourceTeam===v.sourceTeam&&i.methods?.capturedAt===v.capturedAt));
 for(const i of relevant){
  if(i.at!==v.integratedAt||i.originTeam!==v.sourceTeam||!i.methods||i.methods.capturedAt!==v.capturedAt||i.methods.sourceTeam!==v.sourceTeam)return false;
  if(!Array.isArray(i.methods.recipes))return false;
  const row=i.methods.recipes.find(r=>r&&r.recipe===recipe);
  if(!row||row.successfulBatches!==v.successfulBatchesAtCapture||row.taughtBatches!==v.taughtBatchesAtCapture)return false;
 }
 return true;
}
/** Pure evidence query. Custody and forced labor never confer teaching access. */
export function capturedMethodSourcesForPerson(s:GameState,u:Unit,recipe:ProductionRecipe):CapturedMethodSource[]{
 const owner=s.units.find(p=>p.id===u.id);if(!owner||!free(owner)||!knows(owner,recipe))return [];
 const result=new Map<string,CapturedMethodSource>(),skill=owner.productionSkills![recipe]!;
 for(const receipt of skill.methodSources||[])if(skill.taughtBatches>0&&skill.lastTaughtAt!==undefined&&receipt.learnedAt<=skill.lastTaughtAt&&validCapturedMethodSource(s,recipe,receipt))result.set(key(receipt),{...receipt});
 for(const integration of s.captiveDealings?.integrations||[]){
  if(integration.unitId!==owner.id||integration.captorTeam!==owner.team||!integration.methods||!Array.isArray(integration.methods.recipes))continue;
  const row=integration.methods.recipes.find(r=>r&&r.recipe===recipe);if(!row)continue;
  const receipt:CapturedMethodSource={version:1,kind:'captured',originMakerId:owner.id,sourceTeam:integration.methods.sourceTeam,capturedAt:integration.methods.capturedAt,integratedAt:integration.at,learnedAt:integration.at,successfulBatchesAtCapture:row.successfulBatches,taughtBatchesAtCapture:row.taughtBatches};
  if(validCapturedMethodSource(s,recipe,receipt))result.set(key(receipt),receipt);
 }
 return [...result.values()];
}
export function capturedRecipeSources(s:GameState,ownerTeam:number,recipes:readonly ProductionRecipe[]):CapturedMethodSource[]{
 const sources=new Map<string,CapturedMethodSource>();
 for(const u of s.units)if(u.team===ownerTeam&&free(u)&&u.productionSkills)for(const recipe of recipes)for(const source of capturedMethodSourcesForPerson(s,u,recipe)){
  const previous=sources.get(key(source));if(!previous||source.learnedAt<previous.learnedAt)sources.set(key(source),source);
 }
 return [...sources.values()];
}
/** Optional legacy fields remain optional. A copied source is a receipt of an
 * actual successful lesson, with the origin capture story kept unchanged. */
export function validCapturedKnowledgeState(s:GameState,validRecipe:(recipe:string)=>boolean){
 if(!s||!Array.isArray(s.units)||!Array.isArray(s.tribes)||!Number.isSafeInteger(s.nextId)||!time(s.time,Infinity))return false;
 const integrations=s.captiveDealings?.integrations;
 if(integrations!==undefined&&!Array.isArray(integrations))return false;
 for(const i of integrations||[]){
  if(!i||typeof i!=='object')return false;
  // Legacy rows remain governed by the established captive-dealings validator.
  // Stronger provenance requirements belong only to newly recorded methods.
  if(i.methods!==undefined){
   if(!id(s,i.unitId)||!team(s,i.originTeam)||!team(s,i.captorTeam)||i.originTeam===i.captorTeam||!time(i.at,s.time)||s.buildings?.some(b=>b&&b.id===i.unitId))return false;
   if(!validSnapshot(s,i.methods,validRecipe)||i.methods.sourceTeam!==i.originTeam||i.methods.capturedAt>i.at)return false;
   const origin=s.units.find(u=>u?.id===i.unitId);if(origin&&!heldPersonalMethodsMatch(origin,i.methods))return false;
  }
 }
 for(const u of s.units){
  if(!u||typeof u!=='object')return false;
  const custody=u.prisoner;
  if(custody?.methods!==undefined&&(!validSnapshot(s,custody.methods,validRecipe)||custody.methods.sourceTeam!==custody.originTeam||!heldPersonalMethodsMatch(u,custody.methods)))return false;
  if(u.productionSkills!==undefined&&!object(u.productionSkills))return false;
  for(const [recipe,skill]of Object.entries(u.productionSkills||{})){
   if(!validRecipe(recipe)||!skill||!object(skill))return false;
   if(skill.methodSources===undefined)continue;
   if(!Array.isArray(skill.methodSources)||skill.methodSources.length>CAPTURED_KNOWLEDGE_RULES.maximumSources||!counter(skill.taughtBatches)||skill.taughtBatches<=0||!time(skill.lastTaughtAt,s.time))return false;
   const seen=new Set<string>();for(const receipt of skill.methodSources){if(!validCapturedMethodSource(s,recipe,receipt)||receipt.learnedAt>skill.lastTaughtAt||seen.has(key(receipt)))return false;seen.add(key(receipt));}
  }
 }
 return true;
}
