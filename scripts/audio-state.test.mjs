import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {MusicDirector,DIRECTOR_RULES as R,STATE_TRACKS,TRACK_META,INSTRUMENT_PALETTE,calmTrack,ambientMix,AmbientSmoother,LAYERS} from '../src/scene/audioState.ts';
import {peacefulMusic,TRACKS} from '../src/game/music.ts';
const IN=(o={})=>({mood:'peace',tradeActive:false,age:1,season:'Spring',calmMode:true,...o});
function run(d,script){const out=[];for(const [secs,input] of script){for(let i=0;i<secs;i++)out.push(d.step(input,1));}return out;}
test('calm tracks agree with the live peacefulMusic for every age and season; all tracks exist in TRACKS and are acoustic',()=>{
 for(const age of[0,1,2,3,4,5,6])for(const season of['Spring','Summer','Autumn','Winter'])for(const calm of[true,false])assert.equal(calmTrack(age,season,calm),peacefulMusic(age,season,calm),`${age} ${season} ${calm}`);
 for(const [state,list] of Object.entries(STATE_TRACKS))for(const t of list){assert.ok(TRACKS[t],t+' is a real track');assert.equal(TRACK_META[t].acoustic,true);}
 for(const t of Object.keys(TRACKS))assert.ok(TRACK_META[t],'every shipped track is described: '+t);
 const src=readFileSync(new URL('../src/scene/audioState.ts',import.meta.url),'utf8');assert.ok(!/Math\.random|OscillatorNode|createOscillator/.test(src.replace(/\/\*\*[\s\S]*?\*\//g,'')),'no random and no synthesised music');
 assert.ok(INSTRUMENT_PALETTE.forbidden.includes('synth')&&!INSTRUMENT_PALETTE.allowed.includes('synth'));
});
test('combat states exist only while their real flag was seen: no attack or defense without an observed raid or fighting',()=>{
 const d=new MusicDirector(7);let t=0,lastRaid=-1e9,lastPillage=-1e9,rng=1;const next=()=>(rng=(rng*1103515245+12345)&0x7fffffff)/0x7fffffff;let mood='peace',trade=false;
 for(let i=0;i<20000;i++){if(i%37===0)mood=next()<.1?'raid':next()<.1?'pillage':'peace';if(i%53===0)trade=next()<.4;
  t++;if(mood==='raid')lastRaid=t;if(mood==='pillage')lastPillage=t;const o=d.step(IN({mood,tradeActive:trade,season:['Spring','Summer','Autumn','Winter'][Math.floor(i/900)%4]}),1);
  if(o.state==='defense')assert.ok(t-lastRaid<=R.combatHoldSeconds+1e-9,'defense without a raid at '+i);
  if(o.state==='attack')assert.ok(t-lastPillage<=R.combatHoldSeconds+1e-9,'attack without fighting at '+i);
  if(o.state==='trade')assert.ok(t-lastRaid>R.combatHoldSeconds&&t-lastPillage>R.combatHoldSeconds,'trade music over combat');
  if(mood==='raid')assert.equal(o.state,'defense','a raid is answered in the same step');}
 const calm=new MusicDirector(1);for(const o of run(calm,[[600,IN()]]))assert.equal(o.state,'calm','nothing happening never leaves calm');
});
test('transitions: combat leaves only after the hold, trade needs sustained real trade, nothing flickers',()=>{
 const d=new MusicDirector(3);let out=run(d,[[30,IN()]]);assert.equal(out.at(-1).state,'calm');
 out=run(d,[[1,IN({mood:'raid'})]]);assert.equal(out[0].state,'defense');assert.equal(out[0].fade.seconds,R.fade.intoCombat);assert.equal(out[0].track,'battle');
 out=run(d,[[R.combatHoldSeconds-2,IN()]]);assert.ok(out.every(o=>o.state==='defense'),'holds through quiet');
 out=run(d,[[30,IN()]]);const back=out.find(o=>o.state==='calm');assert.ok(back&&back.fade.seconds===R.fade.outOfCombat,'then returns to calm slowly');
 const t=new MusicDirector(4);run(t,[[30,IN()]]);out=run(t,[[R.tradeEnterSeconds-1,IN({tradeActive:true})]]);assert.ok(out.every(o=>o.state==='calm'),'a moment of trade is not a trade piece');
 out=run(t,[[40,IN({tradeActive:true})]]);assert.ok(out.some(o=>o.state==='trade')&&out.at(-1).state==='trade');assert.ok(STATE_TRACKS.trade.includes(out.at(-1).track));
 out=run(t,[[R.tradeHoldSeconds-2,IN()]]);assert.ok(out.every(o=>o.state==='trade'),'trade lingers briefly');out=run(t,[[40,IN()]]);assert.equal(out.at(-1).state,'calm');
 let changes=0;const f=new MusicDirector(5);for(const o of run(f,Array.from({length:200},(_,i)=>[1,IN({tradeActive:i%2===0})])))if(o.changed)changes++;assert.ok(changes<=6,'flapping trade input does not flap the music '+changes);
 const sw=new MusicDirector(6);out=run(sw,[[1,IN({mood:'pillage'})],[3,IN({mood:'raid'})]]);assert.equal(out[0].state,'attack');assert.equal(out.at(-1).state,'defense','defending the village outranks attacking');
});
test('calm mode never plays the lively pieces; the track follows season and age within the state palette',()=>{
 for(const season of['Spring','Summer','Autumn','Winter'])for(const age of[0,2,4]){const d=new MusicDirector(age+1);const o=run(d,[[60,IN({season,age,calmMode:true})]]).at(-1);assert.ok(STATE_TRACKS.calm.includes(o.track)&&!TRACK_META[o.track].lively);}
 assert.equal(run(new MusicDirector(1),[[60,IN({season:'Winter'})]]).at(-1).track,'harp');
 const d=new MusicDirector(1);run(d,[[30,IN({season:'Spring'})]]);const out=run(d,[[40,IN({season:'Winter'})]]);assert.equal(out.at(-1).track,'harp','a season change is followed after the dwell');assert.ok(out.filter(o=>o.changed).length<=1);
});
test('skip: next track, never the same, holds until the state changes, then the world decides again; combat may skip to peaceful music',()=>{
 const d=new MusicDirector(2);run(d,[[30,IN({season:'Spring'})]]);const a=d.track,b=d.skipTrack();assert.notEqual(a,b);assert.ok(STATE_TRACKS.calm.includes(b));
 const out=run(d,[[100,IN({season:'Spring'})]]);assert.ok(out.every(o=>o.track===b&&o.skipped),'a skip lasts');
 const seen=new Set([b]);for(let i=0;i<6;i++)seen.add(d.skipTrack());assert.equal(seen.size,3,'cycles the whole calm palette');
 run(d,[[1,IN({mood:'raid'})]]);assert.equal(d.track,'battle');assert.notEqual(d.skipTrack(),'battle');assert.equal(d.state,'defense','skipping music does not end the defense state');
 const o2=run(d,[[5,IN({mood:'raid'})]]);assert.ok(o2.every(o=>o.skipped),'chosen piece lasts while the raid lasts');
});
test('deterministic: same seed and inputs give the same output, different seeds can pick differently; rests are seeded gaps',()=>{
 const script=[[50,IN()],[5,IN({mood:'raid'})],[60,IN({tradeActive:true})],[60,IN({season:'Autumn'})]];const a=run(new MusicDirector(9),script),b=run(new MusicDirector(9),script);assert.deepEqual(a,b);
 const d=new MusicDirector(1),e=new MusicDirector(1);run(d,[[10,IN()]]);run(e,[[10,IN()]]);const r=d.trackEnded();assert.equal(r,e.trackEnded());assert.ok(r>=10+R.restSeconds[0]-1e-9&&r<=10+R.restSeconds[1]+1e-9);
});
test('ambient: layers follow biome, season, hour, weather and real water or fire distance; indoors hushes; all gains in 0..1',()=>{
 const base={biome:'forest',season:'Summer',hour:12,weather:'clear'};
 assert.ok(ambientMix(base).birds>.5&&ambientMix({...base,hour:2}).birds===0,'birds sing by day only');assert.equal(ambientMix({...base,season:'Winter'}).birds,0);assert.equal(ambientMix({...base,weather:'storm'}).birds,0);
 assert.ok(ambientMix({...base,hour:2,biome:'plains'}).crickets>.5&&ambientMix({...base,hour:12}).crickets===0&&ambientMix({...base,hour:2,season:'Winter'}).crickets===0);
 assert.ok(ambientMix({...base,biome:'wetland',hour:22}).frogs>0&&ambientMix({...base,hour:22}).frogs===0&&ambientMix({...base,biome:'wetland',hour:12}).frogs===0);
 assert.equal(ambientMix(base).surf,0);assert.ok(ambientMix({...base,coastal:true}).surf>0);assert.ok(ambientMix({...base,weather:'storm'}).rain===1&&ambientMix(base).rain===0);
 assert.equal(ambientMix(base).river,0);assert.ok(ambientMix({...base,waterDistance:10}).river>ambientMix({...base,waterDistance:50}).river);assert.equal(ambientMix({...base,waterDistance:80}).river,0);
 assert.equal(ambientMix(base).fire,0,'no fire sound without a lit fire in range');assert.ok(ambientMix({...base,litFireDistance:3}).fire>.8);assert.equal(ambientMix({...base,litFireDistance:Infinity}).fire,0);
 assert.ok(ambientMix({...base,biome:'desert',hour:12}).insects>0&&ambientMix({...base,biome:'forest'}).insects===0);assert.ok(ambientMix({...base,biome:'tundra',season:'Winter'}).snowHush>0);
 assert.equal(ambientMix({...base,people:0}).murmur,0);assert.ok(ambientMix({...base,people:60}).murmur>0&&ambientMix({...base,people:60,hour:12}).murmur>ambientMix({...base,people:60,hour:2}).murmur);
 const o=ambientMix({...base,litFireDistance:3,indoors:true});assert.ok(o.birds<ambientMix(base).birds&&o.fire>.8);
 for(const biome of['plains','forest','hills','desert','tundra','wetland'])for(const season of['Spring','Summer','Autumn','Winter'])for(const hour of[0,5.5,12,20,23.5])for(const weather of['clear','rain','storm','frost','mist'])for(const l of LAYERS){const v=ambientMix({biome,season,hour,weather,coastal:hour>20,people:30,waterDistance:20,litFireDistance:5})[l];assert.ok(v>=0&&v<=1&&Number.isFinite(v));}
 assert.ok(ambientMix({...base,season:'Spring'}).birds>ambientMix({...base,season:'Autumn'}).birds);
});
test('ambient smoothing moves gains at a bounded rate',()=>{
 const s=new AmbientSmoother(.2),target=ambientMix({biome:'forest',season:'Spring',hour:12,weather:'clear'});let prev=0;for(let i=0;i<100;i++){const g=s.step(target,.5);assert.ok(Math.abs(g.birds-prev)<=.1+1e-9);prev=g.birds;}assert.ok(Math.abs(s.gains.birds-target.birds)<1e-9);
});
