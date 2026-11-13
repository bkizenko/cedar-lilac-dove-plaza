import {itemPackedLiters,INVENTORY_VOLUME_RULES} from './inventoryVolume';
import type {Game} from './sim';
import type {GameState,Unit} from './types';
import type {CommunityHandover} from './communityHandoverTypes';
import {connectedForUnit} from './waterTravel';
import {itemCapacity,storedItemUnits} from './production';
import {supplyDrops,supplyApproach,supplyReached,type SupplyDrop} from './campAnchor';
/** Adjustable game coefficients; inventory units are not historical kilograms. */
import {ARMOR_RULES} from './armorRules';
export {ARMOR_RULES} from './armorRules';
export type ArmorHolder={kind:'unit';id:number;x:number;z:number}|{kind:'carried';id:number;x:number;z:number}|{kind:'cache';x:number;z:number;buildingId?:number}|{kind:'ground';x:number;z:number};
export type ArmorAsset={id:number;team:number;kind:'paddedTorso';condition:number;projectId:number;createdAt:number;holder:ArmorHolder};
export type ArmorState={version:1;assets:ArmorAsset[];metrics:{crafted:number;damagePrevented:number}};
type ArmorGameState=GameState&{armor?:ArmorState};
const state=(g:Game)=> (g.state as ArmorGameState).armor??={version:1,assets:[],metrics:{crafted:0,damagePrevented:0}};
const indexes=new WeakMap<ArmorState,{revision:number;byUnit:Map<number,ArmorAsset>}>(),revisions=new WeakMap<ArmorState,number>();
function changed(s:ArmorState){revisions.set(s,(revisions.get(s)||0)+1);}
export function wornArmor(g:Game,u:Unit){const s=(g.state as ArmorGameState).armor;if(!s)return undefined;const revision=revisions.get(s)||0;let index=indexes.get(s);if(!index||index.revision!==revision){index={revision,byUnit:new Map(s.assets.filter(a=>a.holder.kind==='unit').map(a=>[(a.holder as {id:number}).id,a]))};indexes.set(s,index);}return index.byUnit.get(u.id);}
export function armorMovementMultiplier(g:Game,u:Unit){return u.boat?.phase==='aboard'?1:wornArmor(g,u)?ARMOR_RULES.movementMultiplier:1;}
export function armorStoredUnits(g:Game,team:number){return ((g.state as ArmorGameState).armor?.assets||[]).filter(a=>a.team===team&&a.holder.kind==='cache').length*itemPackedLiters('paddedArmor')/INVENTORY_VOLUME_RULES.litersPerStorageUnit;}
function cacheHolder(drop:SupplyDrop):ArmorHolder{return{kind:'cache',x:drop.x,z:drop.z,...(drop.kind==='camp'?{}:{buildingId:drop.id})};}
function reachedCache(g:Game,u:Unit){return supplyDrops(g,u.team).find(drop=>{const p=supplyApproach(g,u,drop);return p&&supplyReached(g,u,drop,p);});}
const repairClaimed=(g:Game,id:number)=>g.state.units.some(u=>u.armorRepair?.armorId===id);
export type ArmorMoveResult={accepted:boolean;reason:string};
/** Cargo is a physical holder, never worn protection or covered-cache stock. */
export function armorCarriedUnits(g:Game,unitId:number){return ((g.state as ArmorGameState).armor?.assets||[]).filter(a=>a.holder.kind==='carried'&&a.holder.id===unitId).length*ARMOR_RULES.loadUnits;}
function heldBody(g:Game,h:ArmorHolder){return h.kind==='unit'||h.kind==='carried'?g.state.units.find(u=>u.id===h.id):undefined;}
function matchingDrop(g:Game,team:number,h:Extract<ArmorHolder,{kind:'cache'}>){return supplyDrops(g,team).find(d=>Math.hypot(d.x-h.x,d.z-h.z)<.01&&(d.kind==='camp'?h.buildingId===undefined:d.id===h.buildingId));}
function reachesDrop(g:Game,u:Unit,drop:SupplyDrop){const spot=supplyApproach(g,u,drop);return !!spot&&supplyReached(g,u,drop,spot);}
function reachesPoint(g:Game,u:Unit,x:number,z:number){
 const distance=Math.hypot(u.x-x,u.z-z);if(distance>ARMOR_RULES.pickupRadius||!connectedForUnit(g,u,x,z))return false;
 const samples=Math.max(1,Math.ceil(distance/.4));let probe=u;
 for(let i=1;i<=samples;i++){const px=u.x+(x-u.x)*i/samples,pz=u.z+(z-u.z)*i/samples;if(!g.canStep(probe,px,pz))return false;probe={...u,x:px,z:pz,y:g.travelHeight(px,pz)};}return true;
}
/** Physical custody primitive. Caller authorizes the trade/capture; this function
 * never prices goods, creates assets, credits stock or changes provenance/condition. */
