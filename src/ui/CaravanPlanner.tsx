import {useState} from 'react';
import type {Engine} from '../game/engine';import type {ResKind} from '../game/types';
import {planCaravan} from '../game/caravanRoutes';
export function CaravanPlanner({engine,team,give,get,budget,minimum}:{engine:Engine;team:number;give:ResKind;get:ResKind;budget:number;minimum:number}){
 const [size,setSize]=useState(1),[guards,setGuards]=useState(0),[transport,setTransport]=useState<'any'|'pack'|'cart'>('any');
 return <details className="craft-group"><summary>Repeat caravan</summary><div className="craft-options">
 <div className="trade-terms"><label>Carriers<select value={size} onChange={e=>setSize(Number(e.target.value))}>{[1,2,3].map(n=><option key={n}>{n}</option>)}</select></label>
 <label>Guards<select value={guards} onChange={e=>setGuards(Number(e.target.value))}>{[0,1,2].map(n=><option key={n}>{n}</option>)}</select></label>
 <label>Transport<select value={transport} onChange={e=>setTransport(e.target.value as typeof transport)}><option value="any">Any available</option><option value="pack">Pack animals</option><option value="cart">Carts</option></select></label></div>
 <p>The total offer is split between carriers. Deals happen at arrival; partial trades can return. Three workers and a food reserve stay home.</p>
 <button type="button" disabled={give===get||budget<size||minimum<size} onClick={()=>{planCaravan(engine.game,team,give,get,budget,minimum,size,guards,transport);engine.pushHud();}}>Create regular caravan</button>
 </div></details>;
}
