/** Procedural audio, thin WebAudio wiring (ASTRA-03 / ASTRA-22). All decisions (layer gains, scales, notes, event rates,
 *  spatial gains, voice budget, synthesis recipes) come from the pure src/scene/audioMix.ts; this file only turns those
 *  numbers into oscillators, filtered noise and gain ramps. No downloads, no Math.random. Starts only after the owner
 *  calls attach() from a user gesture (GameAudio.unlock). */
import {seededRandom,hashSeed} from '../scene/buildingParts';
import {SCORE_LAYERS,ENV_LAYERS,BED_PARAMS,SFX_SPECS,VoiceBudget,BarClock,ScoreSmoother,barNotes,scoreMix,envMix,envEvents,envRecipe,sfxRecipe,smoothEnv,emitterGain,busGain,midiToHz,
 DEFAULT_AUDIO_SETTINGS,type AudioSettings,type ScoreInput,type EnvInput,type EnvLayer,type ScoreLayer,type SfxKind,type Recipe,type Note,type Scale} from '../scene/audioMix';

export type Emitter={kind:SfxKind;x:number;z:number};
export type WorldAudio={score:ScoreInput;env:EnvInput;biome:string;listener:{x:number;z:number;yaw:number;dist:number};emitters:Emitter[];paused:boolean};
const LOOKAHEAD=.7;

export class ProceduralAudio{
 ctx:AudioContext|null=null;active=false;
 private buses:{master:GainNode;music:GainNode;sfx:GainNode;amb:GainNode}|null=null;
 private layerGain=new Map<ScoreLayer,GainNode>();private beds=new Map<EnvLayer,{gain:GainNode;level:number}>();
 private noise:AudioBuffer|null=null;private rng=seededRandom(0x5eed);private budget=new VoiceBudget(20);
 private smoother=new ScoreSmoother();private clock=new BarClock();private env=Object.fromEntries(ENV_LAYERS.map(l=>[l,0])) as Record<EnvLayer,number>;
 private settings:AudioSettings={...DEFAULT_AUDIO_SETTINGS};private mourning=0;private ceremony=0;private seed=1;private lastPaused=false;private brightness=.5;
 private filterByLayer=new Map<ScoreLayer,BiquadFilterNode>();

 /** Call once from a user gesture with the shared context and its destination node. */
 attach(ctx:AudioContext,dest:AudioNode,seed=1){
  if(this.ctx)return;this.ctx=ctx;this.seed=seed;this.rng=seededRandom(hashSeed(seed,'audio'));
  const mk=()=>{const g=ctx.createGain();return g;};
  const master=mk(),music=mk(),sfx=mk(),amb=mk();music.connect(master);sfx.connect(master);amb.connect(master);master.connect(dest);
  this.buses={master,music,sfx,amb};this.noise=this.makeNoise(ctx);this.buildReverb(ctx,music);
  for(const l of SCORE_LAYERS){const g=ctx.createGain(),f=ctx.createBiquadFilter();g.gain.value=0;f.type='lowpass';f.frequency.value=3000;f.connect(g);g.connect(music);this.layerGain.set(l,g);this.filterByLayer.set(l,f);}
  this.active=true;this.applySettings();
 }
 setSettings(s:AudioSettings){this.settings=s;this.applySettings();}
 private applySettings(){
  if(!this.ctx||!this.buses)return;const t=this.ctx.currentTime,b=this.buses,s=this.settings;
  // master carries mute and master; each bus is its own slider (busGain already multiplies master for sub-buses, so master node stays at 1 unless muted)
  b.master.gain.setTargetAtTime(s.muted?0:1,t,.05);
  b.music.gain.setTargetAtTime(busGain(s,'music'),t,.1);b.sfx.gain.setTargetAtTime(busGain(s,'sfx'),t,.05);b.amb.gain.setTargetAtTime(busGain(s,'ambience'),t,.2);
 }
 /** Ruler events: mourning darkens the score for ~50 s, a rise or succession rings bells and horn for ~25 s. */
 rulerEvent(tone:'mourning'|'rise'){if(tone==='mourning')this.mourning=1;else this.ceremony=1;if(this.ctx&&this.active)this.playSfx(tone==='mourning'?'bell':'horn');}

