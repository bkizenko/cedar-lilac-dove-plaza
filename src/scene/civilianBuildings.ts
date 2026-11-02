import * as THREE from 'three';import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';import type{BldGeo}from'./meshes';import{BUILDINGS,TEAM_STYLE}from'../game/constants';
export const CIVILIAN_ART_RULES={maximumTrianglesPerRole:5500,wallSides:12,roofCourses:5,roofEdgeIrregularityMetres:.055} as const;
export type CivilianRole='hut'|'townhall'|'warehouse'|'workshop'|'lumber'|'quarry';
function box(w:number,h:number,d:number,x:number,y:number,z:number){return new THREE.BoxGeometry(w,h,d).translate(x,y+h/2,z);}
function beam(ax:number,ay:number,az:number,bx:number,by:number,bz:number,r=.11){const a=new THREE.Vector3(ax,ay,az),b=new THREE.Vector3(bx,by,bz),delta=b.clone().sub(a),g=new THREE.CylinderGeometry(r*.88,r,delta.length(),5);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));return g.translate((ax+bx)/2,(ay+by)/2,(az+bz)/2);}
function merge(parts:THREE.BufferGeometry[]){const gs=parts.map(g=>{const n=g.index?g.toNonIndexed():g;if(n!==g)g.dispose();return n;}),out=mergeGeometries(gs)!;for(const g of gs)g.dispose();out.computeVertexNormals();out.computeBoundingBox();return out;}
function pitchedRoof(w:number,d:number,eave:number,rise:number,axis:'x'|'z'='z'){
 const parts:THREE.BufferGeometry[]=[];const n=CIVILIAN_ART_RULES.roofCourses;
 for(const side of[-1,1])for(let i=0;i<n;i++){const t=i/n,span=w/2/n*1.18,g=new THREE.BoxGeometry(span,.16,d+.2+.04*Math.sin(i*2+side));g.rotateZ(-side*Math.atan2(rise,w/2));g.translate(side*(w/2-span/2-i*w/2/n),eave+rise*(t+.5/n),0);parts.push(g);}
 if(axis==='x')for(const p of parts)p.rotateY(Math.PI/2);return merge(parts);
}
function bench(x:number,z:number,w=1.35,d=.65,h=.8){return[box(w,.15,d,x,h,z),...[-1,1].flatMap(a=>[-1,1].map(b=>beam(x+a*w*.4,0,z+b*d*.35,x+a*w*.4,h,z+b*d*.35,.07)))];}
function hut():BldGeo{
 const walls:THREE.BufferGeometry[]=[],frame:THREE.BufferGeometry[]=[],roof:THREE.BufferGeometry[]=[];const sides=CIVILIAN_ART_RULES.wallSides;
 for(let i=0;i<sides;i++){const angle=(i+.5)*Math.PI*2/sides;if(Math.cos(angle)>.85)continue;const x=Math.sin(angle)*2.04,z=Math.cos(angle)*1.94,g=box(1.12,1.85,.18,0,0,0);g.rotateY(angle);g.translate(x,0,z);walls.push(g);frame.push(beam(x,0,z,x+.025*Math.sin(i),1.96,z,.075));}
 frame.push(beam(-.72,0,1.8,-.68,1.88,1.8,.13),beam(.72,0,1.8,.68,1.88,1.8,.13),beam(-.75,1.88,1.8,.75,1.88,1.8,.13));
 for(let i=0;i<5;i++){const lower=2.58-i*.4,upper=i===4?.04:Math.max(.08,lower-.54),h=.39,g=new THREE.CylinderGeometry(upper,lower,h,12,1,true);const p=g.getAttribute('position');for(let j=0;j<p.count;j++){const x=p.getX(j),z=p.getZ(j),f=1+.012*Math.sin(x*5+z*2+i);p.setXYZ(j,x*f,p.getY(j),z*f*.95);}g.translate(.025*Math.sin(i),1.9+i*.32+h/2,.025*Math.cos(i));roof.push(g);}
 return{timber:merge(walls),roof:merge(roof),extra:merge(frame),extraMat:'timber',timberMat:'plaster'};
}
function townhall():BldGeo{
 const walls:THREE.BufferGeometry[]=[],frame:THREE.BufferGeometry[]=[];const w=7.2,d=6.8,h=2.6;
 for(const x of[-w/2,w/2])walls.push(box(.18,h,d,x,0,0));walls.push(box(w,h,.18,0,0,-d/2),box(2.65,h,.18,-2.275,0,d/2),box(2.65,h,.18,2.275,0,d/2),box(1.9,.6,.18,0,2,d/2));
 for(const x of[-3.65,-.95,.95,3.65])for(const z of[-3.45,3.45])frame.push(beam(x,0,z,x,2.8,z,.12));for(const z of[-3.45,3.45]){frame.push(beam(-3.65,2.65,z,3.65,2.65,z,.13),beam(-3.5,.3,z,-1,2.55,z,.09),beam(1,2.55,z,3.5,.3,z,.09));}
 for(const x of[-3.7,3.7])frame.push(beam(x,.2,-3.3,x,2.55,-.5,.08),beam(x,2.55,.5,x,.2,3.3,.08));
 return{timber:merge(walls),roof:pitchedRoof(8.4,7.65,2.65,1.6),extra:merge(frame),extraMat:'timber',timberMat:'plaster'};
}
function warehouse():BldGeo{
 const body:THREE.BufferGeometry[]=[box(5.4,.2,4.4,0,.68,0)],frame:THREE.BufferGeometry[]=[];
 for(const x of[-2.5,0,2.5])for(const z of[-1.95,1.95])if(x!==0||z<0)body.push(beam(x,0,z,x,2.65,z,.14));
 // Empty ventilation slots and a broad loading opening, not decorative free crates.
 for(const z of[-2.15,2.15])for(let course=0;course<6;course++){const y=.9+course*.25;if(z>0){body.push(box(1.8,.17,.13,-1.7,y,z),box(1.8,.17,.13,1.7,y,z));}else body.push(box(5.4,.17,.13,0,y,z));}
 for(const x of[-2.65,2.65])for(let i=0;i<6;i++)body.push(box(.13,.17,4.25,x,.9+i*.25,0));
 frame.push(beam(-2.6,.85,2.3,-2.6,2.6,2.3,.1),beam(2.6,.85,2.3,2.6,2.6,2.3,.1));return{timber:merge(body),roof:pitchedRoof(6.35,5.7,2.5,1.25),extra:merge(frame),extraMat:'dark'};
}
function workshop():BldGeo{
 const parts:THREE.BufferGeometry[]=[];for(const x of[-2.15,2.15])for(const z of[-1.8,1.8]){parts.push(beam(x,0,z,x+.04,2.65,z,.1),beam(x,.2,z,x*.6,2.55,z,.075));}
 parts.push(...bench(-1.25,-.65,1.25,1.05),...bench(1.25,-.65,1.25,1.05),...bench(0,1.2,1.75,.65));
 const emptyLedge=[box(3.8,.1,.45,0,.55,-1.65),box(.08,.9,.08,-1.8,.6,-1.7),box(.08,.9,.08,1.8,.6,-1.7)];return{timber:merge(parts),roof:pitchedRoof(5.15,4.55,2.65,.65),extra:merge(emptyLedge),extraMat:'dark'};
}
function lumber():BldGeo{
 const parts:THREE.BufferGeometry[]=[];for(const x of[-2.3,1.7])for(const z of[-1.65,.6])parts.push(beam(x,0,z,x,2.35,z,.11));parts.push(beam(-2.3,.2,-1.65,-.9,2.3,-1.65,.085),beam(.3,2.3,-1.65,1.7,.2,-1.65,.085));
 // Empty sawhorse: supports read as a work fixture, never harvestable timber.
 for(const x of[-1,1]){parts.push(beam(x,0,1,x,.85,1.6,.095),beam(x,0,2.1,x,.85,1.55,.095),beam(x,.75,1.1,x,.75,2,.08));}parts.push(beam(-1.2,.8,1.55,1.2,.8,1.55,.085));
 const roof=new THREE.BoxGeometry(4.8,.18,3.1).rotateX(-.16).translate(-.3,2.4,-.55);return{timber:merge(parts),roof,extra:merge([new THREE.CylinderGeometry(.5,.58,.48,9).translate(2.1,.24,1.65)]),extraMat:'timber'};
}
function quarry():BldGeo{
 const parts=[beam(-1.7,0,-1.5,-.7,3.1,-1.5,.14),beam(1.7,0,-1.5,.7,3.1,-1.5,.14),beam(-1.7,0,-1.5,1.7,0,-1.5,.12),beam(-.8,2.9,-1.5,.8,2.9,-1.5,.15),...bench(1.2,.8,1.4,.9,.65)];
 const stone=[new THREE.CylinderGeometry(.55,.67,.2,7).translate(-1.1,.1,.75),box(.8,.15,.65,1.2,.84,.8)];
 // Permanent sorting partitions are empty; the actual finite seam/outcrops remain game resources.
 parts.push(box(2.5,.35,.12,-.8,0,1.95),box(.12,.35,1.3,-1.95,0,1.35),box(.12,.35,1.3,.35,0,1.35));return{timber:merge(parts),roof:merge([beam(-.08,1.55,-1.5,.08,2.85,-1.5,.045)]),extra:merge(stone),extraMat:'stone',roofMat:'dark'};
}
/** Fit the physical model, including all existing society transforms and the
 * bounded upper variation, inside the unchanged navigation rectangle. */
