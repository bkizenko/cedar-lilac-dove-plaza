import * as THREE from 'three';
import type {Game} from '../game/sim';
import {sampleHeight} from '../game/worldgen';
import {excavationTerrain,excavationHeightAt,EXCAVATION_RULES} from '../game/excavation';
import type {FieldSurface} from './fieldSurface';
/** Replaces coarse tiles with a single bounded refined mesh, including shadows. */
export class ExcavationLayer {
 readonly mesh:THREE.Mesh;
 private original:Uint32Array;
 private revision=-1;
 private terrain:THREE.Mesh;private fields:FieldSurface;private decorate?: (geometry:THREE.BufferGeometry)=>void;
 constructor(terrain:THREE.Mesh,fields:FieldSurface,decorate?:(geometry:THREE.BufferGeometry)=>void){
  this.terrain=terrain;this.fields=fields;this.decorate=decorate;
  this.original=Uint32Array.from(terrain.geometry.index!.array);this.mesh=new THREE.Mesh(new THREE.BufferGeometry(),terrain.material);this.mesh.name='terrain-excavation';this.mesh.castShadow=true;this.mesh.receiveShadow=true;this.mesh.visible=false;
 }
 sync(g:Game){
  const data=excavationTerrain(g);if(this.revision===data.revision)return;this.revision=data.revision;this.fields.excavations.update(data);
  const source=this.terrain.geometry,basePos=source.getAttribute('position'),baseColors=source.getAttribute('color');
  const positions:number[]=[],colors:number[]=[],rock:number[]=[],sand:number[]=[],exposure:number[]=[],normals:number[]=[],indices:number[]=[],n=EXCAVATION_RULES.subdivisions;
  const raw=(x:number,z:number)=>sampleHeight(g.world.heights,x,z,g.world.size),height=(x:number,z:number)=>excavationHeightAt(g,x,z,raw(x,z)),earth=new THREE.Color('#99846a'),normal=new THREE.Vector3();
  for(const tile of data.tiles.values()){
   const offset=positions.length/3;for(let iz=0;iz<=n;iz++)for(let ix=0;ix<=n;ix++){
    const x=(tile.x+ix/n)*data.tileSize-g.world.size/2,z=(tile.z+iz/n)*data.tileSize-g.world.size/2,y=tile.heights[iz*(n+1)+ix],removed=Math.max(0,raw(x,z)-y);
    positions.push(x,y,z);normal.set(height(x-.25,z)-height(x+.25,z),.5,height(x,z-.25)-height(x,z+.25)).normalize();normals.push(normal.x,normal.y,normal.z);
    const gx=Math.max(0,Math.min(g.world.segs,Math.round((x/g.world.size+.5)*g.world.segs))),gz=Math.max(0,Math.min(g.world.segs,Math.round((z/g.world.size+.5)*g.world.segs))),id=gz*(g.world.segs+1)+gx,mix=Math.min(.9,removed*1.5);
    colors.push(baseColors.getX(id)*(1-mix)+earth.r*mix,baseColors.getY(id)*(1-mix)+earth.g*mix,baseColors.getZ(id)*(1-mix)+earth.b*mix);rock.push(Math.min(.75,removed*.3));sand.push(0);exposure.push(Math.min(1,removed*2));
   }
   for(let iz=0;iz<n;iz++)for(let ix=0;ix<n;ix++){const a=offset+iz*(n+1)+ix,b=a+1,c=a+n+1,d=c+1;indices.push(a,c,b,b,c,d);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('surfaceRock',new THREE.Float32BufferAttribute(rock,1));geometry.setAttribute('surfaceSand',new THREE.Float32BufferAttribute(sand,1));geometry.setIndex(indices);this.decorate?.(geometry);
  const cover=geometry.getAttribute('biomeCover'),tint=geometry.getAttribute('biomeTint'),surface=geometry.getAttribute('biomeMaterial');
  if(cover&&tint&&surface)for(let i=0;i<exposure.length;i++){const q=exposure[i];cover.setXYZW(i,cover.getX(i)*(1-q),cover.getY(i)*(1-q),cover.getZ(i)*(1-q)+.65*q,cover.getW(i));tint.setXYZ(i,tint.getX(i)*(1-q)+earth.r*q,tint.getY(i)*(1-q)+earth.g*q,tint.getZ(i)*(1-q)+earth.b*q);surface.setXYZW(i,surface.getX(i)*(1-q)+.97*q,surface.getY(i)*(1-q)+.045*q,surface.getZ(i)*(1-q)+3*q,1);}
  geometry.computeBoundingSphere();this.mesh.geometry.dispose();this.mesh.geometry=geometry;this.mesh.visible=data.tiles.size>0;
  const kept:number[]=[];for(let i=0;i<this.original.length;i+=3){const a=this.original[i],b=this.original[i+1],c=this.original[i+2],x=(basePos.getX(a)+basePos.getX(b)+basePos.getX(c))/3,z=(basePos.getZ(a)+basePos.getZ(b)+basePos.getZ(c))/3,key=Math.floor((z+g.world.size/2)/data.tileSize)*data.width+Math.floor((x+g.world.size/2)/data.tileSize);if(!data.tiles.has(key))kept.push(a,b,c);}
  source.setIndex(kept);
 }
 dispose(){this.mesh.geometry.dispose();}
}
