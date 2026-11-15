// Year length: ONE persisted, optional state.yearLength (absent = Classic 1800) drives every calendar site.
import test from 'node:test';import assert from 'node:assert/strict';import {readdirSync,readFileSync,statSync} from 'node:fs';import {join} from 'node:path';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
import {DEFAULT_YEAR_SECONDS,LIFE_YEAR_SECONDS,YEAR_LENGTH_PRESETS,simulationDaySeconds,normalizeYearLength,validYearLength,yearSecondsOf,seasonSecondsOf,yearScaleOf} from '../src/game/calendarPacing.ts';
import {calendar,cropGrowSeconds,farmHarvestEstimate} from '../src/game/settlement.ts';
import {daylightAt,pacedSolarHour,workdayAt} from '../src/game/daylight.ts';
import {seasonalTemperature} from '../src/game/yearClimate.ts';
import {herdMaturity,herdGestation} from '../src/game/animalSpecies.ts';
import {jsonCopy} from './save-roundtrip-helpers.mjs';

const make=(yearLength)=>{const g=new Game();g.reset(31,21,{size:1040,layout:'pangaea',...(yearLength?{yearLength}:{})});g.enterIsland();return g;};

test('helpers: Classic is the default, bad values repair to it, presets are all valid',()=>{
 assert.equal(DEFAULT_YEAR_SECONDS,1800);assert.equal(LIFE_YEAR_SECONDS,1800);
 assert.equal(yearSecondsOf(undefined),1800);assert.equal(yearSecondsOf({}),1800);assert.equal(yearSecondsOf({yearLength:3600}),3600);
 assert.equal(seasonSecondsOf({yearLength:3600}),900);assert.equal(yearScaleOf({yearLength:7200}),4);
 for(const bad of [NaN,Infinity,-1,0,100,1234,99999,'3600',null,3600.5,1801])assert.equal(yearSecondsOf({yearLength:bad}),1800,String(bad));
 for(const p of YEAR_LENGTH_PRESETS)assert.ok(validYearLength(p.seconds),p.name);
 assert.equal(normalizeYearLength(1800),undefined,'the default is never persisted');assert.equal(normalizeYearLength(3600),3600);assert.equal(normalizeYearLength(12345),undefined);
 assert.equal(simulationDaySeconds,56.25,'day length is constant for every year length');
});

test('old save (no yearLength) loads at 1800 and the calendar equals the former hard-coded one',()=>{
 const g=make();assert.equal(g.state.yearLength,undefined);
 const raw=jsonCopy(encodeGame(g));assert.ok(!('yearLength' in raw.state),'Classic worlds do not write the field');
 const back=decodeGame(raw);assert.equal(back.state.yearLength,undefined);assert.equal('yearLength' in back.state,false);
 const names=['Spring','Summer','Autumn','Winter'];
 for(let t=0;t<5400;t+=37){
  back.state.time=t;const c=calendar(back),year=Math.floor(t/1800),phase=Math.floor((t%1800)/450);
  assert.equal(c.year,year);assert.equal(c.phase,phase);assert.equal(c.name,names[phase]);assert.equal(c.remaining,450-(t%450));
  assert.equal(c.month,["March","April","May","June","July","August","September","October","November","December","January","February"][Math.floor((t%1800)/150)]);
  assert.equal(back.seasonMix().yearFrac,(t%1800)/1800);
  assert.equal(daylightAt(t).hours,daylightAt(t,45,1800).hours);
 }
 assert.equal(cropGrowSeconds(back),810);
});

test('year length survives a save round trip; damaged values repair to Classic instead of failing',()=>{
 const g=make(3600);assert.equal(g.state.yearLength,3600);
 const raw=jsonCopy(encodeGame(g));assert.equal(raw.state.yearLength,3600);
 assert.equal(decodeGame(jsonCopy(raw)).state.yearLength,3600);
 for(const bad of [NaN,-5,1,999999,'long',1234]){const r=jsonCopy(raw);r.state.yearLength=bad;validateGameSave(jsonCopy(r));assert.equal(decodeGame(r).state.yearLength,undefined,String(bad));}
 const none=jsonCopy(raw);delete none.state.yearLength;assert.equal(decodeGame(none).state.yearLength,undefined);
 assert.equal(make(1800).state.yearLength,undefined,'asking for Classic equals the default');
 assert.equal(make(777).state.yearLength,undefined,'an invalid request is ignored');
});

