import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {planCanalWorks,executeCanalWorks,continueCanalWorks,canalWorksProgress,lineStageIssue} from '../src/game/waterLineWorks.ts';
import {canalWorks,canalPhase,canalBreachPermit,validCanalWorks,withBreachPermit} from '../src/game/canalBreach.ts';
import {excavationCuts,excavationIssue} from '../src/game/excavation.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';

function world(){const g=new Game();g.reset(13,18,{size:1560,layout:'archipelago'});g.enterIsland();g.testMode=true;g.revealMap=true;g.updateVision(0);Object.assign(g.state,{weather:'clear',weatherT:1e5,raidT:1e5});return g;}
// a native low strip between two sea-level waters (found by the band survey, see grok-world.md W7)
const A={x:335,z:382},B={x:371,z:382},LINE=[A,B];
const wetDepth=(g,x,z)=>g.waterAt(x,z)-g.height(x,z);
function centreline(g){const out=[],L=Math.hypot(B.x-A.x,B.z-A.z);for(let t=0;t<=L;t+=1){const x=A.x+(B.x-A.x)*t/L,z=A.z+(B.z-A.z)*t/L;out.push({x,z,land:wetDepth(g,x,z)<-.02});}return out;}

test('native canal: dug through the ordinary dig job; no ground changes below the water until every breach dig is laboured, then the breach is applied at once and the channel fills end to end',()=>{
  const g=world(),plan=planCanalWorks(g,A,B,0,LINE),land=centreline(g).filter(p=>p.land);
  assert.deepEqual(plan.issues,[]);assert.ok(plan.mouthStages>0&&plan.breachStages>=plan.mouthStages);assert.ok(land.length>=8,'a real land strip');
  assert.ok(plan.workSeconds>=plan.plannedCutCubicMetres*6-1);
  const r=executeCanalWorks(g,plan);assert.equal(r.ok,true,r.reason);
  const w=canalWorks(g).find(c=>c.id===r.canalId);assert.ok(w);
  // diggers stand on the strip beside the line (the banks stay land when the channel floods)
  const banks=[];for(const q of land)for(const off of [-10,-14,-18]){const x=q.x,z=q.z+off;if(wetDepth(g,x,z)<-1.2&&g.walkable(x,z))banks.push({x,z});} // the dry ridge north of the cut
  assert.ok(banks.length>=6,'dry banks beside the canal');
  const units=g.state.units.filter(u=>u.team===0).slice(0,6);
  units.forEach((u,i)=>{const q=banks[Math.floor(i*banks.length/units.length)];Object.assign(u,{x:q.x,z:q.z,y:g.height(q.x,q.z),order:'idle'});});g.rebuildWalk();
  const order=[];let p;
  for(let s=0;s<9000;s+=.2){g.state.paused=false;g.step(.2);if(Math.abs(s%10)>=.1)continue;
    for(const u of units){u.hunger=0;u.thirstSeconds=0;u.coldSeconds=0;}
    // before anything below the water is applied, every breach dig must already be laboured
    const committed=()=>w.breach.filter(st=>{const b=g.state.buildings.find(k=>k.type==='trench'&&Math.abs(k.x-st.x)<.01&&Math.abs(k.z-st.z)<.01);return b&&excavationCuts(g).some(c=>c.buildingId===b.id);}).length;
    const pre=committed();if(pre>0&&pre<w.breach.length)order.push({partial:pre,labourDone:canalPhase(g,w).breachLabourDone});
    if(pre===0&&canalPhase(g,w).breachLabourDone)order.push({labourDoneAt:s});
    continueCanalWorks(g,w.id);const post=committed();if(post>0)order.push({after:post,labourDone:pre>0||canalPhase(g,w).complete});
    p=canalWorksProgress(g,w.id);if(p.complete)break;
    const live=units.filter(u=>u.hp>0),cx=live.reduce((a,u)=>a+u.x,0)/Math.max(1,live.length),cz=live.reduce((a,u)=>a+u.z,0)/Math.max(1,live.length);const open=p.buildingIds.map(id=>g.state.buildings.find(b=>b.id===id)).filter(b=>b.build<1-1e-5).sort((a,b)=>Math.hypot(a.x-cx,a.z-cz)-Math.hypot(b.x-cx,b.z-cz))[0];if(open)for(const u of units)if(u.order!=='build'||u.buildOrder!==open.id){u.order='build';u.buildOrder=open.id;}}
  assert.equal(p.complete,true,JSON.stringify(p));assert.deepEqual(g.simulationErrors,[]);
  // any partially applied breach was only ever seen after all breach labour was done, and the rest followed in the same call
  assert.ok(order.every(o=>o.partial===undefined||o.labourDone),JSON.stringify(order));
  const firstAfter=order.find(o=>o.after!==undefined);assert.ok(firstAfter);assert.equal(firstAfter.after,w.breach.length,'the breach is applied together');
  // labour is the ordinary excavation labour of the union volume
  const cuts=excavationCuts(g).filter(c=>p.buildingIds.includes(c.buildingId)),work=cuts.reduce((a,c)=>a+c.workSeconds,0),vol=cuts.reduce((a,c)=>a+c.volumeCubicMeters,0);
  assert.ok(Math.abs(vol-plan.plannedCutCubicMetres)/plan.plannedCutCubicMetres<.05,`dug ${vol} vs planned ${plan.plannedCutCubicMetres}`);assert.ok(work>=vol*6*.97);
  // the canal fills: every former land sample on the centreline is now at least 0.1 m under water
  for(const q of land)assert.ok(wetDepth(g,q.x,q.z)>=.1,`still dry at ${q.x.toFixed(1)},${q.z.toFixed(1)}: ${wetDepth(g,q.x,q.z).toFixed(2)}`);
  console.log(`canal: ${land.length} m of land, ${plan.breachStages} breach digs (${plan.mouthStages} mouths), ${vol.toFixed(0)} m³, ${work.toFixed(0)} work-s; min water depth on the old land ${Math.min(...land.map(q=>wetDepth(g,q.x,q.z))).toFixed(2)} m`);
  // it round-trips, and the save validator accepts it
  const enc=JSON.parse(JSON.stringify(encodeGame(g)));assert.equal(validCanalWorks(enc.state??enc,1560),true);
  const back=decodeGame(enc);assert.equal(canalWorks(back).length,1);assert.equal(back.height(land[0].x,land[0].z),g.height(land[0].x,land[0].z));
});

