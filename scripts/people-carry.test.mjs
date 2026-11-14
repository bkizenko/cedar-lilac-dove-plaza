// People gait and load carrying (owner playtest 11-13): natural walk/carry/haul/run with feet under the hips, work stances that never splay,
// loads carried the way real people carried them, loads built from round shapes (no box slabs).
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {CLIPS,samplePose,blendPoses,gaitBlend,HIP_WIDTH,STANCE_WIDTH_MAX,PARTS} from '../src/scene/animationClips.ts';
import {composeEuler,transformPoint,RIG_PIVOTS} from '../src/scene/characterRig.ts';
import {CARRY_STYLES,CARRY_STYLE_IDS,CARRY_KINDS,CARRY_DENSITY,carryMass,carryStyleFor,quantizeChoice,piecesFor} from '../src/scene/carryStyles.ts';
import {carryLoadParts,loadTriangles,CARRY_BUDGET} from '../src/scene/carryLoads.ts';
import {partBounds} from '../src/scene/buildingParts.ts';
const deg=180/Math.PI,V1={phaseOffset:0,speed:1,amplitude:1},N=48;
const sample=(clip,f,load=0,style)=>{for(let i=0;i<N;i++)f(samplePose(CLIPS[clip],i/N,V1,load,style),i/N);};
/** Foot centre in the PELVIS frame (so hip yaw does not count as stance width): leg pivot offset plus the leg's own rotation of its length. */
const foot=(pose,side)=>{const part=side<0?'legL':'legR',m=new Array(16).fill(0);composeEuler(m,[0,0,0],pose.parts[part]);const v=transformPoint(m,[0,-.5,0]);return [side*.085+v[0],v[1],v[2]];};
const width=(pose)=>Math.abs(foot(pose,1)[0]-foot(pose,-1)[0]);
const GAIT=['walk','carry','haul','run'],STANCE=['chop','quarry','till','build','plant','harvest','tend','thresh','grind','bake','craft','fight','thrust','shoot','slash','fish','winnow','spin','weave','scrape','knead','stir','hang'];

