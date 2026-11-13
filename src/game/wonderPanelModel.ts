import type {Game} from './sim';
import {WONDER_DEFS,WONDER_STAGES,STAGE_COUNT,stageOfLabour,type WonderId} from './wonderDefs';
import {suggestWonders,type Suggestion} from './wonderSuggest';
import {liveWonders,WONDER_RULES} from './wonderRules';
import {wonderEffectRows} from './wonderEffects';
import {ruinViews,type RuinView} from './ruinsWorld';
import {st} from './wonderRules';

/** Read model for the Wonders panel (Hearth UI): every wonder as one row with its state, cost, effect words, blockers and ground choices. Read-only. */
export type WonderRowState='rising'|'finished'|'fallen'|'suggested'|'available'|'locked';
export type WonderRow={id:WonderId;label:string;blurb:string;state:WonderRowState;stateWords:string;analogue:string;analogueSourced:boolean;
 cost:{wood:number;stone:number;food:number;copper:number;iron:number;labourSeconds:number;crew:string};
 effects:string[];hooks:string[];blocker?:string;reasons:string[];score:number;ready:boolean;sites:{x:number;z:number;words:string}[];minAge:number;
 project?:{progress:number;stage:string;level:number;crew:number;waiting?:string;nextGoods?:string};earthworks?:boolean};
export type WondersModel={enabled:boolean;rows:WonderRow[];suggested:WonderId[];ruins:RuinView[];lore:number;ruinsFound:number;reserve:{wood:number;stone:number;food:number}};
const goodsWords=(g:{wood:number;stone:number;food:number;copper?:number;iron?:number})=>[g.wood&&`${g.wood} wood`,g.stone&&`${g.stone} stone`,g.food&&`${g.food} food`,g.copper&&`${g.copper} copper`,g.iron&&`${g.iron} iron`].filter(Boolean).join(', ');
export function wondersModel(g:Game,focus?:string):WondersModel{
 const enabled=(g.state as {wonderFounding?:{enabled?:boolean}}).wonderFounding?.enabled===true,sugg=new Map<string,Suggestion>(suggestWonders(g,0,{siteChecks:8,focus}).map(s=>[s.id,s]));
 const mine=liveWonders(g).filter(r=>r.team===0),top=[...sugg.values()].filter(s=>s.feasible).slice(0,3).map(s=>s.id);
 const rows:WonderRow[]=WONDER_DEFS.map(d=>{
  const s=sugg.get(d.id),rec=mine.find(r=>r.family===d.id),fallen=(g.state.wonders??[]).some(r=>r.team===0&&r.family===d.id&&r.fallen!==undefined)&&!rec;
  const state:WonderRowState=rec?(rec.project?'rising':'finished'):fallen?'fallen':s?.ready&&top.includes(d.id)?'suggested':s?.feasible?'available':'locked';
  const effects=d.effects.filter(e=>e.id!=='prestige').map(e=>e.words);
  const lv=rec?.project?stageOfLabour(rec.project.labour,rec.project.need):STAGE_COUNT,next=rec?.project&&(rec.project.delivered??STAGE_COUNT)<STAGE_COUNT?WONDER_STAGES[rec.project.delivered??0].label:undefined;
  return{id:d.id,label:d.label,blurb:d.blurb,state,stateWords:state==='rising'?'Being raised':state==='finished'?'Standing':state==='fallen'?'Fallen to ruin':state==='suggested'?'Suggested':state==='available'?(s?.ready?'You can begin it':'Ground found'):(d.earthworks?'Needs earthworks':'Not possible yet'),
   analogue:d.inspiration.name,analogueSourced:d.inspiration.verified,cost:{wood:d.cost.wood,stone:d.cost.stone,food:d.cost.food,copper:d.cost.copper??0,iron:d.cost.iron??0,labourSeconds:d.cost.labour,crew:`${d.crew.min} to ${d.crew.max} workers`},
   effects:[...(d.effects.some(e=>e.id==='prestige')?['Renown for your people']:[]),...effects],hooks:d.hooks,blocker:rec||!s?(d.earthworks?'Needs earthworks that are not yet commissioned':undefined):s.blocker,reasons:s?.reasons??[],score:s?.score??0,ready:!!s?.ready,
   sites:(s?.sites??[]).map(x=>({x:x.x,z:x.z,words:`${x.distance} m from the hall${typeof x.facts.rock==='string'?`, ${x.facts.rock}`:''}`})),minAge:d.minAge,
   ...(rec?.project?{project:{progress:rec.progress,stage:WONDER_STAGES[Math.min(STAGE_COUNT-1,lv)].label,level:lv,crew:rec.project.crewIds.length,waiting:rec.waiting,nextGoods:next}}:{}),...(d.earthworks?{earthworks:true}:{})};
 });
 const order:Record<WonderRowState,number>={rising:0,suggested:1,available:2,finished:3,fallen:4,locked:5};
 rows.sort((a,b)=>order[a.state]-order[b.state]||b.score-a.score||a.label.localeCompare(b.label));
 void wonderEffectRows;
 return{enabled,rows,suggested:top,ruins:ruinViews(g),lore:st(g).ruins?.lore??0,ruinsFound:st(g).ruins?.found??0,reserve:{...WONDER_RULES.reserve}};
}
export const wonderCostWords=goodsWords;
