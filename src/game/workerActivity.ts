import {copperStudyHeld} from './materialStudy';
import type { GameState, Unit } from './types';
import { BUILDINGS } from './constants';
import { ITEM_NAMES, PRODUCTION_RECIPES, productionOutputs, productionFoodOutputs } from './production';
import { fireWarmingVisit } from './survivalNeeds';

const quantity = (n:number) => Number(n.toFixed(2));
const point = (p:{x:number;z:number}) => `${Math.round(p.x)}, ${Math.round(p.z)}`;
const bundle = (items:Record<string,number|undefined>) => Object.entries(items).filter(([,n]) => (n||0)>0).map(([k,n]) => `${quantity(n!)} ${ITEM_NAMES[k as keyof typeof ITEM_NAMES]||k}`);
const phaseNames:Record<string,string> = {collecting:'Collecting paid inputs',carrying:'Taking inputs to workshop',working:'Working',curing:'Drying',ready:'Collecting finished batch',returning:'Delivering finished batch',unloading:'Unloading paid inputs',stored:'Inputs stored',paused:'Paused'};

/** A read-only account of saved assignments, not a new planner or an ETA. */
export function workerActivity(state:GameState,u:Unit) {
 const cargo=bundle(u.itemCargo||{});
 if(u.carry>0)cargo.unshift(`${quantity(u.carry)} ${u.carryFood||u.carryType||'goods'}`);
 if((u.waterWork?.liters||0)>0)cargo.push(`${quantity(u.waterWork!.liters)} L water`);
 const p=state.production?.projects.find(p=>p.id===u.productionProjectId&&p.actorId===u.id&&!['complete','lost'].includes(p.phase));
 const b=p&&state.buildings.find(b=>b.id===p.workplace);
 const recipe=p&&PRODUCTION_RECIPES[p.recipe];
 let stage=p?phaseNames[p.phase]||p.phase:u.order==='gather'?'Gathering':u.order==='return'?'Returning goods':u.order==='build'?'Building':u.order==='idle'?'Available':u.order==='hold'?'Holding position':u.order;
 let source:string|undefined,destination:string|undefined;
 const node=u.node;
 if(!p&&node){
  const name='type' in node?BUILDINGS[node.type]?.name:'kind' in node?node.kind:'species' in node?node.species:'Assigned site';
  if(u.order==='gather')source=`${name} #${node.id} · ${point(node)}`;
  else if(u.order==='build')destination=`${name} #${node.id} · ${point(node)}`;
 }
 if(p?.phase==='collecting'&&p.cacheAnchor)source=`Paid cache · ${point(p.cacheAnchor)}`;
 if(!p&&u.waterWork){stage=u.waterWork.paused?'Water collection paused':u.waterWork.phase==='collecting'?'Collecting water':u.waterWork.phase==='outbound'?'Walking to water':'Delivering water';source=`Water source · ${point({x:u.waterWork.sourceX,z:u.waterWork.sourceZ})}`;}
 if(p&&b&&['carrying','working','ready','curing'].includes(p.phase))destination=`${BUILDINGS[b.type].name} #${b.id} · ${point(b)}`;
 if(['move','explore','return','attackmove'].includes(u.order)||p&&['collecting','returning','unloading'].includes(p.phase))destination=`Current waypoint · ${point({x:u.tx,z:u.tz})}`;
 if(u.garmentRepair&&u.garmentRepair.phase!=='paused'){const w=u.garmentRepair,b=state.buildings.find(b=>b.id===w.workplaceId);stage=w.phase==='paused'?'Garment repair paused':w.phase==='working'?'Repairing original garment':'Carrying garment to tailor';destination=b?`${BUILDINGS[b.type].name} #${b.id} · ${point(b)}`:undefined;}
 if(u.husbandryWork?.phase.startsWith('bedding')){const w=u.husbandryWork,b=state.buildings.find(b=>b.id===w.pen);stage=w.phase==='beddingFetch'?'Fetching straw bedding':w.phase==='beddingLay'?'Laying straw bedding':w.phase==='beddingReturn'?'Returning carried bedding':'Carrying bedding to pen';destination=w.phase==='beddingFetch'||w.phase==='beddingReturn'?`Cache waypoint · ${point({x:u.tx,z:u.tz})}`:b?`Animal pen #${b.id} · ${point(b)}`:undefined;}
 if(u.armorRepair){const w=u.armorRepair,b=state.buildings.find(b=>b.id===w.workplaceId);stage=w.phase==='paused'?'Armor repair paused':w.phase==='working'?'Repairing original armor':'Carrying armor to tailor';destination=b?`${BUILDINGS[b.type].name} #${b.id} · ${point(b)}`:undefined;}
 if(u.tradedTeaching){const offer=state.teachingOffers?.find(o=>o.id===u.tradedTeaching!.offerId);if(offer){stage=offer.phase==='returning'?'Bringing learned method home':offer.phase==='observing'?'Observing foreign artisan':offer.phase==='armed'?'Waiting for agreed demonstration':'Carrying teaching payment';destination=`${offer.phase==='returning'?'Home cache':'Teaching workshop'} · ${point({x:u.tx,z:u.tz})}`;}}
 if(u.copperStudy){const w=u.copperStudy;stage=w.paused?'Copper trial paused':w.phase==='loading'?'Loading prototype inputs':w.phase==='working'?'Testing copper prototype':'Carrying prototype inputs';destination=`Crafting shelter #${w.workplace}`;}
 const warmth=fireWarmingVisit(state,u);
 if(warmth){stage=warmth.atFire?'Warming at fire':'Walking to warmth';destination=`Lit hearth #${warmth.fireId} · ${point(warmth)}`;}
 const blocked=p?.blockedReason||(u.stuckT>3?`Movement blocked · ${Math.floor(u.stuckT)}s`:undefined);
 let batchCargo:string[]=[];if(u.copperStudy?.paid){const p=copperStudyHeld(u);batchCargo.push(`${p.copper} copper · ${(p.charcoal||p.wood).toFixed(1)} ${u.copperStudy.fuel==='charcoal'?'charcoal':'logs'} held in prototype`);}
 if(p&&recipe){
  if(p.phase==='carrying'||p.phase==='unloading'||p.phase==='paused'&&['carrying','unloading'].includes(p.resumePhase))batchCargo=[...bundle(recipe.inputs),...Object.entries(recipe.foodInputs||{}).map(([k,n])=>`${quantity(n!)} ${k}`),...(recipe.grain?[`${recipe.grain} clean grain`]:[]),...(recipe.wood?[`${recipe.wood} logs`]:[]),...(recipe.water?[`${recipe.water} L water`]:[])];
  if(p.phase==='returning')batchCargo=[...bundle(productionOutputs(p)),...Object.entries(productionFoodOutputs(p)).filter(([,n])=>(n||0)>0).map(([kind,n])=>`${quantity(n!)} ${kind}`)];
 }
 if(u.armorRepair)batchCargo.push(`Original padded armor #${u.armorRepair.armorId}`,...bundle(u.armorRepair.paid));
 if(u.garmentRepair)batchCargo.push(`Original ${ITEM_NAMES[u.garmentRepair.garment.item]}`,...bundle(u.garmentRepair.paid));
 return {stage,source,destination,cargo,batchCargo,blocked,recipe:recipe?.name,projectId:p?.id,progress:p&&recipe?Math.min(1,p.progress/recipe.workSeconds):undefined,workSeconds:p?.progress,requiredWorkSeconds:recipe?.workSeconds,batchAgeSeconds:p?Math.max(0,state.time-p.started):undefined};
}
