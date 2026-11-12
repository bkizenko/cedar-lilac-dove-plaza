import {EQUIPMENT_LOAD_RULES} from './equipmentLoadRules';
import type {CombatRole} from './combatCounters';

/**
 * Weapon families and siege equipment as data, with pure counters, crew, ammunition and wear rules.
 *
 * BLUF: melee, ranged and siege families each have real counters (reach beats riders, piercing beats armour, blunt
 * breaks gates, missiles lose to shield walls), crews that must actually be present, ammunition that is a finite
 * stock, and wear. Nothing here creates goods or touches a save: it sits behind the existing equipment
 * primitives (weapon cargo kinds and load units are reused unchanged for spears, bows and blades) and is read by
 * whichever module equips, crafts or fires. Costs are in the same adjustable game units as the rest of the game.
 */
export type WeaponFamily='melee'|'ranged'|'siege';
export type AmmoKind='stones'|'javelins'|'arrows'|'bolts';
export type StructureClass='palisade'|'stonewall'|'gate'|'tower'|'hut';
export type WeaponCost={wood:number;stone:number;cordage:number;copper:number;iron:number};
export type WeaponSpec={
 id:string;name:string;family:WeaponFamily;role:CombatRole|'siege';age:number;
 /** Work shelter or bench the item is made at. */workplace:'townhall'|'workshop'|'forge';
 damage:number;range:number;rof:number;
 /** 0..1 fraction of armour ignored; blunt weapons carry negative pierce (armour blunts them less than blades). */pierce:number;
 /** Reach advantage against mounted attackers, 1 for none. */vsMounted:number;
 /** Multipliers against buildings. */structure:Record<StructureClass,number>;
 /** Crew that must physically operate it; 1 for personal weapons. */crew:{minimum:number;full:number};
 ammo?:{kind:AmmoKind;perShot:number};
 /** Abstract load units, as equipment load rules do. */loadUnits:number;
 /** Hits before the item is spent; repaired at a bench. */durability:number;
 cost:WeaponCost;
 /** Existing wq14 weapon cargo kind this maps onto, when it has one. */cargoKind?:'spears'|'bows'|'blades';
 note:string;
};
const flat=(m:number):Record<StructureClass,number>=>({palisade:m,stonewall:m,gate:m,tower:m,hut:m});
const cost=(c:Partial<WeaponCost>):WeaponCost=>({wood:0,stone:0,cordage:0,copper:0,iron:0,...c});
export const WEAPONS:Readonly<Record<string,WeaponSpec>>=Object.freeze({
 club:{id:'club',name:'War club',family:'melee',role:'blade',age:0,workplace:'townhall',damage:7,range:1.6,rof:1.1,pierce:-.2,vsMounted:1,structure:{palisade:.3,stonewall:.1,gate:.4,tower:.1,hut:.5},crew:{minimum:1,full:1},loadUnits:2,durability:60,cost:cost({wood:2}),note:'Cheap and brutal; poor against armour'},
 spear:{id:'spear',name:'Spear',family:'melee',role:'spear',age:1,workplace:'workshop',damage:12,range:2.6,rof:1.05,pierce:.15,vsMounted:1.25,structure:{palisade:.2,stonewall:.05,gate:.2,tower:.05,hut:.3},crew:{minimum:1,full:1},loadUnits:EQUIPMENT_LOAD_RULES.weapons.spears,durability:90,cost:cost({wood:6}),cargoKind:'spears',note:'Reach holds riders off'},
 handAxe:{id:'handAxe',name:'Hafted axe',family:'melee',role:'blade',age:1,workplace:'workshop',damage:11,range:1.7,rof:1.15,pierce:.1,vsMounted:1,structure:{palisade:.9,stonewall:.15,gate:.8,tower:.3,hut:1.1},crew:{minimum:1,full:1},loadUnits:2,durability:80,cost:cost({wood:2,stone:2,cordage:1}),note:'Chops palisades and doors'},
 bladeSword:{id:'bladeSword',name:'Sword',family:'melee',role:'blade',age:2,workplace:'forge',damage:15,range:1.9,rof:1,pierce:.2,vsMounted:1,structure:{palisade:.35,stonewall:.08,gate:.4,tower:.08,hut:.5},crew:{minimum:1,full:1},loadUnits:EQUIPMENT_LOAD_RULES.weapons.blades,durability:110,cost:cost({wood:1,copper:6}),cargoKind:'blades',note:'The all-rounder; needs smithing'},
 warPick:{id:'warPick',name:'War pick',family:'melee',role:'blade',age:2,workplace:'forge',damage:13,range:1.8,rof:.95,pierce:.55,vsMounted:1,structure:{palisade:.4,stonewall:.35,gate:.5,tower:.3,hut:.4},crew:{minimum:1,full:1},loadUnits:3,durability:95,cost:cost({wood:2,copper:5,stone:2}),note:'Punches through armour'},
 pike:{id:'pike',name:'Long pike',family:'melee',role:'spear',age:3,workplace:'workshop',damage:11,range:4.2,rof:.8,pierce:.2,vsMounted:1.4,structure:{palisade:.1,stonewall:.02,gate:.1,tower:.02,hut:.15},crew:{minimum:1,full:1},loadUnits:4,durability:85,cost:cost({wood:9,cordage:1}),note:'Only in formed ranks; cumbersome alone'},
 sling:{id:'sling',name:'Sling',family:'ranged',role:'skirmisher',age:0,workplace:'townhall',damage:6,range:14,rof:1.3,pierce:-.1,vsMounted:1,structure:flat(.02),crew:{minimum:1,full:1},ammo:{kind:'stones',perShot:1},loadUnits:1,durability:120,cost:cost({cordage:1}),note:'Stones are everywhere; weak against armour'},
 javelin:{id:'javelin',name:'Javelin',family:'ranged',role:'skirmisher',age:1,workplace:'workshop',damage:14,range:8,rof:.9,pierce:.2,vsMounted:1.1,structure:flat(.05),crew:{minimum:1,full:1},ammo:{kind:'javelins',perShot:1},loadUnits:2,durability:150,cost:cost({wood:3}),note:'Heavy short-range throw'},
 bow:{id:'bow',name:'Bow',family:'ranged',role:'archer',age:1,workplace:'workshop',damage:9,range:12,rof:1.2,pierce:.05,vsMounted:1,structure:flat(.03),crew:{minimum:1,full:1},ammo:{kind:'arrows',perShot:1},loadUnits:EQUIPMENT_LOAD_RULES.weapons.bows,durability:140,cost:cost({wood:5,cordage:2}),cargoKind:'bows',note:'Reliable at range; shield walls blunt it'},
 warBow:{id:'warBow',name:'Composite war bow',family:'ranged',role:'archer',age:3,workplace:'workshop',damage:12,range:17,rof:1.05,pierce:.35,vsMounted:1.05,structure:flat(.04),crew:{minimum:1,full:1},ammo:{kind:'arrows',perShot:1},loadUnits:3,durability:160,cost:cost({wood:6,cordage:4}),note:'Long reach and real penetration'},
 crossbow:{id:'crossbow',name:'Crossbow',family:'ranged',role:'archer',age:4,workplace:'forge',damage:18,range:15,rof:.5,pierce:.6,vsMounted:1.1,structure:flat(.06),crew:{minimum:1,full:1},ammo:{kind:'bolts',perShot:1},loadUnits:4,durability:170,cost:cost({wood:5,cordage:3,copper:4}),note:'Slow, but armour gives little cover'},
 battering_ram:{id:'battering_ram',name:'Beam ram',family:'siege',role:'siege',age:1,workplace:'workshop',damage:36,range:1,rof:.12,pierce:0,vsMounted:1,structure:{palisade:2.2,stonewall:.9,gate:3,tower:1.1,hut:2.4},crew:{minimum:2,full:4},loadUnits:30,durability:200,cost:cost({wood:24,cordage:4}),note:'Matches the existing crewed beam ram; gates fall first'},
 scalingLadder:{id:'scalingLadder',name:'Scaling ladders',family:'siege',role:'siege',age:1,workplace:'workshop',damage:0,range:1,rof:.1,pierce:0,vsMounted:1,structure:{palisade:0,stonewall:0,gate:0,tower:0,hut:0},crew:{minimum:2,full:4},loadUnits:12,durability:80,cost:cost({wood:14,cordage:6}),note:'Lets a storming party over a palisade; the defenders pay in blood'},
 mantlet:{id:'mantlet',name:'Mantlet screen',family:'siege',role:'siege',age:2,workplace:'workshop',damage:0,range:1,rof:.1,pierce:0,vsMounted:1,structure:{palisade:0,stonewall:0,gate:0,tower:0,hut:0},crew:{minimum:2,full:3},loadUnits:14,durability:120,cost:cost({wood:16,cordage:4}),note:'A carried wall of timber and hide; halves missiles on the crew behind it'},
 sapperTools:{id:'sapperTools',name:"Sappers' picks",family:'siege',role:'siege',age:2,workplace:'forge',damage:20,range:1,rof:.15,pierce:0,vsMounted:1,structure:{palisade:.6,stonewall:1.6,gate:.8,tower:1.4,hut:.8},crew:{minimum:3,full:5},loadUnits:16,durability:140,cost:cost({wood:6,copper:12,cordage:2}),note:'Undermines stone; slow and exposed'},
 ballista:{id:'ballista',name:'Bolt thrower',family:'siege',role:'siege',age:3,workplace:'forge',damage:42,range:34,rof:.25,pierce:.7,vsMounted:1.2,structure:{palisade:.45,stonewall:.2,gate:.35,tower:.3,hut:.4},crew:{minimum:2,full:3},ammo:{kind:'bolts',perShot:1},loadUnits:28,durability:160,cost:cost({wood:40,cordage:14,copper:8}),note:'Pins riders and officers at range'},
 catapult:{id:'catapult',name:'Stone thrower',family:'siege',role:'siege',age:3,workplace:'forge',damage:55,range:40,rof:.1,pierce:0,vsMounted:.9,structure:{palisade:1.2,stonewall:1,gate:1.1,tower:1.3,hut:1.6},crew:{minimum:3,full:5},ammo:{kind:'stones',perShot:3},loadUnits:36,durability:150,cost:cost({wood:60,cordage:20,copper:10}),note:'Batters walls from afar; slow and eats stones'},
 siegeTower:{id:'siegeTower',name:'Siege tower',family:'siege',role:'siege',age:4,workplace:'forge',damage:0,range:1,rof:.05,pierce:0,vsMounted:1,structure:{palisade:0,stonewall:0,gate:0,tower:0,hut:0},crew:{minimum:6,full:10},loadUnits:60,durability:220,cost:cost({wood:140,cordage:30,iron:6}),note:'Puts a storming party on the wall-walk; slow and burns'},
});
export const WEAPON_IDS=Object.freeze(Object.keys(WEAPONS));
export const weaponSpec=(id:string)=>Object.hasOwn(WEAPONS,id)?WEAPONS[id]:undefined;
export const weaponsOf=(family:WeaponFamily)=>Object.values(WEAPONS).filter(w=>w.family===family);
export const weaponsAvailable=(age:number)=>Object.values(WEAPONS).filter(w=>w.age<=age);

