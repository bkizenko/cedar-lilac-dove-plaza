import test from 'node:test';import assert from 'node:assert/strict';
let THREE=null,L=null;try{THREE=await import('three');L=await import('../src/scene/characterRigLayer.ts');}catch(e){THREE=null;}
const skip=THREE?false:'three is not installed here (npm ci)';
const {cultureForCiv}=await import('../src/scene/civPeople.ts');
const culture=cultureForCiv('hanrei',3),other=cultureForCiv('rusvolt',3);
const U=(o={})=>({id:1,type:'worker',team:0,x:0,y:0,z:0,vx:0,vz:0,facing:0,hp:10,order:'idle',...o});
function world(extra={}){const alive=new Set(),w={time:0,season:'summer',era:3,identity:t=>({culture:t===0?culture:other,teamColor:t===0?'#e0c078':'#e05038'}),gearOf:u=>({garment:{item:'woolCoat',condition:1},...(u.type==='spearman'?{armor:{kind:'paddedTorso',condition:1}}:{})}),
 projectFor:()=>undefined,farmFor:()=>null,fireLitNear:()=>false,loadOf:()=>0,aliveIds:()=>alive,visible:()=>true,...extra};return {w,alive};}
const cam=()=>new THREE.Vector3(0,6,20);
test('rig layer: a crowd of one outfit costs one draw per bone, not per person; far tier is one draw per outfit',{skip},()=>{
 const scene=new THREE.Scene(),layer=new L.CharacterRigLayer(scene),{w,alive}=world();
 const units=Array.from({length:40},(_,i)=>U({id:i+1,x:(i%8)*1.2-5,z:-Math.floor(i/8)*1.2}));units.forEach(u=>alive.add(u.id));
 layer.beginFrame(w,cam(),'high',true);for(const u of units)assert.ok(layer.write(u,[1.65,1.65,1.65],0,1,.5));layer.endFrame();
 assert.equal(layer.stats.people,40);assert.equal(layer.stats.tiers[0],40);assert.ok(layer.stats.draws<=16,'one outfit (4 hem/sash variants of hips and spine): '+layer.stats.draws);const d40=layer.stats.draws;
 layer.beginFrame(w,cam(),'high',true);for(const u of units.slice(0,10))layer.write(u,[1.65,1.65,1.65],0,1,.5);layer.endFrame();assert.ok(d40<=layer.stats.draws+8,'draws are about variety, not head count');
 // far away: the same crowd is one merged silhouette per outfit
 layer.beginFrame(w,new THREE.Vector3(0,60,320),'high',true);for(const u of units)layer.write(u,[1.65,1.65,1.65],0,1,.5);layer.endFrame();
 assert.equal(layer.stats.tiers[2],40);assert.ok(layer.stats.draws<=4,'far: one merged mesh per outfit variant (4 hem/sash variants): '+layer.stats.draws);assert.ok(layer.stats.triangles/40<=700,'far tier stays within its budget');
 assert.equal([...layer.object.children].reduce((n,m)=>n+m.count,0),40,'every person is exactly one far instance');
 layer.dispose();assert.equal(layer.object.parent,null);
});
test('rig layer: capacity grows past the starting size and every instance matrix is finite',{skip},()=>{
 const scene=new THREE.Scene(),layer=new L.CharacterRigLayer(scene),{w,alive}=world();
 const units=Array.from({length:70},(_,i)=>U({id:i+1,x:i*.4,z:0,order:i%2?'gather':'move',vx:i%2?0:2,node:{kind:'tree'}}));units.forEach(u=>alive.add(u.id));
 for(let f=0;f<5;f++){w.time=f*.1;layer.beginFrame(w,cam(),'med',false);for(const u of units)layer.write(u,[1.65,1.65,1.65],0,1,.5);layer.endFrame();}
 for(const m of layer.object.children)if(m.count>0){assert.ok(m.instanceMatrix.count>=m.count);for(let i=0;i<m.count*16;i++)assert.ok(Number.isFinite(m.instanceMatrix.array[i]));}
 assert.ok(layer.object.children.some(m=>m.count===70));layer.dispose();
});
test('rig layer: different civs and gear make different outfits but identical outfits share draws; the animator really moves the arms',{skip},()=>{
 const scene=new THREE.Scene(),layer=new L.CharacterRigLayer(scene),{w,alive}=world();
 const a=U({id:1,team:0}),b=U({id:2,team:1,x:2}),c=U({id:3,team:0,type:'spearman',x:4}),chop=U({id:4,team:0,x:6,order:'gather',node:{kind:'tree'}});[a,b,c,chop].forEach(u=>alive.add(u.id));
 const armR=()=>{const m=[...layer.object.children].find(x=>x.name.includes('|armR|')&&x.count>0);return m;};
 const pose=t=>{w.time=t;layer.beginFrame(w,cam(),'high',false);for(const u of [a,b,c,chop])layer.write(u,[1.65,1.65,1.65],0,1,.5);layer.endFrame();return [...layer.object.children].filter(m=>m.count>0).length;};
 const draws=pose(0);assert.ok(draws>=18,'civ and gear differences make separate draws: '+draws);
 const snap=m=>Array.from(m.instanceMatrix.array.slice(0,16*m.count));pose(0);const first=[...layer.object.children].filter(m=>m.name.includes('|armR|')&&m.count>0).map(snap);
 pose(.4);const later=[...layer.object.children].filter(m=>m.name.includes('|armR|')&&m.count>0).map(snap);
 assert.ok(first.length>0&&JSON.stringify(first)!==JSON.stringify(later),'the chopper\'s arm moved with sim time');assert.ok(armR());
 layer.dispose();
});
test('rig layer: a death leaves a lying body for a bounded time, then it is gone',{skip},()=>{
 const scene=new THREE.Scene(),layer=new L.CharacterRigLayer(scene),{w,alive}=world();
 const u=U({id:9,x:1,z:1,vx:0,vz:0,facing:.4});alive.add(9);
 w.time=1;layer.beginFrame(w,cam(),'high',true);layer.write(u,[1.65,1.65,1.65],0,1,.5);layer.writeCorpses(()=>0,()=>true);layer.endFrame();assert.equal(layer.stats.corpses,0);
 alive.delete(9);w.time=1.1;layer.beginFrame(w,cam(),'high',true);layer.writeCorpses(()=>0,()=>true);layer.endFrame();assert.equal(layer.stats.corpses,1,'the body appears where the unit died');
 w.time=3;layer.beginFrame(w,cam(),'high',true);layer.writeCorpses(()=>0,()=>true);layer.endFrame();assert.equal(layer.stats.corpses,1);
 const y=[...layer.object.children].filter(m=>m.count>0).flatMap(m=>[m.instanceMatrix.array[13]]);assert.ok(y.every(Number.isFinite));
 w.time=100;layer.beginFrame(w,cam(),'high',true);layer.writeCorpses(()=>0,()=>true);layer.endFrame();assert.equal(layer.stats.corpses,0,'bodies sink away and are removed');
 layer.dispose();
});
test('rig maths agrees with three.js: composeEuler is exactly Euler YXZ + scale + translate',{skip},async()=>{
 const {composeEuler}=await import('../src/scene/characterRig.ts');let worst=0,seed=1;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 for(let i=0;i<300;i++){const r=[rnd()*6-3,rnd()*6-3,rnd()*6-3],t=[rnd(),rnd(),rnd()],s=[1+rnd(),1+rnd(),1+rnd()];
  const m=new THREE.Matrix4().compose(new THREE.Vector3(...t),new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0],r[1],r[2],'YXZ')),new THREE.Vector3(...s)),o=composeEuler(new Array(16).fill(0),t,r,s);
  for(let k=0;k<16;k++)worst=Math.max(worst,Math.abs(o[k]-m.elements[k]));}
 assert.ok(worst<1e-9,'max difference '+worst);
});
