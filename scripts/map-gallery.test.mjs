import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {MAP_GALLERY,galleryPose,findGalleryAnchor,galleryShots,nextGalleryScene,galleryScene} from '../src/scene/mapGallery.ts';

const terrainOf=g=>({size:g.world.size,height:(x,z)=>g.height(x,z),waterAt:(x,z)=>g.waterAt(x,z),camp:(()=>{const c=g.campOf(0);return {x:c.x,z:c.z};})()});
test('gallery lists the ten review scenes in order with unique ids and checks',()=>{
 assert.deepEqual(MAP_GALLERY.map(s=>s.id),['close','middle','wide','overcast','water','fall','cliff','dune','route','contour-farm']);
 assert.equal(new Set(MAP_GALLERY.map(s=>s.id)).size,10);
 for(const s of MAP_GALLERY){assert.ok(s.check.length>20);assert.ok(s.dist>0&&s.pitch>0&&s.pitch<1.4);}
 const d=['close','middle','wide'].map(i=>galleryScene(i).dist);assert.ok(d[0]<d[1]&&d[1]<d[2]);
 assert.equal(galleryScene('overcast').weather,'rain');assert.equal(galleryScene('fall').season,'autumn');
 assert.equal(galleryScene('close').yaw,galleryScene('wide').yaw,'close/middle/wide share one heading');
});
test('gallery cycling wraps both ways',()=>{
 assert.equal(nextGalleryScene(null).id,'close');assert.equal(nextGalleryScene('contour-farm').id,'close');assert.equal(nextGalleryScene('close',-1).id,'contour-farm');
});
test('poses on a real world are deterministic, in bounds, dry, and same-landscape scenes share the camp',()=>{
 const g=new Game();g.testMode=true;g.reset(7);g.enterIsland();const t=terrainOf(g);
 const a=MAP_GALLERY.map(s=>galleryPose(t,s)),b=MAP_GALLERY.map(s=>galleryPose(t,s));
 assert.deepEqual(a,b);
 for(const p of a){assert.ok(Math.abs(p.x)<=t.size/2&&Math.abs(p.z)<=t.size/2);assert.ok(Number.isFinite(p.lookY));}
 for(const id of ['close','middle','wide','overcast','fall']){const p=a.find(q=>q.id===id);assert.equal(p.x,t.camp.x);assert.equal(p.z,t.camp.z);}
 const sh=findGalleryAnchor(t,'shore');if(sh.found){assert.equal(t.waterAt(sh.x,sh.z)>t.height(sh.x,sh.z)+.05,false);}
 const cl=findGalleryAnchor(t,'cliff');if(cl.found){const e=1.5,sl=Math.hypot((t.height(cl.x+e,cl.z)-t.height(cl.x-e,cl.z))/3,(t.height(cl.x,cl.z+e)-t.height(cl.x,cl.z-e))/3);assert.ok(sl>.55);}
});
test('missing terrain features fall back to the camp rather than inventing ground',()=>{
 const flat={size:400,height:()=>0,waterAt:()=>-1e9,camp:{x:3,z:4}};
 for(const k of ['shore','cliff','dune','slope']){const r=findGalleryAnchor(flat,k);assert.equal(r.found,false);assert.deepEqual([r.x,r.z],[3,4]);}
});
test('harness shots cover every scene',()=>{
 const s=galleryShots(5);assert.equal(Object.keys(s).length,10);assert.ok(s['04-overcast'].weather==='rain'&&s['06-fall'].season==='autumn');
});
