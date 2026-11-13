import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {BotanicalForest,FOREST_LOD} from '../src/scene/botanicalForest.ts';
import {painterForm,CanopyCover,treeSiteAt,biomeDressingCandidates} from '../src/scene/biomeSceneLayer.ts';
import {BOTANICAL_SPECIES,pickSpecies,DEFAULT_SITE} from '../src/scene/botanicalSpecies.ts';
import {botanicalTree} from '../src/scene/treeBotany.ts';
import {PROVINCE_KINDS} from '../src/game/ecologicalProvinces.ts';
import {geologyFor} from '../src/scene/painterGeology.ts';

const kinds=(k,site,n=600,moisture=.5)=>{const c={};for(let i=0;i<n;i++){const f=painterForm(k,(i+.5)/n,false,moisture,site);c[f]=(c[f]||0)+1;}return c;};
const share=(c,names,n=600)=>names.reduce((s,k)=>s+(c[k]||0),0)/n;

test('stand structure: thin soil and scree are sparse, closed canopy has a forest floor, clearings have grass and flowers',()=>{
 const thin=kinds('mixed-woodland',{cover:.6,edge:0,soil:.1,slope:0}),under=kinds('mixed-woodland',{cover:.7,edge:0,soil:.8,slope:0}),clear=kinds('meadow',{cover:0,edge:0,soil:.8,slope:0}),edge=kinds('mixed-woodland',{cover:.15,edge:.4,soil:.8,slope:0});
 assert.ok(share(thin,['pebbles','rocks','cushion','drygrass'])>.55,'thin soil is stones and dry tufts');assert.equal(thin.fern||0,0);assert.equal(thin.sapling||0,0);
 assert.ok(share(under,['fern','bracken','moss','mushroom','deadwood','log','stump','sapling','pinelet'])>.6,'canopy floor is ferns, fungi, deadwood and saplings');
 assert.ok((under.sapling||0)>0&&(under.log||0)>0&&(under.mushroom||0)>0);
 assert.ok(share(clear,['grass','flowers','tallgrass'])>.7,'clearing is grass and flowers');
 assert.ok(share(edge,['bush','sapling','tallgrass'])>.25,'edge carries shrubs and saplings');
 // moss mounds stay rare outside wet closed canopy
 assert.ok((kinds('mixed-woodland',{cover:.7,edge:0,soil:.8,slope:0},600,.3).moss||0)/600<.05);
});

test('canopy cover follows living trees and is deterministic',()=>{
 const trees=[{id:1,x:0,z:0,amount:10,scale:1},{id:2,x:5,z:3,amount:10,scale:1.2},{id:3,x:100,z:100,amount:0,scale:1}],a=new CanopyCover(),b=new CanopyCover();a.update(trees);b.update(trees);
 assert.ok(a.cover(1,1)>.3);assert.ok(a.cover(100,100)<.01,'felled tree casts no canopy');assert.equal(a.cover(2,2),b.cover(2,2));
 for(const x of [-50,0,3,40,500])assert.ok(Number.isFinite(a.cover(x,x))&&a.cover(x,x)>=0&&a.cover(x,x)<=1);
});

function fakeGame(){return {world:{size:512,mapgen:{wind:{x:1,z:0}}},state:{seed:9,trees:[],buildings:[]},height:(x,z)=>Math.max(0,x*.05),waterAt:()=>0,exploredAt:()=>true,seasonMix:()=>({winter:0,autumn:0,snow:0})};}
function ecology(kind='mixed-woodland'){const width=8,idx=PROVINCE_KINDS.indexOf(kind);return {version:1,size:512,width,cellMeters:64,kinds:new Uint8Array(width*width).fill(idx),freshwaterDistanceMeters:new Float32Array(width*width).fill(60),soil:new Float32Array(width*width).fill(.7),moisture:new Float32Array(width*width).fill(.5),temperatureOffsetCelsius:new Float32Array(width*width).fill(0),slope:new Float32Array(width*width).fill(.1)};}

test('site reading is finite and the soil channel reads geology soil and scree',()=>{
 const g=fakeGame(),eco=ecology(),s=treeSiteAt(g,eco,10,10);
 for(const v of Object.values(s))assert.ok(Number.isFinite(v));assert.ok(s.soil>=0&&s.soil<=1);assert.ok(s.slope>0.03,'sloping ground');
 const segs=16,n=segs+1,world={heights:new Float32Array(n*n).fill(4),size:512,waterY:0,ecology:eco,mapgen:{geology:{width:n,rock:new Uint8Array(n*n),soil:new Float32Array(n*n).fill(.05),scree:new Float32Array(n*n).fill(.9)}}};
 geologyFor(world,9,{height:()=>4,waterAt:()=>0});
 const bare=treeSiteAt({...g,world},eco,0,0);assert.ok(bare.soil<.15,'scree and thin soil read as barren '+bare.soil);
});