export function fitCivilianFootprint(type:CivilianRole,kit:BldGeo){const spec=BUILDINGS[type];let scale=1;for(const style of TEAM_STYLE)for(const geometry of[kit.timber,kit.roof,kit.extra]){if(!geometry)continue;const p=geometry.getAttribute('position'),c=Math.cos(style.yaw),s=Math.sin(style.yaw);for(let i=0;i<p.count;i++){const x=p.getX(i)*style.sx,z=p.getZ(i)*style.sz,wx=Math.abs(x*c+z*s),wz=Math.abs(z*c-x*s);if(wx>0)scale=Math.min(scale,(spec.w/2-.12)/wx);if(wz>0)scale=Math.min(scale,(spec.d/2-.12)/wz);}}
 for(const geometry of[kit.timber,kit.roof,kit.extra])if(geometry){geometry.scale(scale,1,scale);geometry.computeBoundingBox();geometry.computeBoundingSphere();}return kit;}
export function civilianBuildingGeos():Record<CivilianRole,BldGeo>{const result={hut:hut(),townhall:townhall(),warehouse:warehouse(),workshop:workshop(),lumber:lumber(),quarry:quarry()};for(const role of Object.keys(result)as CivilianRole[])fitCivilianFootprint(role,result[role]);return result;}
