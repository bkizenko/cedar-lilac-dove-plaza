import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {applyEngineCommand,isEngineDispatchCommand} from '../src/game/engineDispatch.ts';
import {isEngineReadQuery,applyEngineReadQuery} from '../src/game/engineReadModels.ts';
import {mulberry32} from '../src/game/rng.ts';
import * as D from '../src/game/wonderDefs.ts';
import * as W from '../src/game/wonderFounding.ts';
import * as S from '../src/game/wonderSuggest.ts';
import * as SS from '../src/game/wonderSiteSearch.ts';
import * as E from '../src/game/wonderEffects.ts';
import * as R from '../src/game/ruinsWorld.ts';
import {civicPrestige} from '../src/game/civicPrestige.ts';
import {foodSpoilage} from '../src/game/pantry.ts';
import {generateWonderKit,WONDER_KINDS,CORE_OF,WONDER_FUNCTIONS} from '../src/scene/wonderKit.ts';
import {WONDER_RECIPES,recipeOf} from '../src/scene/wonderRecipes.ts';
import {ruinSpecFor,ruinSource} from '../src/scene/ruinLayer.ts';
import {CIV_IDS} from '../src/scene/civStyles.ts';
import {perceive} from '../src/game/fame.ts';
import {unrestOf} from '../src/game/rulersRuntime.ts';
import {recordDiscoveries,discoveryScore} from '../src/game/discovery.ts';
const random=Math.random;test.beforeEach(()=>{Math.random=mulberry32(0x7771);});test.afterEach(()=>{Math.random=random;});
function game(seed=1,opts={}){const g=new Game();g.reset(seed,10,opts);g.enterIsland();g.exploredAt=()=>true;return g;}
function run(g,s){const end=g.state.time+s;while(g.state.time<end){g.state.paused=false;g.step(.5);}}
const home=(g,team)=>g.state.campSites?.find(c=>c.team===team)??g.world.camps.find(c=>c.team===team);
function prepare(g,team,{age=3,rich=true,hands=true}={}){
 const h=home(g,team);if(!g.state.buildings.some(b=>b.team===team&&b.type==='townhall'))g.addStartingBuilding('townhall',h.x,h.z,team);
 const t=g.tribe(team);t.age=age;if(rich){t.wood=2000;t.stone=2000;t.food=3000;t.copper=200;t.iron=200;}
 if(hands){while(g.state.units.filter(u=>u.team===team&&u.type==='worker').length<34)g.spawnUnit('worker',h.x+((g.state.units.length%7)-3)*2,h.z+4,team);}
 for(const u of g.state.units)if(u.team===team&&u.type==='worker'){u.order='idle';u.carry=0;}
 return h;
}
const THREE=['aureline','nilemark','hanrei'];

