/** Village grammar: layout of TILED cells (palisade, stone wall, gate, trench, moat, canal, aqueduct). A cell is 4 x 4 m and knows which of its
 * four neighbours it touches (JOIN bits, buildingHelpers.ts), so a line of cells reads as one wall: straight runs tile edge to edge, a lone cell is
 * capped at both ends, the last cell of a run is capped at its centre, corners/tees/crosses get a hub (post, tower or bastion). Heights and
 * thicknesses must NOT vary per cell (they would step at every joint); variety goes into details that stay inside the cell. */
import {JOIN,joinOfAxis,type FamilyContext} from './buildingHelpers';

export type Arm={along:'x'|'z';cx:number;cz:number;len:number;sign:-1|0|1};
export type Layout={arms:Arm[];mask:number;kind:'isolated'|'end'|'straight'|'corner'|'tee'|'cross';px:boolean;nx:boolean;pz:boolean;nz:boolean;
 /** hub at the cell centre (end, corner, tee, cross) */hub:boolean;
 /** centre of the open (missing-neighbour) side for an end cell: where the cap faces */capDir:{x:number;z:number}|null};

/** Mask of a context: the live neighbour mask, else the legacy wallAxis ('x', 'z' or 'corner' = +X and +Z). */
export const maskOf=(ctx:FamilyContext)=>(ctx.join!==undefined?ctx.join:joinOfAxis(ctx.wallAxis))&15;

export function layoutOf(mask:number,w:number,d:number,t:number):Layout{
  const iso=(mask&15)===0,m=iso?JOIN.px|JOIN.nx:mask&15,px=!!(m&JOIN.px),nx=!!(m&JOIN.nx),pz=!!(m&JOIN.pz),nz=!!(m&JOIN.nz),arms:Arm[]=[];
  if(px&&nx)arms.push({along:'x',cx:0,cz:0,len:w,sign:0});
  else if(px||nx){const s=px?1:-1;arms.push({along:'x',cx:s*(w/2-t/2)/2,cz:0,len:w/2+t/2,sign:s});}
  if(pz&&nz)arms.push({along:'z',cx:0,cz:0,len:d,sign:0});
  else if(pz||nz){const s=pz?1:-1;arms.push({along:'z',cx:0,cz:s*(d/2-t/2)/2,len:d/2+t/2,sign:s});}
  const n=+px+ +nx+ +pz+ +nz,hasX=px||nx,hasZ=pz||nz;
  const kind:Layout['kind']=iso?'isolated':n===1?'end':n===2?(hasX&&hasZ?'corner':'straight'):n===3?'tee':'cross';
  const capDir=kind==='end'?{x:px?-1:nx?1:0,z:pz?-1:nz?1:0}:null;
  return {arms,mask:m,kind,px,nx,pz,nz,hub:kind!=='straight'&&kind!=='isolated',capDir};
}
/** Point on an arm: `off` along the run, `lat` across it (negative lat is the outer side for a +Z/+X facing wall). */
export const armAt=(a:Arm,off:number,lat:number):[number,number]=>a.along==='x'?[a.cx+off,a.cz+lat]:[a.cx+lat,a.cz+off];
