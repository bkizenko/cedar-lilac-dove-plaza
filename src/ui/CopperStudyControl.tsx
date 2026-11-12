import {useEffect,useRef,useState} from 'react';
import {useOwnerReadModels} from './useOwnerReadModels';
import {beginCopperHelper,copperHelperIssue,practicalHelperReport,pausePracticalHelper,resumePracticalHelper} from '../game/practicalHelpers';
import {GameTooltip} from './GameTooltip';
import type {Engine} from '@/game/engine';
import {COPPER_STUDY_RULES} from '@/game/materialStudy';
export function CopperStudyControl({engine,workplace}:{engine:Engine;workplace:number}){
 const g=engine.game,t=g.tribe(0),person=g.state.units.find(u=>u.team===0&&u.hp>0&&u.copperStudy),work=person?.copperStudy;
 const query={kind:'copper-study-issues' as const,workplaceId:workplace},read=useOwnerReadModels(engine,[query]),availability=read(query),model=availability.model;
 const [busy,setBusy]=useState(false),[feedback,setFeedback]=useState(''),mounted=useRef(true),requestId=useRef(0),epoch=engine.dispatchEpoch;
 useEffect(()=>{mounted.current=true;setBusy(false);setFeedback('');return()=>{mounted.current=false;requestId.current++;};},[engine,workplace,epoch]);
 if(t.copperExperiment)return <p className="text-sm text-parchment">Copper prototype established · {g.state.units.filter(u=>u.team===0&&u.hp>0&&u.farmTool==='copperTools').length} residents equipped</p>;
 const issue=availability.issue||model?.logs,charcoalIssue=availability.issue||model?.charcoal,helpers=person?practicalHelperReport(g,person.id):null,helperIssue=person?copperHelperIssue(g,person.id):'Start a paid trial first';
 const help=()=>{if(person){const result=beginCopperHelper(g,person.id);g.banner(result.reason,4);engine.pushHud();}};
 const start=async(fuel:'logs'|'charcoal'='logs')=>{
  if(engine.disposed||engine.dispatchEpoch!==epoch)return;const request=++requestId.current;setBusy(true);
  const current=()=>mounted.current&&!engine.disposed&&engine.dispatchEpoch===epoch&&requestId.current===request;
  try{const result=await engine.dispatch({kind:'begin-copper-study',workplaceId:workplace,fuel});if(current()&&result.epoch===epoch){setFeedback(result.reason);engine.pushHud();}}
  catch(error){if(current())setFeedback(error instanceof Error?error.message:'Copper trial request failed');}
  finally{if(current())setBusy(false);}
 };
 if(work&&work.workplace!==workplace)return <span>Copper trial underway at another shelter.</span>;
 if(work)return <div className="copper-study-control">
  <strong>Copper trial · {Math.floor(work.progress/COPPER_STUDY_RULES.workSeconds*100)}%</strong>
  <progress aria-label="Copper prototype work" max={COPPER_STUDY_RULES.workSeconds} value={work.progress}/>
  {work.paused?<button type="button" disabled={!!issue||busy} onClick={()=>void start()}>{work.version!==1||work.paid?'Resume trial · inputs already paid':'Resume trial'}</button>:<span>1 maker · {helpers?.helpers.filter(h=>h.phase!=='paused').length||0} helpers</span>}
  <span>{work.version===1&&work.phase==='loading'?'Awaiting materials at storage · not yet paid':work.version===1&&work.phase==='carrying'?'Carrying paid materials to the bench':'Testing at the bench'}</span>
  {person?.workReason&&<span>{person.workReason}</span>}
  {work.paused&&issue&&<span>{issue}</span>}
  {feedback&&<span role="status">{feedback}</span>}
  {person&&work.workplace===workplace&&<><GameTooltip title="Hands-on helpers" description="Two extra adults can assist at real benches beside the maker. First helper contributes 45% and the second 25% of their actual crafting work; materials remain paid once. Cultivation helpers are assigned separately at the hearth."><button type="button" disabled={!!helperIssue} title={helperIssue||'Assign a real adult to an available bench'} onClick={help}>Add helper</button></GameTooltip>{helpers?.helpers.map(h=><div key={h.id}><span>{h.name} · {h.phase==='paused'?'Paused':h.phase==='traveling'?'Walking to bench':'Helping'}</span><button type="button" onClick={()=>{const u=g.state.units.find(u=>u.id===h.id);if(!u)return;if(h.phase==='paused'){const r=resumePracticalHelper(g,u.id);g.banner(r.reason,4);}else pausePracticalHelper(g,u);engine.pushHud();}}>{h.phase==='paused'?'Resume helper':'Pause helper'}</button></div>)}</>}

 </div>;
 return <div className="copper-study-control">
  <button type="button" disabled={!!issue||busy} onClick={()=>void start()} title={issue||'One resident takes materials to the shelter and tests a prototype at a real bench.'}>Test a copper tool</button>
  <button type="button" disabled={!!charcoalIssue||busy} onClick={()=>void start('charcoal')} title={charcoalIssue||'Pay charcoal instead of logs for this trial.'}>Test copper · {COPPER_STUDY_RULES.charcoalUnits} charcoal</button>
  <span>{COPPER_STUDY_RULES.copperUnits} copper · {COPPER_STUDY_RULES.woodLogs} logs · {COPPER_STUDY_RULES.workSeconds} work seconds</span>
  {issue&&<span>{issue}</span>}
  {charcoalIssue&&charcoalIssue!==issue&&<span>{charcoalIssue}</span>}
  {feedback&&<span role="status">{feedback}</span>}
 </div>;
}