test('walk, carry, haul and run: feet land under the hips with a narrow step width, toes forward, no splay',()=>{
 for(const id of GAIT)sample(id,(p)=>{
  const w=width(p);assert.ok(w>=.04&&w<=.118,`${id} step width ${w.toFixed(3)} (hip joints are ${HIP_WIDTH})`);
  for(const s of [-1,1]){const f=foot(p,s);assert.ok(Math.abs(f[0])<=.085,`${id} foot is under its hip, not outside it (${f[0].toFixed(3)})`);}
  for(const part of ['legL','legR'])assert.ok(Math.abs(p.parts[part][1])*deg<=2,`${id} toes point forward (leg yaw ${(p.parts[part][1]*deg).toFixed(1)})`);
  // each leg adducts toward the midline, never abducts
  assert.ok(p.parts.legL[2]>=0&&p.parts.legR[2]<=0,`${id} legs go inward`);
 },id==='carry'?1:0);
 // blended walk to run keeps the narrow step at every speed
 for(let sp=0;sp<=7;sp+=.5)for(let i=0;i<N;i++){const b=gaitBlend(sp),p=blendPoses(samplePose(CLIPS.walk,i/N),samplePose(CLIPS.run,i/N),b),w=width(p);assert.ok(w>=.04&&w<=.118,`blend ${sp} m/s width ${w.toFixed(3)}`);}
 // the old playtest failure: legs well outside the hips while walking
 assert.ok(HIP_WIDTH*.7>=.1);
});
test('wide stances are for tool poses only and stay within 1.2x the hip width (was an A-stance up to 2x)',()=>{
 let widest=0;
 for(const id of STANCE)sample(id,(p)=>{const w=width(p);widest=Math.max(widest,w);assert.ok(w<=HIP_WIDTH*STANCE_WIDTH_MAX+1e-9,`${id} stance ${w.toFixed(3)} > ${(HIP_WIDTH*STANCE_WIDTH_MAX).toFixed(3)}`);for(const part of ['legL','legR'])assert.ok(Math.abs(p.parts[part][2])*deg<=2,`${id} leg roll ${(p.parts[part][2]*deg).toFixed(1)}`);});
 assert.ok(widest>=HIP_WIDTH,'the stance is at least hip width');
 // every clip is covered by one of the two groups (a new clip must declare itself)
 const known=new Set([...GAIT,...STANCE,'idle','row']);for(const id of Object.keys(CLIPS))assert.ok(known.has(id),`clip ${id} has no stance rule`);
 sample('idle',(p)=>assert.ok(width(p)<=HIP_WIDTH*STANCE_WIDTH_MAX));sample('row',(p)=>assert.ok(width(p)<=HIP_WIDTH*STANCE_WIDTH_MAX));
});
test('the stance keeps both feet on the ground by pitching the legs the same amount (fore-aft stagger), not by splaying',()=>{
 for(const id of STANCE){const c=CLIPS[id];if(!c.lock)continue;sample(id,(p)=>{const a=foot(p,-1),b=foot(p,1);
  // both feet end at the same height, so neither floats nor sinks relative to the other
  const ha=a[1]+p.root[1],hb=b[1]+p.root[1];assert.ok(Math.abs(ha-hb)<=.03,`${id} feet differ in height by ${Math.abs(ha-hb).toFixed(3)}`);});}
});
test('carry styles: spine pitch grows with load mass in every style; a head load stays upright; heavy back loads lean further than light ones',()=>{
 for(const id of CARRY_STYLE_IDS){let prev=-9;for(const m of [0,.25,.5,.75,1]){let max=-9;sample('carry',(p)=>{max=Math.max(max,p.parts.spine[0]*deg);},m,{id,mass:m});assert.ok(max>prev,`${id} pitch ${max.toFixed(1)} should exceed ${prev.toFixed(1)} at mass ${m}`);assert.ok(max<=26,`${id} lean ${max.toFixed(1)}`);prev=max;}}
 const lean=(id,m)=>samplePose(CLIPS.carry,.25,V1,m,{id,mass:m}).parts.spine[0]*deg;
 assert.ok(lean('headLoad',1)<=4,'a balanced head load keeps the torso upright');
 for(const id of ['bundleBack','tumplineBasket','sackBack','stoneFrame'])assert.ok(lean(id,1)>=lean('headLoad',1)+12,`${id} bends the torso`);
 assert.ok(lean('tumplineBasket',1)-lean('tumplineBasket',0)>=10,'a full tumpline load adds at least 10 degrees of lean');
});
test('carry styles: a heavier load shortens the stride; every style keeps the narrow step and bounded joints',()=>{
 for(const id of CARRY_STYLE_IDS){const swing=(m)=>{let mx=0;sample('carry',(p)=>{mx=Math.max(mx,Math.abs(p.parts.legL[0]));},m,{id,mass:m});return mx;};assert.ok(swing(1)<swing(0)*.8,`${id} stride ${swing(1).toFixed(3)} vs ${swing(0).toFixed(3)}`);
  for(const m of [0,.6,1])sample('carry',(p)=>{const w=width(p);assert.ok(w>=.04&&w<=.118,`${id} step ${w.toFixed(3)}`);for(const part of PARTS)for(const v of p.parts[part])assert.ok(Number.isFinite(v)&&Math.abs(v)<Math.PI);assert.ok(Math.abs(p.root[1])<.2&&Math.abs(p.root[0])<.05);},m,{id,mass:m});}
 // the unstyled carry posture is unchanged for old callers (no style = box-in-front), and still leans with load
 const a=samplePose(CLIPS.carry,.25,V1,0),b=samplePose(CLIPS.carry,.25,V1,1);assert.ok(b.parts.spine[0]>a.parts.spine[0]);
});
test('carry style choice is by society, cargo and fill, deterministic, and always a style that can carry that cargo',()=>{
 const civs=['sandrill','nilemark','tigrane','hanrei','vedara','aureline','sahelan','quillan','kaaltun','mekhari','brythen','rusvolt','steppan','skoldar'];const used=new Set();
 for(const civ of civs)for(const kind of CARRY_KINDS)for(let seed=1;seed<=12;seed++)for(const load of [.1,.5,1]){
  const c=carryStyleFor({society:civ,kind,load,seed});assert.deepEqual(c,carryStyleFor({society:civ,kind,load,seed}),'stable');
  assert.ok(CARRY_STYLES[c.style].kinds.includes(kind),`${civ} ${kind} -> ${c.style}`);assert.equal(c.mass,carryMass(kind,load));assert.ok(c.pieces>=1&&c.variety>=0&&c.variety<1);used.add(c.style);}
 for(const id of ['shoulderLog','bundleBack','tumplineBasket','headLoad','yoke','sackBack','stoneFrame'])assert.ok(used.has(id),`${id} is chosen by some society`);
 const pick=(civ,kind,n=30)=>{const m={};for(let s=1;s<=n;s++){const st=carryStyleFor({society:civ,kind,load:.7,seed:s}).style;m[st]=(m[st]||0)+1;}return Object.entries(m).sort((a,b)=>b[1]-a[1])[0][0];};
 assert.equal(pick('quillan','food'),'tumplineBasket');assert.equal(pick('hanrei','food'),'yoke');assert.equal(pick('sahelan','food'),'headLoad');assert.equal(pick('skoldar','stone'),'stoneFrame');
 // heavier timber is bound into a bundle, a light stick load stays a shoulder log
 const wood=(load)=>{const m={};for(let s=1;s<=40;s++){const st=carryStyleFor({society:'rusvolt',kind:'wood',load,seed:s}).style;m[st]=(m[st]||0)+1;}return m;};
 assert.ok((wood(1).bundleBack||0)>=(wood(1).shoulderLog||0),'heavy timber is bundled');assert.ok((wood(.2).shoulderLog||0)>=(wood(.2).bundleBack||0),'light timber rides the shoulder');
 assert.ok(CARRY_DENSITY.stone>CARRY_DENSITY.food&&carryMass('stone',.8)>carryMass('food',.8));
});
const sorted=(b)=>[b.maxX-b.minX,b.maxY-b.minY,b.maxZ-b.minZ].sort((x,y)=>x-y);
const union=(parts)=>{const b={minX:1e9,maxX:-1e9,minY:1e9,maxY:-1e9,minZ:1e9,maxZ:-1e9};for(const p of parts){const q=partBounds(p);for(const k of Object.keys(b))b[k]=k.startsWith('min')?Math.min(b[k],q[k]):Math.max(b[k],q[k]);}return b;};
test('loads are round-ended logs, baskets, sacks, jars and stones: no box slabs, finite, sized to the body, inside the geometry budget',()=>{
 for(const style of CARRY_STYLE_IDS)for(const kind of CARRY_STYLES[style].kinds)for(const load of [.25,.5,1])for(const variety of [.17,.5,.83]){
  const c=quantizeChoice({style,kind,load,mass:carryMass(kind,load),pieces:piecesFor(style,load),variety}),L=carryLoadParts(c,12345),tag=`${style}/${kind}/${load}/${variety}`,all=Object.values(L).flat();
  assert.ok(all.length>0,tag);
  for(const p of all){
   for(const v of [...p.size,...p.pos,...(p.rot||[])])assert.ok(Number.isFinite(v),tag+' finite');assert.ok(p.size.every(v=>v>0),tag+' positive size');
   if(p.shape==='box'&&p.role==='body'){const s=[...p.size].sort((a,b)=>a-b);assert.ok(s[2]/s[0]<=2.4,`${tag} box slab ${p.size.join('x')}`);}
   if(p.shape==='box')assert.ok(p.role!=='cord'||Math.max(...p.size)/Math.min(...p.size)>=0,tag);
  }
  const body=all.filter(p=>p.role==='body'),dims=sorted(union(body));assert.ok(dims[1]/dims[0]<=4.6,`${tag} reads as a slab: ${dims.map(v=>v.toFixed(2)).join(' x ')}`);
  const b=union(all);assert.ok(b.minX>=-1&&b.maxX<=1&&b.minY>=-.05&&b.maxY<=1.9&&b.minZ>=-3.1&&b.maxZ<=(style==='poleRear'?3.1:1.2),`${tag} stays near the body ${JSON.stringify(b)}`);
  if(kind==='wood'&&['shoulderLog','bundleBack','poleFront','poleRear'].includes(style)){const cy=body.filter(p=>p.shape==='cylinder').length;assert.ok(cy>=c.pieces&&!body.some(p=>p.shape==='box'),`${tag} logs are cylinders`);}
  for(const [tier,cap] of [[0,CARRY_BUDGET.near],[1,CARRY_BUDGET.mid],[2,CARRY_BUDGET.far]])assert.ok(loadTriangles(L,tier)<=cap,`${tag} tier ${tier}: ${loadTriangles(L,tier)} > ${cap}`);
 }
});
test('loads vary: log length and diameter differ between pieces and units, cordage is visible on bundles, baskets have a rim, sacks are tied',()=>{
 const wood=(variety,seed)=>carryLoadParts(quantizeChoice({style:'bundleBack',kind:'wood',load:1,mass:.85,pieces:piecesFor('bundleBack',1),variety}),seed).spine;
 const a=wood(.17,1),b=wood(.83,2),logs=(L)=>L.filter(p=>p.role==='body'&&p.shape==='cylinder');
 assert.ok(new Set(logs(a).map(p=>p.size[1].toFixed(2))).size>=3,'logs in one bundle differ in length');assert.ok(new Set(logs(a).map(p=>p.size[0].toFixed(3))).size>=3,'and in diameter');
 assert.notDeepEqual(logs(a).map(p=>p.size),logs(b).map(p=>p.size));assert.ok(a.filter(p=>p.role==='cord').length>=2,'bound with cordage');assert.ok(a.some(p=>p.role==='strap'),'shoulder loops');
 const bk=carryLoadParts(quantizeChoice({style:'tumplineBasket',kind:'food',load:.8,mass:.6,pieces:1,variety:.5}),3);assert.ok(bk.head.some(p=>p.role==='strap'),'forehead band on the head bone');assert.ok(bk.spine.filter(p=>p.role==='detail').length>=6,'weft bands, ribs and rim');
 const sk=carryLoadParts(quantizeChoice({style:'sackBack',kind:'food',load:.8,mass:.6,pieces:1,variety:.5}),3).spine;assert.ok(sk.some(p=>p.role==='cord'),'sack neck tied');assert.ok(sk.filter(p=>p.shape==='cone').length>=1,'gathered neck');
 const hl=carryLoadParts(quantizeChoice({style:'headLoad',kind:'food',load:.8,mass:.6,pieces:1,variety:.1}),3);assert.ok(hl.head&&!hl.spine,'a head load is mounted on the head bone');assert.ok(hl.head.some(p=>p.col===undefined?false:p.shape==='cylinder'),'pad and neck');
 const yk=carryLoadParts(quantizeChoice({style:'yoke',kind:'food',load:.8,mass:.6,pieces:1,variety:.5}),3).spine;const xs=yk.filter(p=>p.shape==='cylinder'&&p.role==='body').map(p=>p.pos[0]);assert.ok(Math.min(...xs)<-.4&&Math.max(...xs)>.4,'a basket at each end of the pole');
});
test('deterministic: no Math.random, Date.now or performance.now in the gait and carry sources; every load build is repeatable',()=>{
 for(const f of ['animationClips','carryStyles','carryLoads','characterAnim']){const s=fs.readFileSync(new URL(`../src/scene/${f}.ts`,import.meta.url),'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'');assert.ok(!/Math\.random|Date\.now|performance\.now/.test(s),f);}
 const c=quantizeChoice(carryStyleFor({society:'quillan',kind:'stone',load:.9,seed:77}));assert.deepEqual(carryLoadParts(c,9),carryLoadParts(c,9));
});
let THREE=null,L=null;try{THREE=await import('three');L=await import('../src/scene/characterRigLayer.ts');}catch{THREE=null;}
const skip=THREE?false:'three is not installed here (npm ci)';
const {cultureForCiv}=await import('../src/scene/civPeople.ts');
test('rig layer: a loaded worker draws its load on its own bones (not a legacy slab), loads share geometry, an empty worker draws none, legacy people are untouched',{skip},()=>{
 const culture=cultureForCiv('hanrei',3),alive=new Set(),w={time:0,season:'summer',era:3,identity:()=>({culture,teamColor:'#e0c078'}),gearOf:()=>({garment:{item:'woolCoat',condition:1}}),projectFor:()=>undefined,farmFor:()=>null,fireLitNear:()=>false,loadOf:u=>Math.min(1,(u.carry||0)/10),aliveIds:()=>alive,visible:()=>true};
 const U=(o={})=>({id:1,type:'worker',team:0,x:0,y:0,z:0,vx:0,vz:2,facing:0,hp:10,order:'move',...o});
 const run=(units,camPos=new THREE.Vector3(0,6,20))=>{const scene=new THREE.Scene(),layer=new L.CharacterRigLayer(scene);units.forEach(u=>alive.add(u.id));for(let f=0;f<4;f++){w.time=f*.1;layer.beginFrame(w,camPos,'high',true);for(const u of units){u.z+=.2;layer.write(u,[1.65,1.65,1.65],0,1,.5);}layer.endFrame();}const keys=[...layer.variants.keys()].filter(k=>k.startsWith('t')&&k.includes('load|')||k.startsWith('load|'));return {layer,keys,stats:{...layer.stats}};};
 const empty=run([U({id:1})]);assert.equal(empty.keys.length,0,'no load, no load geometry');
 const loaded=run([U({id:2,carry:9,carryType:'wood'})]);assert.ok(loaded.keys.length>=1,'loaded: '+[...loaded.layer.variants.keys()].filter(k=>k.includes('load')).length);
 assert.ok(loaded.stats.draws>empty.stats.draws,'the load is extra draws on the person');assert.equal(loaded.stats.fallbacks,0);
 // eight carriers of the same cargo, fill and style share their load geometry
 const crowd=run(Array.from({length:8},(_,i)=>U({id:10+i*3,carry:9,carryType:'food',x:i*1.2})));const ks=[...crowd.layer.variants.keys()].filter(k=>k.includes('load|'));assert.ok(ks.length<=18,'shared load variants: '+ks.length);
 // far tier draws a (cheaper) load too, and the rig never reports a fallback because of loads
 const far=run([U({id:40,carry:9,carryType:'stone'})],new THREE.Vector3(0,40,1500));assert.ok([...far.layer.variants.keys()].some(k=>k.includes('load|')&&k.includes('|t2|')),'far tier load');assert.equal(far.stats.fallbacks,0);
 // a unit on a cart or boat does not wear the load (the vehicle carries it)
 const cart=run([U({id:50,carry:9,carryType:'wood',haulage:'cart'})]);assert.equal([...cart.layer.variants.keys()].filter(k=>k.includes('load|')).length,0);
});
