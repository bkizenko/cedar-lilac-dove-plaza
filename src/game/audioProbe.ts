/** Reads real game state into a WorldAudio snapshot for ProceduralAudio. Read-only: never mutates the game, never touches
 *  rendering or simulation rules. Throttled by the caller (about 2 Hz is plenty). */
import type {Game} from './sim';
import type {WorldAudio,Emitter} from './proceduralAudio';
import {toolFor,footstepFor,type SfxKind} from '../scene/audioMix';

const FIRE_TYPES=new Set<string>(['hearth','oven','kiln','townhall','smokehouse']);
const SEASONS=['Spring','Summer','Autumn','Winter'];
type Cam={x:number;z:number;yaw:number;dist:number};
export function probeWorld(game:Game,cam:Cam,seed:number,paused:boolean,mood:'peace'|'raid'|'pillage',tradeActive:boolean):WorldAudio{
 const s=game.state,hour=game.dayPhase()*24,sn=game.seasonMix().name,season=SEASONS.includes(sn)?sn:'Spring';
 let biome='plains',bd=1e18;for(const b of game.world.biomes??[]){const d=(b.x-cam.x)**2+(b.z-cam.z)**2;if(d<bd){bd=d;biome=b.kind;}}
 // water: nearest wet sample on rings around the listener
 let water:number|undefined,coastal=false;
 outer:for(const r of [8,20,40,70])for(let k=0;k<8;k++){const a=k*Math.PI/4,x=cam.x+Math.cos(a)*r,z=cam.z+Math.sin(a)*r;
  if(game.height(x,z)<game.waterAt(x,z)+.2){water=r;coastal=Math.abs(x)>game.world.size/2-60||Math.abs(z)>game.world.size/2-60;break outer;}}
 let fire:number|undefined,mill:number|undefined;
 for(const b of s.buildings){if(b.team!==0||b.hp<=0||b.build<1)continue;const d=Math.hypot(b.x-cam.x,b.z-cam.z);
  if(FIRE_TYPES.has(b.type)&&(fire===undefined||d<fire))fire=d;if(b.type==='watermill'&&(mill===undefined||d<mill))mill=d;}
 const emitters:Emitter[]=[];let people=0,crowd=0,working=0,mine=0;const counts=new Map<SfxKind,number>();
 const add=(kind:SfxKind,x:number,z:number)=>{const n=counts.get(kind)??0;if(n>=6)return;counts.set(kind,n+1);emitters.push({kind,x,z});};
 const wet=(x:number,z:number)=>game.height(x,z)<game.waterAt(x,z)+.35;
 for(const u of s.units){if(u.hp<=0)continue;
  if(u.team===0){mine++;if(u.order==='gather'||u.order==='build')working++;}
  const d=Math.hypot(u.x-cam.x,u.z-cam.z);if(d>160)continue;
  if(d<90)people++;if(d<14)crowd++;
  const moving=Math.abs(u.vx)+Math.abs(u.vz)>.15;
  if((u.order==='attack'||u.order==='attackmove')&&u.cd>0&&d<140){add('clash',u.x,u.z);continue;}
  if(moving){if(d<30)add(wet(u.x,u.z)?'step_water':footstepFor(season==='Winter'?'snow':'grass'),u.x,u.z);continue;}
  const tool=toolFor(u.order,u.job);if(tool&&d<70)add(tool,u.x,u.z);
 }
 const livestock=((s as unknown as Record<string,unknown>).sheep as unknown[]|undefined)?.length??0;
 return {paused,biome,emitters,listener:cam,
  score:{mood,hour,season,age:s.tribes[0]?.age??0,work:Math.min(1,working/Math.max(1,mine)*1.6),tradeActive,seed},
  env:{biome:biome as 'plains'|'forest'|'hills',coastal,season:season as 'Spring',hour,weather:s.weather as 'clear',waterDistance:water,litFireDistance:fire,people,millDistance:mill,livestock:Math.min(livestock,40),crowd}};
}
