/** Audio state spec: a pure music director and ambient mixer driven ONLY by real game state.
 *
 *  States: calm, trade, attack (our people are fighting), defense (an observed hostile is at the village).
 *  Inputs are the same facts the sim already computes: Game.musicMood() ('raid' = a visible foe near home or
 *  fighting our people, 'pillage' = our units attacking), whether a trade is really in progress (an offer awaiting
 *  an answer, a caravan or envoy trading), age, season. There is no timer, scripted "danger" or random state change:
 *  a combat state exists only while its real flag was seen within the hold window. Track choice is seeded, never
 *  Math.random. Music is acoustic recorded tracks only: a track enters a palette only if marked acoustic; no
 *  synthesised, electric or sequenced music exists anywhere in the tables.
 *
 *  Ambient layers (wind, birds, crickets, frogs, surf, rain, river, fire, murmur) are gains computed from real
 *  biome, season, hour, weather, water and fire proximity. No ambient audio files exist yet; layers carry an id
 *  only (asset request in the handoff). */
import {hashSeed,seededRandom} from './buildingParts';

export type MusicState='calm'|'trade'|'attack'|'defense';
export type TrackId='village'|'adventure'|'battle'|'folk'|'celtic'|'harp';
/** Mirrors src/game/music.ts TRACKS ids. `acoustic` is the asset author's declaration (unverified by ear here). */
export const TRACK_META:Record<TrackId,{acoustic:true;lively:boolean;combat:boolean}>={village:{acoustic:true,lively:false,combat:false},adventure:{acoustic:true,lively:false,combat:false},battle:{acoustic:true,lively:true,combat:true},folk:{acoustic:true,lively:false,combat:false},celtic:{acoustic:true,lively:true,combat:false},harp:{acoustic:true,lively:false,combat:false}};
/** Instrument classes the palette allows and forbids. */
export const INSTRUMENT_PALETTE={allowed:['voice','harp','lyre','flute','whistle','fiddle','lute','frame-drum','horn','strings','piano','bells'] as const,forbidden:['synth','electric-guitar','drum-machine','sampler-pad','vocoder','sequenced-electronic'] as const};
export const STATE_TRACKS:Record<MusicState,readonly TrackId[]>={calm:['village','harp','folk'],trade:['folk','village'],attack:['battle'],defense:['battle']};
export const DIRECTOR_RULES={combatHoldSeconds:20,tradeEnterSeconds:5,tradeHoldSeconds:15,minDwellSeconds:20,combatSwitchSeconds:8,restSeconds:[20,40] as const,fade:{intoCombat:2,outOfCombat:6,other:6}} as const;
export type MusicInput={mood:'peace'|'raid'|'pillage';tradeActive:boolean;age:number;season:string;/** true = never the lively pieces */calmMode:boolean};
export type DirectorOutput={state:MusicState;track:TrackId;changed:boolean;fade?:{to:MusicState;seconds:number};restUntil?:number;reason:string;skipped:boolean};

