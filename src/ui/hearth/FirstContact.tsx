import {useMemo,useState,type ReactNode} from 'react';
import {LedgerRow} from './LedgerRow';
import {MessageCircle,Handshake,Scale,Repeat,Footprints,Wheat,Sword} from 'lucide-react';
import type {Engine} from '@/game/engine';
import {answerEncounter,contactActions,performContactAction,type ContactAction} from '@/game/encounters';
import {leaderDialogue,chooseLeaderDialogue,voiceOf,type LeaderTopic} from '@/game/leaderDialogue';
import {personName} from '@/game/people';
import {societyRelation} from '@/game/societyRelations';
import {SocietyFlag} from '../SocietyFlag';
import {TradedTeachingActions} from '../ContactActions';
import {TraderVerbs,ConsequenceLegend} from '../TraderVerbs';
import {ContactPortrait,portraitSpec} from './ContactPortrait';
import {LOOKS,individualFor,lookForSkin} from '@/scene/peopleLook';
import {skinOfTeam} from '@/game/skinState';
import {civForTeam} from '@/scene/peopleAdapter';
import {cultureForCiv,cultureForSkin} from '@/scene/civPeople';
import {bodyClassFor} from '@/scene/characterRig';
import type {Mood} from '@/game/vocab';
import './contact.css';

