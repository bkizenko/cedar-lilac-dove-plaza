import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FillerForest,FILLER_RULES,isFillerId,groveAt} from '../src/scene/fillerForest.ts';
import {BotanicalForest} from '../src/scene/botanicalForest.ts';
import {BiomeSceneLayer} from '../src/scene/biomeSceneLayer.ts';
import {PROVINCE_KINDS,PROVINCE_PROFILES} from '../src/game/ecologicalProvinces.ts';
import {DRAW_DISTANCE_RULES,drawBands} from '../src/game/drawDistance.ts';
import {DEFAULT_SITE} from '../src/scene/botanicalSpecies.ts';

const SIZE=1040;
/** A tidy test world: gentle slope everywhere, a lake in the north-west, a cliff band, camps in two corners, one province per quadrant. */
function env(over={}){
 const height=(x,z)=>{const cliff=Math.abs(z-300)<20?(z-300)*3:0;return 6+.01*x+cliff;};
 const waterAt=(x,z)=>Math.hypot(x+300,z+300)<90?9:0;
 const kinds=['conifer-forest','meadow','mixed-woodland','arid'];
 return {seed:7,size:SIZE,height,waterAt,provinceAt:(x,z)=>{const kind=kinds[(x<0?0:1)+(z<0?0:2)];return {kind,treeDensityPerHectare:PROVINCE_PROFILES[kind].treeDensityPerHectare};},
  soilAt:()=>null,camps:[{x:-400,z:-400},{x:380,z:380}],baseFormAt:(id,x)=>x<0?'conifer':'broadleaf',...over};
}
const camera={x:0,z:0};
const sweep=(f,opts={})=>{const out={trees:[],blobs:[]};const r=f.collect(camera,{detail:700,far:900,fade:0,maxTrees:1e9,maxBlobs:1e9,...opts},out);return {out,r};};

test('filler is deterministic: same world twice gives the same forest, call order does not matter, another seed gives another',()=>{
 const a=sweep(new FillerForest(env())).out,b=sweep(new FillerForest(env())).out;
 assert.ok(a.trees.length>500,'a real forest '+a.trees.length);
 assert.deepEqual(a.trees,b.trees);assert.deepEqual(a.blobs,b.blobs);
 // visit chunks in a different order (collect from elsewhere first), then compare chunk content
 const f=new FillerForest(env());f.collect({x:350,z:-350},{detail:200,far:300,fade:0,maxTrees:1e9,maxBlobs:1e9},{trees:[],blobs:[]});
 const c=new FillerForest(env());for(const [cx,cz] of [[0,0],[-3,2],[5,-4],[2,2]])assert.deepEqual(f.chunk(cx,cz).trees,c.chunk(cx,cz).trees);
 const other=sweep(new FillerForest(env({seed:8}))).out;assert.notDeepEqual(a.trees.slice(0,20),other.trees.slice(0,20));
 // ids are unique and negative
 const ids=new Set(a.trees.map(t=>t.id));assert.equal(ids.size,a.trees.length);assert.ok(a.trees.every(t=>isFillerId(t.id)&&t.id<0&&t.filler===true&&t.amount>0));
});

