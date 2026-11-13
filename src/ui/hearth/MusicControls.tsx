import {useState} from 'react';
import {Music,Pause,Play,SkipForward} from 'lucide-react';
import {IconBtn} from './kit';
type AudioLike={settings:{music:number;ambience:number;musicPaused:boolean;muted:boolean};toggleMusicPaused:()=>void;skipTrack:()=>void;setVolume:(b:'music'|'ambience',v:number)=>void;score?:{status?:string}};
type EngineLike={audio:AudioLike;pushHud?:()=>void}|null;
/** Small always-visible music control: play/pause and skip. Nature ambience is separate and keeps playing. */
export function MusicChip({engine}:{engine:EngineLike}){
 const [,bump]=useState(0);if(!engine)return null;
 const paused=engine.audio.settings.musicPaused;
 return <div className="hw-music" role="group" aria-label="Music">
  <IconBtn label={paused?'Play music':'Pause music'} tip={paused?'Music is paused. Nature sounds keep playing.':'Pause the music; nature sounds keep playing'} active={paused} onClick={()=>{engine.audio.toggleMusicPaused();bump(n=>n+1);engine.pushHud?.();}}>{paused?<Play size={24}/>:<Music size={24}/>}</IconBtn>
  <IconBtn label="Skip track" tip="Next piece" onClick={()=>{engine.audio.skipTrack();bump(n=>n+1);engine.pushHud?.();}}><SkipForward size={24}/></IconBtn>
 </div>;
}
/** Menu block: pause/play, skip, music volume and nature ambience volume. Persisted by the audio settings. */
export function MusicPanel({engine}:{engine:EngineLike}){
 const [,bump]=useState(0);if(!engine)return null;
 const st=engine.audio.settings,paused=st.musicPaused;
 return <div className="hw-music-panel hw-stack" role="group" aria-label="Music and nature sounds">
  <div className="hw-row">
   <button type="button" className="hw-btn-wide" aria-pressed={!paused} onClick={()=>{engine.audio.toggleMusicPaused();bump(n=>n+1);}}>{paused?<Play aria-hidden="true"/>:<Pause aria-hidden="true"/>}{paused?'Play music':'Pause music'}</button>
   <button type="button" className="hw-btn-wide" onClick={()=>{engine.audio.skipTrack();bump(n=>n+1);}}><SkipForward aria-hidden="true"/>Skip track</button>
  </div>
  <label>Music volume<input type="range" min={0} max={100} value={Math.round(st.music*100)} aria-label="Music volume" onChange={e=>{engine.audio.setVolume('music',+e.target.value/100);bump(n=>n+1);}}/></label>
  <label>Nature sounds volume<input type="range" min={0} max={100} value={Math.round(st.ambience*100)} aria-label="Nature sounds volume" onChange={e=>{engine.audio.setVolume('ambience',+e.target.value/100);bump(n=>n+1);}}/></label>
  <span className="hw-chip" role="status">{engine.audio.score?.status??''}</span>
 </div>;
}
