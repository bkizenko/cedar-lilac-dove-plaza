import test from 'node:test';import assert from 'node:assert/strict';
import {normaliseSettings,busGain,loadSettings,saveSettings,DEFAULT_AUDIO_SETTINGS,pickScale,degreeToMidi,midiToHz,scoreMix,ScoreSmoother,SCORE_LAYERS,barNotes,BarClock,envMix,smoothEnv,ENV_LAYERS,envEvents,
 attenuation,panFor,zoomFactor,emitterGain,VoiceBudget,SFX_SPECS,sfxRecipe,envRecipe,footstepFor,toolFor,LEGACY_SFX,birdVoice,MODES} from '../src/scene/audioMix.ts';
import {seededRandom} from '../src/scene/buildingParts.ts';
import {readFileSync} from 'node:fs';
const IN=(o={})=>({mood:'peace',hour:12,season:'Spring',age:1,work:0,seed:7,...o});

test('settings: normalised, mute zeroes every bus, storage round-trips and survives garbage',()=>{
 assert.deepEqual(normaliseSettings(null),DEFAULT_AUDIO_SETTINGS);
 const s=normaliseSettings({master:2,music:-1,sfx:'x',ambience:.3,muted:true});assert.equal(s.master,1);assert.equal(s.music,0);assert.equal(s.sfx,DEFAULT_AUDIO_SETTINGS.sfx);assert.equal(s.muted,true);
 for(const b of['master','music','sfx','ambience'])assert.equal(busGain(s,b),0);
 const open={...DEFAULT_AUDIO_SETTINGS,master:1,music:1};assert.equal(busGain(open,'music'),1);assert.ok(busGain({...open,music:.5},'music')<.3,'quadratic curve');
 const mem=new Map(),st={getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v)};saveSettings(st,{...DEFAULT_AUDIO_SETTINGS,music:.2,muted:true});assert.deepEqual(loadSettings(st),{...DEFAULT_AUDIO_SETTINGS,music:.2,muted:true});
 assert.deepEqual(loadSettings({getItem:()=>'{bad'}),DEFAULT_AUDIO_SETTINGS);assert.deepEqual(loadSettings(null),DEFAULT_AUDIO_SETTINGS);
});
test('scales: seeded, season-moded, in range, mourning goes minor, key constant per world',()=>{
 assert.deepEqual(pickScale(5,'Winter',2),pickScale(5,'Winter',2));
 for(const season of['Spring','Summer','Autumn','Winter'])for(let seed=1;seed<30;seed++){const sc=pickScale(seed,season,1);assert.ok(MODES[sc.mode]);assert.ok(sc.root>=40&&sc.root<=64);}
 for(let seed=1;seed<20;seed++)assert.ok(['aeolian','phrygian'].includes(pickScale(seed,'Summer',1,true).mode));
 assert.equal(pickScale(9,'Spring',1).root,pickScale(9,'Winter',1).root,'same world, same key');
 const sc=pickScale(1,'Summer',1);assert.equal(degreeToMidi(sc,0),sc.root);assert.equal(degreeToMidi(sc,sc.intervals.length),sc.root+12);assert.equal(degreeToMidi(sc,-1),sc.root+sc.intervals.at(-1)-12);assert.ok(Math.abs(midiToHz(69)-440)<1e-9);
});
test('score mix responds to state: danger, night, work, ruler events, era',()=>{
 const peace=scoreMix(IN()),raid=scoreMix(IN({mood:'raid'})),night=scoreMix(IN({hour:23})),work=scoreMix(IN({work:1})),mourn=scoreMix(IN({mourning:1})),cer=scoreMix(IN({ceremony:1}));
 assert.ok(raid.gains.drum>peace.gains.drum+.5&&raid.gains.horn>peace.gains.horn&&raid.gains.lute<peace.gains.lute&&raid.bpm>peace.bpm);
 assert.ok(night.gains.flute<peace.gains.flute&&night.gains.drone>peace.gains.drone&&night.bpm<peace.bpm);
 assert.ok(work.gains.drum>peace.gains.drum&&work.gains.lute>peace.gains.lute);
 assert.ok(mourn.bpm<peace.bpm&&mourn.gains.lute<peace.gains.lute&&mourn.gains.bells>peace.gains.bells&&['aeolian','phrygian'].includes(mourn.scale.mode)&&mourn.brightness<peace.brightness);
 assert.ok(cer.gains.bells>.5&&cer.gains.horn>.5);
 assert.equal(scoreMix(IN({age:0})).gains.strings,0);assert.ok(scoreMix(IN({age:4})).gains.strings>0);
 for(const l of SCORE_LAYERS)for(const m of[peace,raid,night,work,mourn,cer]){assert.ok(m.gains[l]>=0&&m.gains[l]<=1);}
 assert.deepEqual(scoreMix(IN({season:'Autumn',hour:7})),scoreMix(IN({season:'Autumn',hour:7})),'pure');
});
test('smoother: no pops, frame-rate independent, converges, falls gradually',()=>{
 const t=scoreMix(IN({mood:'raid'})),a=new ScoreSmoother();
 let prev=0,maxJump=0;for(let i=0;i<600;i++){a.step(t,1/60);maxJump=Math.max(maxJump,Math.abs(a.gains.drum-prev));prev=a.gains.drum;}
 assert.ok(maxJump<.02,'per-frame step stays small');for(let i=0;i<60;i++)a.step(t,.5);
 for(const l of SCORE_LAYERS)assert.ok(Math.abs(a.gains[l]-t.gains[l])<.05,'converges '+l);
 const x=new ScoreSmoother(),y=new ScoreSmoother();for(let i=0;i<120;i++)x.step(t,.05);for(let i=0;i<6;i++)y.step(t,1);assert.ok(Math.abs(x.gains.lute-y.gains.lute)<.02,'frame-rate independent');
 const hold=new ScoreSmoother(),calm=scoreMix(IN());for(let i=0;i<200;i++)hold.step(t,.5);const up=hold.gains.drum;for(let i=0;i<2;i++)hold.step(calm,.5);assert.ok(hold.gains.drum<up&&hold.gains.drum>up*.3,'falls gradually');
});
test('notes: deterministic, on-scale, no exact looping across sections, ranges sane',()=>{
 const sc=pickScale(3,'Summer',2),pcs=new Set(sc.intervals.map(i=>((sc.root+i)%12+12)%12));
 for(const l of SCORE_LAYERS)for(let bar=0;bar<40;bar++){const n=barNotes(3,l,bar,sc);assert.deepEqual(n,barNotes(3,l,bar,sc));
  for(const x of n){assert.ok(x.beat>=0&&x.beat<4,l);assert.ok(x.dur>0&&x.vel>0&&x.vel<=1);if(l!=='drum')assert.ok(pcs.has((x.midi%12+12)%12),`${l} note on scale`);assert.ok(x.midi>=24&&x.midi<=100);}}
 const sig=(l,from)=>JSON.stringify(Array.from({length:8},(_,i)=>barNotes(3,l,from+i,sc)));
 for(const l of['lute','flute'])assert.notEqual(sig(l,0),sig(l,8),l+' sections differ');
 assert.notEqual(sig('lute',0),sig('lute',16));assert.notEqual(JSON.stringify(barNotes(3,'lute',0,sc)),JSON.stringify(barNotes(4,'lute',0,sc)),'seed changes the music');
});
test('bar clock: contiguous bars, tempo-aware, no stale burst after a pause',()=>{
 const c=new BarClock(),a=c.advance(0,.7,60);assert.equal(a[0].bar,0);assert.equal(a[0].beatSec,1);
 const bars=[...a];let t=0;for(let i=0;i<200;i++){t+=.1;bars.push(...c.advance(t,.7,i<100?60:120));}
 assert.deepEqual(bars.map(b=>b.bar),bars.map((_,i)=>i));for(let i=1;i<bars.length;i++)assert.ok(bars[i].start>bars[i-1].start);
 const late=c.advance(t+300,.7,60);assert.ok(late.length<=2,'no burst after pause');assert.ok(late[0].start>=t+300);
});
test('environment mix: rain, storm, water, fire, mill, night birds, season',()=>{
 const E=(o={})=>envMix({biome:'forest',season:'Spring',hour:9,weather:'clear',...o});
 assert.ok(E().birds>.5);assert.equal(E({hour:2}).birds,0);assert.ok(envMix({biome:'plains',season:'Summer',hour:23,weather:'clear'}).crickets>.5);
 assert.ok(E({weather:'rain'}).rain>0&&E({weather:'storm'}).storm===1&&E().storm===0&&E({weather:'storm'}).wind>E().wind);
 assert.ok(E({waterDistance:5}).river>E({waterDistance:50}).river&&E({waterDistance:500}).river===0);assert.ok(E({litFireDistance:2}).fire>.8&&E().fire===0);
 assert.ok(E({millDistance:3}).mill>.5&&E({millDistance:100}).mill===0&&E().mill===0,'mill only when a running mill is near');assert.ok(E({coastal:true}).surf>0&&E().surf===0);
 assert.equal(E({season:'Winter'}).birds,0);assert.ok(E({livestock:12}).livestock>E({livestock:1}).livestock);assert.ok(E({crowd:25}).crowd>.5);
 for(const l of ENV_LAYERS)assert.ok(E({weather:'storm',waterDistance:1,litFireDistance:1,millDistance:1})[l]<=1);
 const cur=Object.fromEntries(ENV_LAYERS.map(l=>[l,0])),tg=E({waterDistance:5});for(let i=0;i<300;i++)smoothEnv(cur,tg,.1);assert.ok(Math.abs(cur.river-tg.river)<.01);
 assert.ok(birdVoice('forest',6).rate>birdVoice('forest',13).rate);assert.ok(birdVoice('forest',13).rate>birdVoice('forest',2).rate);
});
test('env events: seeded, rate scales with gain, capped, silent layers silent',()=>{
 const z=Object.fromEntries(ENV_LAYERS.map(l=>[l,0])),run=(g,seed)=>{const r=seededRandom(seed),out=[];for(let i=0;i<600;i++)out.push(...envEvents(g,.1,r));return out;};
 assert.equal(run(z,1).length,0);const lo=run({...z,birds:.2},1).length,hi=run({...z,birds:1},1).length;assert.ok(hi>lo*2&&lo>0);
 assert.deepEqual(run({...z,fire:1},5),run({...z,fire:1},5));assert.ok(run({...z,fire:1},5).every(e=>e.kind==='crackle'));
 assert.ok(run({...z,mill:1},2).every(e=>e.kind==='creak')&&run({...z,mill:1},2).length>0);assert.ok(envEvents({...z,fire:1,birds:1,crickets:1,frogs:1,storm:1,mill:1},10,seededRandom(1)).length<=6);
});
test('spatial: attenuates with distance, culled at max, pans by side, zoom thins',()=>{
 const c=SFX_SPECS.axe.spatial;assert.equal(attenuation(0,c),1);assert.ok(attenuation(20,c)<attenuation(10,c));assert.equal(attenuation(c.max,c),0);assert.equal(attenuation(1e6,c),0);assert.equal(attenuation(-1,c),0);
 let p=1;for(let d=0;d<c.max;d+=5){const a=attenuation(d,c);assert.ok(a<=p+1e-9);p=a;}
 assert.ok(panFor(30,0,0)>.3&&panFor(-30,0,0)<-.3&&panFor(0,30,0)===0);
 assert.ok(panFor(1e6,0,0)<=1&&panFor(-1e6,0,0)>=-1);assert.ok(zoomFactor(20)>zoomFactor(200)&&zoomFactor(1e6)>=.25);
 const e=emitterGain(40,0,c,30,0);assert.ok(e.gain>0&&e.pan>0&&e.dist===40);assert.equal(emitterGain(500,0,c,30,0).gain,0);
 assert.equal(attenuation(5e7,SFX_SPECS.click.spatial),1,'ui click is non-positional');
});
test('voice budget: cooldown, per-kind cap, global cap, priority eviction, release',()=>{
 const b=new VoiceBudget(4);assert.ok(b.acquire('axe',1,0));assert.equal(b.acquire('axe',1,.1),null,'cooldown');assert.ok(b.acquire('axe',1,1));assert.ok(b.acquire('axe',1,2));assert.equal(b.acquire('axe',.5,3),null,'kind cap, weaker loses');
 const stronger=b.acquire('axe',1.5,4);assert.ok(stronger&&stronger.evicted.length===1);assert.ok(b.active<=4);
 const full=new VoiceBudget(2);full.acquire('clash',1,0);full.acquire('hammer',1,0);assert.equal(full.acquire('step_grass',.3,0),null,'footstep cannot evict');
 const h=full.acquire('horn',1,0);assert.ok(h&&h.evicted.length===1,'horn evicts');assert.equal(full.active,2);
 const r=new VoiceBudget(1),v=r.acquire('hen',1,0);r.release(v.id);assert.equal(r.active,0);assert.equal(r.acquire('dog',.001,0),null,'inaudible never acquires');
 const big=new VoiceBudget(20),kinds=Object.keys(SFX_SPECS);let t=0;for(let i=0;i<5000;i++){t+=.01;big.acquire(kinds[i%kinds.length],.5+(i%7)/10,t);assert.ok(big.active<=20);}
});
test('sfx and env recipes: every kind synthesises, finite bounded params, deterministic, no files',()=>{
 for(const k of Object.keys(SFX_SPECS)){const a=sfxRecipe(k,seededRandom(4)),b=sfxRecipe(k,seededRandom(4));assert.deepEqual(a,b);assert.ok(a.length>0,k);
  for(const p of a){for(const v of[p.f0,p.f1??1,p.atk,p.dur,p.gain,p.fc??1,p.at??0])assert.ok(Number.isFinite(v)&&v>=0,k);assert.ok(p.dur>0&&p.dur<=4&&p.gain<=1,k);assert.ok(['noise','sine','triangle','sawtooth','square'].includes(p.wave));if(p.wave!=='noise')assert.ok(p.f0>=20&&p.f0<=20000,k);}}
 for(const e of['bird','cricket','frog','crackle','creak','thunder','animal','drip','murmurBurst'])for(const biome of['forest','plains','wetland','hills','tundra'])assert.ok(envRecipe(e,biome,7,seededRandom(2)).length>0,e);
 assert.notDeepEqual(sfxRecipe('axe',seededRandom(1)),sfxRecipe('axe',seededRandom(2)),'varied per hit');
 const mixSrc=readFileSync(new URL('../src/scene/audioMix.ts',import.meta.url),'utf8').replace(/\/\*\*[\s\S]*?\*\//g,'');assert.ok(!/Math\.random|AudioContext|fetch\(|\.mp3|\.ogg|\.wav\b/.test(mixSrc),'pure, asset-free');
 const wire=readFileSync(new URL('../src/game/proceduralAudio.ts',import.meta.url),'utf8').replace(/\/\*\*[\s\S]*?\*\//g,'');assert.ok(!/Math\.random|fetch\(|\.mp3|\.ogg|\.wav\b|new Audio\(/.test(wire),'wiring is asset-free and seeded');
});
test('surface, tool and legacy mapping',()=>{
 assert.equal(footstepFor('snow'),'step_snow');assert.equal(footstepFor('unknown'),'step_grass');assert.equal(footstepFor('shallow'),'step_water');
 assert.equal(toolFor('gather','wood'),'axe');assert.equal(toolFor('gather','stone'),'pick');assert.equal(toolFor('gather','food'),'hoe');assert.equal(toolFor('build',null),'hammer');assert.equal(toolFor('idle','wood'),null);
 for(const k of Object.values(LEGACY_SFX))if(k)assert.ok(SFX_SPECS[k]);
});
