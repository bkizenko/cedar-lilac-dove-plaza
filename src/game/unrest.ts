/** Casus belli, claims and revolutions with warning stages. Pure functions: callers feed current numbers, get stage + reasons.
 * Revolutions are never instant: stages escalate and each exposes a visible, countering action. */
import {clamp} from './rulerCore';
import type {Polity} from './polityModel';

export type CasusBelli='claim'|'tribute'|'holy'|'reconquest'|'defence'|'raid'|'succession'|'liberation';
export type Claim={holder:string;target:string;kind:CasusBelli;strength:number;expiresTick:number};
export function cbLegitimacyCost(cb:CasusBelli):number{return ({claim:6,tribute:10,holy:4,reconquest:3,defence:0,raid:14,succession:5,liberation:2} as const)[cb];}
/** Claims decay; strong ones last longer. Pure filter. */
export const liveClaims=(cs:Claim[],tick:number)=>cs.filter(c=>c.expiresTick>tick&&c.strength>0);

export type UnrestInput={legitimacy:number;warWeariness:number;foodShortage:number;taxBurden:number;faithDivergence:number;coalitionLoss:number;rulerPopularity:number};
export const STAGES=['calm','grumbling','agitation','plots','uprising','civilWar'] as const;
export type Stage=(typeof STAGES)[number];
/** 0..100 unrest; each factor weighted, buffered by legitimacy and institutionalisation. */
export function unrest(u:UnrestInput,p:Polity):number{
 const raw=.22*u.warWeariness+.2*u.foodShortage+.14*u.taxBurden+.14*u.faithDivergence+.2*u.coalitionLoss+.1*(100-u.rulerPopularity);
 const buffer=.35*u.legitimacy+.2*p.institutionalization;
 return Math.round(clamp(raw*1.5-buffer*.5+10));
}
export function stageOf(x:number):Stage{return x<15?'calm':x<30?'grumbling':x<50?'agitation':x<70?'plots':x<88?'uprising':'civilWar';}
export const COUNTER:Record<Stage,string>={calm:'none needed',grumbling:'festival, grain dole or a gesture to the faction',agitation:'concessions, a council seat, or ending the unpopular war',plots:'purge the ringleaders (at a legitimacy cost) or buy the coalition',uprising:'field the retinue or negotiate; every day of delay empowers a rival claimant',civilWar:'the realm splits along its fault lines'};
/** Who leads the revolt: the strongest internal claimant if there is one, else a faction. */
export function revoltLeader(claimants:{id:string;strength:number}[]):string|null{
 return [...claimants].sort((a,b)=>b.strength-a.strength)[0]?.id??null;
}
/** Conquest integration: how much of the conquered society's legitimacy transfers. No instant annexation: stays 0 until staged. */
export function integrationStep(prev:number,culturalGap:number,faithGap:number,occupationTicks:number):number{
 const rate=.004*(1-culturalGap)*(1-.6*faithGap)+Math.min(.002,occupationTicks*1e-6);
 return clamp(prev+rate,0,1);
}
