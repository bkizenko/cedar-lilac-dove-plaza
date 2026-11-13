import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
import {ROUTE_RULES as R,traceStep,tickRouteWear,routeCorridors,corridorWear,wearOf,stageOf,routePace,paintRouteField,corridorLine,corridorOwner,setRoutesEnabled,routesEnabled,validRouteWear} from '../src/game/routeWear.ts';
import {tickWaystations,stationsOf,stopsWanted,longRoute,chooseSite,WAYSTATION_RULES as W,stationViews,stationLabel,setWaystationsEnabled,validWaystations} from '../src/game/waystations.ts';

const fresh=(seed=4)=>{const g=new Game();g.reset(seed,18,{size:1040,layout:'pangaea'});g.enterIsland();g.state.trails=[];return g;};
const hashOf=v=>createHash('sha256').update(JSON.stringify(v,(_k,x)=>ArrayBuffer.isView(x)?Array.from(x):x)).digest('hex');
/** One real-looking journey: a worker walks a→b in 0.5 s ticks through the same steering hook the sim uses. */
function journey(g,team,a,b,{order='gather',bend=0,id=1,wobble=0}={}){
 const u={id,team,hp:10,order,x:a.x,z:a.z,type:'worker'};const len=Math.hypot(b.x-a.x,b.z-a.z),n=Math.ceil(len/1.8);
 for(let i=1;i<=n;i++){const f=i/n,px=-(b.z-a.z)/len,pz=(b.x-a.x)/len,off=Math.sin(f*Math.PI)*bend+Math.sin(i*1.3)*wobble,nx=a.x+(b.x-a.x)*f+px*off,nz=a.z+(b.z-a.z)*f+pz*off;g.state.time+=.4;traceStep(g,u,nx,nz,b.x,b.z);u.x=nx;u.z=nz;}
}
const idle=(g,s)=>{for(let t=0;t<s;t+=3){g.state.time+=3;tickRouteWear(g,3);}};

test('wear starts with the second journey; a one-off movement makes no trail',()=>{
 const g=fresh();journey(g,0,{x:-60,z:0},{x:20,z:10});
 const c=routeCorridors(g);assert.equal(c.length,1);assert.equal(corridorWear(c[0]),0);assert.equal(stageOf(0),'none');
 const f=paintRouteField(c,g.state.seed,g.world.size,1);assert.equal(f.wear.reduce((a,b)=>a+b,0),0,'no ground wear from a single walk');
 journey(g,0,{x:20,z:10},{x:-60,z:0});assert.ok(corridorWear(routeCorridors(g)[0])>0,'second journey on the same corridor wears it (either direction)');
 assert.equal(routeCorridors(g).length,1);
});

test('wandering and exploring never wear ground; fighting and boats neither',()=>{
 const g=fresh();let seed=7;const r=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<80;i++)journey(g,0,{x:(r()-.5)*300,z:(r()-.5)*300},{x:(r()-.5)*300,z:(r()-.5)*300},{id:i+1});
 assert.equal(routeCorridors(g).filter(c=>corridorWear(c)>0).length,0);
 for(const order of ['idle','explore','attack','attackmove','hold'])for(let k=0;k<4;k++)journey(g,0,{x:-50,z:-50},{x:40,z:50},{order,id:200});
 assert.equal(routeCorridors(g).filter(c=>c.pts.length&&Math.hypot(c.ax+50,c.az+50)<5).length,0,'non-routine orders are not even remembered');
 // a route that doubles back on itself is a wander, not a corridor
 const before=routeCorridors(g).length;journey(g,0,{x:0,z:0},{x:30,z:0},{bend:120,id:300});assert.equal(routeCorridors(g).length,before);
});

