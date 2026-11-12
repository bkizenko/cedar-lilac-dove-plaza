import {Shield} from 'lucide-react';
import type {Engine} from '../game/engine';
import type {Unit} from '../game/types';
import {personName} from '../game/people';
import {ARMOR_RULES} from '../game/armor';
import type{EngineDispatchCommand}from'../game/engineDispatch';
import{useOwnerReadModels}from'./useOwnerReadModels';
import {GameTooltip} from './GameTooltip';
export function ArmorControls({engine,people,run,button='rounded-md border border-bronze/40 px-2 py-1 text-xs disabled:opacity-50'}:{engine:Engine;people:Unit[];run:(command:EngineDispatchCommand)=>Promise<void>;button?:string}){
 const g=engine.game,queries=people.filter(u=>u.hp>0&&u.team===0&&!u.prisoner).map(u=>({kind:'armor-choice' as const,unitId:u.id})),read=useOwnerReadModels(engine,queries);
 return <section aria-label="Armor" className="space-y-1 text-xs">{people.filter(u=>u.hp>0&&u.team===0&&!u.prisoner).map(u=>{
  const availability=read({kind:'armor-choice',unitId:u.id}),model=availability.model,worn=model?.wornArmorId===undefined?undefined:g.state.armor?.assets.find(a=>a.id===model.wornArmorId),available=model?.availableArmorId===undefined?undefined:g.state.armor?.assets.find(a=>a.id===model.availableArmorId),issue=availability.issue||model?.issue;
  return <div key={u.id} className="flex flex-wrap items-center gap-2"><GameTooltip title={`${personName(u)} · ${worn?'Padded armor':'No armor'}`} description={`Up to ${Math.round(ARMOR_RULES.protection*100)}% combat protection, reduced by wear. ${Math.round((1-ARMOR_RULES.movementMultiplier)*100)}% slower on foot. Clothing remains separate.`}><span className="inline-flex items-center gap-1"><Shield className="size-3.5"/>{people.length>1&&personName(u)}{worn?`${Math.round(worn.condition*100)}%`:'No armor'}</span></GameTooltip>{worn?<><progress aria-label="Armor condition" max={1} value={worn.condition} className="h-1.5 w-12 accent-bronze"/><button className={button} onClick={()=>run({kind:'unequip-armor',unitId:u.id})}>Put away</button></>:available?<button className={button} disabled={!!issue} title={issue||undefined} onClick={()=>run({kind:'equip-armor',unitId:u.id,armorId:available.id})}>Equip · {Math.round(available.condition*100)}%</button>:null}</div>;
 })}</section>;
}