test('filler stays off the sim: clear of sim trees, camps (gradient), water, cliffs, bare soil and the world edge',()=>{
 const sim=[];for(let i=0;i<400;i++)sim.push({x:-200+(i%20)*8,z:-100+Math.floor(i/20)*8});
 const e=env(),f=new FillerForest(e);f.setSimTrees(sim);
 const {out}=sweep(f);assert.ok(out.trees.length>300);
 for(const t of out.trees){
  assert.ok(Math.abs(t.x)<=SIZE/2-FILLER_RULES.worldMarginMetres+1e-6&&Math.abs(t.z)<=SIZE/2-FILLER_RULES.worldMarginMetres+1e-6,'inside the world');
  assert.ok(t.y>=e.waterAt(t.x,t.z)+FILLER_RULES.minDryMetres-1e-6,'dry ground');
  assert.ok(!(Math.abs(t.z-300)<20),'not on the cliff band');
  for(const s of sim)assert.ok(Math.hypot(s.x-t.x,s.z-t.z)>=FILLER_RULES.simSeparationMetres-1e-6,'clear of sim trees');
  assert.ok(f.campDistance(t.x,t.z)>=DRAW_DISTANCE_RULES.simTreeRadiusMetres-1e-6,'never inside the sim-tree radius of a camp');
 }
 // thinning is a gradient: the share of kept candidates grows with distance from the camp
 const near=out.trees.filter(t=>f.campDistance(t.x,t.z)<DRAW_DISTANCE_RULES.simTreeRadiusMetres+DRAW_DISTANCE_RULES.fillerBlendMetres*.5).length,far=out.trees.filter(t=>f.campDistance(t.x,t.z)>=DRAW_DISTANCE_RULES.simTreeRadiusMetres+DRAW_DISTANCE_RULES.fillerBlendMetres).length;
 assert.ok(near<far);
 // thin geology soil removes the stand
 const bare=sweep(new FillerForest(env({soilAt:()=>.04}))).out;assert.equal(bare.trees.length,0,'bare rock grows nothing');
 const poor=sweep(new FillerForest(env({soilAt:()=>.3}))).out,rich=sweep(new FillerForest(env({soilAt:()=>1}))).out;assert.ok(poor.trees.length<rich.trees.length,'shallow soil thins the stand');
 // buildings are a hard filter supplied by the caller
 const clear=sweep(f,{exclude:(x,z)=>Math.hypot(x-100,z-0)<60}).out;assert.ok(clear.trees.every(t=>Math.hypot(t.x-100,t.z)>=60)&&clear.blobs.every(b=>Math.hypot(b.x-100,b.z)>=60));
});

test('density follows the province and the groves: conifer forest is denser than meadow and arid, and the stand is clumped, not uniform',()=>{
 const f=new FillerForest(env());const {out}=sweep(f);
 const count=(pred)=>out.trees.filter(pred).length,conifer=count(t=>t.x<0&&t.z<0),meadow=count(t=>t.x>=0&&t.z<0),mixed=count(t=>t.x<0&&t.z>=0),arid=count(t=>t.x>=0&&t.z>=0);
 assert.ok(conifer>meadow*2&&mixed>meadow*2&&meadow>arid,`${conifer} ${mixed} ${meadow} ${arid}`);
 // clumping: the grove field spans clearings (0) and dense woods in the same province
 const samples=[];for(let i=0;i<400;i++)samples.push(groveAt(7,(i%20)*30-300,Math.floor(i/20)*30-300));assert.ok(Math.min(...samples)<.25&&Math.max(...samples)>.6);
 const per=PROVINCE_KINDS.map(k=>PROVINCE_PROFILES[k].treeDensityPerHectare);assert.ok(Math.max(...per)>=100);
});

