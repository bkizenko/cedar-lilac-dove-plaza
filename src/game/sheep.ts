import type {Game} from './sim';
import type {Critter,Livestock} from './types';
import {climateAt} from './ecology';
/** Explicit gameplay coefficients, not historical kilograms or calendar years. */
export const SHEEP_RULES={version:1,maximumFleece:4,startingFleece:2,regrowthSeconds:1200,shearSeconds:30,warmthCelsius:6,maximumWild:16,spawnAttempts:160,washSeconds:35,spinSeconds:40,weaveSeconds:70,feltSeconds:80,sewSeconds:60} as const;
export type SheepFleece={version:1;units:number;grownUnits:number;shearedUnits:number;lastShearedAt?:number};
export function newFleece(units=0):SheepFleece{return{version:1,units,grownUnits:units,shearedUnits:0};}
export function validFleece(c:Critter,now:number){const f=c.fleece;if(c.species!=='sheep')return f===undefined;if(!f||f.version!==1||![f.units,f.grownUnits,f.shearedUnits].every(n=>Number.isFinite(n)&&n>=0&&n<=1e9)||f.units>SHEEP_RULES.maximumFleece||Math.abs(f.units+f.shearedUnits-f.grownUnits)>1e-5)return false;return f.lastShearedAt===undefined||Number.isFinite(f.lastShearedAt)&&f.lastShearedAt>=0&&f.lastShearedAt<=now;}
export function growFleece(a:Livestock,dt:number,eligible:boolean){if(a.species!=='sheep'||!a.fleece||!eligible||!(dt>0))return 0;const n=Math.min(SHEEP_RULES.maximumFleece-a.fleece.units,dt*SHEEP_RULES.maximumFleece/SHEEP_RULES.regrowthSeconds);a.fleece.units+=n;a.fleece.grownUnits+=n;return n;}
/** Called only at fresh reset, after original generation. Save restore replaces
 * these fresh arrays with its exact saved animals; no tick/load migration spawns. */
export function initializeSheep(g:Game){
 if(g.state.sheepVersion===1)return;
 g.state.sheepVersion=1;let seed=(g.state.seed^0x1357ace)>>>0;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const camps=g.world.camps.filter(c=>c.team!==3);let total=0;
 for(const camp of camps){for(let attempt=0,placed=0;attempt<SHEEP_RULES.spawnAttempts&&placed<4&&total<SHEEP_RULES.maximumWild;attempt++){
  const angle=random()*Math.PI*2,d=32+random()*90,x=camp.x+Math.sin(angle)*d,z=camp.z+Math.cos(angle)*d,y=g.height(x,z);
  if(Math.abs(x)>g.world.size/2-8||Math.abs(z)>g.world.size/2-8||y<=g.waterAt(x,z)+.4||!g.walkable(x,z)||!g.workBoard.connected(g,camp.x,camp.z,x,z)||g.state.wildlife.some(a=>Math.hypot(a.x-x,a.z-z)<2))continue;
  const climate=climateAt(g,x,z);if(climate.temperature>30&&climate.humidity<.25)continue;
  const id=g.id();g.state.wildlife.push({id,species:'sheep',x,y,z,facing:random()*Math.PI*2,vx:0,vz:0,wanderT:random()*4,hp:2,maxHp:2,fly:0,scale:.9+random()*.15,grazing:{x,z},fleece:newFleece(SHEEP_RULES.startingFleece)});placed++;total++;
 }}
}
