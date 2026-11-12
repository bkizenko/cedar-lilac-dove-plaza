/**
 * Ship designs and naval counters: pure data and pure functions, no Game.
 *
 * BLUF: each design rides on one of the existing hull classes (so seats, hit points, practice and art are
 * untouched) and adds a fighting role: ram, boarding, missile platform, hold. Counters are bounded soft
 * multipliers with a readable reason, like land combat: rams punish light hulls, boarders punish rammers that
 * carry few fighters, armoured long hulls shrug off missiles but wallow against a ram, nothing is decisive.
 * Costs are finite materials that come out of the society's stores.
 */
export type BaseHull='riverboat'|'scoutCanoe'|'freightPunt';
export type NavalRole='raider'|'boarder'|'rammer'|'hauler'|'patrol';
export type PortWork='breakwater'|'slipway'|'lighthouse'|'drydock'|'navalStores';
export type ShipDesign={
 id:string;name:string;role:NavalRole;baseHull:BaseHull;
 /** Advisory overall envelope in metres for art; does not change navigation. */length:number;beam:number;
 /** Multiplier on hull damage taken: below 1 is a tough hull, above 1 a fragile one. */armour:number;
 /** Fighting terms at full crew. */ram:number;boarding:number;missiles:number;
 /** Cargo hold in the same abstract goods units haulage uses. */hold:number;
 /** Minimum crew actually aboard to use the weapons. */minimumCrew:number;
 /** Port works the building dock must have. */requires:readonly PortWork[];
 cost:{wood:number;stone:number;cordage:number;copper:number};workSeconds:number;
};
export const SHIP_DESIGNS:Readonly<Record<string,ShipDesign>>=Object.freeze({
 warCanoe:{id:'warCanoe',name:'War canoe',role:'raider',baseHull:'scoutCanoe',length:5.2,beam:1.8,armour:1.2,ram:0,boarding:.7,missiles:.8,hold:4,minimumCrew:2,requires:[],cost:{wood:26,stone:2,cordage:6,copper:0},workSeconds:110},
 riverPatrol:{id:'riverPatrol',name:'River patrol boat',role:'patrol',baseHull:'riverboat',length:6.8,beam:2.8,armour:1,ram:.2,boarding:.8,missiles:1.2,hold:8,minimumCrew:3,requires:['breakwater'],cost:{wood:46,stone:5,cordage:4,copper:0},workSeconds:170},
 longship:{id:'longship',name:'Longship',role:'boarder',baseHull:'freightPunt',length:6.4,beam:2.4,armour:.95,ram:.25,boarding:1.3,missiles:.8,hold:10,minimumCrew:5,requires:['breakwater','slipway'],cost:{wood:84,stone:6,cordage:16,copper:0},workSeconds:260},
 galley:{id:'galley',name:'Ram galley',role:'rammer',baseHull:'freightPunt',length:7.4,beam:2.3,armour:.85,ram:1.3,boarding:.6,missiles:.7,hold:6,minimumCrew:6,requires:['breakwater','slipway','drydock'],cost:{wood:130,stone:10,cordage:22,copper:10},workSeconds:380},
 knarr:{id:'knarr',name:'Cargo knarr',role:'hauler',baseHull:'freightPunt',length:6.6,beam:3.1,armour:1,ram:0,boarding:.3,missiles:.2,hold:44,minimumCrew:3,requires:['breakwater','slipway'],cost:{wood:100,stone:8,cordage:18,copper:0},workSeconds:300},
});
export const DESIGN_IDS=Object.freeze(Object.keys(SHIP_DESIGNS));
export const shipDesign=(id:string)=>Object.hasOwn(SHIP_DESIGNS,id)?SHIP_DESIGNS[id]:undefined;
export type PortWorkSpec={id:PortWork;name:string;wood:number;stone:number;cordage:number;workSeconds:number;requires:readonly PortWork[];note:string};
export const PORT_WORK_SPECS:Readonly<Record<PortWork,PortWorkSpec>>=Object.freeze({
 breakwater:{id:'breakwater',name:'Breakwater and quay',wood:40,stone:36,cordage:0,workSeconds:240,requires:[],note:'Calm moorage for more hulls, shelter from storms, firmer defence against a blockade'},
 slipway:{id:'slipway',name:'Slipway',wood:60,stone:8,cordage:6,workSeconds:180,requires:[],note:'Lets this port build and haul out hulls'},
 lighthouse:{id:'lighthouse',name:'Beacon tower',wood:24,stone:64,cordage:0,workSeconds:300,requires:['breakwater'],note:'Longer sight over the water and a longer reach for ships sailing from here'},
 drydock:{id:'drydock',name:'Drydock',wood:90,stone:56,cordage:10,workSeconds:360,requires:['breakwater','slipway'],note:'Builds ram galleys and overhauls any hull'},
 navalStores:{id:'navalStores',name:'Naval storehouse',wood:34,stone:12,cordage:0,workSeconds:150,requires:['breakwater'],note:'Provisions and missiles for fleets, held in this port'},
});
export const PORT_WORK_IDS=Object.freeze(Object.keys(PORT_WORK_SPECS) as PortWork[]);
export type PortTier={tier:0|1|2|3;name:string;moorage:number};
export const PORT_TIERS:readonly PortTier[]=Object.freeze([
 {tier:0,name:'Landing',moorage:2},{tier:1,name:'Harbour',moorage:5},{tier:2,name:'Shipyard',moorage:7},{tier:3,name:'Naval base',moorage:10},
]);
export const tierFor=(works:Partial<Record<PortWork,unknown>>):0|1|2|3=>works.drydock?3:works.slipway&&works.breakwater?2:works.breakwater?1:0;

