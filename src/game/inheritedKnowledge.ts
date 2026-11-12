import type{Game}from'./sim';
import type{GameState,CropKind}from'./types';
import type{CommunityHandover}from'./communityHandoverTypes';
import type{ProductionRecipe}from'./production';
import type{BoatPractice}from'./boatPractice';
type BoatProof=Pick<BoatPractice,'waterMeters'|'loadedMeters'|'deliveredGoods'|'built'|'proven'>;
export type CommunityKnowledgeProof={sourceTeam:number;sourceName:string;observedAt:number;recipes:ProductionRecipe[];cultivated:CropKind[];copperPrototype?:true;sledDeliveries?:number;cartMethod?:true;boat?:BoatProof};
export type CommunityKnowledgeSnapshot={version:1;proofs:CommunityKnowledgeProof[]};
type KnowledgeRecord=CommunityHandover&{knowledge?:CommunityKnowledgeSnapshot};
const crops:CropKind[]=['grain','pulses','tubers'];
const hulls=['scoutCanoe','freightPunt']as const;
/** Frozen evidence travels with the adopted community. Never consult its former
 * owner's later work, and never credit an ownership change as new production. */
export function captureCommunityKnowledge(g:Game,r:CommunityHandover):CommunityKnowledgeSnapshot{
 const t=g.tribe(r.fromTeam),whole=r.scope==='society',people=g.state.units.filter(u=>r.residentIds.includes(u.id)&&u.hp>0),sites=g.state.buildings.filter(b=>r.siteIds.includes(b.id)&&g.finished(b));
 const recipes=Object.entries(t.productionPractice||{}).filter(([key,h])=>h&&h.batches>0&&(whole||h.makers.some(id=>people.some(u=>u.id===id&&(u.productionSkills?.[key as ProductionRecipe]?.successfulBatches||0)>0)))).map(([key])=>key as ProductionRecipe).sort();
 const cultivated=(t.cultivated||[]).filter(k=>whole||sites.some(b=>b.type==='farm'&&(b.crop?.kind||b.cropType||'grain')===k));
 const proof:CommunityKnowledgeProof={sourceTeam:t.id,sourceName:t.name,observedAt:g.state.time,recipes,cultivated:[...cultivated]};
 if(t.boatPractice){const p=t.boatPractice,boat:BoatProof={waterMeters:whole?p.waterMeters:0,loadedMeters:whole?p.loadedMeters:0,deliveredGoods:whole?p.deliveredGoods:0,built:{},proven:{}};
  for(const k of hulls){const adopted=g.state.boats?.some(b=>r.boatIds.includes(b.id)&&b.hp>0&&b.hullClass===k);if(whole||adopted){if(p.built[k])boat.built[k]=p.built[k];if(p.proven[k])boat.proven[k]=true;}}
  proof.boat=boat;
 }
 if(t.copperExperiment&&(whole||people.some(u=>u.farmTool==='copperTools'||u.farmTool==='ironTools')))proof.copperPrototype=true;
 if(whole&&t.haulagePractice)proof.sledDeliveries=t.haulagePractice;
 if(people.some(u=>u.haulage==='cart'))proof.cartMethod=true;
 const prior=whole?inheritedKnowledgeProofs(g.state,r.fromTeam):[];
 return{version:1,proofs:structuredClone([...prior.filter(p=>p.sourceTeam!==r.fromTeam),proof])};
}
/** Ownership chains must reach this recipient; later captures cannot reveal a
 * different community's history. Repeated transfers retain one dated proof. */
