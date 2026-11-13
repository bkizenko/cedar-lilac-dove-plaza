/** One entry point for every animal model: species id -> rig + pose. Quadrupeds here; birds and fish register from animalFlyers.ts. */
import type * as THREE from 'three';
import {quadModel,quadRig,type Sex} from './animalModels';
import {solvePose,type Gait} from './animalPose';
import {QUADS,type QuadId,type SpeciesId} from './animalSpecs';
import type {RigModel} from './animalRig';

export type PoseRequest={gait:Gait|'fly'|'swim'|'glide'|'perch';phase:number;t:number;seed:number;age:number;speed?:number};
export type Posed={mats:Map<string,THREE.Matrix4>;lift:number};
export type Entry={rig(sex:Sex,seed:number):RigModel;pose(sex:Sex,seed:number,req:PoseRequest):Posed;gait:{walkMax:number;trotMax:number;stride:readonly [number,number,number]};herbivore:boolean;tris(sex:Sex,seed:number):[number,number,number]};
const entries=new Map<SpeciesId,Entry>();
export const registerEntry=(id:SpeciesId,e:Entry)=>{entries.set(id,e);};
for(const id of Object.keys(QUADS) as QuadId[]){
 const sp=QUADS[id];
 entries.set(id,{rig:(sex,seed)=>quadRig(quadModel(id,sex,seed)),pose:(sex,seed,req)=>solvePose(quadModel(id,sex,seed),{gait:req.gait as Gait,phase:req.phase,t:req.t,seed:req.seed,age:req.age}),
  gait:sp.gait,herbivore:sp.kind!=='carnivore',tris:(sex,seed)=>quadModel(id,sex,seed).tris});
}
export const entryFor=(id:SpeciesId):Entry=>{const e=entries.get(id);if(!e)throw new Error('no animal model for '+id);return e;};
export const hasEntry=(id:SpeciesId)=>entries.has(id);