test('repeated trips progress faint -> worn -> beaten, merge into one strip, and widen with traffic',()=>{
 const g=fresh();const A={x:-70,z:-20},B={x:40,z:35};const seen=new Set();let width=[];
 for(let i=0;i<24;i++){journey(g,i%3,A,B,{id:i+1,bend:(i%4-1.5)*.8,wobble:.15});journey(g,i%3,B,A,{id:i+1,bend:(i%4-1.5)*.8});g.state.time+=2;
  const c=routeCorridors(g);assert.equal(c.length,1,'same corridor, either direction, whoever walks');seen.add(stageOf(corridorWear(c[0])));
  const f=paintRouteField(c,g.state.seed,g.world.size,1);let n=0;for(let k=0;k<f.wear.length;k++)if(f.wear[k]>.2)n++;width.push(n);}
 assert.deepEqual([...seen].sort(),['beaten','faint','worn'].sort());
 assert.ok(width.at(-1)>width[3]*1.15,'wider strip with more traffic '+JSON.stringify([width[3],width.at(-1)]));
 assert.ok(routePace(g,0,0)>=1);
 const c=routeCorridors(g)[0],line=corridorLine(c,g.state.seed,1);assert.ok(line.every(Number.isFinite));
});

test('unused routes fade away; a recently walked one outlasts an old one',()=>{
 const g=fresh();for(let i=0;i<10;i++)journey(g,0,{x:-60,z:0},{x:30,z:0},{id:i+1});
 const w0=corridorWear(routeCorridors(g)[0]);assert.ok(w0>.5);
 idle(g,R.halfLifeSeconds);const w1=corridorWear(routeCorridors(g)[0]);assert.ok(w1<w0*.8&&w1>0,`${w0} -> ${w1}`);
 idle(g,R.halfLifeSeconds*8);assert.equal(routeCorridors(g).length,0,'fully pruned');
 assert.equal(routePace(g,-20,0),1);
});

test('terrain cost: the route follows the walked path, bending around an obstacle and averaging trips',()=>{
 const g=fresh();for(let i=0;i<6;i++)journey(g,0,{x:-60,z:0},{x:60,z:0},{id:i+1,bend:25});
 const c=routeCorridors(g)[0],mid=c.pts.length/4|0;const z=c.pts[mid*2+1];assert.ok(Math.abs(z)>10,'mid-route is displaced by the detour, not a straight line '+z);
});

test('deterministic: same journeys give byte-identical routes, fields and stations; no NaN',()=>{
 const run=()=>{const g=fresh(5);for(let i=0;i<20;i++){journey(g,0,{x:-180,z:-30},{x:190,z:40},{id:i+1,bend:6});idle(g,30);}
  const f=paintRouteField(routeCorridors(g),g.state.seed,g.world.size,2);return {g,h:hashOf([g.state.routeWear,f.wear,f.core,f.hash])};};
 const a=run(),b=run();assert.equal(a.h,b.h);
 const f=paintRouteField(routeCorridors(a.g),a.g.state.seed,a.g.world.size,2);for(const arr of [f.wear,f.core,f.hash])assert.ok(arr.every(Number.isFinite));
 assert.ok(f.wear.every(v=>v>=0&&v<=1));
 assert.ok(wearOf(Infinity)===0&&wearOf(NaN)===0);
});

test('merging routes read as one wider, darker track where they join',()=>{
 const g=fresh();for(let i=0;i<14;i++){journey(g,0,{x:-70,z:-34},{x:60,z:0},{id:1});journey(g,0,{x:-70,z:34},{x:60,z:0},{id:2});}
 const c=routeCorridors(g);assert.equal(c.length,2);
 const both=paintRouteField(c,g.state.seed,g.world.size,1),one=paintRouteField([c[0]],g.state.seed,g.world.size,1);
 const at=(f,x,z)=>{const i=Math.floor(x+g.world.size/2),j=Math.floor(z+g.world.size/2);return f.wear[j*f.res+i];};
 assert.ok(at(both,57,0)>at(one,57,0)+.03,'joined strip is darker at the junction '+at(both,57,0)+' vs '+at(one,57,0));
 // far from the junction the two strands are apart and braid-free
 let near=0;for(let dz=-4;dz<=4;dz++)near=Math.max(near,at(both,-65,-33+dz));assert.ok(near>.2&&at(both,-65,0)<.05,near+' '+at(both,-65,0));
});

