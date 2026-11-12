import {FORMATION_PROFILES,eased,type FormationKind} from './formations';
/** Pure soft-counter table. Every term is a bounded multiplier with a readable reason; no matchup is decisive. */
export type CombatRole='civilian'|'spear'|'blade'|'archer'|'skirmisher'|'mounted'|'commander'|'warden';
export const ROLE_OF:Record<string,CombatRole>={worker:'civilian',spearman:'spear',swordsman:'blade',archer:'archer',ranger:'skirmisher',cavalry:'mounted',leader:'commander',warden:'warden'};
export const roleOfType=(type:string):CombatRole=>ROLE_OF[type]||'civilian';
export type CombatFacts={role:CombatRole;speed:number;armoured:boolean;/** attacks from range this hit */ranged:boolean;formation?:FormationKind;cohesion:number;morale:number;advancing:boolean};
export const COUNTER_RULES={
 /** Per-hit total stays inside this band however many soft terms stack. */
 floor:.6,ceiling:1.45,
 spearVsMounted:1.25,formedSpearsBreakCharge:.9,
 rangedVsUnarmoured:1.15,rangedVsArmoured:.9,
 skirmisherVsSlowHeavy:1.15,slowHeavySpeedRatio:.9,
 mountedVsRanged:1.15,heavyVsLight:1.05,
 /** Morale and cohesion band. */
 moraleLow:.8,moraleHigh:1.05,
} as const;
export type Matchup={multiplier:number;reasons:string[]};
const heavy=(f:CombatFacts)=>f.role==='blade'||f.role==='warden'||f.armoured&&f.speed<5;
const light=(f:CombatFacts)=>f.role==='civilian'||f.role==='archer'||f.role==='skirmisher';
const pct=(m:number)=>`×${m.toFixed(2)}`;
/** Role-versus-role terms only; formation and morale terms live in formationModifier. */
export function counterMatchup(a:CombatFacts,d:CombatFacts):Matchup{
 const R=COUNTER_RULES,reasons:string[]=[];let m=1;
 const add=(factor:number,why:string)=>{m*=factor;reasons.push(`${why} ${pct(factor)}`);};
 if(a.role==='spear'&&d.role==='mounted')add(R.spearVsMounted,'Spears against cavalry');
 if(a.role==='mounted'&&d.role==='spear'&&d.formation&&d.cohesion>=.5)add(eased(R.formedSpearsBreakCharge,d.cohesion),'Formed spears break the charge');
 if(a.ranged){
  if(d.armoured)add(R.rangedVsArmoured,'Arrows glance off armour');
  else add(R.rangedVsUnarmoured,'Arrows against unarmoured foes');
 }
 if(a.role==='skirmisher'&&heavy(d)&&d.speed<=a.speed*R.slowHeavySpeedRatio)add(R.skirmisherVsSlowHeavy,'Skirmisher outpaces a slow heavy foe');
 if(a.role==='mounted'&&(d.role==='archer'||d.role==='skirmisher'))add(R.mountedVsRanged,'Riders run down shooters');
 if((a.role==='blade'||a.role==='warden')&&light(d)&&!a.ranged)add(R.heavyVsLight,'Heavy infantry against light troops');
 return {multiplier:m,reasons};
}
/** Cohesion/formation/morale terms for one hit, from the attacker's group and the target's group. */
export function formationModifier(a:CombatFacts,d:CombatFacts,mounted:boolean):Matchup{
 const R=COUNTER_RULES,reasons:string[]=[];let m=1;
 const add=(factor:number,why:string)=>{if(Math.abs(factor-1)<.005)return;m*=factor;reasons.push(`${why} ${pct(factor)}`);};
 if(a.formation){
  const p=FORMATION_PROFILES[a.formation],off=a.formation==='wedge'&&!a.advancing?1:p.offense;
  add(eased(off,a.cohesion),`${p.name} offense (${Math.round(a.cohesion*100)}% cohesion)`);
 }
 const moraleOf=(f:CombatFacts)=>R.moraleLow+(R.moraleHigh-R.moraleLow)*Math.max(0,Math.min(1,f.morale));
 if(a.formation)add(moraleOf(a),a.morale<.25?'Wavering morale':'Morale');
 if(d.formation){
  const p=FORMATION_PROFILES[d.formation],base=a.ranged?p.takenRanged:mounted?p.takenMounted:p.takenMelee;
  add(eased(base,d.cohesion),`${p.name} ${a.ranged?'against arrows':mounted?'against riders':'in melee'} (${Math.round(d.cohesion*100)}% cohesion)`);
  if(d.morale<.25)add(1.1,'Wavering defenders');
 }
 return {multiplier:m,reasons};
}
export function combinedMatchup(a:CombatFacts,d:CombatFacts,use:{counters:boolean;formations:boolean}={counters:true,formations:true}):Matchup{
 const c=use.counters?counterMatchup(a,d):{multiplier:1,reasons:[]},f=use.formations?formationModifier(a,d,a.role==='mounted'):{multiplier:1,reasons:[]};
 const total=Math.max(COUNTER_RULES.floor,Math.min(COUNTER_RULES.ceiling,c.multiplier*f.multiplier));
 return {multiplier:total,reasons:[...c.reasons,...f.reasons]};
}