export const WEAPON_RULES=Object.freeze({
 version:1,
 floor:.6,ceiling:1.5,structureFloor:0,structureCeiling:3.2,
 pierceVsArmour:.8,bluntVsArmour:.85,
 rangedVsShieldWall:.65,rangedVsLoose:1.1,rangedVsMantlet:.5,
 siegeVsUnits:.5,reachVsFormedMounted:1,
 /** Wear per hit; structures are rougher on a weapon than flesh. */wearPerHit:1,wearPerStructureHit:2,
});
export type WeaponTarget={armoured?:boolean;mounted?:boolean;shieldWall?:boolean;loose?:boolean;behindMantlet?:boolean;formed?:boolean;structure?:StructureClass};
export type WeaponMatchup={multiplier:number;reasons:string[]};
const pct=(m:number)=>`×${m.toFixed(2)}`;
/** One attack's soft multipliers, bounded and readable. Against a building the structure table is the whole story. */
export function weaponMatchup(w:WeaponSpec,t:WeaponTarget):WeaponMatchup{
 const R=WEAPON_RULES,reasons:string[]=[];
 if(t.structure){
  const m=Math.max(R.structureFloor,Math.min(R.structureCeiling,w.structure[t.structure]));
  reasons.push(`${w.name} against a ${t.structure} ${pct(m)}`);return {multiplier:m,reasons};
 }
 let m=1;const add=(f:number,why:string)=>{if(Math.abs(f-1)<.005)return;m*=f;reasons.push(`${why} ${pct(f)}`);};
 if(t.armoured){if(w.pierce>0)add(1+w.pierce*R.pierceVsArmour,'Penetrates armour');else if(w.pierce<0)add(R.bluntVsArmour,'Armour blunts the blow');}
 if(t.mounted&&w.vsMounted!==1)add(w.vsMounted,w.vsMounted>1?'Reach against riders':'Poor against riders');
 if(w.family==='ranged'||w.family==='siege'&&w.ammo){
  if(t.shieldWall)add(R.rangedVsShieldWall,'Shield wall blunts missiles');
  if(t.loose)add(R.rangedVsLoose,'Loose troops have no cover');
  if(t.behindMantlet)add(R.rangedVsMantlet,'A mantlet screen takes the missiles');
 }
 if(w.family==='siege'&&!w.ammo)add(R.siegeVsUnits,'Siege gear is clumsy against people');
 if(w.id==='pike'&&!t.formed)add(.8,'A pike alone is unwieldy');
 return {multiplier:Math.max(R.floor,Math.min(R.ceiling,m)),reasons};
}

