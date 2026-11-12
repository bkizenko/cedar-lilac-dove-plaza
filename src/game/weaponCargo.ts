import {EQUIPMENT_LOAD_RULES} from './equipmentLoadRules';
import type {Game} from './sim';
import type {GameState,Unit} from './types';
import {supplyDrops,supplyApproach,supplyReached,type SupplyDrop} from './campAnchor';
import {connectedForUnit} from './waterTravel';
export const WEAPON_CARGO_KINDS=['spears','bows','blades'] as const;
export type WeaponCargoKind=typeof WEAPON_CARGO_KINDS[number];
export type WeaponCargo=Partial<Record<WeaponCargoKind,number>>;
export type DroppedWeaponCargo={id:number;team:number;x:number;z:number;droppedAt:number;stock:WeaponCargo};
/** Game load units, not historical kilograms. Carried weapons never arm their holder. */
export const WEAPON_CARGO_LOAD_UNITS=EQUIPMENT_LOAD_RULES.weapons;
export const WEAPON_CARGO_RULES={maximumCarrierUnits:40,maximumGroundBundles:128,maximumGroundCount:10000000,pickupMeters:1.8,mergeMeters:1.8} as const;
export type WeaponCargoResult={accepted:boolean;reason:string};
const known=(kind:unknown):kind is WeaponCargoKind=>typeof kind==='string'&&(WEAPON_CARGO_KINDS as readonly string[]).includes(kind);
const positive=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>0;
export function weaponCargoLoad(u:Pick<Unit,'weaponCargo'>){return WEAPON_CARGO_KINDS.reduce((sum,k)=>sum+(u.weaponCargo?.[k]||0)*WEAPON_CARGO_LOAD_UNITS[k],0);}
const no=(reason:string):WeaponCargoResult=>({accepted:false,reason});
const yes=(reason:string):WeaponCargoResult=>({accepted:true,reason});
function reached(g:Game,u:Unit,team:number,cacheId?:number):SupplyDrop|undefined{
 if(!Number.isInteger(team)||!g.state.tribes[team])return undefined;
 return supplyDrops(g,team).find(drop=>(cacheId===undefined||drop.kind!=='camp'&&drop.id===cacheId)&&(()=>{const at=supplyApproach(g,u,drop);return !!at&&supplyReached(g,u,drop,at);})());
}
function receiver(g:Game,id:number){return g.state.units.find(u=>u.id===id&&u.hp>0&&!u.prisoner);}
function clearEmpty(u:Unit){if(!WEAPON_CARGO_KINDS.some(k=>(u.weaponCargo?.[k]||0)>0))delete u.weaponCargo;}
/** Caller authorizes a trade/transfer; stock changes only at an actually reached cache. */
export function loadWeaponCargo(g:Game,unitId:number,kind:WeaponCargoKind,amount:number,sourceTeam?:number,cacheId?:number):WeaponCargoResult{
 const u=receiver(g,unitId);if(!u||!known(kind)||!positive(amount))return no('Choose a living carrier, weapon kind and whole positive amount');
 const team=sourceTeam??u.team;if(!reached(g,u,team,cacheId))return no('Walk to the actual source cache');
 const stock=g.tribe(team);if(!Number.isSafeInteger(stock[kind])||stock[kind]<amount)return no('Not enough real weapons remain in that cache');
 if(weaponCargoLoad(u)+(u.armorCargoId===undefined?0:EQUIPMENT_LOAD_RULES.armor)+(u.farmToolCargoId===undefined?0:EQUIPMENT_LOAD_RULES.farmTool)+amount*WEAPON_CARGO_LOAD_UNITS[kind]>WEAPON_CARGO_RULES.maximumCarrierUnits)return no('Weapon bundle exceeds carrier load');
 stock[kind]-=amount;(u.weaponCargo??={})[kind]=(u.weaponCargo?.[kind]||0)+amount;return yes('Existing weapons loaded onto the carrier');
}
export function deliverWeaponCargo(g:Game,unitId:number,kind:WeaponCargoKind,amount:number,targetTeam?:number,cacheId?:number):WeaponCargoResult{
 const u=receiver(g,unitId);if(!u||!known(kind)||!positive(amount)||(u.weaponCargo?.[kind]||0)<amount)return no('Actual carried weapon amount is unavailable');
 const team=targetTeam??u.team;if(!reached(g,u,team,cacheId))return no('The weapon carrier must reach the receiving cache');
 const stock=g.tribe(team),total=stock[kind]+amount;if(!Number.isSafeInteger(total)||total>1e12)return no('Receiving weapon stock limit reached');
 stock[kind]=total;u.weaponCargo![kind]!-=amount;clearEmpty(u);return yes('Actual carried weapons delivered');
}
/** Death never refunds society stock or silently loses a saturated parcel. */
export function reconcileWeaponCargo(g:Game){
 for(const u of g.state.units){if(u.hp>0||!u.weaponCargo)continue;
  if(!Number.isFinite(u.x)||!Number.isFinite(u.z)||Math.abs(u.x)>g.world.size/2||Math.abs(u.z)>g.world.size/2)continue;
  const drops=g.state.droppedWeaponCargo??=[],near=drops.find(p=>p.team===u.team&&Math.hypot(p.x-u.x,p.z-u.z)<=WEAPON_CARGO_RULES.mergeMeters&&WEAPON_CARGO_KINDS.every(k=>(p.stock[k]||0)+(u.weaponCargo?.[k]||0)<=WEAPON_CARGO_RULES.maximumGroundCount));
  if(near){for(const k of WEAPON_CARGO_KINDS){const n=u.weaponCargo[k]||0;if(n)near.stock[k]=(near.stock[k]||0)+n;}delete u.weaponCargo;continue;}
  if(drops.length>=WEAPON_CARGO_RULES.maximumGroundBundles)continue; // Game retains this real dead holder until a slot is available.
  drops.push({id:g.id(),team:u.team,x:u.x,z:u.z,droppedAt:g.state.time,stock:{...u.weaponCargo}});delete u.weaponCargo;
 }
}
export function pickupWeaponCargo(g:Game,unitId:number,bundleId:number,kind:WeaponCargoKind,amount:number):WeaponCargoResult{
 const u=receiver(g,unitId),drop=g.state.droppedWeaponCargo?.find(p=>p.id===bundleId);if(!u||!drop||!known(kind)||!positive(amount)||(drop.stock[kind]||0)<amount)return no('Actual ground weapons are unavailable');
 const distance=Math.hypot(u.x-drop.x,u.z-drop.z);if(distance>WEAPON_CARGO_RULES.pickupMeters||!connectedForUnit(g,u,drop.x,drop.z))return no('Walk to the actual dropped weapon bundle');
 let probe=u;const steps=Math.max(1,Math.ceil(distance/.4));for(let i=1;i<=steps;i++){const x=u.x+(drop.x-u.x)*i/steps,z=u.z+(drop.z-u.z)*i/steps;if(!g.canStep(probe,x,z))return no('No clear approach to the dropped weapons');probe={...u,x,z,y:g.travelHeight(x,z)};}
 if(weaponCargoLoad(u)+(u.armorCargoId===undefined?0:EQUIPMENT_LOAD_RULES.armor)+(u.farmToolCargoId===undefined?0:EQUIPMENT_LOAD_RULES.farmTool)+amount*WEAPON_CARGO_LOAD_UNITS[kind]>WEAPON_CARGO_RULES.maximumCarrierUnits)return no('Weapon bundle exceeds carrier load');
 (u.weaponCargo??={})[kind]=(u.weaponCargo?.[kind]||0)+amount;drop.stock[kind]!-=amount;
 if(!WEAPON_CARGO_KINDS.some(k=>(drop.stock[k]||0)>0))g.state.droppedWeaponCargo=g.state.droppedWeaponCargo!.filter(p=>p!==drop);return yes('Existing ground weapons picked up');
}
function stockValid(value:unknown,max:number){return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.entries(value).length>0&&Object.entries(value).every(([k,n])=>known(k)&&typeof n==='number'&&Number.isSafeInteger(n)&&n>=0&&n<=max)&&Object.values(value).some(n=>typeof n==='number'&&n>0);}
export function validWeaponCargoState(s:GameState){
 for(const u of s.units)if(u.weaponCargo!==undefined&&(!stockValid(u.weaponCargo,WEAPON_CARGO_RULES.maximumCarrierUnits)||weaponCargoLoad(u)>WEAPON_CARGO_RULES.maximumCarrierUnits))return false;
 const parcels=s.droppedWeaponCargo;if(parcels===undefined)return true;if(!Array.isArray(parcels)||parcels.length>WEAPON_CARGO_RULES.maximumGroundBundles)return false;
 const occupied=new Set([...s.units,...s.buildings,...s.trees,...s.stones,...s.forage,...s.fish,...s.copper,...s.iron,...s.wildlife,...(s.livestock||[]),...(s.boats||[]),...(s.production?.projects||[]),...(s.haulageProjects||[]),...(s.armor?.assets||[]),...(s.clay?.deposits||[]),...(s.fibre?.patches||[]),...(s.droppedCargo?.parcels||[])].map(e=>e.id));
 const ids=new Set<number>(),half=(s.worldOptions?.size??1040)/2;
 for(const p of parcels){if(!p||!positive(p.id)||p.id>=s.nextId||ids.has(p.id)||occupied.has(p.id)||!Number.isInteger(p.team)||!s.tribes[p.team]||!Number.isFinite(p.x)||!Number.isFinite(p.z)||Math.abs(p.x)>half||Math.abs(p.z)>half||!Number.isFinite(p.droppedAt)||p.droppedAt<0||p.droppedAt>s.time||!stockValid(p.stock,WEAPON_CARGO_RULES.maximumGroundCount))return false;ids.add(p.id);}
 return true;
}