// -- counters -------------------------------------------------------------------------------------------------------
export type NavalMode='ram'|'boarding'|'missile';
export const NAVAL_COUNTER_RULES=Object.freeze({
 floor:.6,ceiling:1.45,
 ramVsLight:1.25,ramVsHeavy:.85,ramVsHauler:1.15,
 boardingVsFewFighters:1.2,boardingVsArmoured:.9,boardingVsMissileShip:1.1,
 missileVsUnarmoured:1.1,missileVsArmoured:.85,missileVsBoarder:1.1,
 /** A ship with too few aboard fights at this fraction of its weapon strength. */undermannedFloor:.35,
});
export type NavalMatchup={multiplier:number;reasons:string[]};
const pct=(m:number)=>`×${m.toFixed(2)}`;
/** Role-versus-role terms for one attack. Bounded, readable, never decisive. */
export function navalMatchup(attacker:ShipDesign,defender:ShipDesign,mode:NavalMode):NavalMatchup{
 const R=NAVAL_COUNTER_RULES,reasons:string[]=[];let m=1;
 const add=(f:number,why:string)=>{m*=f;reasons.push(`${why} ${pct(f)}`);};
 if(mode==='ram'){
  if(defender.armour<=.9&&defender.role!=='hauler')add(R.ramVsHeavy,'A heavy hull shrugs off the ram');
  else if(defender.armour>=1.1||defender.baseHull==='scoutCanoe')add(R.ramVsLight,'The ram punishes a light hull');
  if(defender.role==='hauler')add(R.ramVsHauler,'A deep-laden hauler cannot turn away');
 }else if(mode==='boarding'){
  if(defender.role==='rammer'&&defender.minimumCrew>=5)add(R.boardingVsFewFighters,'A ram galley carries few fighters to repel boarders');
  if(defender.armour<=.9)add(R.boardingVsArmoured,'High sides are hard to climb');
  if(defender.missiles>=1)add(R.boardingVsMissileShip,'Missile crews have no answer once the grapnels bite');
 }else{
  if(defender.armour<=.9)add(R.missileVsArmoured,'Missiles glance off a heavy hull');else add(R.missileVsUnarmoured,'Missiles find the lightly built hull');
  if(defender.role==='boarder'||defender.role==='raider')add(R.missileVsBoarder,'Boarders are exposed while closing');
 }
 return {multiplier:Math.max(R.floor,Math.min(R.ceiling,m)),reasons};
}
/** Weapon strength of a design for one mode, eased down when under-crewed. */
export function designStrength(d:ShipDesign,mode:NavalMode,crewAboard:number){
 const weapon=mode==='ram'?d.ram:mode==='boarding'?d.boarding:d.missiles;
 const crewed=Math.max(NAVAL_COUNTER_RULES.undermannedFloor,Math.min(1,crewAboard/Math.max(1,d.minimumCrew)));
 return weapon*crewed;
}