const moodOf=(rel:ReturnType<typeof societyRelation>):Mood=>rel.hostile?'hostile':!(rel.known||rel.trust>0||rel.grievance>0)?'unknown':rel.grievance>rel.trust+.2?'wary':rel.trust>.3?'friendly':'neutral';
/** Person's genome look, same functions the people renderer uses (society key, unit id). */
export function lookOfPerson(engine:Engine,strangerId:number){
 const g=engine.game,u=g.state.units.find(x=>x.id===strangerId);if(!u)return null;
 const skin=skinOfTeam(g.state,u.team),civ=civForTeam(g.state.seed,u.team),look=skin?lookForSkin(skin):LOOKS[civ],seed=g.state.seed%997+1;
 const key=(skin?cultureForSkin(skin,seed):cultureForCiv(civ,seed)).key,cls=bodyClassFor(u,g.state.time);
 return {u,look,ind:individualFor(look,key,u.id,cls,u.stature)};
}
export function FirstContact({engine}:{engine:Engine}){
 const g=engine.game,encounter=g.state.encounter!;
 const [topic,setTopic]=useState<LeaderTopic>('welcome'),[said,setSaid]=useState<string>(''),[note,setNote]=useState(''),[trade,setTrade]=useState(false);
 const stranger=g.state.units.find(u=>u.id===encounter.stranger),person=g.state.units.find(u=>u.id===encounter.person),t=g.tribe(encounter.team);
 const hostile=g.isFoe(0,t.id),v=voiceOf(g,stranger,encounter.team);
 const rel=societyRelation(g,0,encounter.team),mood=moodOf(rel);
 const view=stranger&&person?leaderDialogue(g,person.id,stranger.id,topic):null;
 const actions=contactActions(g,encounter.stranger,encounter.person);
 const who=useMemo(()=>lookOfPerson(engine,encounter.stranger),[engine,encounter.stranger]);
 const spec=who?portraitSpec(who.look,who.ind,{era:t.age??0,mood,cold:(t.age??0)<=0}):null;
 const reply=(r:'greet'|'observe')=>{answerEncounter(g,r);engine.canvas.focus();engine.pushHud();};
 const ask=(id:LeaderTopic)=>{if(!person||!stranger)return;const next=leaderDialogue(g,person.id,stranger.id,id);setTopic(id);setSaid(next.reply);setNote('');setTrade(id==='trade');engine.pushHud();};
 const run=(action:ContactAction,offer?:string)=>{const r=performContactAction(g,action,encounter.stranger,encounter.person,offer);setNote(r.report||r.reason);engine.pushHud();if(r.accepted&&!['question','approach-trade'].includes(action))engine.canvas.focus();};
 const line=said||(view?(view.issue||view.reply):'');
 const know:string[]=[];
 know.push(v.moodText(mood));
 if(stranger?.carryType&&stranger.carry>0)know.push(v.knowledge.carrying(Math.floor(stranger.carry),stranger.carryType));
 const kin=g.state.units.filter(u=>u.team===0&&u.hp>0&&stranger&&(stranger.parents?.includes(u.id)||u.parents?.includes(stranger.id))).length;
 know.push(v.knowledge.kin(kin));
 const tagList=actions.prisoner?[...actions.interrogate.consequences,...actions.ransom.consequences]:[...actions.attack.consequences,...actions.capture.consequences,...actions.rob.consequences];
 const speak=view&&view.choices.length>0&&!view.issue;
 const peaceChoice=view?.choices.find(c=>c.kind==='peace');
 const picks:[LeaderTopic,string,string,ReactNode][]=[['needs',v.speakVerbs.needs,v.prompts.needs,<Wheat size={24}/>],['relations',v.speakVerbs.relations,v.prompts.relations,<Scale size={24}/>],['treaties',v.speakVerbs.pact,v.prompts.pact,<Handshake size={24}/>]];
 return <div className="fc-body">
  <aside className="fc-side">
   {spec&&<ContactPortrait spec={spec} name={stranger?personName(stranger):'Stranger'}/>}
   <p className="fc-eyebrow">{hostile?v.encounter.hostile:v.encounter.first}</p>
   <h2 id="encounter-heading">{t.name}</h2>
   <p className="fc-role"><SocietyFlag game={g} team={encounter.team}/> {stranger?v.roleLine(personName(stranger),stranger.type==='leader'?'leader':'hand'):''}</p>
   <h3 className="fc-h">{v.encounter.seen}</h3>
   <ul className="fc-know">{know.map(k=><li key={k}>{k}</li>)}</ul>
   {!!tagList.length&&<><h3 className="fc-h">{v.encounter.marks}</h3><ConsequenceLegend tags={tagList} tagText={v.force.tags}/></>}
  </aside>
  <div className="fc-main">
   <blockquote className="fc-said" role="log" aria-live="polite" aria-label="Meeting conversation"><p>{line}</p></blockquote>
   {speak&&<><h3 className="fc-h">{v.groups.speak}</h3><ul className="fc-list" aria-label={v.groups.speak}>
    {picks.map(([id,label,prompt,icon])=><LedgerRow key={id} say icon={icon} label={prompt} onClick={()=>ask(id)}/>)}
    {peaceChoice&&<LedgerRow icon={<Handshake size={24}/>} label={peaceChoice.label} onClick={()=>{if(!person||!stranger)return;const r=chooseLeaderDialogue(g,person.id,stranger.id,topic,peaceChoice.id);setSaid(r.reply);setTopic(r.view.topic);engine.pushHud();}}/>}
   </ul></>}
   {!hostile&&<><h3 className="fc-h">{v.groups.deal}</h3><ul className="fc-list" aria-label={v.groups.deal}>
    <LedgerRow icon={<Repeat size={24}/>} say label={v.prompts.trade} line={stranger?.carryType&&stranger.carry>0?v.trader.offers(Math.floor(stranger.carry),stranger.carryType):v.trader.empty} expanded={trade} onClick={()=>{ask('trade');setTrade(!trade);}}/>
    {trade&&actions.trade.options.map(o=><LedgerRow key={o.id} icon={<Repeat size={24}/>} label={o.label} onClick={()=>run('trade',o.id)}/>)}
    {trade&&!actions.trade.options.length&&(actions.approach.reason===null?<LedgerRow icon={<Footprints size={24}/>} label={v.trader.closer} onClick={()=>run('approach-trade')}/>:<li className="fc-quiet">{actions.trade.reason}</li>)}
    {trade&&stranger?.visit?.phase==='waiting'&&stranger.visit.team===undefined&&<LedgerRow icon={<MessageCircle size={24}/>} label={v.trader.decline} onClick={()=>run('decline-trade')}/>}
   </ul>{trade&&stranger&&stranger.team!==0&&<div className="fc-quiet"><TradedTeachingActions engine={engine} teacherId={stranger.id} personId={encounter.person} open={trade}/></div>}</>}
   <h3 className="fc-h">{v.groups.force}</h3>
   <TraderVerbs engine={engine} strangerId={encounter.stranger} personId={encounter.person} variant="ledger" noLegend extra={!actions.prisoner&&stranger?<LedgerRow icon={<Sword size={24}/>} label={v.trader.demand} line={v.force.tags.loot+'.'} blocked={!!actions.demand.reason} reason={actions.demand.reason} onClick={()=>run('demand')}/>:null}/>
   {note&&<p className="fc-note" role="status" aria-live="polite">{note}</p>}
   <h3 className="fc-h">{v.groups.leave}</h3>
   <ul className="fc-list">
    {!hostile&&<LedgerRow icon={<Handshake size={24}/>} label={v.farewell.part} line={v.farewell.line} onClick={()=>reply('greet')}/>}
    {!actions.prisoner&&stranger&&<LedgerRow icon={<Footprints size={24}/>} label={v.trader.leave} onClick={()=>run('ask-visitor-leave')}/>}
    {actions.scout&&<LedgerRow icon={<Footprints size={24}/>} label={v.trader.goHome} line={personName(actions.scout)} onClick={()=>run('send-scout-home')}/>}
    <LedgerRow icon={<Footprints size={24}/>} label={v.farewell.leave} onClick={()=>reply('observe')}/>
   </ul>
  </div>
 </div>;
}
