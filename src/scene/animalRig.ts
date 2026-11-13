/** Shared rig description used by the instanced layer: quadrupeds, birds and fish all reduce to this. */
import type * as THREE from 'three';
export type RigBone={id:string;part:string;parent:string|null};
export type RigModel={
 key:string;bones:readonly RigBone[];
 /** near tier: one geometry per part type, instanced once per bone that uses it */
 geo:Readonly<Record<string,THREE.BufferGeometry|null>>;
 /** mid tier: rigid merged pieces, each drawn once per listed bone */
 mid:readonly {name:string;bones:readonly string[];geo:THREE.BufferGeometry}[];
 far:THREE.BufferGeometry;
 /** nominal body length / height in metres for LOD and bounds */
 size:number;
};