/** Taking carried armor from someone by force, within the contact distance the demand already required. The same asset moves into the taker's hands
 * (team follows the holder, condition and provenance stay); nothing is copied. A repair in progress or an already-loaded taker refuses. */
export function robCarriedArmor(g:Game,victimId:number,robberId:number):ArmorMoveResult{
 const no=(reason:string):ArmorMoveResult=>({accepted:false,reason}),s=(g.state as ArmorGameState).armor,victim=g.state.units.find(u=>u.id===victimId),robber=g.state.units.find(u=>u.id===robberId&&u.hp>0&&!u.prisoner);
 const a=s?.assets.find(x=>x.holder.kind==='carried'&&x.holder.id===victimId);
 if(!s||!a||!victim||!robber)return no('No carried armor to take');
 if(repairClaimed(g,a.id))return no('Armor under repair stays with its owner');
 if(robber.armorCargoId!==undefined||s.assets.some(o=>o.id!==a.id&&o.holder.kind==='carried'&&o.holder.id===robber.id))return no('The taker already carries armor');
 if(Math.hypot(robber.x-victim.x,robber.z-victim.z)>ARMOR_RULES.pickupRadius*2.5)return no('Close in on the person first');
 delete victim.armorCargoId;a.team=robber.team;a.holder={kind:'carried',id:robber.id,x:robber.x,z:robber.z};robber.armorCargoId=a.id;changed(s);
 return{accepted:true,reason:'Their carried armor taken'};
}
export function moveArmorAsset(g:Game,armorId:number,next:ArmorHolder,targetTeam?:number):ArmorMoveResult{
 const no=(reason:string):ArmorMoveResult=>({accepted:false,reason}),s=(g.state as ArmorGameState).armor,a=s?.assets.find(a=>a.id===armorId);
 if(!s||!a)return no('Existing armor asset is unavailable');
 if(repairClaimed(g,a.id))return no('Finish or cancel the paid armor repair before moving this asset');
 if(!next||!['unit','carried','cache','ground'].includes(next.kind))return no('Invalid armor holder');
 const half=g.world.size/2+32;if(!Number.isFinite(next.x)||!Number.isFinite(next.z)||Math.abs(next.x)>half||Math.abs(next.z)>half)return no('Invalid armor holder position');
 if(targetTeam!==undefined&&(!Number.isInteger(targetTeam)||!g.state.tribes[targetTeam]))return no('Invalid receiving society');
 const source=a.holder,sourceBody=heldBody(g,source),sourceX=sourceBody?.x??source.x,sourceZ=sourceBody?.z??source.z;
 let holder:ArmorHolder,team=a.team;
 if(next.kind==='unit'||next.kind==='carried'){
  const body=g.state.units.find(u=>u.id===next.id&&u.hp>0&&!u.prisoner);if(!body)return no('Living receiving resident is unavailable');
  team=targetTeam??body.team;if(team!==body.team)return no('Carried or worn armor must follow its actual resident');
  if(source.kind==='cache'){const drop=matchingDrop(g,a.team,source);if(!drop||!reachesDrop(g,body,drop))return no('Walk to the armor’s actual cache');}
  else if(sourceBody?.id!==body.id&&!reachesPoint(g,body,sourceX,sourceZ))return no('Reach the actual armor holder before transferring it');
  if(next.kind==='carried'&&(body.armorCargoId!==undefined&&body.armorCargoId!==a.id||s.assets.some(other=>other.id!==a.id&&other.holder.kind==='carried'&&other.holder.id===body.id)))return no('This resident already carries another armor asset');
  if(next.kind==='unit'){
   if(!(source.kind==='unit'&&source.id===body.id)){const issue=armorEquipIssue(g,body.id,a.id);if(issue)return no(issue);}
   const worn=wornArmor(g,body);if(worn&&worn.id!==a.id)return no('Put away the current armor first');
   if(source.kind==='carried')return no('Unload carried armor at a real cache before wearing it');
  }
  holder={kind:next.kind,id:body.id,x:body.x,z:body.z};
 }else if(next.kind==='cache'){
  const building=next.buildingId===undefined?undefined:g.state.buildings.find(b=>b.id===next.buildingId);
  team=targetTeam??building?.team??a.team;const drop=matchingDrop(g,team,next);if(!drop)return no('Choose an actual receiving cache');
  if(source.kind==='cache'&&source.buildingId===next.buildingId&&Math.hypot(source.x-next.x,source.z-next.z)<.01&&a.team===team)return{accepted:true,reason:'Armor already rests at this cache'};
  if(!sourceBody||sourceBody.hp<=0||!reachesDrop(g,sourceBody,drop))return no('The actual armor carrier must reach the receiving cache');
  if(storedItemUnits(g,team)+itemPackedLiters('paddedArmor')/INVENTORY_VOLUME_RULES.litersPerStorageUnit>itemCapacity(g,team)+INVENTORY_VOLUME_RULES.comparisonEpsilonUnits)return no('Receiving material cache is full; armor remains with its carrier');
  holder=cacheHolder(drop);
 }else{
  if(Math.hypot(next.x-sourceX,next.z-sourceZ)>.01)return no('Armor can only be laid down at its actual holder position');
  team=targetTeam??a.team;holder={kind:'ground',x:sourceX,z:sourceZ};
 }
 if(source.kind==='carried'&&sourceBody?.armorCargoId===a.id)delete sourceBody.armorCargoId;
 a.team=team;a.holder=holder;if(holder.kind==='carried')g.state.units.find(u=>u.id===holder.id)!.armorCargoId=a.id;changed(s);return{accepted:true,reason:'Existing armor moved with its condition and provenance'};
}
export function armorDeliveryIssue(g:Game){return ((g.state as ArmorGameState).armor?.assets.length||0)>=ARMOR_RULES.maximumAssets?'Armor storage record limit reached':null;}
/** Called only by completed paid production at its physically reached cache. */
export function deliverProducedArmor(g:Game,u:Unit,projectId:number){const existing=(g.state as ArmorGameState).armor?.assets.find(a=>a.projectId===projectId);if(existing)return true;if(armorDeliveryIssue(g))return false;const drop=reachedCache(g,u);const project=g.state.production?.projects.find(p=>p.id===projectId&&p.actorId===u.id&&p.team===u.team&&p.recipe==='sewPaddedArmor'&&p.phase==='returning'&&p.progress>=ARMOR_RULES.workSeconds);if(!drop||!project)return false;const s=state(g),outside=storedItemUnits(g,u.team)+itemPackedLiters('paddedArmor')/INVENTORY_VOLUME_RULES.litersPerStorageUnit>itemCapacity(g,u.team)+INVENTORY_VOLUME_RULES.comparisonEpsilonUnits;s.assets.push({id:g.id(),team:u.team,kind:'paddedTorso',condition:1,projectId,createdAt:g.state.time,holder:outside?{kind:'ground',x:u.x,z:u.z}:cacheHolder(drop)});s.metrics.crafted++;changed(s);return true;}
export function armorEquipIssue(g:Game,unitId:number,armorId:number){if(repairClaimed(g,armorId))return'Cancel the paid armor repair before equipping this asset';const u=g.state.units.find(u=>u.id===unitId&&u.hp>0&&!u.prisoner),a=(g.state as ArmorGameState).armor?.assets.find(a=>a.id===armorId);if(!u||!a)return'Choose a living resident and existing armor';if(wornArmor(g,u))return'Put away the current armor first';if(a.holder.kind==='unit')return'This armor is already worn';if(a.holder.kind==='carried')return'This armor is cargo; unload it at a real cache first';if(a.holder.kind==='ground'){const h=a.holder,d=Math.hypot(u.x-h.x,u.z-h.z);if(d>ARMOR_RULES.pickupRadius||!connectedForUnit(g,u,h.x,h.z))return'Walk to the dropped armor';let probe=u;for(let i=1;i<=Math.max(1,Math.ceil(d/.4));i++){const f=i/Math.max(1,Math.ceil(d/.4)),x=u.x+(h.x-u.x)*f,z=u.z+(h.z-u.z)*f;if(!g.canStep(probe,x,z))return'No clear approach to the dropped armor';probe={...u,x,z,y:g.travelHeight(x,z)};}return null;}if(a.team!==u.team)return'This cache belongs to another village';const drop=reachedCache(g,u);if(!drop||Math.hypot(drop.x-a.holder.x,drop.z-a.holder.z)>.01||(drop.kind==='camp'?a.holder.buildingId!==undefined:drop.id!==a.holder.buildingId))return'Walk to the armor’s actual cache';return null;}
export function equipArmor(g:Game,unitId:number,armorId:number){const issue=armorEquipIssue(g,unitId,armorId);if(issue)return{accepted:false,reason:issue};const u=g.state.units.find(u=>u.id===unitId)!,s=state(g),a=s.assets.find(a=>a.id===armorId)!;a.team=u.team;a.holder={kind:'unit',id:u.id,x:u.x,z:u.z};changed(s);return{accepted:true,reason:'Padded armor equipped'};}
export function unequipArmor(g:Game,unitId:number){const u=g.state.units.find(u=>u.id===unitId&&u.hp>0&&!u.prisoner),a=u&&wornArmor(g,u),drop=u&&reachedCache(g,u);if(!u||!a||!drop)return{accepted:false,reason:'Walk to a real cache to put away armor'};if(repairClaimed(g,a.id))return{accepted:false,reason:'Cancel the paid armor repair before moving this asset'};const outside=storedItemUnits(g,u.team)+itemPackedLiters('paddedArmor')/INVENTORY_VOLUME_RULES.litersPerStorageUnit>itemCapacity(g,u.team)+INVENTORY_VOLUME_RULES.comparisonEpsilonUnits;a.holder=outside?{kind:'ground',x:u.x,z:u.z}:cacheHolder(drop);changed(state(g));return{accepted:true,reason:outside?'Armor laid beside the full cache':'Armor stored with its existing condition'};}
/** Combat-only: hunger/cold/illness never call this. Protection falls with wear. */
export function armorCombatDamage(g:Game,u:Unit,incoming:number){if(!Number.isFinite(incoming)||incoming<=0)return incoming;const a=wornArmor(g,u);if(!a||a.condition<=0)return incoming;const prevented=incoming*ARMOR_RULES.protection*a.condition;a.condition=Math.max(0,a.condition-incoming*ARMOR_RULES.conditionLossPerIncomingDamage);state(g).metrics.damagePrevented+=prevented;return incoming-prevented;}
/** Ownership follows a captured living holder; deaths/ruined caches leave equipment on real ground. */
export function reconcileArmorHolders(g:Game){const s=(g.state as ArmorGameState).armor;if(!s)return;const units=new Map(g.state.units.map(u=>[u.id,u])),buildings=new Map(g.state.buildings.map(b=>[b.id,b])),drops=new Map<number,SupplyDrop[]>();let moved=false;for(const a of s.assets){if(a.holder.kind==='unit'||a.holder.kind==='carried'){const h=a.holder,u=units.get(h.id);if(u&&u.hp>0){a.team=u.team;h.x=u.x;h.z=u.z;if(h.kind==='carried')u.armorCargoId=a.id;}else{if(h.kind==='carried'&&u?.armorCargoId===a.id)delete u.armorCargoId;a.holder={kind:'ground',x:u?.x??h.x,z:u?.z??h.z};moved=true;}}else if(a.holder.kind==='cache'){const h=a.holder;if(!drops.has(a.team))drops.set(a.team,supplyDrops(g,a.team));const drop=drops.get(a.team)!.find(d=>Math.hypot(d.x-h.x,d.z-h.z)<.01&&(d.kind==='camp'?h.buildingId===undefined:d.id===h.buildingId));if(!drop){const b=h.buildingId===undefined?undefined:buildings.get(h.buildingId);if(b&&g.finished(b)){a.team=b.team;}else{a.holder={kind:'ground',x:h.x,z:h.z};moved=true;}}}}if(moved)changed(s);}
/** Settle only records physically included in this handover; never duplicate assets. */
export function settleArmorHandover(s:GameState,r:CommunityHandover){const v=(s as ArmorGameState).armor;if(!v)return;const residents=new Set(r.residentIds),sites=new Set(r.siteIds);for(const a of v.assets){if(a.team!==r.fromTeam)continue;const h=a.holder,unit=(h.kind==='unit'||h.kind==='carried')&&residents.has(h.id),site=h.kind==='cache'&&h.buildingId!==undefined&&sites.has(h.buildingId),camp=h.kind==='cache'&&h.buildingId===undefined&&r.scope==='society'&&r.cacheAnchor?.kind==='camp'&&Math.hypot(h.x-r.cacheAnchor.x,h.z-r.cacheAnchor.z)<.01;if(unit||site||camp){a.team=r.toTeam;if(h.kind==='carried'){const carrier=s.units.find(u=>u.id===h.id);if(carrier)carrier.armorCargoId=a.id;}}}changed(v);}
export function validArmorState(s:GameState){const v=(s as ArmorGameState).armor;if(v===undefined)return !s.units.some(u=>u.armorCargoId!==undefined);if(!v||typeof v!=='object')return false;const finite=(n:unknown,max=1e12)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max,id=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>0&&Number(n)<s.nextId;if(v.version!==1||!Array.isArray(v.assets)||v.assets.length>ARMOR_RULES.maximumAssets||!v.metrics||!Number.isSafeInteger(v.metrics.crafted)||v.metrics.crafted<0||v.metrics.crafted!==v.assets.length||!finite(v.metrics.damagePrevented))return false;const occupiedIds=new Set([...s.units,...s.buildings,...s.trees,...s.stones,...s.forage,...s.fish,...s.copper,...s.iron,...s.wildlife,...(s.livestock||[]),...(s.production?.projects||[]),...(s.clay?.deposits||[])].map(v=>v.id));const ids=new Set<number>(),projects=new Set<number>(),wearers=new Set<number>(),carriers=new Set<number>(),half=(s.worldOptions?.size||1040)/2+32;for(const a of v.assets){if(!a||!id(a.id)||ids.has(a.id)||occupiedIds.has(a.id)||a.kind!=='paddedTorso'||!Number.isInteger(a.team)||!s.tribes[a.team]||!id(a.projectId)||a.projectId===a.id||v.assets.some(other=>other?.projectId===a.id)||projects.has(a.projectId)||!finite(a.createdAt,s.time)||!finite(a.condition,1)||!a.holder)return false;ids.add(a.id);projects.add(a.projectId);const p=s.production?.projects.find(p=>p.id===a.projectId);if(p&&(p.recipe!=='sewPaddedArmor'||p.phase!=='complete'))return false;const h=a.holder;if(h.kind==='unit'||h.kind==='carried'){if(!Number.isFinite(h.x)||!Number.isFinite(h.z)||Math.abs(h.x)>half||Math.abs(h.z)>half||!id(h.id)||h.kind==='unit'&&wearers.has(h.id)||!s.units.some(u=>u.id===h.id&&u.team===a.team))return false;if(h.kind==='unit')wearers.add(h.id);else{if(carriers.has(h.id)||!s.units.some(u=>u.id===h.id&&u.armorCargoId===a.id))return false;carriers.add(h.id);}}else if(h.kind==='cache'||h.kind==='ground'){if(!Number.isFinite(h.x)||!Number.isFinite(h.z)||Math.abs(h.x)>half||Math.abs(h.z)>half||h.kind==='cache'&&h.buildingId!==undefined&&(!id(h.buildingId)||!s.buildings.some(b=>b.id===h.buildingId&&b.team===a.team&&b.hp>0&&b.build>=1&&Math.hypot(b.x-h.x,b.z-h.z)<.01)))return false;}else return false;}for(const u of s.units)if(u.armorCargoId!==undefined&&(!id(u.armorCargoId)||!v.assets.some(a=>a.id===u.armorCargoId&&a.team===u.team&&a.holder.kind==='carried'&&a.holder.id===u.id)))return false;return true;}
