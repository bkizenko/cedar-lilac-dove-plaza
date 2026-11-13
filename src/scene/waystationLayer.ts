import * as THREE from 'three';
import type {Game} from '../game/sim';
import {stationsOf,stationLabel,type Station,type StationForm} from '../game/waystations';
import {routeCorridors} from '../game/routeWear';

/** Road stops in the world: lean-to, rest hut, inn or caravanserai, in the owning society's own building form, plus a tall pin so a
 * distant stop can be found. Low-poly primitives with flat materials, at most 40 stops, rebuilt only when a stop changes. Render only. */
const FORM_LOOK:Record<StationForm,{wall:string;roof:string;trim:string}>={
 reed:{wall:'#c9ad74',roof:'#d9b85a',trim:'#7f6238'},
 timber:{wall:'#b88c57',roof:'#a8602e',trim:'#6a4a2a'},
 stone:{wall:'#bdb6a4',roof:'#b5683c',trim:'#8d8676'},
 hide:{wall:'#d6c39c',roof:'#cdb98c',trim:'#7a6240'},
};
const mats=new Map<string,THREE.MeshStandardMaterial>();
const mat=(c:string)=>{let m=mats.get(c);if(!m){m=new THREE.MeshStandardMaterial({color:c,roughness:.92,metalness:0});mats.set(c,m);}return m;};
const box=(w:number,h:number,d:number,c:string,x=0,y=0,z=0)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c));m.position.set(x,y+h/2,z);m.castShadow=m.receiveShadow=true;return m;};
const post=(h:number,c:string,x:number,z:number,r=.09)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r*1.1,h,6),mat(c));m.position.set(x,h/2,z);m.castShadow=true;return m;};
/** Gabled roof: a triangular prism along local z. */
function gable(w:number,h:number,d:number,c:string,overhang=.35){
 const g=new THREE.BufferGeometry(),hw=w/2+overhang,hd=d/2+overhang,v=[-hw,0,-hd,hw,0,-hd,0,h,-hd,-hw,0,hd,hw,0,hd,0,h,hd];
 g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,1,2,5,1,5,4,0,1,4,0,4,3]);g.computeVertexNormals();
 const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:c,roughness:.95,side:THREE.DoubleSide,flatShading:true}));m.castShadow=true;return m;
}
/** Mono-pitch roof slab: top surface falls from hBack (at +z) to hFront (at -z), `t` thick, overhanging by `o`. */
function shed(w:number,d:number,hFront:number,hBack:number,c:string,o=.3,t=.12){
 const g=new THREE.BufferGeometry(),hw=w/2+o,hd=d/2+o,fy=hFront-(hFront-hBack)*(o/d)*.0,v=[
  -hw,hFront,-hd, hw,hFront,-hd, hw,hBack,hd, -hw,hBack,hd,
  -hw,hFront-t,-hd, hw,hFront-t,-hd, hw,hBack-t,hd, -hw,hBack-t,hd];void fy;
 g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex([0,3,2,0,2,1, 4,5,6,4,6,7, 0,1,5,0,5,4, 3,7,6,3,6,2, 0,4,7,0,7,3, 1,2,6,1,6,5]);g.computeVertexNormals();
 const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:c,roughness:.95,side:THREE.DoubleSide,flatShading:true}));m.castShadow=true;return m;
}
const plinth=(w:number,d:number)=>box(w,.5,d,'#8a7a5e',0,-.42,0);
function hearth(g:THREE.Group,x:number,z:number){
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2,s=new THREE.Mesh(new THREE.DodecahedronGeometry(.17,0),mat('#807a6e'));s.position.set(x+Math.cos(a)*.45,.12,z+Math.sin(a)*.45);g.add(s);}
 const ash=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,.05,10),mat('#2f2a26'));ash.position.set(x,.03,z);g.add(ash);
}
function leanTo(f:StationForm,progress:number){
 const L=FORM_LOOK[f],g=new THREE.Group(),p=Math.max(.25,progress);
 g.add(plinth(3.6,3.2),post(1.1,L.trim,-1.2,-.8),post(1.1,L.trim,1.2,-.8),post(2.0,L.trim,-1.2,.9),post(2.0,L.trim,1.2,.9));
 const roof=shed(2.6,2.2,1.15,2.05,L.roof,.25);roof.scale.z=p;g.add(roof);
 g.add(box(2.6,.9,.1,L.wall,0,.15,-.85));
 if(progress>=1)hearth(g,0,.1);
 return g;
}
function hut(f:StationForm,progress:number){
 const L=FORM_LOOK[f],g=new THREE.Group(),p=Math.max(.3,progress);
 const h=2.0*p;
 g.add(plinth(4.6,3.6));
 g.add(box(3.6,h,.18,L.wall,0,0,-1.3),box(.18,h,2.6,L.wall,-1.8,0,0),box(.18,h,2.6,L.wall,1.8,0,0));
 g.add(box(1.0,h,.18,L.wall,-1.3,0,1.3),box(1.0,h,.18,L.wall,1.3,0,1.3),box(1.6,.5*p,.18,L.wall,0,1.5*p,1.3));
 const r=gable(3.6,1.2,2.6,L.roof);r.position.y=h;r.scale.y=p;g.add(r);
 if(progress>=1){hearth(g,0,-.1);
  const jar=new THREE.Mesh(new THREE.CylinderGeometry(.28,.2,.6,10),mat('#9a6a45'));jar.position.set(2.5,.3,.8);g.add(jar);
  for(let i=0;i<4;i++)g.add(box(.9,.16,.2,L.trim,2.5,.08+i*.16,-.9));
  const chim=box(.3,.5,.3,L.trim,.0,h+.9,-.4);g.add(chim);}
 return g;
}
function inn(f:StationForm,progress:number){
 const L=FORM_LOOK[f],g=new THREE.Group(),p=Math.max(.35,progress);
 if(f==='hide'){
  // hide-tent camp: a ring of stakes around four tents and a fire, with an awning for the pack animals
  g.add(plinth(11,11));
  for(let i=0;i<20;i++){const a=i/20*Math.PI*2;if(Math.abs(Math.atan2(Math.sin(a+Math.PI/2),Math.cos(a+Math.PI/2)))<.35)continue;g.add(post(1.2*p,L.trim,Math.cos(a)*4.8,Math.sin(a)*4.8,.07));}
  for(let i=0;i<4;i++){const a=i/4*Math.PI*2+.6,t=new THREE.Mesh(new THREE.ConeGeometry(1.5,2.6*p,8),mat(i%2?L.roof:L.wall));t.position.set(Math.cos(a)*2.4,1.3*p,Math.sin(a)*2.4);t.castShadow=true;g.add(t);}
  const awn=shed(3.2,2.2,1.0*p,1.8*p,L.roof,.2);awn.position.set(-3.4,0,3.4);g.add(awn);g.add(post(1.8*p,L.trim,-4.7,2.4),post(1.8*p,L.trim,-2.1,2.4));
 }else if(f==='stone'){
  // caravanserai: a walled court with a roofed range inside, a gate, corner posts and a well
  const s=10,h=2.2*p;
  g.add(plinth(s+1,s+1));
  for(const sd of [-1,1]){g.add(box(s,h,.35,L.wall,0,0,sd*s/2),box(.35,h,s,L.wall,sd*s/2,0,0));}
  g.add(box(1.8,h,.35,L.wall,-3.4,0,-s/2),box(1.8,h,.35,L.wall,3.4,0,-s/2));
  const range=gable(2.8,1.1,s-1.6,L.roof,.25);range.rotation.y=Math.PI/2;range.position.set(0,h*.8,s/2-1.9);range.scale.y=p;g.add(range);
  for(const sx of [-1,1])g.add(box(.5,h*1.35,.5,L.trim,sx*s/2,0,s/2),box(.5,h*1.35,.5,L.trim,sx*s/2,0,-s/2));
  const well=new THREE.Mesh(new THREE.CylinderGeometry(.5,.55,.7,10),mat(L.trim));well.position.set(1.4,.35,-.6);g.add(well);
 }else{
  // inn: long hall, an upper gable, a stable range and a hitching rail with a swinging sign
  const h=2.3*p;
  g.add(plinth(11.5,5.6));
  g.add(box(7,h,.2,L.wall,0,0,-2),box(7,h,.2,L.wall,0,0,2),box(.2,h,4,L.wall,-3.5,0,0),box(.2,h,4,L.wall,3.5,0,0));
  const roof=gable(4,1.9,7,L.roof,.45);roof.rotation.y=Math.PI/2;roof.position.y=h;roof.scale.y=p;g.add(roof);
  g.add(post(1.0*p,L.trim,3.9,-.9),post(1.0*p,L.trim,6.9,-.9),post(1.5*p,L.trim,3.9,1.3),post(1.5*p,L.trim,6.9,1.3));const sr=shed(3.2,2.4,1.0*p,1.5*p,L.roof,.25);sr.position.set(5.4,0,.2);g.add(sr);
  g.add(box(2.2,.12,.12,L.trim,-1.2,.9,2.9),post(.9,L.trim,-2.2,2.9),post(.9,L.trim,-.2,2.9));
  g.add(post(2.6,L.trim,-3.9,2.6),box(.9,.6,.08,L.roof,-3.45,2.2,2.6));
 }
 if(progress>=1)hearth(g,0,f==='stone'?-1.4:f==='hide'?.2:0);
 return g;
}
/** A tall thin marker with a pennant in the owner's colour, visible over trees and from far. */
function pin(color:string,built:boolean){
 const g=new THREE.Group(),h=built?7:5;
 g.add(post(h,'#5b4630',0,0,.06));
 const flag=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.9),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));flag.position.set(.75,h-.5,0);g.add(flag);
 const cap=new THREE.Mesh(new THREE.ConeGeometry(.28,.5,6),mat('#e3ad4f'));cap.position.set(0,h+.25,0);g.add(cap);
 return g;
}
export class WaystationLayer{
 readonly group=new THREE.Group();private built=new Map<number,{key:string;obj:THREE.Group}>();
 constructor(){this.group.name='waystations';}
 private yaw(g:Game,s:Station){
  const c=routeCorridors(g).find(q=>q.id===s.corridor);if(!c)return (s.id*1.3)%6.28;
  let best=1e9,bx=s.x,bz=s.z;for(let i=0;i<c.pts.length;i+=2){const d=Math.hypot(c.pts[i]-s.x,c.pts[i+1]-s.z);if(d<best){best=d;bx=c.pts[i];bz=c.pts[i+1];}}
  return Math.atan2(bx-s.x,bz-s.z);
 }
 sync(g:Game){
  const list=stationsOf(g).filter(s=>s.stage>=1||s.project);const live=new Set<number>();
  for(const s of list){
   if(s.team!==0&&!g.exploredAt(s.x,s.z))continue;
   live.add(s.id);
   const stage=s.stage,prog=s.project?Math.min(1,s.project.labour/s.project.need):1,shown=s.project&&s.project.to>stage?s.project.to:stage;
   const key=`${stage}:${s.form}:${Math.round(prog*8)}:${s.project?1:0}:${s.team}`;
   let e=this.built.get(s.id);
   if(!e||e.key!==key){
    if(e)this.drop(e.obj);
    const obj=new THREE.Group(),f=s.form,b=shown===1?leanTo(f,prog):shown===2?hut(f,prog):inn(f,prog);
    b.rotation.y=this.yaw(g,s);obj.add(b);
    const tcol=g.tribe(s.team)?.color||'#c8563a';obj.add(pin(tcol,s.stage>=1));(obj.children[1] as THREE.Group).position.set(2.8,0,-2.8);
    obj.name=`waystation-${s.id}-${stationLabel(s)}`;this.group.add(obj);e={key,obj};this.built.set(s.id,e);
   }
   e.obj.position.set(s.x,g.height(s.x,s.z),s.z);
  }
  for(const [id,e] of this.built)if(!live.has(id)){this.drop(e.obj);this.built.delete(id);}
 }
 private drop(o:THREE.Object3D){this.group.remove(o);o.traverse(m=>{const g=(m as THREE.Mesh).geometry;if(g)g.dispose();});}
 dispose(){for(const e of this.built.values())this.drop(e.obj);this.built.clear();}
}