/** Peaceful track for age and season, as src/game/music.ts peacefulMusic (kept in sync by a test against that file). */
export function calmTrack(age:number,season:string,calm=true):TrackId{
 const winter=season==='Winter',autumn=season==='Autumn';
 if(calm)return winter?'harp':autumn||age>=2&&season==='Summer'?'folk':'village';
 if(age<=0)return winter||autumn?'adventure':'village';if(age===1)return winter?'village':'adventure';if(age===2)return winter||autumn?'adventure':'folk';if(age===3)return winter?'village':autumn?'adventure':'folk';if(age===4)return winter?'adventure':'folk';return winter?'village':!autumn?'celtic':'folk';
}
export class MusicDirector{
 state:MusicState='calm';track:TrackId='village';private time=0;private seenRaid=-1e9;private seenPillage=-1e9;private tradeSince=-1;private lastTrade=-1e9;private stateSince=0;private skip:{context:MusicState;track:TrackId}|null=null;private serial=0;private restUntil:number|undefined;
 readonly seed:number;constructor(seed:number){this.seed=seed;}
 /** Advance by dt seconds with this tick's real inputs. */
 step(input:MusicInput,dt:number):DirectorOutput{
  this.time+=Math.max(0,dt);const R=DIRECTOR_RULES;
  if(input.mood==='raid')this.seenRaid=this.time;if(input.mood==='pillage')this.seenPillage=this.time;
  if(input.tradeActive){if(this.tradeSince<0)this.tradeSince=this.time;this.lastTrade=this.time;}else this.tradeSince=-1;
  const raid=this.time-this.seenRaid<=R.combatHoldSeconds,pillage=this.time-this.seenPillage<=R.combatHoldSeconds,combat=this.state==='attack'||this.state==='defense';
  const tradeReady=this.tradeSince>=0&&this.time-this.tradeSince>=R.tradeEnterSeconds,tradeHeld=this.time-this.lastTrade<=R.tradeHoldSeconds;
  let want:MusicState,reason:string;
  if(raid){want='defense';reason='a hostile was observed at the village';}
  else if(pillage){want='attack';reason='our people are fighting';}
  else if(this.state==='trade'?tradeHeld:tradeReady){want='trade';reason='a trade is under way';}
  else{want='calm';reason='no danger or trade seen';}
  const dwell=this.time-this.stateSince;let changed=false,fade:DirectorOutput['fade'];
  // Defense is always immediate; attack is immediate unless we are leaving defense; leaving combat is already gated by the hold windows.
  const allowed=want===this.state?false:want==='defense'?true:want==='attack'?(this.state==='defense'?dwell>=R.combatSwitchSeconds:true):combat?true:dwell>=R.minDwellSeconds;
  if(allowed){fade={to:want,seconds:want==='defense'||want==='attack'?R.fade.intoCombat:combat?R.fade.outOfCombat:R.fade.other};this.state=want;this.stateSince=this.time;this.skip=null;this.track=this.pick(input);changed=true;this.restUntil=undefined;}
  else if(!this.skip&&this.state==='calm'&&dwell>=R.minDwellSeconds){const t=calmTrack(input.age,input.season,input.calmMode);if(t!==this.track&&STATE_TRACKS.calm.includes(t)){this.track=t;this.stateSince=this.time;changed=true;}}
  return {state:this.state,track:this.track,changed,...(fade?{fade}:{}),...(this.restUntil!==undefined?{restUntil:this.restUntil}:{}),reason:this.state==='calm'&&this.state===want?reason:want===this.state?reason:`${reason} (holding ${this.state})`,skipped:!!this.skip};
 }
 private pick(input:MusicInput):TrackId{
  const base=STATE_TRACKS[this.state],pref=this.state==='calm'?calmTrack(input.age,input.season,input.calmMode):undefined;
  const pool=base.filter(t=>input.calmMode?!TRACK_META[t].lively||TRACK_META[t].combat:true);
  if(pref&&pool.includes(pref))return pref;const r=seededRandom(hashSeed(this.seed,this.serial++,this.state));return pool[Math.floor(r()*pool.length)%pool.length]??base[0];
 }
 /** Called when a track finishes: a seeded quiet gap before the next piece. */
 trackEnded(){const [a,b]=DIRECTOR_RULES.restSeconds,r=seededRandom(hashSeed(this.seed,'rest',this.serial++));this.restUntil=this.time+a+(b-a)*r();return this.restUntil;}
 /** Manual skip: next track in the state's pool, plus the calm pool while in a combat state (as music.ts allows). Lasts until the state changes. */
 skipTrack():TrackId{
  const peaceful:TrackId[]=['village','harp','folk'],pool:TrackId[]=this.state==='attack'||this.state==='defense'?['battle',...peaceful]:this.state==='trade'?['folk','village','harp']:peaceful;
  const next=pool[(Math.max(0,pool.indexOf(this.track))+1)%pool.length];this.track=next;this.skip={context:this.state,track:next};this.stateSince=this.time;this.restUntil=undefined;return next;
 }
}