test('nothing else can breach water: ordinary digs, forged marks, early mouths and other teams are refused',()=>{
  const g=world(),plan=planCanalWorks(g,A,B,0,LINE),mouth=plan.stages.find(s=>s.mouth),inner=plan.stages.find(s=>s.role==='breach'&&s!==mouth);assert.ok(mouth&&inner);
  // an ordinary dig at the same place and depth is refused by the unchanged rules
  const plain=lineStageIssue(g,mouth,0);assert.ok(/water/.test(plain),plain);
  assert.equal(g.placeBuilding('trench',mouth.x,mouth.z,0),false);
  // a permit for one stage does not cover any other position, depth or team
  assert.equal(withBreachPermit(g,0,mouth,()=>canalBreachPermit(g,{id:-1,team:0,x:inner.x,z:inner.z},inner.depth)),false);
  assert.equal(withBreachPermit(g,0,mouth,()=>canalBreachPermit(g,{id:-1,team:1,x:mouth.x,z:mouth.z},mouth.depth)),false);
  assert.equal(withBreachPermit(g,0,mouth,()=>canalBreachPermit(g,{id:-1,team:0,x:mouth.x,z:mouth.z},mouth.depth===2?1.5:2)),false);
  // commission: until every breach dig is laboured no breach dig may change the ground, even with a mark
  const r=executeCanalWorks(g,plan);assert.equal(r.ok,true);const w=canalWorks(g)[0];assert.equal(canalPhase(g,w).breachLabourDone,false);
  const fake={id:999999,team:0,x:mouth.x,z:mouth.z,w:4,d:4,type:'trench',hp:300,canalWork:{id:w.id,role:'breach'}};
  assert.equal(canalBreachPermit(g,fake,mouth.depth),false,'no breach before the whole channel is laboured');
  assert.ok(/water/.test(excavationIssue(g,fake,mouth.depth)??''));
  // a mark naming no canal, or a channel role, never permits
  assert.equal(canalBreachPermit(g,{...fake,canalWork:{id:w.id+7,role:'breach'}},mouth.depth),false);
  assert.equal(canalBreachPermit(g,{...fake,canalWork:{id:w.id,role:'channel'}},mouth.depth),false);
  // the save validator refuses marks without a record and malformed records
  assert.equal(validCanalWorks({buildings:[{type:'trench',team:0,x:1,z:1,canalWork:{id:1,role:'breach'}}]},1560),false);
  assert.equal(validCanalWorks({canalWorks:[{version:1,id:1,team:0,channel:[],breach:[{x:1,z:1,depth:3,mouth:true}]}],buildings:[]},1560),false);
  assert.equal(validCanalWorks({buildings:[]},1560),true);
});

test('preview equals commit: a changed bank refuses the commission and lays nothing',()=>{
  const g=world(),plan=planCanalWorks(g,A,B,0,LINE);const s=plan.stages[0];
  g.state.trees.push({x:s.x+1,z:s.z+1,y:g.height(s.x+1,s.z+1),amount:40,max:40,kind:'oak'});
  const before=g.state.buildings.length,r=executeCanalWorks(g,plan);assert.equal(r.ok,false);assert.ok(/Clear or gather/.test(r.reason),r.reason);
  assert.equal(g.state.buildings.length,before);assert.equal(canalWorks(g).length,0);
  assert.ok(planCanalWorks(g,A,B,0,LINE).issues.some(i=>/Clear or gather/.test(i)));
});