 update(dt:number,w:WorldAudio){
  const ctx=this.ctx,b=this.buses;if(!ctx||!b||!this.active)return;
  if(w.paused!==this.lastPaused||(w.paused&&ctx.state==='running')||(!w.paused&&ctx.state==='suspended'&&!document.hidden)){this.lastPaused=w.paused;if(w.paused)void ctx.suspend();else void ctx.resume();}
  if(w.paused||ctx.state!=='running')return;
  this.seed=w.score.seed;this.mourning=Math.max(0,this.mourning-dt/50);this.ceremony=Math.max(0,this.ceremony-dt/25);
  const mix=scoreMix({...w.score,mourning:this.mourning,ceremony:this.ceremony});
  this.smoother.step(mix,dt);const t=ctx.currentTime;
  for(const l of SCORE_LAYERS)this.layerGain.get(l)!.gain.setTargetAtTime(this.smoother.gains[l]*.5,t,.25);
  this.brightness=this.smoother.brightness;for(const f of this.filterByLayer.values())f.frequency.setTargetAtTime(700+this.brightness*4200,t,.5);
  if(this.settings.music>0&&!this.settings.muted)this.scheduleScore(mix.scale,mix.danger);
  smoothEnv(this.env,envMix(w.env),dt);this.updateBeds(t);
  if(!this.settings.muted&&this.settings.ambience>0)for(const e of envEvents(this.env,dt,this.rng)){
   const rec=envRecipe(e.kind,w.biome,w.env.hour,this.rng);
   this.play(rec,b.amb,t+e.delay,e.gain*(e.kind==='crackle'?.8:1),(this.rng()-.5)*(e.kind==='thunder'?0:1.2));
  }
  if(!this.settings.muted)this.updateEmitters(dt,w);
 }
 private updateEmitters(dt:number,w:WorldAudio){
  const L=w.listener;
  for(const e of w.emitters){const spec=SFX_SPECS[e.kind];if(this.rng()>dt/Math.max(.2,spec.cooldown*1.4))continue;this.playSfx(e.kind,e.x-L.x,e.z-L.z,L.dist,L.yaw);}
 }
 /** Play a sound kind. dx,dz are metres relative to the listener (omit for a non-positional cue). */
 playSfx(kind:SfxKind,dx?:number,dz?:number,camDist=0,yaw=0){
  const ctx=this.ctx,b=this.buses;if(!ctx||!b||!this.active||ctx.state!=='running'||this.settings.muted)return;
  const spec=SFX_SPECS[kind],pos=dx!==undefined&&dz!==undefined,sp=pos?emitterGain(dx!,dz!,spec.spatial,camDist,yaw):{gain:1,pan:0,dist:0};
  const g=sp.gain*spec.gain,v=this.budget.acquire(kind,g,ctx.currentTime);if(!v)return;
  const rec=sfxRecipe(kind,this.rng),end=this.play(rec,b.sfx,ctx.currentTime,g,sp.pan);
  globalThis.setTimeout(()=>this.budget.release(v.id),Math.max(50,(end-ctx.currentTime)*1000));
 }

