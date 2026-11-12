/** Breakaway settlements and the choices that answer them (CAT-118, with warned unrest stages from M4-07). A daughter hearth far from home, under an uneasy
 * house, that can feed itself, drifts toward autonomy: loyal -> restive -> autonomous -> breakaway, one warned stage per review, with hysteresis on the way
 * down. The parent then weighs bounded choices (concede, accept tribute, coerce, recognise, wait) from its own stores and strength.
 * Pure and seeded. The runtime applies consequences only through existing ledgers (unrest, weariness, relations, history); no goods or people appear. */
import {clamp01,hash32,makeRng} from './rulerCore';

export const STAGES=['loyal','restive','autonomous','breakaway'] as const;
export type Stage=typeof STAGES[number];
export type Resolution='reintegrated'|'recognised'|'tributary';
export type Choice='concede'|'tribute'|'coerce'|'recognise'|'wait';
export type Breakaway={hall:number;parent:number;since:number;stage:Stage;pressure:number;distance:number;reasons:string[];choice?:Choice;choiceAt?:number;conflictUntil?:number;relief?:number;resolution?:Resolution;resolvedAt?:number};
export type SettlementView={hall:number;parent:number;distance:number;ageSeconds:number;residents:number;selfSufficiency:number;localGrievance:number};
export type Option={kind:Choice;score:number;cost:{food:number;wood:number;people:number};risk:number;reasons:string[]};
export const BREAKAWAY_RULES={version:1,nearMeters:120,farMeters:600,up:[.35,.55,.75],downMargin:.1,reviewSeconds:120,minResidents:4,conflictSeconds:480,concedeFood:60,concedeWood:30,coerceFighters:3} as const;

export function pressureOf(v:SettlementView,unrest:number,legitimacy:number):{value:number;reasons:string[]}{
 const R=BREAKAWAY_RULES,dist=clamp01((v.distance-R.nearMeters)/(R.farMeters-R.nearMeters)),u=clamp01(unrest/100),l=clamp01(legitimacy/100),age=clamp01(v.ageSeconds/1800);
 const value=clamp01(.30*dist+.30*u+.20*v.selfSufficiency+.15*v.localGrievance+.05*age-.20*l*(1-.5*dist));
 const reasons:string[]=[];
 if(dist>.4)reasons.push('far from the parent hall');if(u>.4)reasons.push('the house is uneasy');if(v.selfSufficiency>.6)reasons.push('it can feed itself');if(v.localGrievance>.4)reasons.push('old quarrels press on it');if(l>.6)reasons.push('the house is respected (holds it)');
 return {value,reasons};
}
/** One warned stage per review. Rising needs pressure past the threshold; falling needs it to fall `downMargin` below the stage's own threshold. */
export function stageStep(cur:Stage,p:number):Stage{
 const R=BREAKAWAY_RULES,i=STAGES.indexOf(cur);
 if(i<STAGES.length-1&&p>=R.up[i])return STAGES[i+1];
 if(i>0&&p<R.up[i-1]-R.downMargin)return STAGES[i-1];
 return cur;
}
export type ParentView={food:number;wood:number;readyFighters:number;defence:number;weariness:number;unrest:number};
export function options(v:SettlementView,pressure:number,p:ParentView):Option[]{
 const R=BREAKAWAY_RULES,far=clamp01((v.distance-R.nearMeters)/(R.farMeters-R.nearMeters));
 const o=(kind:Choice,base:number,terms:[string,number][],cost:Option['cost'],risk:number):Option=>{
  const score=Math.max(0,Math.min(100,Math.round((base+terms.reduce((t,x)=>t+x[1],0))*10)/10));
  return {kind,score,cost,risk:Math.round(clamp01(risk)*100)/100,reasons:terms.filter(t=>Math.abs(t[1])>=6).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).map(t=>`${t[0]} ${t[1]>0?'+':''}${Math.round(t[1])}`).slice(0,3)};
 };
 const canPay=p.food>=R.concedeFood&&p.wood>=R.concedeWood,canFight=p.readyFighters>=R.coerceFighters;
 const out:Option[]=[
  o('concede',10,[['pressure is high',40*pressure],['the parent can afford it',canPay?20:-40],['distance makes force costly',20*far]],{food:R.concedeFood,wood:R.concedeWood,people:0},.2),
  o('tribute',12,[['pressure is high',30*pressure],['distance makes force costly',25*far],['the house is uneasy',-15*clamp01(p.unrest/100)]],{food:0,wood:0,people:0},.25),
  o('coerce',5,[['the parent is strong',canFight?35*(.4+p.defence):-50],['the settlement is small',20*(1-clamp01(v.residents/16))],['distance',-45*far],['war-weary',-45*clamp01(p.weariness/100)],['the house is uneasy',-20*clamp01(p.unrest/100)]],{food:0,wood:0,people:R.coerceFighters},.5),
  o('recognise',8,[['pressure is high',25*pressure],['distance',30*far],['war-weary',25*clamp01(p.weariness/100)]],{food:0,wood:0,people:0},.1),
  o('wait',30,[['pressure is not yet high',-45*pressure],['it is still only restive',pressure<.55?20:-20]],{food:0,wood:0,people:0},.3),
 ];
 return out.map(x=>(x.kind==='concede'&&!canPay)||(x.kind==='coerce'&&!canFight)?{...x,score:0,reasons:['cannot be done now',...x.reasons].slice(0,3)}:x);
}
export const pickOption=(opts:Option[],seed:number,hall:number,epoch:number):Option=>{
 const r=makeRng(hash32('breakaway-choice',seed,hall,epoch)),noisy=opts.map(o=>({o,s:o.score+(r()-.5)*4}));
 return noisy.sort((a,b)=>b.s-a.s||a.o.kind.localeCompare(b.o.kind))[0].o;
};
/** Whether force brings a breakaway back. Seeded roll against parent strength over local strength, cut by distance. */
export function coerceSucceeds(seed:number,hall:number,epoch:number,parentPower:number,v:SettlementView):{ok:boolean;chance:number}{
 const local=.5+v.residents*.5*(.4+.6*v.selfSufficiency),far=clamp01((v.distance-BREAKAWAY_RULES.nearMeters)/(BREAKAWAY_RULES.farMeters-BREAKAWAY_RULES.nearMeters));
 const chance=clamp01(parentPower/(parentPower+local)*(1-.5*far));
 return {ok:makeRng(hash32('coerce',seed,hall,epoch))()<chance,chance:Math.round(chance*100)/100};
}
export function validBreakaway(b:unknown):b is Breakaway{
 const x=b as Breakaway;return !!x&&Number.isInteger(x.hall)&&Number.isInteger(x.parent)&&(STAGES as readonly string[]).includes(x.stage)&&Number.isFinite(x.since)&&Number.isFinite(x.pressure)&&x.pressure>=0&&x.pressure<=1&&Number.isFinite(x.distance)&&Array.isArray(x.reasons)&&(x.relief===undefined||Number.isFinite(x.relief))&&
  (x.resolution===undefined||['reintegrated','recognised','tributary'].includes(x.resolution))&&(x.choice===undefined||['concede','tribute','coerce','recognise','wait'].includes(x.choice));
}
