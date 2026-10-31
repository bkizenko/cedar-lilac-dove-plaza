import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {worldToMinimap,minimapToWorld,minimapTerrainColor,fogMinimapColor,sampleMinimapTerrain,cameraSurfaceRay,cameraSurfaceFootprint,MINIMAP_RULES} from '../src/ui/minimapModel.ts';
function camera(x=0,y=50,z=70,lookX=0,lookZ=0){const c=new THREE.PerspectiveCamera(38,16/9,.5,860);c.position.set(x,y,z);c.lookAt(lookX,0,lookZ);c.updateMatrixWorld(true);return c;}
function source(size=1040){let revision=0;const g={world:{size,segs:256,heights:new Float32Array(257*257).fill(4),waterY:0,baseWaterY:0,biomes:[{kind:'plains',x:0,z:0}]},state:{excavations:[]},height:()=>4,waterAt:()=>0,navigationRevision:()=>revision,bump:()=>revision++};return g;}
const area=p=>Math.abs(p.reduce((n,a,i)=>{const b=p[(i+1)%p.length];return n+a.x*b.z-a.z*b.x;},0)/2);
test('north-up map/world coordinates roundtrip at every supported size and clamp drag edges',()=>{
 for(const size of[1040,1560,2080])for(const[x,z]of[[-size/2,-size/2],[0,0],[size/2,size/2],[73.2,-211.7]]){const p=worldToMinimap(x,z,size),q=minimapToWorld(p.x,p.y,size);assert.ok(Math.abs(q.x-x)<1e-8&&Math.abs(q.z-z)<1e-8);}
 assert.ok(worldToMinimap(0,-100,1040).y<80);assert.deepEqual(minimapToWorld(-10,170,2080),{x:-1040,z:1040});
});
test('coasts and elevated lakes use local water rather than the global ocean plane; fog hides all terrain identity',()=>{
 const lake=minimapTerrainColor(8,12,'alpine'),dry=minimapTerrainColor(8,0,'alpine');assert.ok(lake[2]>lake[0]);assert.notDeepEqual(lake,dry);
 const g=source(100);g.height=()=>8;g.waterAt=(x,z)=>Math.abs(x)<20&&Math.abs(z)<20?12:0;const sampled=sampleMinimapTerrain(g,0,20),i=10*20+10;
 assert.equal(sampled.water[i],12);assert.equal(sampled.heights[i],8);assert.ok(sampled.colors[i*3+2]>sampled.colors[i*3]);
 assert.deepEqual(fogMinimapColor(lake,false,false),fogMinimapColor(dry,false,false));assert.deepEqual(fogMinimapColor(lake,true,false),lake.map(v=>v*.65));
});
test('terrain cache follows navigation/world resets and bounded actual-ground elevation changes',()=>{
 const g=source(100),first=sampleMinimapTerrain(g,0,20);assert.equal(sampleMinimapTerrain(g,100,20),first);
 g.height=(x,z)=>4-(Math.abs(x-2.5)<2&&Math.abs(z-2.5)<2?1.5:0);
 assert.equal(sampleMinimapTerrain(g,499,20),first);const cut=sampleMinimapTerrain(g,500,20),i=10*20+10;assert.ok(cut.heights[i]<3,'map samples the changed physical ground elevation after the bounded refresh');
 g.bump();assert.notEqual(sampleMinimapTerrain(g,501,20),cut);const beforeReset=sampleMinimapTerrain(g,502,20);g.world={...g.world,size:2080};g.state.excavations=[];g.height=()=>9;
 const reset=sampleMinimapTerrain(g,503,20);assert.notEqual(reset,beforeReset);assert.equal(reset.size,2080);assert.equal(reset.heights[i],9);
});
test('camera rays meet actual elevated water and terrain and respect actual map extent',()=>{
 const c=camera(0,30,40),lake=cameraSurfaceRay(c,0,0,1040,()=>12);assert.ok(Math.abs(lake.y-12)<1e-8);assert.ok(Math.abs(lake.z-16)<.01);
 const ridge=(x,z)=>20*Math.exp(-(((z-25)/8)**2)),hit=cameraSurfaceRay(c,0,0,1040,ridge);assert.ok(hit.y>0&&hit.z>0);assert.ok(Math.abs(hit.y-ridge(hit.x,hit.z))<1e-8);
 const off=camera(800,40,0,800,0);assert.equal(cameraSurfaceRay(off,0,0,1040,()=>0),null);assert.ok(Math.abs(cameraSurfaceRay(off,0,0,2080,()=>0).x-800)<.01);
});
test('actual camera footprint rotates, scales with zoom, and changes with pitch within a bounded query budget',()=>{
 const flat=()=>0,a=cameraSurfaceFootprint(camera(),1040,flat),rotated=cameraSurfaceFootprint(camera(70,50,0),1040,flat),zoomed=cameraSurfaceFootprint(camera(0,100,140),1040,flat);
 assert.equal(a.points.length,8);assert.equal(rotated.points.length,8);for(let i=0;i<8;i++){assert.ok(Math.abs(rotated.points[i].x-a.points[i].z)<.01);assert.ok(Math.abs(rotated.points[i].z+a.points[i].x)<.01);}
 assert.ok(Math.abs(area(zoomed.points)/area(a.points)-4)<.01);const shallow=cameraSurfaceFootprint(camera(0,20,70),2080,flat);assert.ok(area(shallow.points)>area(a.points));
 for(const f of[a,rotated,zoomed,shallow])assert.ok(f.queries<=MINIMAP_RULES.maximumFootprintQueries);assert.equal(a.truncated,false);
});
test('supported camera pitch and zoom extremes retain a valid bounded footprint on small and huge maps',()=>{
 for(const size of[1040,2080])for(const pitch of[.2,.38,1.36])for(const dist of[14,58,230]){
  const c=new THREE.PerspectiveCamera(38,16/9,.5,860);c.position.set(Math.sin(1.12)*Math.cos(pitch)*dist,4.55+Math.sin(pitch)*dist,Math.cos(1.12)*Math.cos(pitch)*dist);c.lookAt(0,5.75,0);c.updateMatrixWorld(true);
  const f=cameraSurfaceFootprint(c,size,()=>4);assert.equal(f.truncated,false,`${size}/${pitch}/${dist}`);assert.ok(f.points.length>=3);assert.ok(f.queries<=MINIMAP_RULES.maximumFootprintQueries);
 }
});
