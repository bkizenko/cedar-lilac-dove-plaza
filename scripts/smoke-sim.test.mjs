// Smoke sim: real seeded world, several in-game years with Auto work and scripted player commands,
// finite-value invariants, persistence round trips mid-run, and old-save-shape loading of tonight's optional fields.
import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
import {planFieldArea,placeFieldArea} from '../src/game/fieldArea.ts';
import {dispatchExistingCampRaid} from '../src/game/raiders.ts';
import {dispatchTradeExpedition} from '../src/game/tradeParties.ts';
import {measureVillageWorkload} from '../src/game/villageWorkload.ts';
import {capitulationOffers,acceptCapitulation} from '../src/game/capitulation.ts';
import {testAction} from '../src/game/testing.ts';
import {foodGuardActive} from '../src/game/foodGuard.ts';
import {validAnimalBeh} from '../src/game/animalBehaviour.ts';
import {answerEncounter} from '../src/game/encounters.ts';
import {endowSettlementSites} from './helpers/endowed-settlement-sites.mjs';

const YEAR=1800,DT=0.34,YEARS=Number(process.env.SMOKE_YEARS||2);
const bad=(v,path,out,depth=0)=>{
 if(typeof v==='number'){if(!Number.isFinite(v))out.push(path);return;}
 if(!v||typeof v!=='object'||depth>7||out.length>20)return;
 if(Array.isArray(v)){for(let i=0;i<Math.min(v.length,3000);i++)bad(v[i],`${path}[${i}]`,out,depth+1);return;}
 for(const k of Object.keys(v))bad(v[k],`${path}.${k}`,out,depth+1);
};
function invariants(g,label){
 const out=[];
 for(const u of g.state.units){for(const k of ['x','z','y','hp','carry','fatigue']){if(u[k]!==undefined&&!Number.isFinite(u[k]))out.push(`unit ${u.id}(${u.type}).${k}=${u[k]}`);}}
 for(const t of g.state.tribes){for(const k of ['food','wood','stone','copper','iron','seeds']){if(t[k]!==undefined&&!Number.isFinite(t[k]))out.push(`tribe ${t.id}.${k}=${t[k]}`);}
  bad(t.foodLots,`tribe${t.id}.foodLots`,out);bad(t.items,`tribe${t.id}.items`,out);}
 for(const b of g.state.buildings)for(const k of ['x','z','hp','build']){if(b[k]!==undefined&&!Number.isFinite(b[k]))out.push(`bld ${b.id}(${b.type}).${k}=${b[k]}`);}
 for(const c of g.state.wildlife||[])for(const k of ['x','z','hp']){if(!Number.isFinite(c[k]))out.push(`critter ${c.id}(${c.species}).${k}=${c[k]}`);}
 const w=measureVillageWorkload(g);bad(w,'workload',out);
 if(!Number.isFinite(g.state.time))out.push('time');
 assert.deepEqual(out,[],`${label}: non-finite values`);
 return w;
}
const roundTrip=(g,label)=>{
 const enc=JSON.parse(JSON.stringify(encodeGame(g)));
 try{validateGameSave(enc);}catch(e){const w=(enc.s||enc.state||enc).wildlife||[];const badc=w.filter(c=>c.beh&&!validAnimalBeh(c.beh,(enc.s||enc.state||enc).time,Math.max(1000,(g.world.size/2)+40))).slice(0,3).map(c=>JSON.stringify({id:c.id,sp:c.species,x:c.x,z:c.z,beh:c.beh}));e.message+=` [${label}] invalid beh critters: ${badc.join(' ; ')}`;throw e;}
 const g2=decodeGame(enc);
 assert.equal(g2.state.units.length,g.state.units.length,`${label}: unit count survives`);
 assert.equal(g2.state.buildings.length,g.state.buildings.length,`${label}: building count survives`);
 g2.start?.();
 for(let i=0;i<150;i++)g2.step(DT);
 invariants(g2,`${label} (loaded, continued)`);
 return g2;
};