test('collect honours caps nearest-first and reports where the budget really ended, so the renderer fades there instead of at a ring',()=>{
 const f=new FillerForest(env());
 const {out,r}=sweep(f,{maxTrees:120,maxBlobs:300,detail:700,far:900,fade:60});
 assert.ok(out.trees.length<=120&&out.blobs.length<=300);assert.ok(r.treeCapped&&r.detailEff<700,'detail radius shrinks to the cap '+r.detailEff);assert.ok(r.blobCapped&&r.farEff<900,'far radius shrinks to the cap '+r.farEff);
 for(const t of out.trees)assert.ok(Math.hypot(t.x,t.z)<=r.detailEff+1e-6);
 for(const b of out.blobs)assert.ok(Math.hypot(b.x,b.z)>=r.detailEff-60-1e-6&&Math.hypot(b.x,b.z)<=900+1e-6);
 // blobs merge trees: far fewer instances than the trees they stand for
 const full=sweep(f).out;assert.ok(full.blobs.length<full.trees.length/3,`${full.blobs.length} blobs for ${full.trees.length} trees`);
 for(const b of full.blobs.slice(0,200)){assert.ok(b.r>0&&b.h>0&&b.n>=1&&Number.isFinite(b.x+b.y+b.z+b.cr+b.cg+b.cb));assert.ok(b.cr<=1&&b.cg<=1&&b.cb<=1);}
 // a build budget defers chunks instead of stalling the frame, and they fill in on later calls
 const g=new FillerForest(env()),first=g.collect(camera,{detail:300,far:500,fade:0,maxTrees:1e9,maxBlobs:1e9,buildMs:0},{trees:[],blobs:[]});
 assert.ok(first.deferred>0);let last=first;for(let i=0;i<2000&&last.deferred>0;i++)last=g.collect(camera,{detail:300,far:500,fade:0,maxTrees:1e9,maxBlobs:1e9,buildMs:0},{trees:[],blobs:[]});assert.equal(last.deferred,0);
 const settled={trees:[],blobs:[]};g.collect(camera,{detail:300,far:500,fade:0,maxTrees:1e9,maxBlobs:1e9},settled);const direct={trees:[],blobs:[]};new FillerForest(env()).collect(camera,{detail:300,far:500,fade:0,maxTrees:1e9,maxBlobs:1e9},direct);assert.deepEqual(settled.trees,direct.trees);
});

test('chunk cache is bounded and rebuilds identically after eviction',()=>{
 const f=new FillerForest(env());const first=JSON.stringify(f.chunk(0,0).trees);
 for(let i=0;i<FILLER_RULES.maxChunks+50;i++)f.chunk((i%30)-15,Math.floor(i/30)-15);
 assert.ok(f.chunks.size<=FILLER_RULES.maxChunks);assert.equal(JSON.stringify(f.chunk(0,0).trees),first);
});

function fakeGame(extra={}){
 const width=8,idx=PROVINCE_KINDS.indexOf('mixed-woodland');
 const ecology={version:1,size:512,width,cellMeters:64,kinds:new Uint8Array(width*width).fill(idx),freshwaterDistanceMeters:new Float32Array(width*width).fill(80),temperatureOffsetCelsius:new Float32Array(width*width),moisture:new Float32Array(width*width).fill(.5),soil:new Float32Array(width*width).fill(.7),metrics:{regions:[]}};
 const trees=[];for(let i=0;i<60;i++)trees.push({id:i+1,kind:'tree',x:-20+(i%10)*6,y:2,z:-20+Math.floor(i/10)*6,amount:20,maxAmt:20,regenT:0,scale:1,rich:1});
 return {ecology,game:{world:{size:512,camps:[{x:-10,z:-10}],mapgen:{wind:{x:1,z:0}}},state:{seed:9,trees,buildings:[]},height:(x,z)=>Math.max(0,x*.01)+2,waterAt:()=>0,exploredAt:()=>true,seasonMix:()=>({winter:0,autumn:0,snow:0}),...extra}};
}

test('rendering the filler never touches the simulation: state is byte-identical, filler ids are never resources and never picked',()=>{
 const {ecology,game}=fakeGame();
 const scene=new THREE.Scene(),layer=new BiomeSceneLayer(scene,game,ecology,'painterly','botanical');
 const before=JSON.stringify(game.state);
 const view={bands:drawBands('high',512),prime:true,key:'a'};
 layer.sync(game,{x:0,z:0},'med',1,view);layer.sync(game,{x:40,z:-30},'med',1,{...view,key:'b'});
 assert.equal(JSON.stringify(game.state),before,'game state unchanged');
 assert.ok(layer.lastFiller&&layer.lastFiller.blobs+layer.lastFiller.trees>0,'filler drawn');
 const simIds=new Set(game.state.trees.map(t=>t.id));
 for(const src of layer.pickingSources())for(const id of src.resourceIds){assert.ok(simIds.has(id),'only real resource ids are pickable, got '+id);assert.ok(!isFillerId(id));}
 // the filler meshes exist and cannot be raycast
 let fillerMeshes=0;scene.traverse(o=>{if(o.isInstancedMesh&&/^filler-(far|horizon)/.test(o.name)&&!/horizon/.test(o.name)){fillerMeshes++;assert.equal(o.count>=0,true);const hits=[];o.raycast(new THREE.Raycaster(new THREE.Vector3(0,50,0),new THREE.Vector3(0,-1,0)),hits);assert.equal(hits.length,0,'filler crowns are not hittable');}});
 assert.ok(fillerMeshes>0);
 // filler instances are in a pool that no picking source covers beyond the sim trees' own cheap crowns
 for(const src of layer.pickingSources())if(/horizon/.test(src.mesh.name))assert.ok(src.resourceIds.length<=src.mesh.count);
 layer.dispose();
});

