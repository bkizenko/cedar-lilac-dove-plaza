import {Shield} from 'lucide-react';
import type {Engine} from '../game/engine';
import type {Unit} from '../game/types';
import {personName} from '../game/people';
import {ARMOR_RULES,armorEquipIssue,equipArmor,unequipArmor,wornArmor} from '../game/armor';
import {GameTooltip} from './GameTooltip';
export function ArmorControls({engine,people,run,button='rounded-md border border-bronze/40 px-2 py-1 text-xs disabled:opacity-50'}:{engine:Engine;people:Unit[];run?:(action:()=>boolean)=>void;button?:string}){
 const g=engine.game,act=(action:()=>{accepted:boolean;reason:string})=>{const issue=()=>{const result=action();g.banner(result.reason,4);return result.accepted;};if(run)run(issue);else{issue();engine.pushHud();}};
 return <section aria-label="Armor" className="space-y-1 text-xs">{people.filter(u=>u.hp>0&&u.team===0&&!u.prisoner).map(u=>{
  const worn=wornArmor(g,u),available=(g.state.armor?.assets||[]).filter(a=>a.holder.kind!=='unit'&&(a.holder.kind==='ground'?g.visibleAt(a.holder.x,a.holder.z):a.team===u.team)&&Math.hypot(a.holder.x-u.x,a.holder.z-u.z)<=24).sort((a,b)=>Number(!!armorEquipIssue(g,u.id,a.id))-Number(!!armorEquipIssue(g,u.id,b.id))||b.condition-a.condition)[0],issue=available?armorEquipIssue(g,u.id,available.id):null;
  return <div key={u.id} className="flex flex-wrap items-center gap-2"><GameTooltip title={`${personName(u)} · ${worn?'Padded armor':'No armor'}`} description={`Up to ${Math.round(ARMOR_RULES.protection*100)}% combat protection, reduced by wear. ${Math.round((1-ARMOR_RULES.movementMultiplier)*100)}% slower on foot. Clothing remains separate.`}><span className="inline-flex items-center gap-1"><Shield className="size-3.5"/>{people.length>1&&personName(u)}{worn?`${Math.round(worn.condition*100)}%`:'No armor'}</span></GameTooltip>{worn?<><progress aria-label="Armor condition" max={1} value={worn.condition} className="h-1.5 w-12 accent-bronze"/><button className={button} onClick={()=>act(()=>unequipArmor(g,u.id))}>Put away</button></>:available?<button className={button} disabled={!!issue} title={issue||undefined} onClick={()=>act(()=>equipArmor(g,u.id,available.id))}>Equip · {Math.round(available.condition*100)}%</button>:null}</div>;
 })}</section>;
}
