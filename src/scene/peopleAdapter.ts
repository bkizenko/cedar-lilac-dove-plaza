/** Glue between the game and the shared character rig (src/scene only). world.ts calls four small methods; everything about
 * how a person is dressed and animated lives in characterRig / characterAnim / characterRigLayer.
 *
 * PEOPLE SETS: 'rig' is the new shared rig; 'legacy' is the archived original (the merged unitGeo body plus wornGarments and
 * wornArmor), kept intact and selectable. Choose with ?people=legacy|rig or localStorage 'hearthwild.people'. If the rig ever
 * throws while drawing, the adapter switches itself to legacy for the rest of the session rather than leave people invisible.
 *
 * Gear shown is the gear a unit really owns: Unit.garment, the armor asset it holds (wornArmor); helmets and shields are drawn
 * only if a future simulation owns them (RigGear). Which civ dresses a team is `civForTeam` until tribes carry a civ. */
import type * as THREE from 'three';
import {wornArmor} from '../game/armor';
import {armorAffiliationColor} from '../game/societyIdentity';
import {calendar} from '../game/settlement';
import {carryingCapacity} from '../game/haulage';
import {TEAM_STYLE} from '../game/constants';
import type {Game} from '../game/sim';
import type {Unit} from '../game/types';
import {hashSeed} from './buildingParts';
import {SEASONS} from './cultureGrammar';
import {CIV_IDS,type CivId} from './civStyles';
import {cultureForCiv} from './civPeople';
import {CharacterRigLayer,type PeopleSet,type PeopleWorld} from './characterRigLayer';
import type {ProjectLike,UnitLike} from './characterAnim';
import type {RigGear} from './characterRig';

export function readPeopleSet():PeopleSet{
 try{const q=typeof location!=='undefined'?new URLSearchParams(location.search).get('people'):null;if(q==='legacy'||q==='rig')return q;}catch{/* fall through */}
 try{const s=typeof localStorage!=='undefined'?localStorage.getItem('hearthwild.people'):null;if(s==='legacy'||s==='rig')return s;}catch{/* fall through */}
 return 'rig';
}
/** Distinct civs for distinct teams (5 is coprime with 14), stable per world seed. */
export const civForTeam=(seed:number,team:number):CivId=>CIV_IDS[(hashSeed(seed,'people-civ')+team*5)%CIV_IDS.length];
export class PeopleAdapter{
 set:PeopleSet;layer:CharacterRigLayer|null=null;private failed=false;private scene:THREE.Scene;private game:Game|null=null;private projects=new Map<number,ProjectLike>();private alive=new Set<number>();
 private cultures=new Map<string,ReturnType<typeof cultureForCiv>>();private world:PeopleWorld|null=null;private errors=0;
 constructor(scene:THREE.Scene,set:PeopleSet=readPeopleSet()){this.scene=scene;this.set=set;if(set==='rig'){try{this.layer=new CharacterRigLayer(scene);}catch(e){this.fail(e);}}}
 get active(){return this.set==='rig'&&!!this.layer&&!this.failed;}
 private fail(e:unknown){this.failed=true;this.set='legacy';this.layer?.dispose();this.layer=null;if(this.errors++===0)console.error('people rig disabled, legacy people restored:',e);}
 private culture(game:Game,team:number){
  const civ=civForTeam(game.state.seed,team),key=civ+'#'+game.state.seed;let c=this.cultures.get(key);if(!c){c=cultureForCiv(civ,game.state.seed%997+1);this.cultures.set(key,c);}return c;
 }
 private build(game:Game):PeopleWorld{
  const g=game;
  return {time:g.state.time,season:SEASONS[calendar(g).phase]??'summer',era:g.state.age||1,
   identity:team=>({culture:this.culture(g,team),teamColor:(TEAM_STYLE[team]||TEAM_STYLE[0]).unit,affiliation:armorAffiliationColor(g,team)}),
   gearOf:u=>{const unit=u as unknown as Unit,gear:RigGear={};if(unit.garment)gear.garment={item:unit.garment.item,condition:unit.garment.condition};const a=wornArmor(g,unit);if(a)gear.armor={kind:a.kind,condition:a.condition};return gear;},
   projectFor:u=>this.projects.get(u.id),
   farmFor:u=>{const n=(u as unknown as Unit).node as {type?:string;crop?:{ripened?:boolean;planted?:number;tended?:number}}|null;return n&&n.type==='farm'?(n.crop??{}):null;},
   fireLitNear:u=>(u as unknown as Unit).workReason==='Warming up by the lit hearth',
   loadOf:u=>{const unit=u as unknown as Unit;if(!(unit.carry>0)||!unit.carryType)return 0;const cap=carryingCapacity(unit,unit.carryType);return cap>0?Math.min(1,unit.carry/cap):0;},
   aliveIds:()=>this.alive,visible:(x,z)=>g.visibleAt(x,z)};
 }
 /** Start a frame. `living` is every unit with hp>0 (drawn or not), used to tell a death from a unit that just left view. */
 begin(game:Game,camera:THREE.Vector3,quality:'low'|'med'|'high',shadows:boolean,living:readonly Unit[]){
  if(!this.active)return;
  try{
   this.game=game;this.projects.clear();this.alive.clear();for(const u of living)this.alive.add(u.id);
   for(const p of game.state.production?.projects||[])if(p.actorId!==null&&p.phase!=='lost'&&p.phase!=='complete')this.projects.set(p.actorId,{phase:p.phase,recipe:p.recipe,progress:p.progress,blockedReason:p.blockedReason});
   this.world=this.build(game);this.layer!.beginFrame(this.world,camera,quality,shadows);
  }catch(e){this.fail(e);}
 }
 /** Draw one unit. Returns true when the rig drew it (world then skips the legacy worn-garment/armor overlays). */
 write(u:Unit,scale:readonly [number,number,number],bob:number,facing:number,garmentBrightness:number){
  if(!this.active)return false;
  try{const l=u as unknown as UnitLike;return this.layer!.write(facing===u.facing?l:{...l,facing},scale,bob,garmentBrightness,u.tint||0);}catch(e){this.fail(e);return false;}
 }
 end(game:Game){
  if(!this.active)return;
  try{this.layer!.writeCorpses((x,z)=>game.height(x,z),(x,z)=>game.visibleAt(x,z));this.layer!.endFrame();if(this.layer!.stats.fallbacks>0)this.fail(new Error('Character geometry budget reached; retaining visible legacy people'));}catch(e){this.fail(e);}
 }
 dispose(){this.layer?.dispose();this.layer=null;}
}