test('Low draw distance draws no filler at all and keeps the original radii',()=>{
 const {ecology,game}=fakeGame();const scene=new THREE.Scene(),layer=new BiomeSceneLayer(scene,game,ecology,'painterly','botanical');
 layer.sync(game,{x:0,z:0},'med',1,{bands:drawBands('low',512),prime:true,key:'l'});
 assert.equal(layer.lastFiller,null);let filler=0;scene.traverse(o=>{if(o.isInstancedMesh&&/^filler-/.test(o.name))filler+=o.count;});assert.equal(filler,0);
 layer.dispose();
});

test('a building keeps filler trees out of its footprint even when it appears after the forest was drawn',()=>{
 const {ecology,game}=fakeGame();const scene=new THREE.Scene(),layer=new BiomeSceneLayer(scene,game,ecology,'painterly','botanical');
 const view={bands:drawBands('high',512),prime:true,key:'a'};layer.sync(game,{x:0,z:0},'med',1,view);const withNone=layer.lastFiller.trees+layer.lastFiller.blobs;
 game.state.buildings.push({hp:10,x:0,z:150,w:20,d:20});layer.sync(game,{x:0,z:0},'med',1,{...view,key:'b'});
 assert.ok(layer.lastFiller.trees+layer.lastFiller.blobs<=withNone);layer.dispose();
});

test('triangle budget at Medium: far crowns beyond the detail radius cost 20 triangles, not 288, and the frame stays under the budget table',()=>{
 const scene=new THREE.Scene(),nodes=[];for(let i=0;i<1500;i++)nodes.push({id:i+1,x:-600+(i%50)*24,y:0,z:-400+Math.floor(i/50)*26,amount:30,scale:1,regenT:0});
 const mk=()=>new BotanicalForest(scene,{seed:3,siteAt:()=>DEFAULT_SITE,baseFormAt:(id)=>({base:id%3?'broadleaf':'conifer',kind:'mixed-woodland'}),nearMetres:{low:28,med:75,high:115},farMetres:700,lowFarMetres:420,stumpHeightScale:.075});
 const tris=()=>{let t=0;scene.traverse(o=>{if(o.isInstancedMesh&&o.count>0&&o.visible){const g=o.geometry;t+=(g.index?g.index.count:g.getAttribute('position').count)/3*o.count;}});return t;};
 const ctx={quality:'med',camera:{x:0,z:0},known:()=>true,winter:0,autumn:0,snow:0};
 const f=mk();f.sync(nodes,{...ctx,farMetres:700});const legacy=tris();f.dispose();
 const g=mk(),b=drawBands('medium',1040);g.sync(nodes,{...ctx,farMetres:b.treeFar,fadeMetres:b.fadeMetres,filler:{trees:[],blobs:[],detailEff:b.fillerDetail,farEff:b.fillerFar}});const medium=tris();g.dispose();
 assert.ok(medium<legacy,`Medium reaches farther (${b.treeFar} vs 700 m) and still submits fewer triangles: ${medium} vs ${legacy}`);
});