test('thin soil shifts species choice toward pioneers (birch, pine, juniper) and away from beech',()=>{
 const count=(site)=>{const c={};for(let i=0;i<800;i++){const id=pickSpecies('broadleaf','mixed-woodland',site,(i+.5)/800);c[id]=(c[id]||0)+1;}return c;};
 const rich=count({...DEFAULT_SITE,soil:.9}),poor=count({...DEFAULT_SITE,soil:.05});
 assert.ok((poor.birch||0)>(rich.birch||0));assert.ok((poor.beech||0)<(rich.beech||0));
});

test('forest sync: deterministic, finite instance transforms, every tree gets a distinct record, no two stand alike',()=>{
 const nodes=[];for(let i=0;i<400;i++)nodes.push({id:i+1,x:(i%20)*7-70,y:0,z:Math.floor(i/20)*7-70,amount:30,scale:.8+((i*37)%10)/25,regenT:0});
 const mk=()=>{const scene=new THREE.Scene(),f=new BotanicalForest(scene,{seed:11,siteAt:()=>DEFAULT_SITE,baseFormAt:(id)=>({base:id%3?'broadleaf':'conifer',kind:'mixed-woodland'}),nearMetres:{low:28,med:75,high:115},farMetres:700,lowFarMetres:420,stumpHeightScale:.075});return {scene,f};};
 const a=mk(),b=mk(),ctx={quality:'high',camera:{x:0,z:0},known:()=>true,winter:0,autumn:0,snow:0};
 const ra=a.f.sync(nodes,ctx),rb=b.f.sync(nodes,ctx);assert.deepEqual(ra,rb);
 const sig=n=>JSON.stringify(a.f.describe(n)),kinds=new Set(nodes.map(sig));assert.ok(kinds.size>300,'per-instance variation '+kinds.size);
 let calls=0,tris=0;a.scene.traverse(o=>{if(o.isInstancedMesh&&o.count>0&&o.visible){calls++;const g=o.geometry,t=(g.index?g.index.count:g.getAttribute('position').count)/3;tris+=t*o.count;for(let i=0;i<o.count*16;i++)assert.ok(Number.isFinite(o.instanceMatrix.array[i]),o.name+' NaN');}});
 assert.ok(calls>0&&calls<=60,'draw calls for 400 trees '+calls);assert.ok(tris<900000,'tris '+tris);
 a.f.dispose();b.f.dispose();
});

test('LOD tiers keep full trees to the near field: full tier is close, mid tier cheaper, budgets hold per species',()=>{
 assert.ok(FOREST_LOD.fullFraction<=.5&&FOREST_LOD.midFraction<=1.3&&FOREST_LOD.midFraction>FOREST_LOD.fullFraction);
 let worstFull=0,worstMid=0;for(const sp of BOTANICAL_SPECIES){const f=botanicalTree(sp.id,0,0),m=botanicalTree(sp.id,0,1);worstFull=Math.max(worstFull,f.triangles);worstMid=Math.max(worstMid,m.triangles);}
 assert.ok(worstFull<=6500&&worstMid<=1200,`${worstFull}/${worstMid}`);
});

test('dressing candidates stay deterministic with a canopy floor and never exceed their caps',()=>{
 const g=fakeGame(),eco=ecology(),cov=new CanopyCover();g.state.trees=Array.from({length:60},(_,i)=>({id:i+1,x:(i%10)*9-45,z:Math.floor(i/10)*9-27,amount:20,scale:1,regenT:0}));cov.update(g.state.trees);
 const a=biomeDressingCandidates(g,eco,{x:0,z:0},'high','painterly',cov),b=biomeDressingCandidates(g,eco,{x:0,z:0},'high','painterly',cov);
 assert.deepEqual(a,b);assert.ok(a.length>100&&a.length<=1500);for(const p of a)assert.ok(Number.isFinite(p.x+p.y+p.z+(p.scale??1)));
 assert.ok(a.some(p=>p.kind==='sapling')||a.some(p=>p.kind==='fern'),'woodland floor appears under canopy');
});
