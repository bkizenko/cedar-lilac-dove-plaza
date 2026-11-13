import {useEffect,useRef,useState} from 'react';
import type {Engine} from '../game/engine';
import {rivalCourtChange} from './council/courtLine';
import type {CouncilModel,RivalCourt} from '../game/rulersView';
import {LeaderPortrait} from './h/LeaderPortrait';
/** Death or change of the ruling person reads as an event, not a silent handover-card edit: a dismissible toast with
 * the chronicle line, who leads now and how they came to it. Presentation only; reads the council model, never mutates it. */
type Seen={ruler:string;generation:number;house:string};
/** Seeded bust of the person now holding the seat, so a change of rule has a face. Rival faces key on name+house (no unit id is public). */
type Face={name:string;society:string;seed:number;colors:{primary:string;secondary:string}};
type Event={id:number;title:string;body:string;tone:'mourning'|'rise';face?:Face};
const nameKey=(s:string)=>{let h=0;for(let i=0;i<s.length;i++)h=(Math.imul(h,31)+s.charCodeAt(i))|0;return Math.abs(h)||1;};
const lastDeath=(log:string[],name:string)=>[...log].reverse().find(l=>l.includes(name)&&/died|killed|fell/i.test(l));
export function describeRulerChange(prev:Seen,c:CouncilModel):Omit<Event,'id'>|null{
 if(!c.enabled||!c.ruler||!c.house)return null;
 if(prev.ruler===c.ruler.name&&prev.generation===c.house.generation)return null;
 const line=lastDeath(c.log,prev.ruler);
 const how=c.handover?.regent?`${c.handover.regent} rules as regent for now.`:`${c.ruler.name}, ${c.ruler.age}, takes the seat. ${c.ruler.headline}.`;
 return {tone:line?'mourning':'rise',title:line?`${prev.ruler} is dead`:`New ruler of House ${c.house.name}`,body:`${line?line.replace(/^\d+:\s*/,'')+'. ':''}${how}`};
}
export function RulerEventToast({engine}:{engine:Engine}){
 const [ev,setEv]=useState<Event|null>(null),seen=useRef<Seen|null>(null),rivals=useRef<Map<number,RivalCourt>>(new Map()),n=useRef(0);
 useEffect(()=>{
  let alive=true,busy=false;
  const poll=async()=>{
   if(busy||engine.disposed)return;busy=true;
   try{
    const reply=await engine.readModel({kind:'rulers-council'});if(!alive||reply.model.kind!=='rulers-council')return;
    const c=reply.model.council;if(!c.enabled||!c.ruler||!c.house)return;
    for(const nb of c.neighbours){const was=rivals.current.get(nb.team),rc=rivalCourtChange(nb.name,was,nb.court);if(nb.court)rivals.current.set(nb.team,nb.court);
     if(rc){try{engine.audio?.proc.rulerEvent('rise');}catch{/* cue is optional */}const id=nb.identity,k=nameKey(nb.court?.ruler+'|'+nb.court?.house);setEv({id:++n.current,tone:'rise',...rc,face:nb.court?{name:nb.court.ruler,society:nb.name,seed:k,colors:{primary:id?.primary??'#8a6a3a',secondary:id?.secondary??'#d9b36a'}}:undefined});}}
    const prev=seen.current;seen.current={ruler:c.ruler.name,generation:c.house.generation,house:c.house.name};
    const d=prev&&prev.house===c.house.name?describeRulerChange(prev,c):null;
    if(d){try{engine.audio?.play('invalid');engine.audio?.proc.rulerEvent(d.tone);}catch{/* cue is optional */}setEv({id:++n.current,...d});}
   }catch{/* council optional on old saves */}finally{busy=false;}
  };
  void poll();const t=globalThis.setInterval(()=>void poll(),2000);return()=>{alive=false;globalThis.clearInterval(t);};
 },[engine]);
 useEffect(()=>{if(!ev)return;const t=setTimeout(()=>setEv(null),14000);return()=>clearTimeout(t);},[ev]);
 if(!ev)return null;
 return <div className="hud-toast ruler-event" data-tone={ev.tone} role="status" aria-live="polite" style={{pointerEvents:'auto',borderColor:ev.tone==='mourning'?'rgba(180,140,140,.55)':'rgba(200,160,90,.6)'}}>
  <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>{ev.face&&<div style={{flex:'0 0 auto',borderRadius:8,overflow:'hidden',border:'1px solid rgba(200,160,90,.5)'}}><LeaderPortrait compact size={56} leaderId={ev.face.seed} worldSeed={ev.face.seed} era={1} name={ev.face.name} society={ev.face.society} colors={ev.face.colors}/></div>}
  <div><strong>{ev.title}</strong><div className="text-xs" style={{opacity:.85}}>{ev.body}</div>
  <button type="button" className="mt-1 text-[11px] underline" onClick={()=>setEv(null)}>Dismiss</button></div></div></div>;
}