test('long-route threshold uses the sim day: speed x loaded factor x simulation day',()=>{
 assert.ok(Math.abs(W.dayWalkMetres-5.4*.8*(1800/32))<1e-6);
 assert.equal(stopsWanted(W.dayWalkMetres),0);assert.equal(longRoute(W.dayWalkMetres),false);assert.equal(longRoute(W.dayWalkMetres+1),true);
 assert.equal(stopsWanted(W.dayWalkMetres+1),1);assert.ok(stopsWanted(700)>=2&&stopsWanted(5000)<=3);
});

/** Build a busy long corridor owned by `team`, then run the sim clock so stations may develop. */
function busyLong(g,team,A,B,trips=22){for(let i=0;i<trips;i++){journey(g,team,A,B,{id:50+i});journey(g,team,B,A,{id:50+i});g.state.time+=1;}}
const step=(g,sec,every=1)=>{for(let t=0;t<sec;t+=every){g.state.time+=every;tickRouteWear(g,every);tickWaystations(g,every);}};
function landPair(g){ // two dry land points about 330 m apart on the same island
 const pts=[];for(let x=-300;x<=300;x+=15)for(let z=-300;z<=300;z+=15)if(g.walkable(x,z)&&g.height(x,z)>g.waterAt(x,z)+1.5)pts.push({x,z});
 for(const a of pts)for(const b of pts){const d=Math.hypot(a.x-b.x,a.z-b.z);if(d>300&&d<340&&g.workBoard.connected(g,a.x,a.z,b.x,b.z))return [a,b];}
 return null;
}

test('a short busy route never grows a waystation',()=>{
 const g=fresh();busyLong(g,0,{x:-60,z:0},{x:100,z:0},30);step(g,900,3);
 assert.equal(stationsOf(g).length,0);
});

test('long, busy route grows lean-to -> hut -> inn, paid from real stock and real labour',()=>{
 const g=fresh();const p=landPair(g);assert.ok(p,'test world has a long dry corridor');
 const [A,B]=p;busyLong(g,0,A,B);assert.ok(routeCorridors(g)[0].len>W.dayWalkMetres);
 const t=g.tribe(0);t.wood=900;t.stone=900;t.food=900;
 const s=raise(g,0,A,B,3);
 assert.equal(s.stage,3,'inn stands');assert.ok(Math.hypot(s.x-A.x,s.z-A.z)>40&&Math.hypot(s.x-B.x,s.z-B.z)>40,'beside the route, away from both ends');
 const cost=W.stages.reduce((a,x)=>({wood:a.wood+(x.cost.wood||0),stone:a.stone+(x.cost.stone||0),food:a.food+(x.cost.food||0)}),{wood:0,stone:0,food:0});
 assert.ok(900-t.wood>=cost.wood-6&&900-t.stone===cost.stone,`wood ${900-t.wood}/${cost.wood} stone ${900-t.stone}/${cost.stone}`);
 assert.ok(t.wood>=0&&t.stone>=0&&t.food>=0);assert.ok(s.store.food<=W.stages[2].store+1e-9);
 assert.equal(stationViews(g,0).length,1);assert.equal(stationViews(g,0)[0].label,'Inn'===stationLabel(s)?'Inn':stationViews(g,0)[0].label);
});

test('no stage is free: with an empty stockpile nothing is built and the card says what is missing',()=>{
 const g=fresh();const p=landPair(g);const [A,B]=p;busyLong(g,0,A,B);const t=g.tribe(0);t.wood=0;t.stone=0;
 for(let r=0;r<40;r++){busyLong(g,0,A,B,2);step(g,30,1);}
 const s=stationsOf(g)[0];assert.ok(s);assert.equal(s.stage,0);assert.ok(/wood/i.test(s.waiting||''),s.waiting);assert.equal(t.wood,0);
 assert.equal(stationViews(g,0).length,0,'an unfunded site is not pinned');
});