 // ---- score
 private scheduleScore(scale:Scale,danger:number){
  const ctx=this.ctx!;
  for(const bar of this.clock.advance(ctx.currentTime,LOOKAHEAD,this.smoother.bpm))for(const l of SCORE_LAYERS){
   if(this.smoother.gains[l]<.02)continue;
   for(const n of barNotes(this.seed,l,bar.bar,scale,danger))this.playNote(l,n,bar.start+n.beat*bar.beatSec,bar.beatSec);
  }
 }
 private playNote(layer:ScoreLayer,n:Note,at:number,beat:number){
  const dest=this.filterByLayer.get(layer)!,f=midiToHz(n.midi),dur=Math.max(.1,n.dur*beat),v=n.vel;
  const rec:Recipe=layer==='lute'?[{wave:'triangle',f0:f,atk:.004,dur:Math.min(dur+.6,2.2),gain:.5*v},{wave:'sawtooth',f0:f*2,filter:'lowpass',fc:2400,atk:.002,dur:.35,gain:.12*v},{wave:'noise',f0:0,filter:'bandpass',fc:f*3,q:2,atk:.001,dur:.03,gain:.15*v}]
   :layer==='flute'?[{wave:'sine',f0:f,atk:.09,dur:dur+.3,gain:.5*v,vib:{hz:5.2,cents:14}},{wave:'sine',f0:f*2,atk:.12,dur:dur+.2,gain:.06*v},{wave:'noise',f0:0,filter:'bandpass',fc:f*2,q:4,atk:.08,dur:dur+.2,gain:.07*v}]
   :layer==='drum'?[{wave:'sine',f0:n.midi>60?210:110,f1:n.midi>60?150:62,atk:.002,dur:.22,gain:.9*v},{wave:'noise',f0:0,filter:'lowpass',fc:n.midi>60?2600:900,atk:.002,dur:.08,gain:.35*v}]
   :layer==='drone'?[{wave:'sawtooth',f0:f,filter:'lowpass',fc:380,atk:1.5,dur:dur+1.5,gain:.28*v},{wave:'sawtooth',f0:f*1.004,filter:'lowpass',fc:360,atk:1.5,dur:dur+1.5,gain:.2*v}]
   :layer==='strings'?[{wave:'sawtooth',f0:f,filter:'lowpass',fc:1400,atk:1.2,dur:dur+1,gain:.16*v,vib:{hz:5,cents:8}},{wave:'sawtooth',f0:f*1.006,filter:'lowpass',fc:1300,atk:1.3,dur:dur+1,gain:.14*v}]
   :layer==='horn'?[{wave:'sawtooth',f0:f,filter:'lowpass',fc:650,atk:.5,dur:dur+.6,gain:.3*v},{wave:'sawtooth',f0:f*1.003,filter:'lowpass',fc:600,atk:.5,dur:dur+.6,gain:.2*v}]
   :[1,2.76,5.4].map((m,i)=>({wave:'sine' as const,f0:f*m,atk:.003,dur:2.6/(i+1),gain:.22*v/(i+1)}));
  this.play(rec,dest,at,1,0);
 }
 private buildReverb(ctx:AudioContext,bus:GainNode){
  const d=ctx.createDelay(1),fb=ctx.createGain(),lp=ctx.createBiquadFilter(),wet=ctx.createGain();d.delayTime.value=.29;fb.gain.value=.38;lp.type='lowpass';lp.frequency.value=2200;wet.gain.value=.35;
  bus.connect(d);d.connect(lp);lp.connect(fb);fb.connect(d);lp.connect(wet);wet.connect(this.buses!.master);
 }