export function inheritedKnowledgeProofs(s:GameState,team:number){
 const records=(s.communityHandovers||[])as KnowledgeRecord[],proofs=new Map<number,CommunityKnowledgeProof>();
 for(const r of records){if(!r.knowledge)continue;let owner=r.toTeam;
  for(const next of records)if(next.id!==r.id&&next.timeSeconds>=r.timeSeconds&&next.id>r.id&&next.scope==='society'&&next.fromTeam===owner)owner=next.toTeam;
  if(owner!==team)continue;
  for(const p of r.knowledge.proofs){if(p.sourceTeam===team)continue;const old=proofs.get(p.sourceTeam);if(!old||old.observedAt<p.observedAt)proofs.set(p.sourceTeam,p);}
 }
 return[...proofs.values()].sort((a,b)=>a.sourceTeam-b.sourceTeam);
}
export function inheritedRecipeSources(s:GameState,team:number,recipe:string){return inheritedKnowledgeProofs(s,team).filter(p=>p.recipes.includes(recipe as ProductionRecipe));}
export function hasDeliveredMethod(g:Game,team:number,recipe:ProductionRecipe){return(g.tribe(team).productionPractice?.[recipe]?.batches||0)>0||inheritedRecipeSources(g.state,team,recipe).length>0||g.state.units.some(u=>u.team===team&&u.hp>0&&!u.prisoner&&u.enslavedFrom===undefined&&((u.productionSkills?.[recipe]?.successfulBatches||0)>0||(u.productionSkills?.[recipe]?.taughtBatches||0)>0));}
export function inheritedBoatProof(s:GameState,team:number):BoatProof{
 const result:BoatProof={waterMeters:0,loadedMeters:0,deliveredGoods:0,built:{},proven:{}};
 for(const p of inheritedKnowledgeProofs(s,team)){if(!p.boat)continue;for(const key of['waterMeters','loadedMeters','deliveredGoods']as const)result[key]=Math.max(result[key],p.boat[key]);for(const k of hulls){result.built[k]=Math.max(result.built[k]||0,p.boat.built[k]||0);if(p.boat.proven[k])result.proven[k]=true;}}
 return result;
}
/** Recipe names are validated against the actual runtime catalogue by the
 * caller, avoiding a production -> textile -> knowledge import cycle. */
export function validCommunityKnowledgeSnapshot(s:GameState,r:KnowledgeRecord,validRecipe?:(key:string)=>boolean){
 const k=r.knowledge;if(k===undefined)return true;
 if(!k||Object.keys(k).some(key=>!['version','proofs'].includes(key))||k.version!==1||!Array.isArray(k.proofs)||k.proofs.length>s.tribes.length)return false;
 const seen=new Set<number>(),number=(n:unknown,max=1e12)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max;
 for(const p of k.proofs){if(!p||Object.keys(p).some(key=>!['sourceTeam','sourceName','observedAt','recipes','cultivated','copperPrototype','sledDeliveries','cartMethod','boat'].includes(key))||seen.has(p.sourceTeam)||!s.tribes.some(t=>t.id===p.sourceTeam)||typeof p.sourceName!=='string'||!p.sourceName.length||p.sourceName.length>200||!number(p.observedAt,r.timeSeconds)||!Array.isArray(p.recipes)||p.recipes.length>512||new Set(p.recipes).size!==p.recipes.length||p.recipes.some(q=>typeof q!=='string'||(validRecipe?!validRecipe(q):!/^[a-zA-Z][a-zA-Z0-9]*$/.test(q)))||!Array.isArray(p.cultivated)||new Set(p.cultivated).size!==p.cultivated.length||p.cultivated.some(q=>!crops.includes(q)))return false;
  if(p.copperPrototype!==undefined&&p.copperPrototype!==true||p.cartMethod!==undefined&&p.cartMethod!==true||p.sledDeliveries!==undefined&&!number(p.sledDeliveries,60))return false;
  seen.add(p.sourceTeam);if(p.sourceTeam!==r.fromTeam&&!inheritedKnowledgeProofs({...s,communityHandovers:(s.communityHandovers||[]).filter(old=>old.id<r.id)},r.fromTeam).some(q=>JSON.stringify(q)===JSON.stringify(p)))return false;
  const b=p.boat;if(b){if(Object.keys(b).some(key=>!['waterMeters','loadedMeters','deliveredGoods','built','proven'].includes(key))||![b.waterMeters,b.loadedMeters,b.deliveredGoods].every(n=>number(n))||b.loadedMeters>b.waterMeters+1e-7||!b.built||!b.proven||Array.isArray(b.built)||Array.isArray(b.proven)||Object.keys(b.built).some(key=>!hulls.includes(key as typeof hulls[number])||!Number.isSafeInteger(b.built[key as typeof hulls[number]])||!number(b.built[key as typeof hulls[number]]))||Object.entries(b.proven).some(([key,v])=>!hulls.includes(key as typeof hulls[number])||v!==true||!(b.built[key as typeof hulls[number]]||0)))return false;}
 }
 return true;
}

export function inheritedHaulageEvidence(s:GameState,team:number){const proofs=inheritedKnowledgeProofs(s,team);return{sledDeliveries:Math.max(0,...proofs.map(p=>p.sledDeliveries||0)),cartMethod:proofs.some(p=>p.cartMethod)};}
