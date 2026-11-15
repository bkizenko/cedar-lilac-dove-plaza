import {useEffect,useRef,useState} from 'react';
import {Swords,Handshake,Shield,Crown} from 'lucide-react';
import type {Engine} from '../../game/engine';
import {useOwnerReadModels} from '../useOwnerReadModels';
import {newWars} from './warPopupModel';
const QC={kind:'rulers-council'} as const;
/** A big, plain popup the moment a house declares war on us: what it means and the three things to do about it. */
export function WarPopup({engine,onNeighbours}:{engine:Engine;onNeighbours:()=>void}){
 const council=useOwnerReadModels(engine,[QC])(QC).model?.council,seen=useRef<Set<number>|null>(null),[queue,setQueue]=useState<number[]>([]);
 const hostile=(council?.neighbours??[]).filter(n=>n.hostile).map(n=>n.team);
 const key=hostile.join(',');
 const enabled=!!council?.enabled;
 useEffect(()=>{
  if(!enabled)return;
  const r=newWars(seen.current,hostile);seen.current=r.next;
  if(r.fresh.length)setQueue(q=>[...q,...r.fresh.filter(t=>!q.includes(t))]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[enabled,key]);
 const team=queue[0],n=council?.neighbours.find(x=>x.team===team);
 if(team===undefined||!n)return null;
 const close=()=>setQueue(q=>q.slice(1));
 return <div className="hw-warpop-back" role="presentation"><section className="hw-warpop" role="alertdialog" aria-modal="true" aria-label={`${n.name} declares war`}>
  <h2><Swords size={36}/>{n.name} are at war with you</h2>
  <p>Their warriors may raid your village or camp. You can send a messenger to offer peace (they may refuse while the fight goes well for them), or sound the horn so your people arm and defend.</p>
  <div className="hw-row">
   <button type="button" className="hw-primary" onClick={()=>{void engine.dispatch({kind:'propose-peace',team},undefined,{notice:true});close();}}><Handshake size={22}/>Offer peace</button>
   <button type="button" className="hw-btn-wide" onClick={()=>{engine.game.soundDefenseHorn();engine.pushHud();close();}}><Shield size={22}/>Sound the horn</button>
   <button type="button" className="hw-btn-wide" onClick={()=>{close();onNeighbours();}}><Crown size={22}/>Open neighbours</button>
   <button type="button" className="hw-btn-wide" onClick={close}>Dismiss</button>
  </div>
 </section></div>;
}