test('a 2x year has seasons exactly 2x as long, and every per-year site follows',()=>{
 const a=make(),b=make(3600);
 for(const [t,phase] of [[0,0],[449,0],[450,1],[899,1],[900,2],[1799,3],[1800,3],[3599,3]]){b.state.time=t;
  assert.equal(calendar(b).phase,Math.min(3,Math.floor(t/900)),`t=${t}`);void phase;}
 b.state.time=899;assert.equal(calendar(b).phase,0);assert.equal(calendar(b).remaining,1);b.state.time=900;assert.equal(calendar(b).phase,1);assert.equal(calendar(b).remaining,900);
 b.state.time=3600;assert.equal(calendar(b).year,1);assert.equal(calendar(b).phase,0);
 // the same fraction of the year gives identical seasonal output
 for(const f of [0,.1,.3,.55,.8,.99]){a.state.time=f*1800;b.state.time=f*3600;
  const ma=a.seasonMix(),mb=b.seasonMix();assert.equal(ma.name,mb.name);for(const k of ['spring','summer','autumn','winter','snow','yearFrac'])assert.ok(Math.abs(ma[k]-mb[k])<1e-9,k);
  assert.ok(Math.abs(a.daylight().hours-b.daylight().hours)<1e-9);
  assert.ok(Math.abs(seasonalTemperature(7,f*1800)-seasonalTemperature(7,f*3600,3600))<1e-9);
  assert.equal(a.clockState().weather,b.clockState().weather);assert.equal(a.clockState().season,b.clockState().season);}
 // crops ripen 0.45 of a year after sowing
 assert.equal(cropGrowSeconds(a),810);assert.equal(cropGrowSeconds(b),1620);
 // annual yield scales, so per-second food production is unchanged
 const fa=a.makeBld('farm',0,0,0),fb=b.makeBld('farm',0,0,0);a.height=()=>4;b.height=()=>4;
 assert.equal(farmHarvestEstimate(b,fb),farmHarvestEstimate(a,fa)*2);
 // food storage and breeding clocks are quoted per year too
 assert.equal(b.stockCap(0),a.stockCap(0)*2);
 assert.equal(herdMaturity('cattle',b.state),2*herdMaturity('cattle',a.state));assert.equal(herdGestation('goat',b.state),2*herdGestation('goat',a.state));
 // the day is the same length in real time at any year length
 const rate=86400/simulationDaySeconds;
 assert.ok(Math.abs(pacedSolarHour(5,rate,5,3600)-pacedSolarHour(5,rate,5,1800))<1,'clock rate does not depend on year length');
 assert.equal(workdayAt(100,12,3600).hours,workdayAt(50,12).hours);
});

test('a running 2x world stays in spring when a Classic one has reached summer, and still saves',()=>{
 const a=make(),b=make(3600);for(const g of [a,b]){g.state.paused=false;}
 for(let i=0;i<500;i++){a.step(1);b.step(1);}
 assert.ok(a.state.time>=450&&b.state.time>=450,'both clocks advanced '+a.state.time+' '+b.state.time);
 assert.equal(calendar(a).phase,1);assert.equal(calendar(b).phase,0);
 assert.equal(decodeGame(jsonCopy(encodeGame(b))).state.yearLength,3600);
});

test('ageing keeps its own constant life year (a longer season does not lengthen a life)',()=>{
 const a=make(),b=make(7200);
 const ages=g=>g.state.units.filter(u=>u.team===0).map(u=>Math.floor(u.ageT/LIFE_YEAR_SECONDS)).length;
 assert.equal(ages(a),ages(b));
 const src=readFileSync(new URL('../src/game/sim.ts',import.meta.url),'utf8');
 assert.ok(src.includes('LIFE_YEAR_SECONDS')&&!/\*\s*1800\b/.test(src.replace(/\/\/.*$/gm,'')),'sim.ts ageing uses LIFE_YEAR_SECONDS, not a bare 1800');
});

// Guard: no module may read the Classic year constant for a live game. Add a file here only with a written reason.
const ALLOW={
 'game/calendarPacing.ts':'definition',
 'game/settlement.ts':'YEAR_SECONDS default alias',
 'game/farmCalibration.ts':'Classic-year reference table',
 'game/fieldLook.ts':'default parameter of a time-only helper',
 'game/knowledgeEvidence.ts':'default parameter of a time-only helper',
 'game/rulersRuntime.ts':'RULERS_YEAR_SECONDS is its own 90 s dynasty clock, unrelated to the calendar',
};
function walk(d,out=[]){for(const f of readdirSync(d)){const p=join(d,f),s=statSync(p);if(s.isDirectory())walk(p,out);else if(/\.(ts|tsx)$/.test(f))out.push(p);}return out;}
test('guard: no hard-coded calendar year in src outside the documented allow-list',()=>{
 const root=new URL('../src/',import.meta.url).pathname,bad=[];
 for(const p of walk(root)){const rel=p.slice(root.length);if(ALLOW[rel])continue;
  const code=readFileSync(p,'utf8').replace(/\/\*[\s\S]*?\*\//g,'').split('\n').map(l=>l.replace(/\/\/.*$/,''));
  code.forEach((l,i)=>{if(/\bYEAR_SECONDS\b|SIM_CALENDAR_RULES\.yearSeconds|%\s*1800\b|\(\s*time\s*\/\s*1800|state\.time\s*\/\s*1800/.test(l)&&!/RULERS_YEAR_SECONDS|RUIN|LIFE_YEAR_SECONDS|DEFAULT_YEAR_SECONDS|MAX_YEAR/.test(l))bad.push(`${rel}:${i+1}: ${l.trim().slice(0,100)}`);});}
 assert.deepEqual(bad,[],'use yearSecondsOf(state) / seasonSecondsOf(state) (calendarPacing.ts):\n'+bad.join('\n'));
});
