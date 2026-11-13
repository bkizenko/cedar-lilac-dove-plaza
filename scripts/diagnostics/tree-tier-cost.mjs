// Measured submission cost of each tree-detail step: instances, triangles and draw calls the tree layers hand to the renderer, counted from the scene graph
// (the real BiomeSceneLayer + BotanicalForest + FillerForest on a seeded 1040 m woodland world). Real GPU timing is NOT available in this sandbox; these are counts.
//   node --import ./scripts/game-loader.mjs scripts/diagnostics/tree-tier-cost.mjs [out.json]
import * as THREE from 'three';import fs from 'node:fs';
import {BiomeSceneLayer} from '../../src/scene/biomeSceneLayer.ts';
import {PROVINCE_KINDS} from '../../src/game/ecologicalProvinces.ts';
import {drawBands} from '../../src/game/drawDistance.ts';
import {TREE_DETAIL,TREE_STEPS,GRAPHICS_LABELS} from '../../src/game/graphicsSettings.ts';
const SIZE=1040;
function world(){
 const width=16,idx=PROVINCE_KINDS.indexOf('mixed-woodland');
 const ecology={version:1,size:SIZE,width,cellMeters:SIZE/width,kinds:new Uint8Array(width*width).fill(idx),freshwaterDistanceMeters:new Float32Array(width*width).fill(80),temperatureOffsetCelsius:new Float32Array(width*width),moisture:new Float32Array(width*width).fill(.5),soil:new Float32Array(width*width).fill(.7),metrics:{regions:[]}};
 let s=12345;const r=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
 const trees=[];for(let i=0;i<2200;i++){const a=r()*Math.PI*2,d=Math.sqrt(r())*300;trees.push({id:i+1,kind:'tree',x:Math.cos(a)*d,y:2,z:Math.sin(a)*d,amount:20,maxAmt:20,regenT:0,scale:.8+r()*.5,rich:1});}
 const game={world:{size:SIZE,camps:[{x:0,z:0}],mapgen:{wind:{x:1,z:0}}},state:{seed:9,trees,buildings:[]},height:(x,z)=>2+Math.sin(x*.01)*3+Math.cos(z*.013)*3,waterAt:()=>0,exploredAt:()=>true,seasonMix:()=>({winter:0,autumn:0,snow:0})};
 return {ecology,game};
}
// a forward view: camera looks along +x with a 100 degree horizontal field (the real code tests a widened frustum; this is the same idea in the ground plane)
const forward=cam=>(x,z,rad)=>{const dx=x-cam.x,dz=z-cam.z,d=Math.hypot(dx,dz);return d<rad+30||Math.abs(Math.atan2(dz,dx))<1.0+rad/Math.max(d,1);};
function count(scene){
 const g={};let calls=0,tris=0,inst=0;// 'other' = ground dressing (bushes, grass tufts): not a tree layer, it depends on graphics quality, so it is left out of the totals
 scene.traverse(o=>{if(!(o.isMesh||o.isInstancedMesh)||!o.visible)return;const geo=o.geometry,per=((geo.index?geo.index.count:geo.attributes.position.count)||0)/3,n=o.isInstancedMesh?o.count:1;if(n<=0)return;
  const k=o.name.startsWith('filler-horizon')?'filler horizon crowns':o.name.startsWith('filler-far')?'filler far crowns+trunks':o.name.startsWith('resource-far')?'sim far crowns+trunks':o.name.startsWith('resource-contact')?'contact shadows':o.name.startsWith('resource-')?'sim trees full/mid':'other';
  const e=g[k]??(g[k]={drawCalls:0,instances:0,triangles:0});e.drawCalls++;e.instances+=n;e.triangles+=Math.round(per*n);if(k!=='other'){calls++;inst+=n;tris+=per*n;}});
 return {drawCalls:calls,instances:inst,triangles:Math.round(tris),groups:g};
}
const out={note:'Tree layers only (ground dressing excluded). Counts from the real tree layers on a seeded woodland (2200 sim trees within 300 m of the camp, filler everywhere), camera at the camp, draw distance Medium. forward = 100 degree view cone (what a normal view submits); allAround = upper bound. No GPU timing: SwiftShader/no-GPU sandbox, not an M1.',steps:{}};
for(const view of ['forward','allAround'])for(const step of TREE_STEPS){
 const {ecology,game}=world(),scene=new THREE.Scene(),layer=new BiomeSceneLayer(scene,game,ecology,'painterly','botanical');
 const cam={x:0,z:0},bands=drawBands('medium',SIZE),v={bands,prime:true,key:'k',detail:TREE_DETAIL[step],inView:view==='forward'?forward(cam):undefined};
 for(let i=0;i<4;i++)layer.sync(game,cam,'med',1,{...v,key:'k'+i});
 let guard=0;while(layer.lastFiller&&layer.lastFiller.deferred>0&&guard++<600)layer.sync(game,cam,'med',1,{...v,key:'g'+guard});
 const c=count(scene);(out.steps[step]??(out.steps[step]={label:TREE_DETAIL[step].label,knobs:TREE_DETAIL[step]}))[view]=c;layer.dispose();
}
// legacy reference: the old Low / Medium / High tree settings (no detail object): near radii 28/75/115, old low scalings
for(const q of ['low','med','high']){
 const {ecology,game}=world(),scene=new THREE.Scene(),layer=new BiomeSceneLayer(scene,game,ecology,'painterly','botanical');
 const cam={x:0,z:0},bands=drawBands('medium',SIZE),v={bands,prime:true,key:'k',inView:forward(cam)};
 for(let i=0;i<4;i++)layer.sync(game,cam,q,1,{...v,key:'k'+i});let guard=0;while(layer.lastFiller&&layer.lastFiller.deferred>0&&guard++<600)layer.sync(game,cam,q,1,{...v,key:'g'+guard});
 (out.legacy??={})[q]=count(scene);layer.dispose();
}
const file=process.argv[2];if(file){fs.writeFileSync(file,JSON.stringify(out,null,1));}
const row=(n,c)=>`${n.padEnd(22)} calls ${String(c.drawCalls).padStart(3)}  instances ${String(c.instances).padStart(6)}  triangles ${String(c.triangles).padStart(8)}`;
console.log('FORWARD VIEW (draw distance Medium)');for(const s of TREE_STEPS)console.log(row(`step ${s} ${TREE_DETAIL[s].label}`,out.steps[s].forward));
for(const q of ['low','med','high'])console.log(row(`legacy ${q}`,out.legacy[q]));
console.log('ALL AROUND (upper bound)');for(const s of TREE_STEPS)console.log(row(`step ${s} ${TREE_DETAIL[s].label}`,out.steps[s].allAround));
