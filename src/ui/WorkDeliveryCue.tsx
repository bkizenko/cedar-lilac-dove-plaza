import {useEffect,useState} from 'react';
import type {Engine} from '../game/engine';
import type {ProductionDelivery} from '../game/productionDelivery';
import {describeDeliveries,type CueTone} from './workDeliveryText';
/** Quiet cue when a paid meal, brew or batch is actually delivered. Reads Engine.subscribeProductionDeliveries
 * (own-team, real delivered quantities, never replayed); coalesces a burst into one line, shows it briefly and
 * invents no goods. Presentation only; no seam present (Worker or old engine) means no cue. */
export function WorkDeliveryCue({engine}:{engine:Engine}){
 const [cue,setCue]=useState<{id:number;tone:CueTone;text:string}|null>(null);
 useEffect(()=>{
  if(!engine.productionDeliveryAvailable)return;
  let buf:ProductionDelivery[]=[],timer:ReturnType<typeof setTimeout>|undefined,id=0;
  const flush=()=>{timer=undefined;const d=describeDeliveries(buf);buf=[];if(d){setCue({id:++id,...d});try{engine.audio?.play('click');}catch{/* optional */}}};
  const off=engine.subscribeProductionDeliveries(d=>{buf.push(d);if(!timer)timer=setTimeout(flush,1200);});
  return()=>{off();if(timer)clearTimeout(timer);};
 },[engine]);
 useEffect(()=>{if(!cue)return;const t=setTimeout(()=>setCue(null),5000);return()=>clearTimeout(t);},[cue]);
 if(!cue)return null;
 return <div className="hud-toast work-cue" data-tone={cue.tone} role="status" aria-live="polite" style={{pointerEvents:'auto',padding:'.3rem .7rem',fontSize:'.78rem',borderColor:cue.tone==='brew'?'rgba(200,160,90,.6)':'rgba(150,190,120,.5)'}}>{cue.text}</div>;
}
