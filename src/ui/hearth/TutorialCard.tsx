import {useEffect} from 'react';
import {GraduationCap,X,EyeOff} from 'lucide-react';
import type {Engine} from '@/game/engine';
import {TUTORIAL_STEPS,advanceTutorial,currentStep,nextTutorialStep,skipTutorial,resumeTutorial,setTutorialHints} from '@/game/tutorial';
import './tutorial.css';

/** Compact hint card for tutorial mode. Steps complete from game state (re-checked on every HUD refresh) or with Next; Skip and Hide are always available. */
export function TutorialCard({engine,season}:{engine:Engine;season:string}){
 const s=engine.game.state,t=s.tutorial;
 if(t&&advanceTutorial(s,season)){/* state advanced during render; the HUD refresh that triggered it is the next paint */}
 const step=currentStep(t),shown=!!t&&t.active&&t.hints&&!!step;
 useEffect(()=>{
  const root=document.documentElement;
  if(shown&&step?.target)root.dataset.hwTut=step.target;else delete root.dataset.hwTut;
  return()=>{delete root.dataset.hwTut;};
 },[shown,step?.target]);
 if(!t)return null;
 const poke=()=>engine.pushHud();
 if(!shown){
  const finished=t.step>=TUTORIAL_STEPS.length;
  if(finished)return null;
  return <button type="button" className="hw-tut-chip" aria-label={t.active?'Show tutorial hints':'Resume tutorial'} onClick={()=>{if(t.active)setTutorialHints(s,true);else resumeTutorial(s);poke();}}><GraduationCap size={20}/><span>{t.active?'Hints off':'Tutorial paused'}</span></button>;
 }
 return <section className="hw-tut" role="status" aria-label="Tutorial">
  <header><GraduationCap size={20}/><span className="hw-tut-n">Step {t.step+1} of {TUTORIAL_STEPS.length}</span>
   <button type="button" className="hw-tut-x" aria-label="Hide hints" title="Hide hints" onClick={()=>{setTutorialHints(s,false);poke();}}><EyeOff size={18}/></button></header>
  <h3>{step!.title}</h3>
  <p>{step!.text}</p>
  <footer>
   <button type="button" onClick={()=>{skipTutorial(s);poke();}}><X size={16}/>Skip tutorial</button>
   <button type="button" className="hw-tut-next" onClick={()=>{nextTutorialStep(s,season);poke();}}>{step!.done?'Skip step':'Next'}</button>
  </footer>
 </section>;
}
