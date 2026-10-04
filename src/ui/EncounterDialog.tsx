import {useEffect,useRef} from 'react';
import type {Engine} from '@/game/engine';
import {answerEncounter} from '@/game/encounters';
import {personName} from '@/game/people';
import {visitorPrice,tradeWithVisitor} from '@/game/visitors';
import {knownSettlement} from '@/game/barter';
import type {ResKind} from '@/game/types';
export function EncounterDialog({engine}:{engine:Engine|null}){
 const ref=useRef<HTMLDialogElement>(null),encounter=engine?.game.state.encounter;
 useEffect(()=>{if(encounter)ref.current?.showModal();else ref.current?.close();return()=>ref.current?.close();},[encounter]);
 if(!engine||!encounter)return null;
 const g=engine.game,t=g.tribe(encounter.team),stranger=g.state.units.find(u=>u.id===encounter.stranger),person=g.state.units.find(u=>u.id===encounter.person);
 const hostile=g.isFoe(0,t.id),localTrader=stranger?.visit?.phase==='waiting'&&Math.hypot(stranger.x-g.campOf(0).x,stranger.z-g.campOf(0).z)<35;
 const reply=(r:'greet'|'withdraw'|'observe')=>{answerEncounter(g,r);engine.canvas.focus();engine.pushHud();};
 return <dialog ref={ref} className="play-guide settlement-ledger" onCancel={e=>{e.preventDefault();reply('observe');}}>
  <h2 className="font-display text-2xl text-bronze-bright">People on the frontier</h2>
  <p>{person?personName(person):'Your explorer'} has met someone from <strong>{t.name}</strong>.</p>
  <p>{hostile?'They may attack. Choose whether to retreat or continue.':'This is your first face-to-face contact. Their stores and settlement size remain unknown.'}</p>
  {stranger?.carryType&&stranger.carry>0&&<p>Visible cargo: {Math.floor(stranger.carry)} {stranger.carryType}.</p>}
  {localTrader&&stranger&&<section><h3>Discuss their carried goods</h3>{(['food','wood','stone','copper','iron'] as ResKind[]).map(good=>{
    const price=visitorPrice(g,stranger,good);if(!price||good==='copper'&&g.tribe(0).age<1||good==='iron'&&g.tribe(0).age<2)return null;
    return <button key={good} disabled={g.tribe(0)[good]<price} onClick={()=>{if(tradeWithVisitor(g,stranger.id,good))reply('greet');else g.banner('The trader is no longer available for this exchange',4);engine.pushHud();}}>Offer {price} {good} for their cargo</button>;
  })}</section>}
  {!hostile&&<button onClick={()=>reply('greet')}>Greet them peacefully</button>}
  {!hostile&&knownSettlement(g,t.id)&&<button onClick={()=>{reply('greet');engine.keyboard.ledger=true;engine.pushHud();}}>Plan a trade offer or delegation</button>}
  {!hostile&&!knownSettlement(g,t.id)&&<p>Locate their settlement to send a trade or peace delegation. Reports arrive with the carrier.</p>}
  <button onClick={()=>reply('withdraw')}>Bring this explorer home</button>
  <button onClick={()=>reply('observe')}>Keep going</button>
 </dialog>;
}
