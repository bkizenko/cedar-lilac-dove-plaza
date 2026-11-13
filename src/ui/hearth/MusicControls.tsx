import {useState} from 'react';
import {Music,Pause,Play,SkipForward,Volume2,VolumeX,Bird,Speaker,Music2} from 'lucide-react';
import {IconBtn} from './kit';
import {FoldHandle,FoldMin,useFold} from './fold';
import {cx} from './kit';
type Sub='music'|'ambience'|'sfx';
type Settings={master:number;music:number;ambience:number;sfx:number;musicPaused:boolean;muted:boolean;musicOff:boolean;ambienceOff:boolean;sfxOff:boolean};
type AudioLike={settings:Settings;toggleMusicPaused:()=>void;skipTrack:()=>void;setVolume:(b:'master'|Sub,v:number)=>void;toggleBusOff?:(b:Sub)=>void;setBusOff?:(b:Sub,off:boolean)=>void;score?:{status?:string}};
type EngineLike={audio:AudioLike;toggleMute?:()=>void;pushHud?:()=>void}|null;
const OFF={music:'musicOff',ambience:'ambienceOff',sfx:'sfxOff'} as const;
const toggleSub=(a:AudioLike,b:Sub)=>{if(a.toggleBusOff)a.toggleBusOff(b);else a.setBusOff?.(b,!a.settings[OFF[b]]);};
export const AUDIO_ROWS:{bus:Sub;label:string;on:string;off:string;icon:'music'|'nature'|'sfx'}[]=[
 {bus:'music',label:'Music',on:'Music is on',off:'Music is off',icon:'music'},
 {bus:'ambience',label:'Nature sounds',on:'Nature sounds are on',off:'Nature sounds are off',icon:'nature'},
 {bus:'sfx',label:'Sound effects',on:'Sound effects are on',off:'Sound effects are off',icon:'sfx'},
];
/** Compact always-visible audio chip (inside the clock bar): music play/pause, skip, one switch for sound effects, minimise.
 *  Collapsed it becomes a labelled "Sound" handle. Music, nature sounds and effects are separate switches with their own volume in Menu. */
export function MusicChip({engine}:{engine:EngineLike}){
 const [,bump]=useState(0);const f=useFold('audio');if(!engine)return null;
 const st=engine.audio.settings,paused=st.musicPaused,sfxOff=st.muted||st.sfxOff,musicOff=st.musicOff;
 return <>
  <FoldHandle f={f} icon={st.muted?<VolumeX size={24}/>:<Volume2 size={24}/>} tone={st.muted?'warn':undefined}/>
  {f.showPanel&&<div className={cx('hw-music',f.cls)} role="group" aria-label="Sound">
   <IconBtn label={paused?'Play music':'Pause music'} tip={paused?'Music is paused. Nature sounds keep playing.':'Pause the music; nature sounds keep playing'} active={paused||musicOff} onClick={()=>{engine.audio.toggleMusicPaused();bump(n=>n+1);engine.pushHud?.();}}>{paused?<Play size={24}/>:<Music size={24}/>}</IconBtn>
   <IconBtn label="Skip track" tip="Next piece" onClick={()=>{engine.audio.skipTrack();bump(n=>n+1);engine.pushHud?.();}}><SkipForward size={24}/></IconBtn>
   <IconBtn label={sfxOff?'Turn sound effects on':'Turn sound effects off'} tip={`${sfxOff?'Sound effects are off':'Sound effects are on'}. Music and nature sounds are separate. (O)`} active={sfxOff} onClick={()=>{toggleSub(engine.audio,'sfx');bump(n=>n+1);engine.pushHud?.();}}>{sfxOff?<VolumeX size={24}/>:<Volume2 size={24}/>}</IconBtn>
   <FoldMin f={f}/>
  </div>}
 </>;
}
const ROW_ICON={music:<Music2 aria-hidden="true"/>,nature:<Bird aria-hidden="true"/>,sfx:<Speaker aria-hidden="true"/>};
/** Menu block: master, then music, nature sounds and sound effects, each with its own on/off switch and volume, plus play/pause and skip. Saved with the audio settings. */
export function MusicPanel({engine}:{engine:EngineLike}){
 const [,bump]=useState(0);if(!engine)return null;
 const a=engine.audio,st=a.settings,paused=st.musicPaused;
 return <div className="hw-music-panel hw-stack" role="group" aria-label="Music, nature sounds and sound effects">
  <div className="hw-row">
   <button type="button" className="hw-btn-wide" aria-pressed={!st.muted} onClick={()=>{engine.toggleMute?.();bump(n=>n+1);}}>{st.muted?<VolumeX aria-hidden="true"/>:<Volume2 aria-hidden="true"/>}{st.muted?'All sound is off':'All sound is on'}</button>
   <button type="button" className="hw-btn-wide" aria-pressed={!paused} onClick={()=>{a.toggleMusicPaused();bump(n=>n+1);}}>{paused?<Play aria-hidden="true"/>:<Pause aria-hidden="true"/>}{paused?'Play music':'Pause music'}</button>
   <button type="button" className="hw-btn-wide" onClick={()=>{a.skipTrack();bump(n=>n+1);}}><SkipForward aria-hidden="true"/>Skip track</button>
  </div>
  <label>Master volume<input type="range" min={0} max={100} value={Math.round(st.master*100)} aria-label="Master volume" onChange={e=>{a.setVolume('master',+e.target.value/100);bump(n=>n+1);}}/></label>
  {AUDIO_ROWS.map(r=>{const off=st[OFF[r.bus]];return <div key={r.bus} className="hw-audio-row" role="group" aria-label={r.label}>
   <button type="button" className="hw-btn-wide" aria-pressed={!off} aria-label={`${r.label}: ${off?'off':'on'}`} title={off?r.off:r.on} onClick={()=>{toggleSub(a,r.bus);bump(n=>n+1);}}>{ROW_ICON[r.icon]}{r.label}<em>{off?'Off':'On'}</em></button>
   <label>{r.label} volume<input type="range" min={0} max={100} disabled={off} value={Math.round(st[r.bus]*100)} aria-label={`${r.label} volume`} onChange={e=>{a.setVolume(r.bus,+e.target.value/100);bump(n=>n+1);}}/></label>
  </div>;})}
  <span className="hw-chip" role="status">{a.score?.status??''}</span>
 </div>;
}
