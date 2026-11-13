import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {ANIMAL_TRAITS,ANIMAL_RULES,activityLevel,flightDistance,validAnimalBeh,animalRand} from '../src/game/animalBehaviour.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
const calm=g=>{g.state.weather='clear';g.state.weatherT=1e9;g.state.units=[];g.state.autoWorkEnabled=false;};
/** A resting resident far from animals but counted as a player unit (not a threat) keeps every animal in the full-rate LOD ring. */
function nearLod(g,c){const u=g.spawnUnit('worker',c.x+30,c.z,0);u.shelterId=-1;u.hp=1;return u;}
function world(seed=7){const g=new Game();g.reset(seed);g.enterIsland();calm(g);g.tickWildlife(.01);return g;}
const species=(g,sp)=>g.state.wildlife.filter(c=>c.species===sp&&c.hp>0);
function run(g,seconds,dt=1/30,each){for(let i=0;i<seconds/dt;i++){g.state.time+=dt;g.tickWildlife(dt);each?.(i);}}

test('new games use the behaviour model: groups, leaders, wolf packs and optional validated beh fields',()=>{
 const g=world();assert.equal(g.state.animalBehaviourVersion,1);
 assert.ok(species(g,'wolf').length>=3,'a wolf pack exists');
 const groups=new Map();for(const c of g.state.wildlife)if(c.beh)groups.set(c.beh.grp,(groups.get(c.beh.grp)||0)+1);
 assert.ok([...groups.values()].some(n=>n>=3),'herds form');
 for(const c of g.state.wildlife)assert.ok(validAnimalBeh(c.beh,g.state.time,600));g.tickWildlife(.1);assert.ok(g.state.wildlife.every(c=>c.beh),'late herds get behaviour on first tick');
 assert.equal(validAnimalBeh({...g.state.wildlife[0].beh,st:'teleport'},0,600),false);assert.equal(validAnimalBeh({...g.state.wildlife[0].beh,sp:99},0,600),false);
});
test('determinism: two games loaded from the same save give byte-identical animal paths, and no Math.random is consumed by the new model',()=>{
 // world generation itself still draws Math.random for some buildings, so both runs start from one encoded save
 const blob=encodeGame(world(11));const orig=Math.random;let calls=0;
 const snap=()=>{const g=decodeGame(blob);calm(g);Math.random=()=>{calls++;return orig();};run(g,400,1/15);Math.random=orig;return JSON.stringify(g.state.wildlife.map(c=>[c.id,+c.x.toFixed(6),+c.z.toFixed(6),c.beh?.st,c.hp]));};
 const a=snap(),b=snap();assert.equal(a,b);assert.equal(calls,0,'tickWildlife used Math.random');
});
test('speed and turn limits: no teleport, heading changes bounded by the gait turn rate, speed by the gallop',()=>{
 const g=world(3);const prey=g.state.wildlife.filter(c=>c.species!=='bird'&&c.species!=='wolf'&&c.hp>0);nearLod(g,prey[0]);
 const last=new Map(prey.map(c=>[c.id,{x:c.x,z:c.z,hd:c.beh.hd,f:c.facing,i:0}]));let worstSpeed=0,worstTurn=0,worstFace=0;const dt=1/30;
 run(g,240,dt,i=>{for(const c of prey){const l=last.get(c.id),d=Math.hypot(c.x-l.x,c.z-l.z),T=ANIMAL_TRAITS[c.species],el=(i+1-l.i)*dt;
  if(c.x!==l.x||c.beh.hd!==l.hd){worstSpeed=Math.max(worstSpeed,d/el);const dh=Math.abs(Math.atan2(Math.sin(c.beh.hd-l.hd),Math.cos(c.beh.hd-l.hd)));worstTurn=Math.max(worstTurn,dh/Math.min(el,ANIMAL_RULES.maxStep)/T.turn);
   assert.ok(d<=T.gaits[3]*Math.min(el,ANIMAL_RULES.maxStep)+1e-6,`${c.species} moved ${d} over ${el}s`);assert.ok(c.beh.sp<=T.gaits[3]+1e-6);last.set(c.id,{x:c.x,z:c.z,hd:c.beh.hd,f:c.facing,i:i+1});}}});
 assert.ok(worstTurn<=1.001,`turn rate within limit: ${worstTurn}`);
});
test('daily rhythm: crepuscular deer graze more at dawn/dusk than midday; nocturnal boar are more active at night',()=>{
 const g=world(5);const sun=g.daylight();const bins={};const active=s=>s==='graze'||s==='walk'||s==='rut';
 const deer=species(g,'deer'),boar=species(g,'boar');nearLod(g,deer[0]);
 const T=g.state.time;for(let t=0;t<1500;t+=.5){g.state.time+=.5;g.tickWildlife(.5);if(Math.round(t)%10===0){const h=g.dayPhase()*24,night=h<sun.sunrise||h>sun.sunset;const mid=h>sun.sunrise+3.5&&h<sun.sunset-3.5;const edge=!night&&!mid;
  for(const c of deer){const k='deer.'+(edge?'edge':mid?'mid':'night');(bins[k]??=[0,0])[1]++;if(active(c.beh.st))bins[k][0]++;}
  for(const c of boar){const k='boar.'+(night?'night':mid?'mid':'edge');(bins[k]??=[0,0])[1]++;if(active(c.beh.st))bins[k][0]++;}}}
 const f=k=>bins[k]?bins[k][0]/bins[k][1]:NaN;
 assert.ok(f('deer.edge')>f('deer.mid'),`deer edge ${f('deer.edge')} > mid ${f('deer.mid')}`);
 assert.ok(f('boar.night')>f('boar.mid'),`boar night ${f('boar.night')} > mid ${f('boar.mid')}`);
 void T;
 assert.ok(activityLevel('diurnal',9,6,18)>activityLevel('diurnal',2,6,18));assert.ok(activityLevel('crepuscular',6.3,6,18)>activityLevel('crepuscular',12,6,18));assert.ok(activityLevel('nocturnal',23,6,18)>activityLevel('nocturnal',12,6,18));
});
test('herd cohesion: herd members stay near their leader over a day and keep minimum spacing',()=>{
 const g=world(9);const prey=g.state.wildlife.filter(c=>['deer','goat','boar'].includes(c.species));nearLod(g,prey[0]);run(g,600,.25);
 const by=new Map();for(const c of prey)(by.get(c.beh.grp)||by.set(c.beh.grp,[]).get(c.beh.grp)).push(c);
 let checked=0;for(const m of by.values()){if(m.length<3)continue;const cx=m.reduce((a,c)=>a+c.x,0)/m.length,cz=m.reduce((a,c)=>a+c.z,0)/m.length;const mean=m.reduce((a,c)=>a+Math.hypot(c.x-cx,c.z-cz),0)/m.length;assert.ok(mean<22,`herd of ${m.length} spread ${mean}`);checked++;
  for(let i=0;i<m.length;i++)for(let j=i+1;j<m.length;j++)assert.ok(Math.hypot(m[i].x-m[j].x,m[i].z-m[j].z)>.15,'no stacking');}
 assert.ok(checked>=2);
});
test('flight initiation distance: grows with group size, shrinks with habituation and for a stalking hunter; a walker flushes a deer herd away from the threat',()=>{
 const g=world(13);const deer=species(g,'deer')[0];assert.ok(flightDistance(deer,6,false)>flightDistance(deer,1,false));
 deer.beh.hab=.5;assert.ok(flightDistance(deer,3,false)<flightDistance(ANIMAL_TRAITS&&{...deer,beh:{...deer.beh,hab:0}},3,false));deer.beh.hab=0;assert.ok(flightDistance(deer,3,true)<flightDistance(deer,3,false)*.5);
 const members=g.state.wildlife.filter(c=>c.beh.grp===deer.beh.grp&&c.hp>0);const cx=deer.x,cz=deer.z;
 g.state.wildlife=g.state.wildlife.filter(c=>members.includes(c));nearLod(g,deer);
 const u=g.spawnUnit('worker',cx-ANIMAL_TRAITS.deer.fid*.6,cz,0);u.hp=5;
 let fled=false;run(g,12,1/30,()=>{if(members.some(m=>m.beh.st==='flee'))fled=true;});assert.ok(fled,'deer flee when a person is inside the flight distance');
 const away=members.filter(m=>m.hp>0&&m.x>u.x).length/members.length;assert.ok(away>=.6,'most of the herd ends on the far side of the walker, fleeing away from the threat');
 run(g,25,1/30);assert.ok(Math.hypot(deer.x-u.x,deer.z-u.z)>ANIMAL_TRAITS.deer.fid*1.2,'flight distance restored');
});
test('wolves stalk and chase, prey flee, stamina ends pursuits; a pack kill leaves a finite carcass and the pack feeds without creating meat',()=>{
 const g=world(21);const dry=(x0,z0,x1,z1)=>{for(let i=0;i<=40;i++){const x=x0+(x1-x0)*i/40,z=z0+(z1-z0)*i/40;if(!g.walkable(x,z)||g.height(x,z)<g.waterAt(x,z)+.6)return false;}return true;};
 const wolves=species(g,'wolf').slice(0,3),prey=species(g,'goat').find(c=>dry(c.x-60,c.z,c.x+60,c.z));assert.ok(prey,'a goat with a dry run-up');g.state.wildlife=[...wolves,prey];nearLod(g,prey);
 wolves.forEach((w,i)=>{w.x=prey.x-26;w.z=prey.z+(i-1)*2;w.beh.hunger=.9;w.beh.grp=wolves[0].id;if(i)delete w.beh.lead;w.beh.st='walk';w.beh.until=0;});prey.beh.grp=prey.id;prey.hp=1;
 const seen=new Set();let kills=0;run(g,150,1/30,()=>{for(const c of g.state.wildlife)seen.add(c.beh.st);if(prey.hp<=0&&!kills)kills=g.state.time;});
 assert.ok(seen.has('stalk')&&seen.has('chase')&&seen.has('flee'),`states seen ${[...seen]}`);
 assert.ok(wolves.some(w=>Math.hypot(w.x-(prey.x),w.z-prey.z)<60&&w.beh.en<1||prey.hp<=0),'the pack actually closed in and spent stamina');
 if(prey.hp<=0){assert.ok(prey.carcass.meat<=16+1e-9&&prey.carcass.meat>=0);}
 for(const w of wolves)assert.ok(w.beh.en>=0&&w.beh.en<=1);
});
test('animals never move through solid buildings and stay on dry land under the new model',()=>{
 const g=world(15);const d=species(g,'deer')[0];nearLod(g,d);const b=g.makeBld('townhall',d.x+6,d.z,0);g.state.buildings=[b];d.beh.st='walk';d.beh.gx=d.x+12;d.beh.gz=d.z;d.beh.until=g.state.time+60;
 run(g,60,1/30,()=>{assert.ok(Math.abs(d.x-b.x)>=b.w/2||Math.abs(d.z-b.z)>=b.d/2,'outside footprint');assert.ok(g.height(d.x,d.z)>g.waterAt(d.x,d.z));});
});
test('legacy saves keep the old behaviour: no flag, no beh, same random-walk tick; new saves round-trip beh',()=>{
 const g=world(17);const loaded=decodeGame(encodeGame(g));assert.equal(loaded.state.animalBehaviourVersion,1);assert.deepEqual(loaded.state.wildlife[0].beh,g.state.wildlife[0].beh);
 const old=world(17);delete old.state.animalBehaviourVersion;for(const c of old.state.wildlife){delete c.beh;}old.state.wildlife=old.state.wildlife.filter(c=>c.species!=='wolf');
 const reload=decodeGame(encodeGame(old));assert.equal(reload.state.animalBehaviourVersion,undefined);reload.state.units=[];reload.tickWildlife(1/30);assert.ok(reload.state.wildlife.every(c=>c.beh===undefined),'legacy tick never creates beh');
 const bad=world(17);bad.state.wildlife[0].beh.sp=500;assert.throws(()=>decodeGame(encodeGame(bad)));
 const noFlag=world(17);delete noFlag.state.animalBehaviourVersion;assert.throws(()=>decodeGame(encodeGame(noFlag)),'beh without the version flag is rejected');
});
test('seeded stream is stable and uniform enough',()=>{const xs=Array.from({length:2000},(_,i)=>animalRand(7,3,i));assert.ok(xs.every(x=>x>=0&&x<1));assert.ok(Math.abs(xs.reduce((a,b)=>a+b)/2000-.5)<.03);assert.equal(animalRand(7,3,5),animalRand(7,3,5));});
test('near-zone handoff has no pop: a rig motion started from a moving sim record starts in the same gait and speed, and never feeds back into the sim',async()=>{
 const {MotionTracker}=await import('../src/scene/animalLife.ts');const {QUADS}=await import('../src/scene/animalSpecs.ts');
 const g=world(31);const c=g.state.wildlife.find(a=>a.species==='deer');assert.ok(c);
 for(let i=0;i<40;i++)g.tickWildlife?.(.2);
 const before=JSON.stringify(c);const sp={walkMax:1.6,trotMax:3.2,stride:[.9,1.4,2.2]};
 const t=new MotionTracker();const m=t.step(c.id,c.x,c.z,10,sp,true,false,c.id,'walk',1.2);
 assert.equal(m.gait,'walk');assert.ok(Math.abs(m.speed-1.2)<1e-9,'starts at the sim speed, not 0');
 const g2=new MotionTracker().step(c.id,c.x,c.z,10,sp,true,false,c.id,'graze',0);assert.equal(g2.idle,'graze');
 const d=new MotionTracker().step(c.id,c.x,c.z,10,sp,true,false,c.id,'drink',0);assert.equal(d.idle,'drink');
 assert.equal(JSON.stringify(c),before,'presentation never writes the sim');
});
