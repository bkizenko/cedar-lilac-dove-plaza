import {BUILDINGS} from '../game/constants';
import type {Building} from '../game/types';
export type PlotModule={x:number;z:number;sx:number;sz:number};
const cache=new WeakMap<Building,{w:number;d:number;parts:PlotModule[]}>();
/** Shared geometry bays: more floor area adds rows/bays, never giant doors or grain. */
export function plotModules(b:Building):PlotModule[]{
 const old=cache.get(b);if(old&&old.w===b.w&&old.d===b.d)return old.parts;
 const base=BUILDINGS[b.type],nx=Math.min(3,Math.max(1,Math.ceil(b.w/base.w-1e-6))),nz=Math.min(3,Math.max(1,Math.ceil(b.d/base.d-1e-6)));
 const w=b.w/nx,d=b.d/nz,parts:PlotModule[]=[];
 for(let z=0;z<nz;z++)for(let x=0;x<nx;x++)parts.push({x:-b.w/2+w*(x+.5),z:-b.d/2+d*(z+.5),sx:w/base.w,sz:d/base.d});
 cache.set(b,{w:b.w,d:b.d,parts});return parts;
}
