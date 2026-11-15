import test from 'node:test';import assert from 'node:assert/strict';
import {yearClimate,seasonalTemperature,YEAR_CLIMATE_RULES as R} from '../src/game/yearClimate.ts';
test('year climate is deterministic, bounded, baseline in year 0 and varies year to year',()=>{
 assert.deepEqual(yearClimate(7,0),{amplitude:0,offset:0});
 const seen=new Set();
 for(let y=1;y<40;y++){const a=yearClimate(7,y),b=yearClimate(7,y);assert.deepEqual(a,b);assert.ok(a.amplitude>=R.amplitudeMin&&a.amplitude<=R.amplitudeMax);assert.ok(Math.abs(a.offset)<=R.offsetMax);seen.add(a.amplitude.toFixed(3));}
 assert.ok(seen.size>30);
});
test('some winters are colder and some summers hotter than the baseline year',()=>{
 const win=y=>seasonalTemperature(7,y*1800+.875*1800),sum=y=>seasonalTemperature(7,y*1800+.375*1800);
 let colder=0,milder=0,hotter=0,cooler=0;
 for(let y=1;y<30;y++){if(win(y)<win(0)-1)colder++;if(win(y)>win(0)+1)milder++;if(sum(y)>sum(0)+1)hotter++;if(sum(y)<sum(0)-1)cooler++;}
 assert.ok(colder>3&&milder>3&&hotter>3&&cooler>3);
});
