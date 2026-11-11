import {expandedGrainWorkplace} from '../game/plots';
import type * as THREE from 'three';
import{plotModules}from'./plotModules';
import type {Building,BldType} from '../game/types';
export type GroundContact=Readonly<{ax:number;az:number;bx:number;bz:number}>;
export const GROUNDING_RULES={sliceHeightMetres:.08,stripWidthMetres:.18,maximumStripLengthMetres:.65,minimumVisibleGapMetres:.12,burialMetres:.18,maximumInstances:131072} as const;
export type GroundEntry=Readonly<{x:number;z:number;width:number}>;
let contactVersion=0;export function groundContactVersion(){return contactVersion;}
const entries=new Map<BldType,GroundEntry>();
export function groundEntryFor(type:BldType){return entries.get(type);}
const contacts=new Map<BldType,readonly GroundContact[]>();
export function groundContactsFor(type:BldType){return contacts.get(type);}
/** Cross sections of actual walls/legs, never the navigation rectangle or roof.
 * Collinear triangle fragments are unioned once when the shared kit is built. */
export function registerGroundContacts(type:BldType,geometries:(THREE.BufferGeometry|undefined)[],entry?:GroundEntry){
 contactVersion++;
 if(entry)entries.set(type,Object.freeze({...entry}));else entries.delete(type);
 const groups=new Map<string,{ux:number;uz:number;n:number;parts:[number,number][]}>(),y=GROUNDING_RULES.sliceHeightMetres;
 for(const geometry of geometries){if(!geometry)continue;const p=geometry.getAttribute('position');if(!p)continue;const index=geometry.index,n=index?.count??p.count;
  for(let i=0;i<n;i+=3){const hits:{x:number;z:number}[]=[];for(let j=0;j<3;j++){const a=index?index.getX(i+j):i+j,b=index?index.getX(i+(j+1)%3):i+(j+1)%3,ay=p.getY(a),by=p.getY(b);if((ay<=y&&by>y)||(by<=y&&ay>y)){const t=(y-ay)/(by-ay);hits.push({x:p.getX(a)+(p.getX(b)-p.getX(a))*t,z:p.getZ(a)+(p.getZ(b)-p.getZ(a))*t});}}
   if(hits.length!==2)continue;const[a,b]=hits,dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);if(l<.008)continue;let ux=dx/l,uz=dz/l;if(ux<-.00001||Math.abs(ux)<.00001&&uz<0){ux=-ux;uz=-uz;}const offset=-uz*a.x+ux*a.z,key=[ux,uz,offset].map(v=>Math.round(v*10000)).join('/'),range:[number,number]=[ux*a.x+uz*a.z,ux*b.x+uz*b.z];range.sort((a,b)=>a-b);let g=groups.get(key);if(!g){g={ux,uz,n:offset,parts:[]};groups.set(key,g);}g.parts.push(range);
  }
 }
 const out:GroundContact[]=[];for(const g of groups.values()){g.parts.sort((a,b)=>a[0]-b[0]);const merged:[number,number][]=[];for(const p of g.parts){const last=merged.at(-1);if(last&&p[0]<=last[1]+.0003)last[1]=Math.max(last[1],p[1]);else merged.push([...p]);}for(const[a,b]of merged)out.push(Object.freeze({ax:g.ux*a-g.uz*g.n,az:g.uz*a+g.ux*g.n,bx:g.ux*b-g.uz*g.n,bz:g.uz*b+g.ux*g.n}));}
 const frozen=Object.freeze(out);contacts.set(type,frozen);return frozen;
}

const expanded=new WeakMap<Building,{w:number;d:number;source:readonly GroundContact[];contacts:readonly GroundContact[]}>();
export function buildingGroundContacts(b:Building){const source=groundContactsFor(b.type);if(!source||(b.type!=='warehouse'&&!expandedGrainWorkplace(b)))return source;const old=expanded.get(b);if(old&&old.w===b.w&&old.d===b.d&&old.source===source)return old.contacts;const contacts=Object.freeze(plotModules(b).flatMap(m=>source.map(l=>Object.freeze({ax:m.x+l.ax*m.sx,az:m.z+l.az*m.sz,bx:m.x+l.bx*m.sx,bz:m.z+l.bz*m.sz}))));expanded.set(b,{w:b.w,d:b.d,source,contacts});return contacts;}
