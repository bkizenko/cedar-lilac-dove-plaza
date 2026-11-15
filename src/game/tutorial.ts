// Tutorial mode: a small, pure state machine over the real game state. Steps complete from state changes
// (or manually with Next). It never blocks play, is skippable at any time, and absent state = off (old saves).
import type {GameState} from './types';

export const TUTORIAL_VERSION=1;
export type TutorialTarget='build'|'village'|'council'|'auto'|'work'|'map'|'recall'|null;
export type TutorialStep={
  id:string;title:string;text:string;
  /** UI element to highlight (CSS only). */
  target:TutorialTarget;
  /** Pure completion check; absent = the player presses Next. */
  done?:(s:GameState,t:TutorialState,season:string)=>boolean;
};
export type TutorialState={
  version:1;
  /** index into TUTORIAL_STEPS; TUTORIAL_STEPS.length = finished */
  step:number;
  /** false once skipped or finished */
  active:boolean;
  /** card visible (Hide collapses it to a chip) */
  hints:boolean;
  /** counts at start so existing buildings do not count as the player's work */
  base:{shelter:number;storage:number;farm:number;food:number;wood:number};
  startedAt:number;
};
const mine=(s:GameState)=>s.buildings.filter(b=>b.team===0&&b.hp>0&&!b.raiderCamp);
const count=(s:GameState,types:string[],built:boolean)=>mine(s).filter(b=>types.includes(b.type)&&(!built||b.build>=1)).length;
const people=(s:GameState)=>s.units.filter(u=>u.team===0&&u.hp>0&&u.type==='worker');
export const SHELTER_TYPES=['hut','house'],STORAGE_TYPES=['warehouse'],FARM_TYPES=['farm'];

export const TUTORIAL_STEPS:TutorialStep[]=[
 {id:'select',title:'Select a villager',target:null,text:'Click a villager, or drag a box around several. Press C to select a gatherer. The command card shows what they can do.',
  done:s=>people(s).some(u=>u.selected)},
 {id:'gather',title:'Gather food and wood',target:null,text:'Right-click berries, game or a tree to send the selection to work. Auto work also does this for idle villagers. Food and wood are what everything else costs.',
  done:(s,t)=>people(s).some(u=>u.order==='gather'||u.carry>0)||(s.tribes[0]?.food??0)>t.base.food+2||(s.tribes[0]?.wood??0)>t.base.wood+2},
 {id:'shelter',title:'Build a first shelter',target:'build',text:'Open Build, pick a hut or house and place it on level ground near the hearth. Villagers raise it when wood is in store.',
  done:(s,t)=>count(s,SHELTER_TYPES,true)>t.base.shelter},
 {id:'storage',title:'Build storage',target:'build',text:'A warehouse keeps food and goods out of the weather. Place one beside your work area so carrying is short.',
  done:(s,t)=>count(s,STORAGE_TYPES,true)>t.base.storage},
 {id:'field',title:'Plant a field',target:'build',text:'Open Build > Food and mark a field on open, flat ground near water. Sowing, tending and harvest follow the seasons, so start before winter.',
  done:(s,t)=>count(s,FARM_TYPES,false)>t.base.farm},
 {id:'winter',title:'Get through the first winter',target:'village',text:'Little grows in winter. Before the cold arrives, store food (check the Village panel), keep wood for warmth, and make sure everyone has shelter.',
  done:(_s,_t,season)=>season==='Winter'},
 {id:'auto',title:'Auto work and priorities',target:'auto',text:'Auto work lets idle villagers follow village priorities. Direct orders and paid work stay protected. Turn it off in the left rail if you want full manual control.'},
 {id:'workload',title:'Read the Work panel',target:'work',text:'The Workload button shows work planned against what residents can do. Over 100% means a backlog: build more, assign more hands, or drop low-value jobs.'},
 {id:'hunting',title:'Hunting',target:null,text:'Select an adult and right-click an animal to hunt it. Meat and hides help through winter, but large game fights back, so send two or more.',
  done:s=>people(s).some(u=>u.huntOnly===true||(u.job as string|null)==='hunt')},
 {id:'defence',title:'Defence and raids',target:'recall',text:'Raiders sometimes come for food. The Defense horn calls nearby adults to arms and Recall brings everyone home. Watchtowers, walls and a trained squad turn raids away.'},
 {id:'trade',title:'Trading',target:'council',text:'Meet neighbours and traders to swap surplus for what you lack. Open a trader, review the offer, and keep enough for your own winter.'},
 {id:'neighbours',title:'The Neighbours card',target:'council',text:'Council > Neighbours shows who you have met, their mood toward you, and options for gifts, trade and peace. That is the end of the tutorial; hints can be turned back on any time.'},
];

export function startTutorial(s:GameState):TutorialState{
  const t:TutorialState={version:1,step:0,active:true,hints:true,startedAt:s.time,
    base:{shelter:count(s,SHELTER_TYPES,true),storage:count(s,STORAGE_TYPES,true),farm:count(s,FARM_TYPES,false),food:s.tribes[0]?.food??0,wood:s.tribes[0]?.wood??0}};
  s.tutorial=t;return t;
}
export const currentStep=(t:TutorialState|undefined):TutorialStep|null=>t&&t.active?TUTORIAL_STEPS[t.step]??null:null;
/** Advance past every step already complete. Returns true if anything changed. Pure apart from mutating t. */
/** `season` is the current season name (the HUD snapshot carries it; it is not stored in game state). */
export function advanceTutorial(s:GameState,season=''):boolean{
  const t=s.tutorial;if(!t||!t.active)return false;
  let changed=false;
  for(;;){
    const st:TutorialStep|undefined=TUTORIAL_STEPS[t.step];
    if(!st){t.active=false;return true;}
    if(st.done&&st.done(s,t,season)){t.step++;changed=true;continue;}
    return changed;
  }
}
/** Manual Next: always moves on, whether or not the check passed. */
export function nextTutorialStep(s:GameState,season=''){const t=s.tutorial;if(!t||!t.active)return;t.step++;if(t.step>=TUTORIAL_STEPS.length)t.active=false;advanceTutorial(s,season);}
export function skipTutorial(s:GameState){if(s.tutorial)s.tutorial.active=false;}
export function resumeTutorial(s:GameState){const t=s.tutorial;if(t&&t.step<TUTORIAL_STEPS.length){t.active=true;t.hints=true;}}
export function setTutorialHints(s:GameState,on:boolean){if(s.tutorial)s.tutorial.hints=on;}

const int=(v:unknown,lo:number,hi:number)=>typeof v==='number'&&Number.isInteger(v)&&v>=lo&&v<=hi;
const fin=(v:unknown)=>typeof v==='number'&&Number.isFinite(v);
/** Shape check for saved tutorial state. Callers drop the field when false: the tutorial is optional and must never make a save unreadable. */
export function validTutorial(v:unknown):v is TutorialState{
  const t=v as TutorialState;
  return !!t&&typeof t==='object'&&t.version===1&&int(t.step,0,TUTORIAL_STEPS.length)&&typeof t.active==='boolean'&&typeof t.hints==='boolean'&&fin(t.startedAt)
    &&!!t.base&&typeof t.base==='object'&&['shelter','storage','farm','food','wood'].every(k=>fin((t.base as Record<string,unknown>)[k]));
}