 // ---- ambience beds
 private updateBeds(t:number){
  for(const l of ENV_LAYERS){const p=BED_PARAMS[l];if(!p)continue;const g=this.env[l];let bed=this.beds.get(l);
   if(!bed){if(g<.02)continue;bed=this.makeBed(p);this.beds.set(l,bed);}
   bed.gain.gain.setTargetAtTime(g*bed.level,t,.4);}
 }
 private makeBed(p:NonNullable<typeof BED_PARAMS[EnvLayer]>){
  const ctx=this.ctx!,src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),lfo=ctx.createOscillator(),depth=ctx.createGain();
  src.buffer=this.noise;src.loop=true;f.type=p.filter;f.frequency.value=p.fc;f.Q.value=p.q;g.gain.value=0;
  lfo.frequency.value=p.lfoHz*(.8+this.rng()*.4);depth.gain.value=p.level*p.lfoDepth*.5;lfo.connect(depth);depth.connect(g.gain);
  src.connect(f);f.connect(g);g.connect(this.buses!.amb);src.start(ctx.currentTime,this.rng()*3);lfo.start();
  // wind and surf also sweep their filter so they breathe
  if(p.lfoDepth>=.5){const fd=ctx.createGain();fd.gain.value=p.fc*.35;lfo.connect(fd);fd.connect(f.frequency);}
  return {gain:g,level:p.level};
 }
 /** Brown-ish noise with an equal-power crossfaded seam so the 6 s loop has no click. */
 private makeNoise(ctx:AudioContext){
  const len=Math.floor(ctx.sampleRate*6),x=Math.floor(ctx.sampleRate*.5),n=ctx.createBuffer(1,len,ctx.sampleRate),d=n.getChannelData(0),r=seededRandom(hashSeed(this.seed,'noise'));
  const raw=new Float32Array(len+x);let last=0;for(let i=0;i<raw.length;i++){const w=r()*2-1;last=(last+.12*w)/1.12;raw[i]=w*.55+last*5;}
  for(let i=0;i<len;i++)d[i]=raw[i];
  for(let i=0;i<x;i++){const a=i/x;d[i]=raw[i]*Math.sin(a*Math.PI/2)+raw[len+i]*Math.cos(a*Math.PI/2);}
  let peak=0;for(let i=0;i<len;i++)peak=Math.max(peak,Math.abs(d[i]));if(peak>0)for(let i=0;i<len;i++)d[i]/=peak;
  return n;
 }

 /** Plays a recipe; returns the context time when it ends. */
 private play(rec:Recipe,dest:AudioNode,t0:number,gain:number,pan:number):number{
  const ctx=this.ctx!;let end=t0,out:AudioNode=dest;
  if(pan!==0&&typeof ctx.createStereoPanner==='function'){const p=ctx.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan));p.connect(dest);out=p;}
  for(const p of rec){
   const at=t0+(p.at??0),stop=at+p.atk+p.dur+.05;end=Math.max(end,stop);
   const g=ctx.createGain(),peak=Math.max(.0002,p.gain*gain);
   g.gain.setValueAtTime(0.0001,at);g.gain.linearRampToValueAtTime(peak,at+Math.max(.001,p.atk));g.gain.exponentialRampToValueAtTime(.0001,at+p.atk+p.dur);
   let node:AudioNode,srcStop:()=>void;const extra:AudioNode[]=[g];
   if(p.wave==='noise'){const s=ctx.createBufferSource();s.buffer=this.noise;s.loop=true;s.start(at,this.rng()*4);s.stop(stop);node=s;srcStop=()=>s.disconnect();}
   else{const o=ctx.createOscillator();o.type=p.wave;o.frequency.setValueAtTime(p.f0,at);if(p.f1)o.frequency.exponentialRampToValueAtTime(Math.max(20,p.f1),at+p.atk+p.dur);
    if(p.vib){const l=ctx.createOscillator(),d=ctx.createGain();l.frequency.value=p.vib.hz;d.gain.value=p.vib.cents;l.connect(d);d.connect(o.detune);l.start(at);l.stop(stop);}
    o.start(at);o.stop(stop);node=o;srcStop=()=>o.disconnect();}
   if(p.filter){const f=ctx.createBiquadFilter();f.type=p.filter;f.frequency.setValueAtTime(p.fc??1000,at);if(p.fc1)f.frequency.exponentialRampToValueAtTime(Math.max(20,p.fc1),at+p.atk+p.dur);f.Q.value=p.q??1;node.connect(f);node=f;extra.push(f);}
   if(p.am){const a=ctx.createGain(),l=ctx.createOscillator(),d=ctx.createGain();a.gain.value=1-p.am.depth/2;l.frequency.value=p.am.hz;d.gain.value=p.am.depth/2;l.connect(d);d.connect(a.gain);l.start(at);l.stop(stop);node.connect(a);node=a;extra.push(a);}
   node.connect(g);g.connect(out);
   const first=extra;globalThis.setTimeout(()=>{srcStop();for(const e of first)e.disconnect();},Math.max(100,(stop-ctx.currentTime)*1000+150));
  }
  if(out!==dest)globalThis.setTimeout(()=>out.disconnect(),Math.max(150,(end-ctx.currentTime)*1000+250));
  return end;
 }
 dispose(){this.active=false;for(const b of this.beds.values())b.gain.disconnect();this.beds.clear();this.layerGain.clear();this.filterByLayer.clear();this.buses=null;this.ctx=null;}
}
