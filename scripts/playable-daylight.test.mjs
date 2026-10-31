import test from 'node:test';import assert from 'node:assert/strict';import {daylightPacingAt,daylightAt,pacedSolarHour,DAYLIGHT_PACING_RULES} from '../src/game/daylight.ts';
const rate=86400*32/1800;
test('slow 24-hour clock spends 88–94 percent of play time in seasonal daylight',()=>{
 for(const season of [0,450,900,1350,1700]){const sun=daylightAt(season),budget=daylightPacingAt(season);let day=0,total=12000,dayAdvance=0,nightAdvance=0,daySamples=0,nightSamples=0;
  for(let i=0;i<total;i++){const t=i/total*(86400/rate)*DAYLIGHT_PACING_RULES.clockCycleSlowdown,h=pacedSolarHour(t,rate,season),next=pacedSolarHour(t+.001,rate,season),delta=(next-h+24)%24;
   assert.ok(h>=0&&h<24);assert.ok(delta>0&&delta<.01,'clock stays continuous across sunrise, sunset and midnight');
   if(h>=sun.sunrise&&h<sun.sunset){day++;dayAdvance+=delta;daySamples++;}else{nightAdvance+=delta;nightSamples++;}
  }
  assert.ok(Math.abs(day/total-budget.dayFraction)<.001);assert.ok(day/(total-day)>=7);assert.ok(nightAdvance/nightSamples>dayAdvance/daySamples,'actual clock minutes advance faster at night');
 }
 assert.ok(Math.abs(pacedSolarHour(0,rate)-6.7)<1e-9);assert.equal(daylightAt(1350).sunrise>6,true,'winter sunrise keeps its normal clock hour');
 assert.ok(daylightPacingAt(550).dayFraction>daylightPacingAt(1450).dayFraction);
});
test('changing seasons preserve forward clock motion and the annual boundary',()=>{
 for(let t=0;t<1800;t+=.3){const h=pacedSolarHour(t,rate),next=pacedSolarHour(t+.001,rate);assert.ok((next-h+24)%24<.01);}
 assert.ok(Math.abs(pacedSolarHour(86400/rate*DAYLIGHT_PACING_RULES.clockCycleSlowdown,rate,0)-pacedSolarHour(0,rate,0))<1e-9);
});

test('daytime clock minutes advance at least thirty times slower than the former clock, including 4x play',()=>{
 for(const season of [0,450,900,1350]){const sun=daylightAt(season),budget=daylightPacingAt(season),cycle=86400/rate*DAYLIGHT_PACING_RULES.clockCycleSlowdown;
 const daytimeMinutesPerSecond=sun.hours*60/(cycle*budget.dayFraction);assert.ok((rate/60)/daytimeMinutesPerSecond>=30);
 const daylightRealSecondsAt4x=cycle*budget.dayFraction/4;assert.ok(daylightRealSecondsAt4x>=290,'several uninterrupted real minutes of daylight even at4x');
 }
});
