import {useEffect} from 'react';
import type {Engine} from '../game/engine';
import {newBuildWatch,watchBuildFinishes} from './buildFinishBeat';
import {watchLifeCues,type CueWatch} from './lifeEventCue';
import {watchTaming,type TamingWatch} from './tamingFeedback';
/** A finished building gets one soft sound and a line naming who built it, through the normal news card; nothing is rendered here. */
export function BuildFinishBeat({engine}:{engine:Engine|null}){
 useEffect(()=>{
  if(!engine)return;const w=newBuildWatch(),cues:CueWatch={},taming:TamingWatch={refusals:0,successes:0};
  const id=setInterval(()=>{if(engine.disposed)return;const g=engine.game;const cue=watchLifeCues(g,cues);if(cue.length)g.onSfx?.(cue.includes('lose')?'lose':'trade');const tame=watchTaming(g,taming);if(tame){g.onSfx?.(tame.sfx);g.banner(tame.line,4);engine.pushHud();}if(g.state.paused&&w.ready)return;const lines=watchBuildFinishes(g,w);if(!lines.length)return;g.onSfx?.('hammer');g.banner(lines.join(' · '),4);engine.pushHud();},1000);
  return()=>clearInterval(id);
 },[engine]);
 return null;
}
