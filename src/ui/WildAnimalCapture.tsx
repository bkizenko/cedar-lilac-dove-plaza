import {useState} from 'react';
import type {Engine} from '../game/engine';
import type {Game} from '../game/sim';
import type {Critter} from '../game/types';
import {HERD} from '../game/husbandry';
import {herdRules,HERD_SPECIES} from '../game/animalSpecies';
import {useLifecycleAction} from './useLifecycleAction';
type HerdSpecies=typeof HERD_SPECIES[number];
export type WildCaptureOffer={species:HerdSpecies;penId:number;distance:number;food:number;hands:number}|{species:string;reason:string};
/** What capturing the selected wild animal would take, read only from real pens, food and selected hands. */
export function wildCaptureOffer(g:Game,animal:Critter|null|undefined):WildCaptureOffer|null{
 if(!animal||animal.hp<=0||!g.state.wildlife.includes(animal))return null;
 const species=animal.species;
 if(!(HERD_SPECIES as readonly string[]).includes(species))return{species,reason:`A wild ${species} cannot be penned — select hunters, then right-click to hunt`};
 const pens=g.state.buildings.filter(b=>b.team===0&&b.type==='pen'&&b.hp>0&&g.finished(b)).map(b=>({b,d:Math.hypot(b.x-animal.x,b.z-animal.z)})).sort((a,b)=>a.d-b.d);
 if(!pens.length)return{species,reason:'Build a pasture pen first — captured animals need somewhere to live'};
 const near=pens.find(p=>p.d<HERD.searchRadiusMeters);
 if(!near)return{species,reason:`Nearest pen is ${Math.round(pens[0].d)} m away — handlers only lead animals home from within ${HERD.searchRadiusMeters} m`};
 const hands=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.selected&&u.type==='worker'&&!u.militia).length;
 return{species:species as HerdSpecies,penId:near.b.id,distance:Math.round(near.d),food:herdRules(species).tamingFood,hands};
}
export function WildAnimalCapture({engine}:{engine:Engine}){
 const g=engine.game,action=useLifecycleAction(engine),[feedback,setFeedback]=useState(''),epoch=engine.dispatchEpoch;
 const offer=wildCaptureOffer(g,g.selectedCritter);
 if(!offer)return null;
 if('reason' in offer)return <p className="mt-1.5 text-[11px] leading-snug text-parchment-dim" role="note">{offer.reason}</p>;
 const run=()=>{if(engine.disposed||engine.dispatchEpoch!==epoch)return;void action.run(()=>engine.dispatch({kind:'husbandry-order',penId:offer.penId,action:'capture',species:offer.species,...(offer.hands>1?{group:true}:{})}),reply=>{if(reply.epoch===epoch&&engine.dispatchEpoch===epoch)setFeedback(reply.reason);});};
 return <div className="mt-2">
  <button type="button" className="min-h-11 w-full rounded-md border border-bronze/40 px-3 text-left" disabled={action.busy} onClick={run}>
   Capture this {offer.species}
   <span className="block text-[11px] text-parchment-dim">{offer.food} food · pen {offer.distance} m away · {offer.hands>1?`${offer.hands} selected hands work the herd`:'nearest free handler'} · may refuse</span>
  </button>
  {feedback&&<p className="mt-1 text-[11px] leading-snug" role="status">{feedback}</p>}
 </div>;
}