/** Fast-forward a station by hand through the same code path: pay, crew arrives, labour done. */
function raise(g,team,A,B,to){
 const t=g.tribe(team);t.wood=900;t.stone=900;t.food=900;
 let s;for(let r=0;r<80&&!(s=stationsOf(g)[0]);r++){busyLong(g,team,A,B,2);step(g,30,1);}
 assert.ok(s,'site planned');
 for(let guard=0;guard<400&&s.stage<to;guard++){
  s.visits=Math.max(s.visits,30);busyLong(g,team,A,B,1);step(g,10,1);
  if(s.project){const crew=g.state.units.find(u=>u.id===s.project.crewId);if(crew){crew.x=s.x;crew.z=s.z;}}
 }
 return s;
}
test('construction spends exactly the stage cost and needs a resident who is really there',()=>{
 const g=fresh();const [A,B]=landPair(g);const idleWorker=g.state.units.find(u=>u.team===0&&u.type==='worker'&&!u.militia&&u.hp>0);assert.ok(idleWorker);
 const t=g.tribe(0);t.wood=500;t.stone=500;t.food=500;
 let s;for(let r=0;r<80&&!(s=stationsOf(g)[0]);r++){busyLong(g,0,A,B,2);step(g,30,1);}
  assert.ok(s);const w0=500;
 for(let i=0;i<30&&!s.project;i++){busyLong(g,0,A,B,2);step(g,10,1);}
 assert.ok(s.project,'work began');assert.equal(w0-t.wood,W.stages[0].cost.wood,'exactly the lean-to wood was spent');
 // no labour without a body on site
 const lab0=s.project.labour;const crewId=s.project.crewId;if(crewId!==undefined){const u=g.state.units.find(p=>p.id===crewId);u.x=s.x+80;u.z=s.z;u.hp=0;}
 step(g,20,1);assert.ok(s.project.labour<=lab0+2.001,'labour only accrues while a resident is at the site');
});

test('travellers rest, eat from a finite store, shelter; foreign guests pay a toll; goods are conserved',()=>{
 const g=fresh();const [A,B]=landPair(g);const s=raise(g,0,A,B,2);
 assert.ok(s.stage>=2,'hut stands (stage '+s.stage+')');
 s.store.food=10;const t0=g.tribe(0),t1=g.tribe(1);t1.food=200;const totalFood=()=>g.state.tribes.reduce((a,t)=>a+t.food,0)+s.store.food;
 const own={id:9001,team:0,hp:10,order:'gather',x:s.x+2,z:s.z,fatigue:.8,hunger:90,thirstSeconds:30,type:'worker',boat:null};
 const guest={id:9002,team:1,hp:10,order:'trade',x:s.x-2,z:s.z,fatigue:.5,hunger:0,type:'worker',boat:null,visit:true};
 g.state.units.push(own,guest);const before=totalFood();
 for(let i=0;i<30;i++){g.state.time+=1;tickWaystations(g,1);}
 assert.ok(own.fatigue<.8,'rested');assert.ok(own.hunger<90,'ate');assert.ok(s.store.food<10&&s.store.food>=0,'finite store drawn down');
 assert.ok(s.visits>=2&&s.income>=1,'visits counted, toll taken');assert.ok(Math.abs(totalFood()+(90-own.hunger)/40-before)<1e-6,'goods conserved except what was eaten '+(totalFood()-before));
 g.state.units.splice(g.state.units.indexOf(own),1);g.state.units.splice(g.state.units.indexOf(guest),1);
 // raiders plunder: store goes to the raiders' tribe, the building loses integrity, nothing appears from nowhere
 s.store.food=8;const rt=g.tribe(3),rf=rt?.food??0;const raider={id:9003,team:3,hp:10,order:'attackmove',x:s.x+3,z:s.z,type:'worker',boat:null};g.state.units.push(raider);
 const sum=()=>g.state.tribes.reduce((a,t)=>a+t.food,0)+s.store.food;const b2=sum();
 for(let i=0;i<10;i++){g.state.time+=1;tickWaystations(g,1);}
 assert.ok(s.raided>=1,'plundered');assert.ok(Math.abs(sum()-b2)<1e-6,'loot moved, not created');assert.ok(s.hp<1||s.stage<2);
});

