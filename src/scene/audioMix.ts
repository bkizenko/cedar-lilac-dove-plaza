/** Procedural audio, pure half (ASTRA-03 / ASTRA-22). Game state -> mix parameters. No WebAudio, no Math.random, no
 *  clock: every function is deterministic for its arguments, so the whole adaptive score, the environment mix, the
 *  spatial maths, the voice budget and the synthesis recipes are testable in node. The WebAudio wiring that plays them
 *  lives in src/game/proceduralAudio.ts and holds no decisions. Asset-free: every sound is a recipe of oscillators and
 *  filtered noise.  Existing recorded-music rules in audioState.ts are untouched; this module reuses its ambientMix. */
import {hashSeed,seededRandom} from './buildingParts';
import {ambientMix,isDay,isNight,type AmbientInput,type Layer} from './audioState';

const clamp=(v:number,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
const r3=(v:number)=>Math.round(v*1000)/1000;

// ---------------------------------------------------------------- settings / buses
export type Bus='master'|'music'|'sfx'|'ambience';
/** Each sub-bus has its own volume and its own on/off switch (musicOff / ambienceOff / sfxOff), kept apart from `muted` (everything) and `musicPaused` (player pause). */
export type AudioSettings={master:number;music:number;sfx:number;ambience:number;muted:boolean;musicPaused:boolean;musicOff:boolean;ambienceOff:boolean;sfxOff:boolean};
export const DEFAULT_AUDIO_SETTINGS:AudioSettings={master:.8,music:.4,sfx:.7,ambience:.6,muted:false,musicPaused:false,musicOff:false,ambienceOff:false,sfxOff:false};
export const BUS_OFF_KEY={music:'musicOff',ambience:'ambienceOff',sfx:'sfxOff'} as const;
export type SubBus=keyof typeof BUS_OFF_KEY;
/** True when this bus is silent: everything muted, or that bus switched off. Master only follows the all-mute. */
export function busOff(s:AudioSettings,bus:Bus):boolean{return s.muted||(bus!=='master'&&s[BUS_OFF_KEY[bus]]);}
export const AUDIO_SETTINGS_KEY='hearthwild.audio.v1';
export function normaliseSettings(raw:unknown):AudioSettings{
 const o=(raw&&typeof raw==='object'?raw:{}) as Record<string,unknown>,d=DEFAULT_AUDIO_SETTINGS;
 const n=(k:Bus)=>typeof o[k]==='number'&&Number.isFinite(o[k] as number)?clamp(o[k] as number):d[k];
 return {master:n('master'),music:n('music'),sfx:n('sfx'),ambience:n('ambience'),muted:typeof o.muted==='boolean'?o.muted:d.muted,musicPaused:typeof o.musicPaused==='boolean'?o.musicPaused:d.musicPaused,
  musicOff:typeof o.musicOff==='boolean'?o.musicOff:d.musicOff,ambienceOff:typeof o.ambienceOff==='boolean'?o.ambienceOff:d.ambienceOff,sfxOff:typeof o.sfxOff==='boolean'?o.sfxOff:d.sfxOff};
}
/** Gain a bus node should hold. Volume curve is quadratic so the slider feels even. */
export function busGain(s:AudioSettings,bus:Bus):number{
 if(busOff(s,bus))return 0;const v=bus==='master'?s.master:s[bus]*s.master;return r3(v*v);
}
/** How far the recorded score ducks under the nature bed: ambience at full lowers music to 45% of its level; ambience off leaves it alone. */
export function musicDuck(ambienceGain:number):number{const a=Math.max(0,Math.min(1,ambienceGain));return r3(1-.55*Math.sqrt(a));}
/** Seconds of silence between recorded pieces: sparse, so the birds, wind and water carry most of the day. */
export const MUSIC_REST_MIN=90,MUSIC_REST_SPAN=120;
export function musicRestSeconds(rand:number):number{return MUSIC_REST_MIN+Math.max(0,Math.min(1,rand))*MUSIC_REST_SPAN;}
export function loadSettings(storage:Pick<Storage,'getItem'>|undefined|null):AudioSettings{
 try{const t=storage?.getItem(AUDIO_SETTINGS_KEY);return normaliseSettings(t?JSON.parse(t):null);}catch{return {...DEFAULT_AUDIO_SETTINGS};}
}
export function saveSettings(storage:Pick<Storage,'setItem'>|undefined|null,s:AudioSettings){try{storage?.setItem(AUDIO_SETTINGS_KEY,JSON.stringify(s));}catch{/* storage is a convenience */}}

// ---------------------------------------------------------------- scales
export type ModeName='ionian'|'lydian'|'mixolydian'|'dorian'|'aeolian'|'phrygian'|'pentatonic'|'minorPentatonic';
export const MODES:Record<ModeName,readonly number[]>={ionian:[0,2,4,5,7,9,11],lydian:[0,2,4,6,7,9,11],mixolydian:[0,2,4,5,7,9,10],dorian:[0,2,3,5,7,9,10],aeolian:[0,2,3,5,7,8,10],phrygian:[0,1,3,5,7,8,10],pentatonic:[0,2,4,7,9],minorPentatonic:[0,3,5,7,10]};
export type Scale={root:number;mode:ModeName;intervals:readonly number[]};
const SEASON_MODES:Record<string,readonly ModeName[]>={Spring:['lydian','pentatonic','ionian'],Summer:['mixolydian','ionian','pentatonic'],Autumn:['dorian','mixolydian','minorPentatonic'],Winter:['aeolian','phrygian','minorPentatonic']};
/** Seeded key and mode: season picks the mood, era nudges the register, the world seed picks the root. Stable per (seed,season,age). */
export function pickScale(seed:number,season:string,age:number,mourning=false):Scale{
 const r=seededRandom(hashSeed(seed,'scale',season,age)),pool=mourning?(['aeolian','phrygian'] as const):SEASON_MODES[season]??SEASON_MODES.Spring;
 const mode=pool[Math.floor(r()*pool.length)%pool.length];
 const rootPc=[2,4,7,9,0,5][Math.floor(hashSeed(seed,'root')%6)];// world key, constant for the whole game
 return {root:48+rootPc+(age>=3?-2:0),mode,intervals:MODES[mode]};
}
export const midiToHz=(m:number)=>440*Math.pow(2,(m-69)/12);
/** Scale degree (may be negative or beyond an octave) -> midi. */
export function degreeToMidi(scale:Scale,degree:number,octave=0):number{
 const n=scale.intervals.length,o=Math.floor(degree/n),i=((degree%n)+n)%n;return scale.root+scale.intervals[i]+12*(o+octave);
}

// ---------------------------------------------------------------- adaptive score
export type ScoreLayer='drone'|'lute'|'drum'|'flute'|'strings'|'horn'|'bells';
export const SCORE_LAYERS:readonly ScoreLayer[]=['drone','lute','drum','flute','strings','horn','bells'];
export type ScoreInput={mood:'peace'|'raid'|'pillage';hour:number;season:string;age:number;/** 0..1 share of people at work */work:number;tradeActive?:boolean;
 /** 0..1 decaying envelopes the engine feeds after ruler events */mourning?:number;ceremony?:number;seed:number};
export type ScoreMix={gains:Record<ScoreLayer,number>;/** beats per minute */bpm:number;/** 0 dark..1 bright: filter openness */brightness:number;scale:Scale;danger:number;night:number};
export function scoreMix(i:ScoreInput):ScoreMix{
 const h=((i.hour%24)+24)%24,night=isNight(h)?1:isDay(h)?0:.5,danger=i.mood==='raid'?1:i.mood==='pillage'?.8:0,mourn=clamp(i.mourning??0),cer=clamp(i.ceremony??0),work=clamp(i.work),age=Math.max(0,Math.floor(i.age));
 const peace=(1-danger)*(1-mourn*.8),winter=i.season==='Winter'?1:0,trade=i.tradeActive?.25:0;
 const g:Record<ScoreLayer,number>={
  drone:.35+.35*night+.25*danger+.2*mourn,
  lute:peace*(.45+.3*work+trade)*(1-.55*night)*(1-.3*winter),
  drum:clamp(danger*.9+work*.25*(1-night)*peace+(age>=2?.05:0)),
  flute:peace*(.55-.45*night)*(1-.4*work)*(i.season==='Spring'?1.2:1)+mourn*.25,
  strings:(age>=2?.2+.1*(age-2):0)*(.6+.4*night)+mourn*.4+danger*.2,
  horn:(age>=1?danger*.5:0)+cer*.7,
  bells:cer*.8+mourn*.3+(i.season==='Winter'&&night?.12:0),
 };
 for(const l of SCORE_LAYERS)g[l]=r3(clamp(g[l]));
 const bpm=Math.round(clamp(66+22*danger+14*work*peace-12*mourn-8*night-4*winter+(age>=3?4:0),48,112));
 return {gains:g,bpm,brightness:r3(clamp(.55+.3*(1-night)-.25*mourn-.15*winter+.15*danger)),scale:pickScale(i.seed,i.season,age,mourn>.3),danger,night};
}
/** Frame-rate independent smoothing; layers fade in slowly and out a bit faster, danger layers react fast. No pops. */
export const SCORE_TAU:Record<ScoreLayer,{up:number;down:number}>={drone:{up:6,down:8},lute:{up:5,down:4},drum:{up:1.2,down:5},flute:{up:6,down:4},strings:{up:7,down:8},horn:{up:1,down:5},bells:{up:.6,down:3}};
export class ScoreSmoother{
 gains=Object.fromEntries(SCORE_LAYERS.map(l=>[l,0])) as Record<ScoreLayer,number>;bpm=76;brightness=.5;
 step(t:ScoreMix,dt:number){
  const d=Math.max(0,Math.min(dt,2));
  for(const l of SCORE_LAYERS){const tau=t.gains[l]>this.gains[l]?SCORE_TAU[l].up:SCORE_TAU[l].down;this.gains[l]+=(t.gains[l]-this.gains[l])*(1-Math.exp(-d/tau));}
  this.bpm+=(t.bpm-this.bpm)*(1-Math.exp(-d/8));this.brightness+=(t.brightness-this.brightness)*(1-Math.exp(-d/5));
  return this;
 }
}
export type Note={beat:number;midi:number;dur:number;vel:number};
const RHYTHMS:Record<ScoreLayer,readonly (readonly number[])[]>={
 drone:[[0]],
 lute:[[0,1,2,3],[0,.5,1.5,2,3],[0,1,1.5,2.5,3],[0,.75,1.5,2,3.5],[0,2],[0,1.5,2,3]],
 drum:[[0,2,3],[0,1.5,2,3.5],[0,0.5,2,2.5,3],[0,1,2,3],[0,2,2.5,3,3.5]],
 flute:[[0],[0,1.5],[0.5,2],[0,2.5],[1,2,3]],
 strings:[[0],[0,2]],
 horn:[[0],[0,2]],
 bells:[[0],[0,1.5],[0,2]],
};
/** One 4-beat bar of one layer. Deterministic in (seed,layer,bar). A section is 8 bars sharing a motif; each bar varies it,
 *  and the section index is part of the seed, so the music never loops exactly yet always sounds related. */
export function barNotes(seed:number,layer:ScoreLayer,bar:number,scale:Scale,danger=0):Note[]{
 const section=Math.floor(bar/8),rs=seededRandom(hashSeed(seed,'sec',layer,section)),rb=seededRandom(hashSeed(seed,'bar',layer,bar));
 const motif=[0,1,2,3].map(()=>Math.floor(rs()*5)-1);
 const chordRoot=[0,0,3,4,0,5,3,4][((bar%8)+8)%8]-0;
 if(layer==='drone')return [{beat:0,midi:degreeToMidi(scale,0,-1),dur:4,vel:1},{beat:0,midi:degreeToMidi(scale,4,-1),dur:4,vel:.55}];
 if(layer==='strings'||layer==='horn'){if(bar%2)return [];const d=layer==='horn'?[0,4,2][(bar>>1)%3]:chordRoot;return [{beat:0,midi:degreeToMidi(scale,d,layer==='horn'?-1:0),dur:layer==='horn'?3:8,vel:.8},...(layer==='strings'?[{beat:0,midi:degreeToMidi(scale,d+2,0),dur:8,vel:.6}]:[])];}
 const pat=RHYTHMS[layer][Math.floor(rb()*RHYTHMS[layer].length)%RHYTHMS[layer].length],out:Note[]=[];
 let deg=chordRoot+motif[0];
 for(let k=0;k<pat.length;k++){
  const beat=pat[k],next=pat[k+1]??4;
  if(layer==='drum'){out.push({beat,midi:beat%1?72:(k===0?48:55),dur:.25,vel:r3(clamp((beat%2===0?.9:.6)*(.7+.3*danger)+rb()*.1,.2,1))});continue;}
  if(layer==='bells'){out.push({beat,midi:degreeToMidi(scale,chordRoot+[0,2,4,7][Math.floor(rb()*4)],1),dur:3,vel:r3(.5+rb()*.3)});continue;}
  const step=layer==='flute'?(rb()<.6?motif[k%4]-motif[(k+3)%4]:Math.floor(rb()*5)-2):[0,2,4,2][k%4]-(rb()<.3?1:0);
  deg=layer==='lute'?chordRoot+[0,2,4,7,4,2][(k+bar)%6]+(rb()<.2?1:0):deg+(step===0?1:step);
  const oct=layer==='flute'?1:0;
  if(layer==='flute'&&rb()<.12)continue;// breath rests
  out.push({beat,midi:degreeToMidi(scale,deg,oct),dur:r3(Math.min(layer==='flute'?3:1.6,next-beat+(layer==='flute'?.5:.2))),vel:r3(clamp(.55+rb()*.35,.3,1))});
 }
 return out;
}
/** Beat clock with a smoothly changing tempo: returns the bars whose start falls inside the lookahead window. */
export class BarClock{
 bar=0;nextStart:number|null=null;
 advance(now:number,lookahead:number,bpm:number):{bar:number;start:number;beatSec:number}[]{
  const beatSec=60/clamp(bpm,40,140),out:{bar:number;start:number;beatSec:number}[]=[];
  if(this.nextStart===null||this.nextStart<now-1)this.nextStart=now+.1;// resume after a pause without a burst of stale bars
  while(this.nextStart<now+lookahead&&out.length<4){out.push({bar:this.bar,start:this.nextStart,beatSec});this.nextStart+=beatSec*4;this.bar++;}
  return out;
 }
}

// ---------------------------------------------------------------- environment mix
export type EnvLayer=Layer|'storm'|'mill'|'livestock'|'crowd';
export const ENV_LAYERS:readonly EnvLayer[]=['wind','birds','crickets','frogs','insects','surf','rain','river','fire','murmur','snowHush','storm','mill','livestock','crowd'];
export type EnvInput=AmbientInput&{/** metres to the nearest running watermill; undefined = none */millDistance?:number;livestock?:number;/** people crowded together (market, muster) */crowd?:number};
export function envMix(a:EnvInput):Record<EnvLayer,number>{
 const base=ambientMix(a),out=Object.fromEntries(ENV_LAYERS.map(l=>[l,0])) as Record<EnvLayer,number>;
 for(const l of Object.keys(base) as Layer[])out[l]=base[l];
 const near=(d:number|undefined,r:number)=>d===undefined||!Number.isFinite(d)?0:clamp(1-d/r);
 out.storm=a.weather==='storm'?1:0;out.mill=r3(near(a.millDistance,40)*.8*(a.indoors?.5:1));
 out.livestock=r3(clamp((a.livestock??0)/12)*.5*(isDay(((a.hour%24)+24)%24)?1:.3));
 out.crowd=r3(clamp((a.crowd??0)/25)*.7);
 return out;
}
export const smoothEnv=(cur:Record<EnvLayer,number>,target:Record<EnvLayer,number>,dt:number,tau=2.5)=>{const k=1-Math.exp(-Math.max(0,Math.min(dt,2))/tau);for(const l of ENV_LAYERS)cur[l]+=(target[l]-cur[l])*k;return cur;};
/** Bird voice by biome and time of day: pitch band (Hz), chirps per call, base calls per second at gain 1. */
export function birdVoice(biome:string,hour:number){
 const h=((hour%24)+24)%24,dawn=h>=4.5&&h<8,rate=(dawn?1.6:isDay(h)?.7:.2);
 const band=biome==='forest'?[2200,4200]:biome==='wetland'?[1500,3200]:biome==='hills'?[1800,3000]:biome==='tundra'?[1400,2400]:[2600,5000];
 return {lo:band[0],hi:band[1],chirps:biome==='forest'?3:biome==='wetland'?2:dawn?4:2,rate};
}
/** Poisson-ish scheduling of one-shot ambient events from layer gains; pure given the rng. */
export type EnvEvent={kind:'bird'|'cricket'|'frog'|'crackle'|'creak'|'thunder'|'animal'|'drip'|'murmurBurst';delay:number;gain:number};
const RATES:Partial<Record<EnvLayer,[EnvEvent['kind'],number]>>={birds:['bird',.5],crickets:['cricket',.8],frogs:['frog',.5],fire:['crackle',5],mill:['creak',.9],storm:['thunder',.06],livestock:['animal',.12],crowd:['murmurBurst',.3]};
export function envEvents(gains:Record<EnvLayer,number>,dt:number,rng:()=>number,cap=6):EnvEvent[]{
 const out:EnvEvent[]=[];
 for(const l of ENV_LAYERS){const spec=RATES[l];if(!spec||gains[l]<.02)continue;
  const lam=spec[1]*gains[l]*dt;let n=Math.floor(lam);if(rng()<lam-n)n++;
  for(let i=0;i<Math.min(n,3)&&out.length<cap;i++)out.push({kind:spec[0],delay:r3(rng()*dt),gain:r3(gains[l])});}
 return out;
}

// ---------------------------------------------------------------- spatial
export type SpatialCfg={ref:number;max:number;rolloff:number};
/** Inverse-ish distance law clamped to zero at max (so far emitters cost nothing and are culled). */
export function attenuation(dist:number,c:SpatialCfg):number{
 if(!(dist>=0))return 0;if(dist>=c.max)return 0;const d=Math.max(dist,c.ref);
 const base=c.ref/(c.ref+c.rolloff*(d-c.ref)),fade=clamp((c.max-dist)/(c.max*.25));return r3(base*fade);
}
/** Stereo pan -1..1 for an emitter at (dx,dz) relative to the camera look point, given camera yaw (radians). Right-hand screen axis. */
export function panFor(dx:number,dz:number,yaw:number,spread=18):number{
 const rx=Math.cos(yaw)*dx-Math.sin(yaw)*dz;return r3(clamp(rx/(Math.hypot(dx,dz)+spread)*1.4,-1,1));
}
/** Zooming the camera out thins close-up sounds; ambience is unaffected. camDist ~ orbit distance in world units. */
export const zoomFactor=(camDist:number)=>r3(clamp(1.15-camDist/160,.25,1));
export function emitterGain(dx:number,dz:number,cfg:SpatialCfg,camDist:number,yaw:number){
 const dist=Math.hypot(dx,dz);return {gain:r3(attenuation(dist,cfg)*zoomFactor(camDist)),pan:panFor(dx,dz,yaw),dist};
}

// ---------------------------------------------------------------- sfx catalogue and voice budget
export type SfxKind='axe'|'hammer'|'saw'|'hoe'|'pick'|'step_grass'|'step_dirt'|'step_stone'|'step_wood'|'step_sand'|'step_snow'|'step_water'|'sheep'|'cow'|'horse'|'dog'|'hen'|'crowd'|'clash'|'horn'|'creak'|'splash'|'click'|'bell'|'thunder';
export type SfxSpec={priority:number;cooldown:number;maxVoices:number;spatial:SpatialCfg;gain:number};
const S=(ref:number,max:number,rolloff=1):SpatialCfg=>({ref,max,rolloff});
export const SFX_SPECS:Record<SfxKind,SfxSpec>={
 axe:{priority:5,cooldown:.35,maxVoices:3,spatial:S(6,70),gain:.8},hammer:{priority:5,cooldown:.3,maxVoices:3,spatial:S(6,70),gain:.8},saw:{priority:4,cooldown:.5,maxVoices:2,spatial:S(6,60),gain:.6},
 hoe:{priority:3,cooldown:.5,maxVoices:2,spatial:S(5,50),gain:.6},pick:{priority:5,cooldown:.35,maxVoices:3,spatial:S(6,70),gain:.8},
 step_grass:{priority:1,cooldown:.18,maxVoices:3,spatial:S(3,25,1.4),gain:.35},step_dirt:{priority:1,cooldown:.18,maxVoices:3,spatial:S(3,25,1.4),gain:.4},step_stone:{priority:1,cooldown:.18,maxVoices:3,spatial:S(3,25,1.4),gain:.45},
 step_wood:{priority:1,cooldown:.18,maxVoices:3,spatial:S(3,25,1.4),gain:.45},step_sand:{priority:1,cooldown:.18,maxVoices:3,spatial:S(3,25,1.4),gain:.3},step_snow:{priority:1,cooldown:.18,maxVoices:3,spatial:S(3,25,1.4),gain:.35},step_water:{priority:2,cooldown:.2,maxVoices:3,spatial:S(3,30,1.2),gain:.45},
 sheep:{priority:2,cooldown:2.5,maxVoices:2,spatial:S(8,80),gain:.6},cow:{priority:2,cooldown:4,maxVoices:1,spatial:S(10,90),gain:.7},horse:{priority:3,cooldown:3,maxVoices:1,spatial:S(10,90),gain:.7},dog:{priority:3,cooldown:1.5,maxVoices:2,spatial:S(8,90),gain:.7},hen:{priority:2,cooldown:2,maxVoices:2,spatial:S(5,50),gain:.5},
 crowd:{priority:3,cooldown:3,maxVoices:1,spatial:S(12,120),gain:.7},clash:{priority:7,cooldown:.12,maxVoices:5,spatial:S(10,140),gain:1},horn:{priority:9,cooldown:3,maxVoices:1,spatial:S(40,400,.3),gain:.9},
 creak:{priority:3,cooldown:1.2,maxVoices:1,spatial:S(6,50),gain:.6},splash:{priority:2,cooldown:.3,maxVoices:2,spatial:S(5,50),gain:.6},click:{priority:10,cooldown:.03,maxVoices:2,spatial:S(1,1e9,0),gain:.4},bell:{priority:8,cooldown:.5,maxVoices:2,spatial:S(30,300,.3),gain:.8},thunder:{priority:8,cooldown:5,maxVoices:1,spatial:S(1,1e9,0),gain:.9},
};
export const SURFACE_STEP:Record<string,SfxKind>={grass:'step_grass',meadow:'step_grass',forest:'step_dirt',dirt:'step_dirt',path:'step_dirt',road:'step_stone',stone:'step_stone',rock:'step_stone',floor:'step_wood',wood:'step_wood',sand:'step_sand',beach:'step_sand',snow:'step_snow',shallow:'step_water',water:'step_water',mud:'step_water'};
export const footstepFor=(surface:string):SfxKind=>SURFACE_STEP[surface]??'step_grass';
/** Maps the sim's existing onSfx names to procedural kinds (null = leave to the legacy cue). */
export const LEGACY_SFX:Record<string,SfxKind|null>={chop:'axe',hammer:'hammer',hit:'clash',pillage:'clash',horn:'horn',splash:'splash',click:'click',thunder:'thunder',fish:'splash',rustle:'step_grass'};
export const toolFor=(order:string,job:string|null|undefined):SfxKind|null=>order==='build'?'hammer':order==='gather'?(job==='wood'?'axe':job==='stone'||job==='copper'||job==='iron'?'pick':job==='food'?'hoe':null):null;

/** Polyphony limiter. Per-kind cooldown and cap, global cap, and priority*gain eviction so a battle never starves the horn. */
export class VoiceBudget{
 private voices=new Map<number,{kind:SfxKind;score:number}>();private lastAt=new Map<SfxKind,number>();private nextId=1;
 readonly max:number;constructor(max=20){this.max=max;}
 get active(){return this.voices.size;}
 acquire(kind:SfxKind,gain:number,now:number):{id:number;evicted:number[]}|null{
  const spec=SFX_SPECS[kind],score=spec.priority*Math.max(gain,.001);
  if(gain<.01)return null;
  const last=this.lastAt.get(kind);if(last!==undefined&&now-last<spec.cooldown)return null;
  const evicted:number[]=[],same=[...this.voices].filter(([,v])=>v.kind===kind);
  const weakest=(list:[number,{kind:SfxKind;score:number}][])=>list.reduce((a,b)=>b[1].score<a[1].score?b:a);
  if(same.length>=spec.maxVoices){const w=weakest(same);if(w[1].score>=score)return null;this.voices.delete(w[0]);evicted.push(w[0]);}
  if(this.voices.size>=this.max){const w=weakest([...this.voices]);if(w[1].score>=score)return null;this.voices.delete(w[0]);evicted.push(w[0]);}
  const id=this.nextId++;this.voices.set(id,{kind,score});this.lastAt.set(kind,now);return {id,evicted};
 }
 release(id:number){this.voices.delete(id);}
}

// ---------------------------------------------------------------- synthesis recipes (data; the wiring plays them)
export type Wave='noise'|'sine'|'triangle'|'sawtooth'|'square';
export type Partial_={wave:Wave;f0:number;f1?:number;filter?:'lowpass'|'bandpass'|'highpass';fc?:number;fc1?:number;q?:number;atk:number;dur:number;gain:number;am?:{hz:number;depth:number};vib?:{hz:number;cents:number};at?:number};
export type Recipe=Partial_[];
const jit=(r:()=>number,v:number)=>1+(r()*2-1)*v;
const P=(p:Partial_):Partial_=>p;
const click=(r:()=>number,fc:number,g:number):Partial_=>P({wave:'noise',f0:0,filter:'bandpass',fc:fc*jit(r,.15),q:1.2,atk:.002,dur:.05,gain:g});
const thump=(r:()=>number,f:number,d:number,g:number):Partial_=>P({wave:'sine',f0:f*jit(r,.06),f1:f*.55,atk:.003,dur:d,gain:g});
/** Deterministic given the rng. Every kind returns a short list of partials. */
export function sfxRecipe(kind:SfxKind,r:()=>number):Recipe{
 const step=(fc:number,dur:number,g:number,low=90):Recipe=>[P({wave:'noise',f0:0,filter:'lowpass',fc:fc*jit(r,.2),q:.7,atk:.006,dur,gain:g}),thump(r,low,dur*.8,g*.5)];
 switch(kind){
  case 'axe':return [click(r,1400,.9),thump(r,120,.14,.8),P({wave:'noise',f0:0,filter:'lowpass',fc:500,atk:.01,dur:.22,gain:.25,at:.03})];
  case 'hammer':return [click(r,2200,.7),P({wave:'sine',f0:820*jit(r,.1),atk:.001,dur:.35,gain:.35}),P({wave:'sine',f0:1310*jit(r,.1),atk:.001,dur:.22,gain:.2}),thump(r,150,.08,.5)];
  case 'pick':return [click(r,3000,.8),P({wave:'triangle',f0:1900*jit(r,.1),f1:1500,atk:.001,dur:.15,gain:.25}),thump(r,200,.07,.4)];
  case 'saw':return [P({wave:'noise',f0:0,filter:'bandpass',fc:2600*jit(r,.1),fc1:1800,q:2,atk:.08,dur:.45,gain:.5,am:{hz:38,depth:.5}}),P({wave:'sawtooth',f0:260*jit(r,.05),f1:210,filter:'lowpass',fc:900,atk:.08,dur:.45,gain:.08})];
  case 'hoe':return [thump(r,95,.16,.8),P({wave:'noise',f0:0,filter:'lowpass',fc:900,atk:.01,dur:.25,gain:.4})];
  case 'step_grass':return step(1500,.07,.5,80);case 'step_dirt':return step(1000,.07,.6,100);case 'step_stone':return [click(r,2600,.6),...step(1800,.05,.3,140)];
  case 'step_wood':return [click(r,1600,.5),thump(r,170,.09,.7)];case 'step_sand':return step(2400,.12,.35,60);case 'step_snow':return step(3000,.14,.4,70);
  case 'step_water':return [P({wave:'noise',f0:0,filter:'bandpass',fc:1400*jit(r,.2),q:1.5,atk:.01,dur:.14,gain:.6}),P({wave:'sine',f0:500*jit(r,.2),f1:900,atk:.01,dur:.1,gain:.15})];
  case 'splash':return [P({wave:'noise',f0:0,filter:'bandpass',fc:1800,fc1:900,q:.8,atk:.01,dur:.3,gain:.7}),P({wave:'sine',f0:420*jit(r,.2),f1:760,atk:.005,dur:.12,gain:.2})];
  case 'sheep':{const f=400*jit(r,.15);return [P({wave:'sawtooth',f0:f,f1:f*.85,filter:'bandpass',fc:1100,q:4,atk:.03,dur:.5,gain:.35,am:{hz:28,depth:.6},vib:{hz:9,cents:60}})];}
  case 'cow':{const f=105*jit(r,.1);return [P({wave:'sawtooth',f0:f,f1:f*.8,filter:'lowpass',fc:520,q:2,atk:.12,dur:1.1,gain:.5,vib:{hz:5,cents:25}})];}
  case 'horse':return [P({wave:'sawtooth',f0:420*jit(r,.1),f1:900,filter:'bandpass',fc:1300,q:2.5,atk:.04,dur:.35,gain:.3,vib:{hz:14,cents:70}}),P({wave:'sawtooth',f0:900,f1:300,filter:'bandpass',fc:1500,q:2.5,atk:.01,dur:.55,gain:.3,at:.35,vib:{hz:12,cents:60}})];
  case 'dog':return [P({wave:'sawtooth',f0:300*jit(r,.1),f1:170,filter:'bandpass',fc:800,q:2,atk:.005,dur:.16,gain:.5}),P({wave:'noise',f0:0,filter:'bandpass',fc:1400,q:1,atk:.005,dur:.1,gain:.2}),P({wave:'sawtooth',f0:280*jit(r,.1),f1:160,filter:'bandpass',fc:800,q:2,atk:.005,dur:.16,gain:.45,at:.24})];
  case 'hen':return [0,.11,.22].map(t=>P({wave:'square',f0:(700+r()*200),f1:500,filter:'bandpass',fc:1500,q:3,atk:.004,dur:.08,gain:.18,at:t}));
  case 'crowd':return [P({wave:'noise',f0:0,filter:'bandpass',fc:650,fc1:900,q:.9,atk:.4,dur:1.8,gain:.5,am:{hz:3.5,depth:.5}}),P({wave:'sawtooth',f0:170*jit(r,.2),f1:200,filter:'bandpass',fc:700,q:2,atk:.4,dur:1.6,gain:.06,vib:{hz:5,cents:80}})];
  case 'clash':return [P({wave:'noise',f0:0,filter:'highpass',fc:2500,atk:.001,dur:.18,gain:.7}),P({wave:'sine',f0:1650*jit(r,.08),atk:.001,dur:.5,gain:.2}),P({wave:'sine',f0:2480*jit(r,.08),atk:.001,dur:.35,gain:.15}),thump(r,110,.1,.5)];
  case 'horn':return [P({wave:'sawtooth',f0:174,filter:'lowpass',fc:700,q:1,atk:.25,dur:1.8,gain:.35,vib:{hz:5,cents:12}}),P({wave:'sawtooth',f0:261,filter:'lowpass',fc:800,atk:.3,dur:1.6,gain:.2,at:.1})];
  case 'creak':return [P({wave:'sawtooth',f0:140*jit(r,.1),f1:210,filter:'bandpass',fc:600,fc1:900,q:6,atk:.15,dur:.8,gain:.22,am:{hz:17,depth:.7}})];
  case 'click':return [P({wave:'sine',f0:480*jit(r,.06),atk:.002,dur:.05,gain:.3})];
  case 'bell':return [1,2.76,5.4].map((m,i)=>P({wave:'sine',f0:520*m*jit(r,.01),atk:.002,dur:2.4/(i+1),gain:.3/(i+1)}));
  case 'thunder':return [P({wave:'noise',f0:0,filter:'lowpass',fc:260,fc1:90,q:.7,atk:.2,dur:3.2,gain:.9,am:{hz:2.2,depth:.5}})];
 }
}
/** Ambient one-shots (birds etc.) as recipes. */
export function envRecipe(e:EnvEvent['kind'],biome:string,hour:number,r:()=>number):Recipe{
 switch(e){
  case 'bird':{const v=birdVoice(biome,hour),f=v.lo+(v.hi-v.lo)*r(),out:Recipe=[];for(let i=0;i<v.chirps;i++){const up=r()<.5,t=i*(.09+r()*.05);out.push(P({wave:'sine',f0:f*(up?.85:1.1),f1:f*(up?1.15:.8),atk:.008,dur:.07+r()*.05,gain:.22,at:t}));}return out;}
  case 'cricket':{const f=4200+r()*600;return [0,1,2,3].map(i=>P({wave:'sine',f0:f,atk:.004,dur:.035,gain:.1,at:i*.06}));}
  case 'frog':return [P({wave:'square',f0:180+r()*60,f1:140,filter:'lowpass',fc:500,q:3,atk:.01,dur:.14,gain:.25,am:{hz:30,depth:.6}})];
  case 'crackle':return [P({wave:'noise',f0:0,filter:'highpass',fc:2400+r()*3000,atk:.001,dur:.012+r()*.02,gain:.25+r()*.25})];
  case 'creak':return sfxRecipe('creak',r);
  case 'thunder':return sfxRecipe('thunder',r);
  case 'animal':return sfxRecipe((['sheep','cow','hen','dog','horse'] as const)[Math.floor(r()*5)%5],r);
  case 'drip':return [P({wave:'sine',f0:1200+r()*600,f1:700,atk:.002,dur:.06,gain:.12})];
  case 'murmurBurst':return sfxRecipe('crowd',r);
 }
}
/** Continuous bed parameters per layer for the wiring: filter band and level at gain 1. */
export const BED_PARAMS:Partial<Record<EnvLayer,{filter:'lowpass'|'bandpass'|'highpass';fc:number;q:number;level:number;lfoHz:number;lfoDepth:number}>>={
 wind:{filter:'bandpass',fc:420,q:.6,level:.5,lfoHz:.11,lfoDepth:.5},rain:{filter:'highpass',fc:1800,q:.5,level:.35,lfoHz:.3,lfoDepth:.1},river:{filter:'bandpass',fc:900,q:.5,level:.4,lfoHz:.4,lfoDepth:.25},
 surf:{filter:'lowpass',fc:700,q:.5,level:.5,lfoHz:.09,lfoDepth:.8},fire:{filter:'lowpass',fc:380,q:.6,level:.3,lfoHz:.7,lfoDepth:.3},murmur:{filter:'bandpass',fc:520,q:.8,level:.22,lfoHz:.5,lfoDepth:.4},
 snowHush:{filter:'highpass',fc:3500,q:.4,level:.06,lfoHz:.05,lfoDepth:.2},insects:{filter:'bandpass',fc:5200,q:2,level:.05,lfoHz:.2,lfoDepth:.3},storm:{filter:'lowpass',fc:300,q:.5,level:.35,lfoHz:.07,lfoDepth:.5},
};