test('registry: every row is valid, 26 wonders, 20 beyond the original four, honest analogue labels',()=>{
 assert.deepEqual(D.validRegistry(),[]);
 assert.equal(D.WONDER_DEFS.length,26);
 const original=['observatory','terraceGarden','harbor','millMarket'];
 const fresh=D.foundableDefs().filter(d=>!original.includes(d.id));assert.ok(fresh.length>=16,'at least 16 new foundable families: '+fresh.length);assert.equal(fresh.length,20);
 for(const d of D.WONDER_DEFS){assert.ok(d.inspiration.verified?!!d.inspiration.source:d.inspiration.name.includes('[UNVERIFIED]'),d.id);}
 assert.deepEqual(D.WONDER_DEFS.filter(d=>d.inspiration.verified).map(d=>d.id).sort(),['caravanserai','granary']);
 // staging adds up exactly to the cost for every good
 for(const d of D.WONDER_DEFS)for(const k of ['wood','stone','food','copper','iron']){let n=0;for(let i=0;i<D.STAGE_COUNT;i++)n+=D.stageGoods(d.id,i)[k];assert.equal(n,d.cost[k]??0,`${d.id} ${k}`);}
 assert.equal(D.stageOfLabour(0,100),0);assert.equal(D.stageOfLabour(24,100),0);assert.equal(D.stageOfLabour(25,100),1);assert.equal(D.stageOfLabour(100,100),4);
 // effects tie to named existing systems only
 const ids=new Set(D.WONDER_DEFS.flatMap(d=>d.effects.map(e=>e.id)));assert.deepEqual([...ids].sort(),['concord','defence','knowledge','portCapacity','prestige','storage']);
 assert.ok(D.WONDER_DEFS.filter(d=>d.effects.some(e=>e.id!=='prestige')).length>=14,'most wonders have a live effect');
 assert.ok(D.WONDER_DEFS.filter(d=>d.hooks.length).length>=20,'hook lists for what is not wired yet');
});
test('kit: every registry wonder draws in 3 civ styles, deterministically, per seed different; stages grow and carry scaffolding',()=>{
 assert.equal(WONDER_KINDS.length,26);for(const f of WONDER_FUNCTIONS)assert.ok(WONDER_KINDS.includes(f));
 for(const d of D.WONDER_DEFS){assert.ok(CORE_OF[d.id],d.id);if(d.kit)assert.deepEqual(d.kit,recipeOf(d.id));}
 const sil=new Set();
 for(const d of D.WONDER_DEFS)for(const civ of THREE){
  const a=generateWonderKit({v:1,seed:11,civ,family:d.id,options:{}}),b=generateWonderKit({v:1,seed:11,civ,family:d.id,options:{}});
  assert.deepEqual(a.parts,b.parts,`${d.id}/${civ} deterministic`);assert.ok(a.identity.satisfied&&a.identity.core===CORE_OF[d.id],`${d.id} keeps its core`);assert.ok(a.parts.length>=20,`${d.id}/${civ} parts ${a.parts.length}`);
  const c=generateWonderKit({v:1,seed:12,civ,family:d.id,options:{}});sil.add(a.silhouette);sil.add(c.silhouette);
  const counts=[0,1,2,3,4].map(stage=>generateWonderKit({v:1,seed:11,civ,family:d.id,options:{stage}}));
  const pieces=counts.map(x=>x.pieces.length);for(let i=1;i<5;i++)assert.ok(pieces[i]>=pieces[i-1],`${d.id} pieces ${pieces}`);assert.ok(pieces[4]>pieces[1],`${d.id} grows`);
  assert.equal(pieces[0],0);assert.ok(counts[0].parts.length>=10,'stage 0 is scaffolding');assert.ok(counts[3].parts.length>counts[1].parts.length);assert.deepEqual(counts[4].parts,a.parts,'level 4 is the finished wonder');
 }
 assert.ok(sil.size>=D.WONDER_DEFS.length*3,'silhouettes differ by civ, seed and wonder: '+sil.size);
 // the same definition renders differently per civ
 for(const id of ['ziggurat','lighthouse','citadel']){const s=new Set(CIV_IDS.map(civ=>generateWonderKit({v:1,seed:3,civ,family:id,options:{}}).silhouette));assert.ok(s.size>=8,`${id}: ${s.size} civ looks`);}
});
test('site search is deterministic, honours requirements, and spacing',()=>{
 const g1=game(),g2=game();prepare(g1,0);prepare(g2,0);
 let found=0;
 for(const d of D.foundableDefs()){
  const a=SS.probeWonderSites(g1,0,d.id,4),b=SS.probeWonderSites(g2,0,d.id,4);
  assert.deepEqual(a,b,`${d.id} same seed same sites`);
  for(const s of a.sites){assert.deepEqual(SS.siteIssuesAt(g1,0,d.id,s.x,s.z),[],`${d.id} site passes its own rules`);}
  for(let i=0;i<a.sites.length;i++)for(let j=i+1;j<a.sites.length;j++)assert.ok(Math.hypot(a.sites[i].x-a.sites[j].x,a.sites[i].z-a.sites[j].z)>=45);
  if(a.sites.length)found++;else assert.ok(a.nearest.length>0,`${d.id} explains why no site`);
 }
 assert.ok(found>=6,'a normal map suits several wonders: '+found);
 // an impossible spot reports words
 const h=home(g1,0);assert.ok(SS.siteIssuesAt(g1,0,'observatory',h.x,h.z).length>0);
 assert.deepEqual(SS.siteIssuesAt(g1,0,'granary',1e5,1e5).length>0,true);
});
test('founding spends the first stage; later stages are delivered by the crew; goods, real labour and stages add up',()=>{
 const g=game();run(g,15);prepare(g,0);
 const t=g.tribe(0),pick=S.suggestWonders(g,0,{siteChecks:26,onlyReady:true})[0];assert.ok(pick,'something can be founded');
 const id=pick.id,cost=D.WONDER_DEFS.find(d=>d.id===id).cost,s0=D.stageGoods(id,0),before={wood:t.wood,stone:t.stone,food:t.food,copper:t.copper,iron:t.iron};
 const r=applyEngineCommand(g,{kind:'found-wonder',family:id,x:pick.site.x,z:pick.site.z});assert.equal(r.accepted,true,r.reason);
 const rec=W.wondersOf(g)[0];assert.equal(rec.family,id);assert.equal(rec.project.delivered,1);assert.equal(rec.x,pick.site.x);
 for(const k of ['wood','stone','food','copper','iron'])assert.equal(before[k]-t[k],s0[k],`first stage spends ${k}`);
 assert.ok(s0.stone<cost.stone,'not all up front');assert.equal(rec.project.need,cost.labour);
 // crew arrives, works, later stages get delivered, the labour is real seconds
 const levels=[];let lastDelivered=1;
 for(let k=0;k<400&&W.wondersOf(g)[0].project;k++){run(g,20);const p=W.wondersOf(g)[0];if(p.project){assert.ok(p.project.delivered>=lastDelivered);lastDelivered=p.project.delivered;levels.push(D.stageOfLabour(p.project.labour,p.project.need));}}
 const done=W.wondersOf(g)[0];assert.equal(done.project,undefined,'finished within the bound');assert.equal(done.progress,1);
 for(let i=1;i<levels.length;i++)assert.ok(levels[i]>=levels[i-1],'stages only advance');assert.ok(new Set(levels).size>=3,'several stages seen: '+[...new Set(levels)]);
 for(const k of ['wood','stone','food','copper','iron'])assert.ok(before[k]-t[k]>=cost[k]*.9||k==='food'||k==='wood',`${k} spent`);
 assert.equal(Math.round(before.stone-t.stone),cost.stone,'stone spent equals the stone cost (nobody else spends stone here)');
 assert.deepEqual(g.simulationErrors,[]);
});
test('a stage waits when the stock cannot deliver it, and resumes when the goods arrive',()=>{
 const g=game();run(g,15);prepare(g,0);const t=g.tribe(0),pick=S.suggestWonders(g,0,{siteChecks:26,onlyReady:true})[0];
 assert.equal(W.foundWonder(g,0,pick.id,{site:pick.site}).ok,true);
 t.wood=0;t.stone=0;t.food=0;t.copper=0;t.iron=0;
 for(let k=0;k<30;k++)run(g,20);
 const rec=W.wondersOf(g)[0];assert.equal(rec.project.delivered,1,'nothing delivered without goods');assert.ok(rec.progress<=.26,'labour stops at the delivered stage: '+rec.progress);assert.match(rec.waiting??'',/goods|Needs/);
 t.wood=3000;t.stone=3000;t.food=3000;t.copper=300;t.iron=300;for(let k=0;k<40;k++)run(g,20);
 assert.ok(W.wondersOf(g)[0].progress>.3||!W.wondersOf(g)[0].project,'work resumed');
});
test('suggest ranking: ordered, deterministic, explained, held wonders drop out, needs move the score',()=>{
 const g1=game(),g2=game();prepare(g1,0);prepare(g2,0);
 const a=S.suggestWonders(g1,0,{siteChecks:26}),b=S.suggestWonders(g2,0,{siteChecks:26});
 assert.deepEqual(a,b,'same seed same list');assert.equal(a.length,24);
 for(let i=1;i<a.length;i++)assert.ok(a[i].score<=a[i-1].score+1e-9);
 const ok=a.filter(s=>s.feasible);assert.ok(ok.length>=5,'feasible '+ok.length);for(const s of ok){assert.ok(s.reasons.length>=3,s.id+' has reasons');assert.ok(s.score>0&&s.score<=1);}
 for(const s of a.filter(s=>!s.feasible)){assert.equal(s.score,0);assert.ok(s.blocker,s.id+' names a blocker');}
 // a younger society cannot yet do late wonders; the words say so
 g1.tribe(0).age=0;const young=S.suggestWonders(g1,0,{siteChecks:26});assert.ok(young.find(s=>s.id==='library').blocker.match(/age/));assert.ok(young.every(s=>!s.ready||D.wonderDef(s.id).minAge<=0));g1.tribe(0).age=3;
 // needs: an empty larder asks for storage, a full one asks less
 g1.tribe(0).food=0;const low=S.measureNeeds(g1,0).needs.food;g1.tribe(0).food=3000;const high=S.measureNeeds(g1,0).needs.food;assert.ok(low>=high,`${low} ${high}`);
 const n0=S.suggestWonders(g1,0,{siteChecks:26}).find(s=>s.id==='granary');g1.tribe(0).food=0;const n1=S.suggestWonders(g1,0,{siteChecks:26}).find(s=>s.id==='granary');if(n0.feasible)assert.ok(n1.need>=n0.need-1e-9);
 // one wonder per family: a held wonder drops out of the list
 const best=a.find(s=>s.ready);g1.tribe(0).food=3000;assert.equal(W.foundWonder(g1,0,best.id,{site:best.site}).ok,true);
 const after=S.suggestWonders(g1,0,{siteChecks:26});assert.equal(after.find(s=>s.id===best.id).feasible,false);assert.ok(after.every(s=>!s.ready),'one project at a time');
 // the panel model carries the same ranking and a site picker
 const m=applyEngineReadQuery(g2,{kind:'wonders'});assert.equal(m.kind,'wonders');assert.ok(m.wonders.rows.length===26&&m.wonders.suggested.length<=3);assert.ok(isEngineReadQuery({kind:'wonders'})&&isEngineReadQuery({kind:'wonders',focus:'granary'})&&!isEngineReadQuery({kind:'wonders',focus:'x y'}));
 assert.ok(m.wonders.rows.some(r=>r.sites.length));assert.ok(m.wonders.rows.every(r=>r.cost.labourSeconds>0&&r.effects.length>0));
});
test('rivals found from the same registry and the fame reaches the player as vague rumour',()=>{
 const g=game();run(g,15);const rival=[1,2].find(t=>g.tribe(t)&&t!==3);prepare(g,rival);
 const msgs=[];const banner=g.banner.bind(g);g.banner=(t,s)=>{msgs.push(t);return banner(t,s);};
 const pick=S.rivalChoice(g,rival);assert.ok(pick,'the rival has a ready choice');assert.ok(D.wonderDef(pick.id));
 assert.equal(W.foundWonder(g,rival,pick.id,{site:pick.site}).ok,true);
 const rec=W.wondersOf(g).find(r=>r.team===rival);assert.equal(rec.family,pick.id);
 // fame: unknown society, big work: tiers only upgrade, small works stay home
 const big={...rec,family:'colossus',era:4};const t1=W.famePulse(g,big,'done');
 if(t1)assert.match(t1,/monument|something|rumour|Merchants|Word/);assert.equal(W.famePulse(g,big,'done'),null,'no repeat at the same tier');
 const small={...rec,id:rec.id+50,family:'granary',era:0};assert.equal(W.famePulse(g,small,'done'),null,'small works stay home');
 assert.equal(perceive({id:'x',society:'1',kind:'wonder',magnitude:20,tick:0},{society:'1',hops:1,reliability:.9},0),null);
 assert.equal(W.famePulse(g,{...rec,team:0},'done'),null,'own works are never rumours');
});
test('effects: each is derived from finished records and reaches the system it names',()=>{
 const g=game(5,{rulersVersion:2});run(g,15);const at=(family,extra={})=>({id:900+W.wondersOf(g).length,team:0,family,x:home(g,0).x+20,z:home(g,0).z+20,w:32,d:32,yaw:0,seed:1,progress:1,era:3,done:g.state.time,...extra});
 g.state.wonders=[];g.state.wonderFounding={version:1,enabled:true,nextId:2000,lastStart:{}};
 const base={pres:civicPrestige(g,0).total,spoil:foodSpoilage(g,0),concord:E.wonderEffect(g.state,0,'concord'),stow:E.wonderEffect(g.state,0,'portCapacity')};
 assert.equal(E.wonderEffect(g.state,0,'storage'),0);
 g.tribe(0).food=500;const spoil0=foodSpoilage(g,0);
 g.state.wonders.push(at('granary'),at('citadel',{x:home(g,0).x+30}),at('ziggurat',{x:home(g,0).x+60}),at('lighthouse',{x:home(g,0).x+90}),at('library',{x:home(g,0).x-30}));
 assert.ok(civicPrestige(g,0).total>base.pres,'prestige counts finished wonders');assert.ok(civicPrestige(g,0).wonders.length===5);
 assert.ok(foodSpoilage(g,0)<spoil0*.9,'granary slows spoilage');assert.ok(E.wonderEffect(g.state,0,'concord')>=6);assert.ok(E.wonderEffect(g.state,0,'portCapacity')>=.2);assert.ok(E.wonderEffect(g.state,0,'knowledge')>=.14);
 const h=home(g,0);assert.ok(E.wonderDefenceFactor(g.state,0,h.x+30,h.z+20)<1,'inside the citadel radius');assert.equal(E.wonderDefenceFactor(g.state,0,h.x+500,h.z),1,'outside it nothing changes');assert.equal(E.wonderDefenceFactor(g.state,1,h.x+30,h.z+20),1,'only the owner is covered');
 // a wonder still rising, or fallen, gives nothing
 g.state.wonders=[at('granary',{project:{labour:1,need:10,crewIds:[],started:0,paid:{wood:0,stone:0,food:0}},done:undefined,progress:.1})];assert.equal(E.wonderEffect(g.state,0,'storage'),0);
 g.state.wonders=[at('granary',{fallen:5})];assert.equal(E.wonderEffect(g.state,0,'storage'),0);assert.equal(civicPrestige(g,0).wonders.length,0);
 // caps: effects never stack past their limit
 g.state.wonders=['granary','iceHouse','terraceGarden'].map((f,i)=>at(f,{id:700+i}));assert.ok(E.wonderEffect(g.state,0,'storage')<=E.EFFECT_CAPS.storage);
 const u=g.state.units.find(u=>u.team===0);void u;
 // the unrest read shifts by the concord points when rulers are on
 g.state.wonders=[];const u0=unrestOf(g,0);g.state.wonders=[at('ziggurat'),at('mausoleum',{x:home(g,0).x+50})];const u1=unrestOf(g,0);if(u0&&u1)assert.ok(u1.value<=u0.value,`unrest ${u0.value} -> ${u1.value}`);
});
test('save round trip: staged project, look, ruins and notices survive; old saves load as before; bad rows are refused',()=>{
 const g=game();run(g,15);prepare(g,0);const pick=S.suggestWonders(g,0,{siteChecks:26,onlyReady:true})[0];
 assert.equal(applyEngineCommand(g,{kind:'found-wonder',family:pick.id,x:pick.site.x,z:pick.site.z,look:{axis:'cross',water:false}}).accepted,true);run(g,200);
 g.state.wonderFounding.notices={'2:3':'rumor'};
 const raw=JSON.parse(JSON.stringify(encodeGame(g))),g2=decodeGame(raw);
 assert.deepEqual(JSON.parse(JSON.stringify(W.wondersOf(g2))),JSON.parse(JSON.stringify(W.wondersOf(g))));assert.deepEqual(g2.state.ruins,g.state.ruins);assert.ok(g2.state.ruins.sites.length>=4);
 assert.equal(W.wondersOf(g2)[0].look.axis,'cross');assert.equal(W.wondersOf(g2)[0].project.delivered>=1,true);
 // an old save: no wonder fields, no ruins switch: nothing new happens
 const old=JSON.parse(JSON.stringify(encodeGame(g)));delete old.state.wonderFounding;delete old.state.wonders;delete old.state.ruins;
 const legacy=decodeGame(old);run(legacy,40);assert.equal(R.ruinsEnabled(legacy),false);assert.equal(R.ruinsOf(legacy).length,0);assert.equal(W.wondersOf(legacy).length,0);assert.equal(W.wonderFoundingEnabled(legacy),false);
 // a pre-registry record (original family, no staging fields) loads and finishes by the old rules
 const pre=JSON.parse(JSON.stringify(encodeGame(g)));const r0=pre.state.wonders[0];r0.family='observatory';delete r0.look;delete r0.project.delivered;assert.doesNotThrow(()=>decodeGame(pre));
 const bad=(f)=>{const x=JSON.parse(JSON.stringify(encodeGame(g)));f(x.state);assert.throws(()=>decodeGame(x));};
 bad(s=>{s.wonders[0].family='castle';});bad(s=>{s.wonders[0].look={axis:'diagonal'};});bad(s=>{s.wonders[0].project.delivered=9;});bad(s=>{s.wonders[0].fallen=-1;});
 bad(s=>{s.ruins.sites[0].loot[0].kind='gold';});bad(s=>{s.ruins.sites[0].decay0=3;});bad(s=>{s.ruins.nextId=0;});bad(s=>{s.wonderFounding.notices={x:'loud'};});
 // commands
 assert.ok(isEngineDispatchCommand({kind:'found-wonder',family:'ziggurat'}));assert.ok(isEngineDispatchCommand({kind:'found-wonder',family:'ziggurat',x:1,z:2,look:{axis:'radial'}}));
 assert.equal(isEngineDispatchCommand({kind:'found-wonder',family:'castle'}),false);assert.equal(isEngineDispatchCommand({kind:'found-wonder',family:'ziggurat',look:{axis:'x'}}),false);
});
test('ruins: decay is monotonic and staged, loot is finite and slot-gated, fallen wonders and villages become ruins',()=>{
 const g=game();run(g,15);assert.ok(R.ruinsEnabled(g));const sites=R.ruinsOf(g);assert.ok(sites.length>=4&&sites.length<=7);
 for(const s of sites){assert.equal(s.kind,'ancient');assert.ok(s.decay0>=.45&&s.decay0<=.85);assert.ok(s.loot.some(l=>l.kind==='lore'),'every ancient site keeps lore');assert.equal(new Set(s.loot.map(l=>l.slot)).size,s.loot.length);}
 const again=R.ancientSiteSpots(g);assert.deepEqual(again.map(a=>[a.x,a.z]),sites.map(s=>[s.x,s.z]),'positions come from the seed alone');
 const site=sites[0],d0=R.ruinDecay(site,0),d1=R.ruinDecay(site,3000),d2=R.ruinDecay(site,1e7);assert.ok(d0<=d1&&d1<=d2&&d2===1);assert.equal(R.ruinStage(.1),'weathered');assert.equal(R.ruinStage(.3),'broken');assert.equal(R.ruinStage(.6),'collapsed');assert.equal(R.ruinStage(.9),'reclaimed');
 // decay is time since it fell: a village ruin that fell at t starts sound
 const fresh={fell:100,decay0:0,years:20};assert.equal(R.ruinDecay(fresh,100),0);assert.ok(R.ruinDecay(fresh,100+20*90/2)>.49&&R.ruinDecay(fresh,100+20*90/2)<.51);
 // geometry: collapse stages, overgrowth, climate, per civ style
 for(const civ of THREE){const v={id:1,kind:'wonder',was:'ziggurat',style:civ,seed:9,w:32,d:32,climate:'wet'};
  const specs=[.05,.4,.7,.95].map(decay=>ruinSpecFor({...v,decay}));for(const s of specs)assert.ok(s&&s.parts.length>5,civ);
  const wall=specs.map(s=>s.ruin.stats.wallVolumeAfter);for(let i=1;i<4;i++)assert.ok(wall[i]<=wall[i-1]+1e-6,`${civ} ${wall}`);assert.ok(specs[3].ruin.growth.length>0,'vegetation overgrowth at high decay');assert.ok(specs[0].ruin.growth.length<=specs[3].ruin.growth.length);
  const arid=ruinSpecFor({...v,decay:.6,climate:'arid'});assert.ok(arid.ruin.climate==='arid');}
 for(const kind of ['village','ancient']){const src=ruinSource({id:3,kind,was:kind==='village'?'house':'settlement',style:'hanrei',seed:4,w:20,d:18});assert.ok(src&&src.parts.length>3,kind);}
 // loot: slot-gated and finite
 const unit=()=>({id:9999,team:0,type:'worker',hp:10,carry:0,x:site.x,z:site.z,order:'explore'});
 const real=g.state.units.find(u=>u.team===0&&u.type==='worker');real.x=site.x;real.z=site.z;
 const total=site.loot.length;let taken=0;const kinds=[];
 for(let k=0;k<total+3;k++){g.state.time=Math.max(g.state.time,0)+R.RUIN_RULES.digCooldown+1;real.carry=0;real.x=site.x;real.z=site.z;if(R.lootRuins(g,real)){taken++;kinds.push(real.carryType??'lore');}}
 assert.ok(taken>=1&&taken<=total,`finite: took ${taken} of ${total}`);assert.equal(site.loot.filter(l=>l.taken).length,taken);
 const left=site.loot.filter(l=>!l.taken);for(const l of left)assert.ok(R.SLOT_RULES[l.slot].open>R.ruinDecay(site,g.state.time)-1e-9||false,'only closed slots remain unless the time ran out');
 void unit;
 // a fallen wonder and a lost hall become ruins
 prepare(g,0);const pick=S.suggestWonders(g,0,{siteChecks:26,onlyReady:true})[0];assert.equal(W.foundWonder(g,0,pick.id,{site:pick.site}).ok,true);
 const rec=W.wondersOf(g)[0],n0=R.ruinsOf(g).length;const ruin=R.fellWonder(g,rec);assert.ok(ruin&&ruin.kind==='wonder'&&ruin.was===pick.id&&rec.fallen!==undefined);assert.equal(R.ruinsOf(g).length,n0+1);assert.equal(R.fellWonder(g,rec),null,'once');
 const hall=g.state.buildings.find(b=>b.team===0&&b.type==='townhall');hall.hp=0;run(g,R.RUIN_RULES.scanEvery*2);assert.ok(R.ruinsOf(g).some(r=>r.kind==='village'&&r.was==='townhall'&&r.src===hall.id),'destroyed hall is recorded as a ruin');
 const nv=R.ruinsOf(g).filter(r=>r.kind==='village').length;run(g,R.RUIN_RULES.scanEvery*2);assert.equal(R.ruinsOf(g).filter(r=>r.kind==='village').length,nv,'recorded once');
 const views=R.ruinViews(g);assert.ok(views.length>=1&&views.every(v=>v.words&&['weathered','broken','collapsed','reclaimed'].includes(v.stage)));
 assert.deepEqual(g.simulationErrors,[]);
});
test('a society that is gone leaves its wonder to the ruins; lore counts as a discovery',()=>{
 const g=game();run(g,15);const rival=1;prepare(g,rival);const pick=S.rivalChoice(g,rival);assert.ok(pick);assert.equal(W.foundWonder(g,rival,pick.id,{site:pick.site}).ok,true);
 g.tribe(rival).alive=false;run(g,30);const rec=W.wondersOf(g).find(r=>r.team===rival);assert.ok(rec.fallen!==undefined&&!rec.project,'fallen');assert.ok(R.ruinsOf(g).some(r=>r.kind==='wonder'&&r.team===rival));
 const before=discoveryScore(g);g.state.ruins.lore=1;recordDiscoveries(g);assert.ok(g.state.discoveries.some(d=>d.id==='lore'));assert.equal(discoveryScore(g),before+6);
});