// -- crew, ammunition, wear -------------------------------------------------------------------------------------------------
/** 0 below the minimum crew, 1 at full crew, linear between; extra hands add nothing. */
export function crewEfficiency(w:WeaponSpec,crewPresent:number){
 if(!Number.isFinite(crewPresent)||crewPresent<w.crew.minimum)return 0;
 if(w.crew.full<=w.crew.minimum)return 1;
 return Math.min(1,.5+.5*(crewPresent-w.crew.minimum)/(w.crew.full-w.crew.minimum));
}
export type AmmoStock=Partial<Record<AmmoKind,number>>;
export const AMMO_KINDS:readonly AmmoKind[]=['stones','javelins','arrows','bolts'];
/** Fire up to `shots` shots. Ammunition is finite: it is only ever consumed, never conjured, and the stock is returned fresh. */
export function fire(w:WeaponSpec,stock:AmmoStock,shots:number,crewPresent=w.crew.minimum):{fired:number;stock:AmmoStock;limited:'crew'|'ammo'|null}{
 const next={...stock},want=Math.max(0,Math.floor(Number.isFinite(shots)?shots:0));
 if(crewEfficiency(w,crewPresent)<=0)return {fired:0,stock:next,limited:'crew'};
 if(!w.ammo)return {fired:want,stock:next,limited:null};
 const have=Math.max(0,Math.floor(next[w.ammo.kind]||0)),can=Math.floor(have/w.ammo.perShot),fired=Math.min(want,can);
 next[w.ammo.kind]=have-fired*w.ammo.perShot;
 return {fired,stock:next,limited:fired<want?'ammo':null};
}
/** Damage of one shot or blow against a target, with crew efficiency and the weapon's condition (0..1). */
export function weaponDamage(w:WeaponSpec,t:WeaponTarget,crewPresent=w.crew.minimum,condition=1){
 const crew=crewEfficiency(w,crewPresent);if(crew<=0||condition<=0)return 0;
 const m=weaponMatchup(w,t).multiplier;
 return w.damage*m*crew*(.6+.4*Math.max(0,Math.min(1,condition)));
}
/** Condition after `hits` hits; never below zero and never above one. */
export function wearAfter(w:WeaponSpec,condition:number,hits:number,onStructure=false){
 const loss=Math.max(0,hits)*(onStructure?WEAPON_RULES.wearPerStructureHit:WEAPON_RULES.wearPerHit)/w.durability;
 return Math.max(0,Math.min(1,condition-loss));
}
export const canAfford=(w:WeaponSpec,stock:Partial<WeaponCost>)=>(Object.keys(w.cost) as (keyof WeaponCost)[]).every(k=>(stock[k]||0)>=w.cost[k]);
export function weaponCatalogView(age:number){
 return weaponsAvailable(age).map(w=>({id:w.id,name:w.name,family:w.family,role:w.role,age:w.age,workplace:w.workplace,damage:w.damage,range:w.range,pierce:w.pierce,crew:{...w.crew},ammo:w.ammo?{...w.ammo}:null,loadUnits:w.loadUnits,durability:w.durability,cost:{...w.cost},note:w.note,
  counters:[
   weaponMatchup(w,{armoured:true}).reasons[0]??null,weaponMatchup(w,{mounted:true}).reasons[0]??null,weaponMatchup(w,{shieldWall:true}).reasons[0]??null,
   weaponMatchup(w,{structure:'gate'}).reasons[0]??null].filter((x):x is string=>!!x&&!/×1\.00/.test(x))}));
}