test(`smoke: ${YEARS} in-game years, Auto work, scripted commands, save/load round trips`,{timeout:240000},()=>{
 const g=new Game();g.reset(20261115,undefined,{size:1040,layout:'continents'});g.enterIsland();
 g.state.conflict=g.state.conflict||'quiet';
 const log={};let encounters=0;const hist=[],bn=[];const ob=g.banner.bind(g);g.banner=(m,t)=>{bn.push(Math.round(g.state.time)+' '+m);return ob(m,t);};const popNow=()=>g.state.units.filter(u=>u.team===0&&u.hp>0).length;const stepFor=(sec)=>{const n=Math.ceil(sec/DT);for(let i=0;i<n&&!g.state.ended;i++){if(g.state.encounter){answerEncounter(g,'greet');encounters++;}g.step(DT);if(i%200===0){const my=g.state.units.filter(u=>u.team===0&&u.hp>0),by={};for(const u of my){const k=u.order+(u.job?'/'+u.job:'')+(u.huntOnly?'/H':'');by[k]=(by[k]||0)+1;}hist.push(`${Math.round(g.state.time)}:${my.length} food=${Math.round(g.tribe(0).food)} guard=${foodGuardActive(g)} farms=${g.state.buildings.filter(b=>b.type==='farm').length} ${JSON.stringify(by)}`);}}};
 g.setAutoWork(true);
 stepFor(60);invariants(g,'t=60');
 // command: build a field area near home
 const home=g.campOf(0);for(let x=-200;x<=200;x+=10)for(let z=-200;z<=200;z+=10)g.exploreAt?.(x+home.x,z+home.z,14);
 try{g.testMode=true;testAction(g,'cultivation');g.tribe(0).seeds=500;
  for(let r=18;r<120&&!log.field;r+=6)for(let k=0;k<12&&!log.field;k++){
   const a={x:home.x+Math.cos(k/12*6.283)*r,z:home.z+Math.sin(k/12*6.283)*r},b={x:a.x+12,z:a.z+12};
   const plan=planFieldArea(g,a,b);if(plan.valid>0)log.field=placeFieldArea(g,plan).length;}
  assert.ok(log.field>0,'a field could be placed by the scripted command (cultivation unlocked, seeds, explored ground)');
 }catch(e){e.message='field command: '+e.message;throw e;}
 stepFor(120);invariants(g,'after field');
 // command: hunt on a herd (select adults, assign hunt job)
 const adults=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.type==='worker'&&!(u.maturesAt>g.state.time));
 for(const u of adults.slice(0,3))u.selected=true;
 g.assignJob('hunt');log.hunters=adults.filter(u=>u.selected).length;
 stepFor(120);invariants(g,'after hunt order');
 let cur=roundTrip(g,'t=300');
 // command: trade party (needs a foreign hall known; endow site knowledge like the trade tests do)
 try{endowSettlementSites(g,0);const partner=g.state.buildings.find(b=>b.type==='townhall'&&b.team!==0&&b.team!==3);
  if(partner){g.tribe(0).wood=Math.max(g.tribe(0).wood,60);g.tribe(partner.team).hostile=false;
   const r=dispatchTradeExpedition(g,partner.team,'land','wood',10);log.trade=r.accepted?'sent':'refused: '+r.reason;}else log.trade='no partner hall';
 }catch(e){e.message='trade command: '+e.message;throw e;}
 const fixed=[1,3,5];
 for(let y=0;y<YEARS;y++){
  // command: raise a raid at the start of each year
  try{g.state.conflict='dangerous';g.state.raidT=0;g.spawnRaid();log.raidDispatch=dispatchExistingCampRaid(g);}catch(e){e.message='raid command: '+e.message;throw e;}
  for(let q=0;q<4;q++){
   stepFor(YEAR/4);invariants(g,`year ${y} q${q}`);
   const offers=capitulationOffers(g,0);if(offers.length){const r=acceptCapitulation(g,offers[0].id,'occupy');log.conquest=(log.conquest||0)+1;log.conquestResult=JSON.stringify(r).slice(0,80);}
   if(fixed.includes(y*4+q))roundTrip(g,`year ${y} q${q}`);
  }
 }
 const w=invariants(g,'final');
 const alive=g.state.units.filter(u=>u.team===0&&u.hp>0).length;
 assert.ok(Number.isFinite(alive));
 assert.ok(g.state.time>=YEARS*YEAR,`sim only reached t=${g.state.time} (pop history ${hist.slice(-16).join('\n ')}; last banners ${bn.slice(-15).join(' | ')}; paused=${g.state.paused}, ended=${g.state.ended}, encounter=${!!g.state.encounter})`);log.encounters=encounters;console.log('smoke log',JSON.stringify({...log,time:Math.round(g.state.time),pop:alive,food:Math.round(g.tribe(0).food),workload:Math.round(w.workloadPercent)}));
});

test('old-save-shaped objects lacking tonight\'s optional fields still validate and load',()=>{
 const g=new Game();g.reset(7,undefined,{size:1040,layout:'continents'});g.enterIsland();
 for(let i=0;i<200;i++)g.step(DT);
 const enc=JSON.parse(JSON.stringify(encodeGame(g)));
 const strip=x=>{
  const s=x.s||x.state||x;const f=[];
  delete s.faunaVersion;delete s.tradeCapacity;delete s.foodGuard;
  for(const u of s.units||[]){delete u.pregnantUntil;delete u.sickUntil;delete u.originTribe;}
  return s;};
 strip(enc);
 for(const u of (enc.s||enc.state||enc).units||[]){assert.equal(u.pregnantUntil,undefined);}
 validateGameSave(enc);const g2=decodeGame(enc);for(let i=0;i<50;i++)g2.step(DT);
 // and each field, when present with bad values, is rejected
 const s=(e=>e.s||e.state||e)(JSON.parse(JSON.stringify(encodeGame(g))));
 const mut=(fn)=>{const e=JSON.parse(JSON.stringify(encodeGame(g)));fn((e.s||e.state||e));return e;};
 assert.throws(()=>validateGameSave(mut(s=>{s.faunaVersion=99;})),'faunaVersion 99 rejected');
 assert.throws(()=>validateGameSave(mut(s=>{s.units[0].sickUntil='x';})),'sickUntil string rejected');
 assert.throws(()=>validateGameSave(mut(s=>{s.units[0].pregnantUntil=NaN;s.units[0].pregnantUntil='x';})),'pregnantUntil string rejected');
 assert.throws(()=>validateGameSave(mut(s=>{s.units[0].originTribe={name:'',gen:0};})),'originTribe empty name rejected');
 assert.throws(()=>validateGameSave(mut(s=>{s.tradeCapacity={9999:{left:1,at:0}};})),'tradeCapacity for unknown tribe rejected');
 assert.throws(()=>validateGameSave(mut(s=>{s.tradeCapacity={0:{left:-1,at:0}};})),'negative tradeCapacity rejected');
 // valid present values round-trip
 const ok=mut(s=>{s.faunaVersion=1;s.units[0].sickUntil=500;s.units[0].pregnantUntil=900;s.tradeCapacity={0:{left:5,at:1}};});
 validateGameSave(ok);const g3=decodeGame(ok);assert.equal(g3.state.units[0].sickUntil,500);
});