// ---- Ambient layers.
export type Layer='wind'|'birds'|'crickets'|'frogs'|'insects'|'surf'|'rain'|'river'|'fire'|'murmur'|'snowHush';
export const LAYERS:readonly Layer[]=['wind','birds','crickets','frogs','insects','surf','rain','river','fire','murmur','snowHush'];
export type AmbientInput={biome:'plains'|'forest'|'hills'|'desert'|'tundra'|'wetland';coastal?:boolean;season:'Spring'|'Summer'|'Autumn'|'Winter';/** 0..24 */hour:number;weather?:'clear'|'mist'|'rain'|'storm'|'frost'|'golden'|'flood'|'drought';
 /** metres to running water / to a lit fire the listener can see; undefined = none */waterDistance?:number;litFireDistance?:number;/** people within earshot */people?:number;indoors?:boolean};
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
const near=(d:number|undefined,r:number)=>d===undefined||!Number.isFinite(d)?0:clamp01(1-d/r);
export const isDay=(h:number)=>h>=6&&h<19,isNight=(h:number)=>h>=21||h<5,dawnDusk=(h:number)=>(h>=5&&h<6)||(h>=19&&h<21);
export function ambientMix(a:AmbientInput):Record<Layer,number>{
 const out=Object.fromEntries(LAYERS.map(l=>[l,0])) as Record<Layer,number>,warm=a.season==='Spring'||a.season==='Summer',h=((a.hour%24)+24)%24,day=isDay(h),night=isNight(h),dd=dawnDusk(h);
 const rain=a.weather==='rain'?.7:a.weather==='storm'?1:0,wind=(a.weather==='storm'?.9:a.weather==='frost'?.4:.25)+(a.biome==='hills'||a.biome==='tundra'?.25:0)+(a.biome==='desert'?.1:0);
 out.wind=clamp01(wind);out.rain=rain;
 const lush=a.biome==='forest'?1:a.biome==='plains'?.8:a.biome==='wetland'?.7:a.biome==='hills'?.4:0;
 if(a.season!=='Winter'&&rain<.7)out.birds=clamp01(lush*(day?1:dd?.9:0)*(a.season==='Spring'?1:a.season==='Summer'?.8:.4));
 if(warm&&night&&rain<.5&&a.biome!=='tundra')out.crickets=clamp01((a.biome==='plains'?1:a.biome==='forest'?.7:a.biome==='desert'?.4:.5)*(a.season==='Summer'?1:.6));
 if(warm&&(night||dd)&&a.biome==='wetland'&&rain<.7)out.frogs=a.season==='Spring'?1:.7;
 if(a.biome==='desert'&&day&&a.season!=='Winter')out.insects=.5;
 if(a.coastal)out.surf=clamp01(.5+(a.weather==='storm'?.5:0));
 out.river=near(a.waterDistance,60)*.8;out.fire=near(a.litFireDistance,18);
 out.murmur=clamp01(Math.min(1,(a.people??0)/40)*(day?.5:.15)*(rain>.7?.4:1));
 if(a.season==='Winter'&&(a.biome==='tundra'||a.weather==='frost'||a.weather==='clear'))out.snowHush=a.biome==='tundra'?.7:.3;
 if(a.indoors)for(const l of LAYERS)out[l]=l==='fire'?out[l]:out[l]*.25;
 for(const l of LAYERS)out[l]=Math.round(clamp01(out[l])*1000)/1000;return out;
}
/** Eases gains toward targets at a bounded rate so layers fade rather than pop. */
export class AmbientSmoother{
 gains=Object.fromEntries(LAYERS.map(l=>[l,0])) as Record<Layer,number>;
 private ratePerSecond:number;constructor(ratePerSecond=.2){this.ratePerSecond=ratePerSecond;}
 step(target:Record<Layer,number>,dt:number){const m=this.ratePerSecond*Math.max(0,dt);for(const l of LAYERS){const d=target[l]-this.gains[l];this.gains[l]+=Math.sign(d)*Math.min(Math.abs(d),m);}return this.gains;}
}
