import * as T from 'three';import{mergeGeometries}from'three/addons/utils/BufferGeometryUtils.js';import type{BldGeo}from'./meshes';import{BUILDINGS,TEAM_STYLE}from'../game/constants';
export type ClassicalArtRole='market'|'temple'|'university';
export const CLASSICAL_ART_RULES={maximumTrianglesPerRole:5000,fitMarginMetres:.2,roofCourses:6}as const;
function box(w:number,h:number,d:number,x:number,y:number,z:number){return new T.BoxGeometry(w,h,d).translate(x,y+h/2,z);}
function merge(parts:T.BufferGeometry[]){const gs=parts.map(g=>{const n=g.index?g.toNonIndexed():g;if(n!==g)g.dispose();return n;}),out=mergeGeometries(gs)!;gs.forEach(g=>g.dispose());out.computeBoundingBox();out.computeBoundingSphere();return out;}
function column(x:number,z:number,h=2.7,r=.2){return[new T.CylinderGeometry(r*.85,r,h,10).translate(x,h/2,z),box(r*2.9,.12,r*2.9,x,h,z)];}
function gable(w:number,d:number,eave:number,rise:number,x=0,z=0){const parts:T.BufferGeometry[]=[],angle=Math.atan2(rise,w/2);for(const side of[-1,1])for(let i=0;i<6;i++){const width=w/12*1.16,g=new T.BoxGeometry(width/Math.cos(angle),.13,d+.12);g.rotateZ(-side*angle);g.translate(x+side*(w/2-(i+.5)*w/12),eave+rise*(i+.5)/6,z);parts.push(g);}parts.push(box(.18,.14,d+.2,x,eave+rise,z));return merge(parts);}
function market():BldGeo{const timber:T.BufferGeometry[]=[],walls:T.BufferGeometry[]=[],roof:T.BufferGeometry[]=[];
 // An open trading arcade and three empty shop bays. No decorative free goods.
 for(const x of[-2.65,-.9,.9,2.65])for(const z of[-1.85,1.7])timber.push(...column(x,z,2.25,.13));
 timber.push(box(5.65,.18,.2,0,2.25,1.7),box(5.65,.18,.2,0,2.25,-1.85));
 walls.push(box(5.6,2.2,.18,0,0,-2),...[-2.7,-.9,.9,2.7].map(x=>box(.15,2.2,1.35,x,0,-1.4)));
 // Open shutters/screens read as fixtures, never stock containers.
 for(const x of[-1.8,0,1.8])timber.push(box(1.2,.12,.55,x,.92,-.85));
 roof.push(gable(6.05,4.4,2.4,.8));return{timber:merge(timber),roof:merge(roof),extra:merge(walls),extraMat:'plaster',roofMat:'tile'};}
function temple():BldGeo{const stone:T.BufferGeometry[]=[],dark:T.BufferGeometry[]=[];
 // A real open portico in front of an enclosed cella; no all-site podium slab.
 stone.push(box(.24,3.05,3.6,-1.75,0,-.65),box(.24,3.05,3.6,1.75,0,-.65),box(3.7,3.05,.24,0,0,-2.35));
 for(const x of[-1.75,-.58,.58,1.75])stone.push(...column(x,2,2.8,.18));
 for(const x of[-1.75,1.75])stone.push(...column(x,.65,2.8,.18));
 stone.push(box(4.2,.25,.42,0,2.92,2),box(.42,.25,4.65,-1.75,2.92,-.1),box(.42,.25,4.65,1.75,2.92,-.1));
 // Broken/open doorway and architrave keep interior depth visible at RTS scale.
 stone.push(box(1.15,3.05,.22,-1.18,0,1.05),box(1.15,3.05,.22,1.18,0,1.05),box(1.25,.55,.22,0,2.5,1.05));
 dark.push(box(.16,2.45,.14,-.58,0,1.08),box(.16,2.45,.14,.58,0,1.08));
 return{entry:{x:0,z:1.07,width:1.1},timber:merge(stone),roof:gable(4.75,5.5,3.2,1.15,0,-.05),extra:merge(dark),extraMat:'dark',timberMat:'stone',roofMat:'tile'};}
function academy():BldGeo{const walls:T.BufferGeometry[]=[],columns:T.BufferGeometry[]=[],roofs:T.BufferGeometry[]=[];
 // Courtyard teaching house, not an anachronistic tower or medieval university.
 walls.push(box(7.4,2.65,.2,0,0,-2.9),box(.2,2.65,5.8,-3.7,0,0),box(.2,2.65,5.8,3.7,0,0));
 for(const x of[-2.55,2.55]){walls.push(box(1.9,2.65,.18,x,0,2.8),box(1.9,2.65,.18,x,0,-.75));roofs.push(gable(2.65,6.2,2.75,.7,x,0));}
 roofs.push(gable(7.7,2.25,2.75,.75,0,-2.3));
 for(const x of[-1.3,1.3])for(const z of[-1.4,.3,2])columns.push(...column(x,z,2.55,.13));
 for(const x of[-2.7,2.7])columns.push(box(1.35,.22,.42,x,.5,-2.5),box(.18,.5,.35,x-.48,0,-2.5),box(.18,.5,.35,x+.48,0,-2.5));
 // Empty benches are permanent fixtures; no fake scroll/resource piles.
 return{timber:merge(walls),roof:merge(roofs),extra:merge(columns),extraMat:'stone',timberMat:'plaster',roofMat:'tile'};}
function fit(type:ClassicalArtRole,k:BldGeo){let scale=1;const spec=BUILDINGS[type];for(const st of TEAM_STYLE)for(const g of[k.timber,k.roof,k.extra])if(g){const p=g.getAttribute('position'),c=Math.cos(st.yaw),s=Math.sin(st.yaw);for(let i=0;i<p.count;i++){const x=p.getX(i)*st.sx,z=p.getZ(i)*st.sz;scale=Math.min(scale,(spec.w/2-.2)/(Math.abs(x*c+z*s)||1e-9),(spec.d/2-.2)/(Math.abs(z*c-x*s)||1e-9));}}for(const g of[k.timber,k.roof,k.extra])if(g){g.scale(scale,1,scale);g.computeBoundingBox();g.computeBoundingSphere();}if(k.entry)k.entry={x:k.entry.x*scale,z:k.entry.z*scale,width:k.entry.width*scale};return k;}
export function classicalBuildingGeos():Record<ClassicalArtRole,BldGeo>{return{market:fit('market',market()),temple:fit('temple',temple()),university:fit('university',academy())};}
export const CIVIC_PALETTES={market:{timber:['#9b7048',.35],roof:['#b76445',.18],extra:['#d3bc8d',.15]},temple:{timber:['#d5cab4',.12],roof:['#a85238',.16],extra:['#5b4030',.2]},university:{timber:['#dcd0ae',.15],roof:['#a75a3e',.18],extra:['#bdb5a4',.12]}}as const;
const villageTint=new T.Color();
/** Material colors retain local village accents without turning stone columns into roof-colored timber. */
export function civicPartColor(type:string,part:'timber'|'roof'|'extra',village:string,out:T.Color){if(type==='house'){out.set(part==='timber'?'#d8c3a3':part==='roof'?'#c3a26c':'#785236').lerp(villageTint.set(village),.18);return true;}if(!(type in CIVIC_PALETTES))return false;const[color,mix]=CIVIC_PALETTES[type as ClassicalArtRole][part];out.set(color).lerp(villageTint.set(village),mix);return true;}
