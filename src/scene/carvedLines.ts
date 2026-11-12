/** Live-game inputs for the carved layer's TILED cells and waterfront pieces (pure: no three.js, no game import beyond types).
 *  - lineIndex / joinMaskFor: which neighbours a wall, gate, trench, moat, canal or aqueduct cell touches (JOIN bits), so a line of 4 m cells draws as one
 *    wall with end caps, corners, tees and crosses (villageJoin.ts).
 *  - waterSideFor: which side of a fishing dock the water lies on (the pier is authored facing +Z water and turned to the real side).
 *  - bridgePose: footprint, yaw and pitch that lay a bridge model on its real span.
 *  - warehouseModules: one carved instance per plot module of a (possibly enlarged) warehouse. */
import {JOIN} from './buildingHelpers';

export type LineKind='wall'|'trench'|'moat'|'canal'|'aqueduct';
/** Which building types form a line with each other: palisade, stone wall and gate join; the others join their own kind. */
export const LINE_OF_TYPE:Record<string,LineKind>={palisade:'wall',stonewall:'wall',gate:'wall',trench:'trench',moat:'moat',canal:'canal',aqueduct:'aqueduct'};
export const LINE_CELL=4;
export type LineBuilding={type:string;x:number;z:number;hp:number;gateFacing?:string};
const key=(k:LineKind,gx:number,gz:number)=>k+':'+gx+','+gz;
const grid=(v:number)=>Math.round(v/2);

/** Index of every live line cell on the 2 m placement grid (cells are 4 m, so neighbours sit two grid steps away). */
export function lineIndex(buildings:readonly LineBuilding[]):Set<string>{
  const s=new Set<string>();
  for(const b of buildings){const k=LINE_OF_TYPE[b.type];if(k&&b.hp>0)s.add(key(k,grid(b.x),grid(b.z)));}
  return s;
}
/** JOIN mask (bit 1 +X, 2 -X, 4 +Z, 8 -Z) of a line cell: which of the four neighbouring cells hold a building of the same line kind. 0 = a lone cell. */
export function joinMaskFor(idx:Set<string>,b:LineBuilding):number{
  const k=LINE_OF_TYPE[b.type];if(!k)return 0;
  const gx=grid(b.x),gz=grid(b.z),n=LINE_CELL/2;
  return (idx.has(key(k,gx+n,gz))?JOIN.px:0)|(idx.has(key(k,gx-n,gz))?JOIN.nx:0)|(idx.has(key(k,gx,gz+n))?JOIN.pz:0)|(idx.has(key(k,gx,gz-n))?JOIN.nz:0);
}

/** Water side of a dock: the axis direction whose probe points (5 m and 7 m out) lie most under water; '+z' when none do. `isWater(x,z)` is the caller's terrain query. */
export function waterSideFor(x:number,z:number,isWater:(x:number,z:number)=>boolean):'+x'|'-x'|'+z'|'-z'{
  const sides:['+x'|'-x'|'+z'|'-z',number,number][]=[['+z',0,1],['+x',1,0],['-z',0,-1],['-x',-1,0]];
  let best:'+x'|'-x'|'+z'|'-z'='+z',top=0;
  for(const [name,dx,dz] of sides){let n=0;for(const r of[3,5,7])if(isWater(x+dx*r,z+dz*r))n++;if(n>top){top=n;best=name;}}
  return best;
}

/** Footprint (width fixed, length quantised to half metres so span variants stay few), yaw about Y and pitch about the local X axis of a bridge laid from bank A to bank B. */
export function bridgePose(span:{ax:number;az:number;bx:number;bz:number},baseWidth:number,heightAt:(x:number,z:number)=>number){
  const len=Math.hypot(span.bx-span.ax,span.bz-span.az),dh=heightAt(span.bx,span.bz)-heightAt(span.ax,span.az);
  return {footprint:{w:baseWidth,d:Math.max(4,Math.round(len*2)/2)},yaw:Math.atan2(span.bx-span.ax,span.bz-span.az),pitch:-Math.atan2(dh,Math.max(1,len)),
    level:(heightAt(span.ax,span.az)+heightAt(span.bx,span.bz))/2};
}

/** Plot modules of an enlarged warehouse (same rule as plotModules.ts: up to 3 x 3 bays), as centre offsets and per-bay footprints. */
export function warehouseModules(b:{w:number;d:number},base:{w:number;d:number}){
  const nx=Math.min(3,Math.max(1,Math.ceil(b.w/base.w-1e-6))),nz=Math.min(3,Math.max(1,Math.ceil(b.d/base.d-1e-6))),w=b.w/nx,d=b.d/nz,out:{x:number;z:number;w:number;d:number;index:number}[]=[];
  for(let z=0;z<nz;z++)for(let x=0;x<nx;x++)out.push({x:-b.w/2+w*(x+.5),z:-b.d/2+d*(z+.5),w,d,index:z*nx+x});
  return out;
}