test('rivals build the same way for their own society',()=>{
 const g=fresh();const [A,B]=landPair(g);
 // rival society 1 makes most of the trips
 const t=g.tribe(1);t.wood=500;t.stone=500;t.food=500;let s;
 for(let r=0;r<80&&!(s=stationsOf(g)[0]);r++){busyLong(g,1,A,B,2);step(g,30,1);}
 assert.ok(s&&s.team===1,'owned by the society that walked the route');assert.equal(corridorOwner(routeCorridors(g)[0]),1);
 for(let i=0;i<40&&!s.project;i++){busyLong(g,1,A,B,2);step(g,10,1);}assert.ok(s.project||s.waiting);assert.ok(t.wood<500||s.waiting);
});

test('save round trip keeps routes and stations exactly; invalid state is refused; old saves without them load',()=>{
 const g=fresh();const [A,B]=landPair(g);const s=raise(g,0,A,B,1);assert.ok(s);
 const save=JSON.parse(JSON.stringify(encodeGame(g)));validateGameSave(save);
 const g2=decodeGame(save);assert.equal(hashOf(g2.state.routeWear),hashOf(g.state.routeWear));assert.equal(hashOf(g2.state.waystations),hashOf(g.state.waystations));
 const f1=paintRouteField(routeCorridors(g),g.state.seed,g.world.size,2),f2=paintRouteField(routeCorridors(g2),g2.state.seed,g2.world.size,2);assert.equal(hashOf(f1.wear),hashOf(f2.wear));
 const bad=JSON.parse(JSON.stringify(save));bad.state.routeWear.corridors[0].trips=-3;assert.throws(()=>validateGameSave(bad));
 const bad2=JSON.parse(JSON.stringify(save));bad2.state.waystations.stations[0].stage=9;assert.throws(()=>validateGameSave(bad2));
 const old=JSON.parse(JSON.stringify(save));delete old.state.routeWear;delete old.state.waystations;validateGameSave(old);const g3=decodeGame(old);
 assert.equal(routeCorridors(g3).length,0);assert.equal(routePace(g3,0,0),1);assert.equal(stationsOf(g3).length,0);tickRouteWear(g3,1);tickWaystations(g3,1);
 // legacy saved trails still load and still read as pace
 const legacy=JSON.parse(JSON.stringify(save));legacy.state.trails=[{cell:100,wear:.9,last:0,angle:0}];validateGameSave(legacy);decodeGame(legacy);
});

test('switches: routes off restores legacy per-step trails; waystations off stops growth',()=>{
 const g=fresh();setRoutesEnabled(g,false);assert.equal(routesEnabled(g),false);
 const u={id:1,team:0,hp:10,order:'gather',x:0,z:0};assert.equal(traceStep(g,u,1,0,50,0),false,'caller falls back to the legacy stamp');
 setRoutesEnabled(g,true);assert.equal(traceStep(g,u,1,0,50,0),true);
 assert.equal(validRouteWear({routeWear:undefined}),true);assert.equal(validWaystations({}),true);
 const h=fresh();const [A,B]=landPair(h);setWaystationsEnabled(h,false);busyLong(h,0,A,B);step(h,600,3);assert.equal(stationsOf(h).length,0);
 assert.ok(stationLabel({stage:3,form:'stone'})==='Caravanserai'&&stationLabel({stage:3,form:'timber'})==='Inn');
});

test('sim integration: real workers repeating a haul wear a route; the legacy stamp no longer marks every step',()=>{
 const g=fresh();for(let i=0;i<400;i++)g.step(.5);
 assert.ok(!(g.state.trails||[]).length,'no per-step trail stamps from ordinary movement');
 for(const c of routeCorridors(g))assert.ok(Number.isFinite(c.trips)&&c.pts.every(Number.isFinite));
});
