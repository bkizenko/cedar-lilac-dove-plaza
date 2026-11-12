/** Strategic tribe director (ASTRA-16): every society sets a posture for a 30-minute window, defend / recover / raid / develop, from its own
 * measured needs and dated intel, with a seeded temperament so societies differ run to run but a seed reproduces. NO CHEATS: the input is the
 * same `Needs` a society's decision layer reads (own stores, local sight, reported neighbours); the output is only a score multiplier
 * (postureMultiplier) and a stated reason. It never adds goods, people, vision or combat strength, and it reads nothing about the player.
 * Mid-window it revises only on an emergency (famine, a serious threat) so a posture is not flipped by noise. */
import {clamp01,hash32,makeRng} from './rulerCore';
import {raidTargets,type Needs,type Posture} from './societyDecisions';

export const DIRECTOR_RULES={version:1,windowSeconds:1800,emergencyThreat:.85,emergencyFoodSeconds:120,raidMargin:10,developBase:35} as const;
export type Director={window:number;posture:Posture;since:number;boldness:number;caution:number;scores:Record<Posture,number>;reasons:string[]};
/** Fixed per (seed, society): how bold and how careful this house is. 0.2..0.8 so none is a pure warmonger or pacifist. */
export function temperament(seed:number,team:number){const r=makeRng(hash32('temperament',seed,team));return {boldness:.2+.6*r(),caution:.2+.6*r()};}
export const windowOf=(time:number)=>Math.floor(Math.max(0,time)/DIRECTOR_RULES.windowSeconds);
export function scorePostures(n:Needs,boldness:number,caution:number):Record<Posture,number>{
 const hunger=clamp01((600-n.foodSeconds)/600),best=raidTargets(n)[0],seesTarget=!!best&&n.readyFighters>=3;
 const defend=100*n.threat*(.6+.8*caution)+30*n.exposure*(1-n.defence)+(n.targets.some(t=>t.hostile)?15*(1-n.defence):0);
 const recover=80*clamp01((n.weariness-30)/70)+60*clamp01(n.recoveryLeft/900)+50*hunger+40*clamp01((n.unrest-35)/65);
 const raid=seesTarget?Math.max(0,best!.score)*(.5+boldness):0;
 return {develop:DIRECTOR_RULES.developBase,defend:Math.round(defend),recover:Math.round(recover),raid:Math.round(raid)};
}
const reasonsFor=(p:Posture,n:Needs):string[]=>{
 const r:string[]=[];
 if(p==='defend'){if(n.threat>.3)r.push('danger gathers near home');if(n.exposure>.3)r.push('our wealth has been seen');if(n.defence<.5)r.push('our defences are thin');}
 if(p==='recover'){if(n.weariness>30)r.push('the people are war-weary');if(n.recoveryLeft>0)r.push('still recovering from the last strike');if(n.foodSeconds<600)r.push('food is short');if(n.unrest>35)r.push('the house is uneasy');}
 if(p==='raid'){const t=raidTargets(n)[0];if(t)r.push(`a known neighbour looks worth the risk (${t.target})`);}
 if(p==='develop')r.push('nothing presses; build and trade');
 return r;
};
/** Direct one society. `prior` is its stored director record. Pure in (needs, seed, team, prior). */
export function direct(n:Needs,seed:number,team:number,prior?:Director):Director{
 const R=DIRECTOR_RULES,w=windowOf(n.time),t=temperament(seed,team),scores=scorePostures(n,t.boldness,t.caution);
 const emergency=n.threat>=R.emergencyThreat?'defend' as Posture:n.foodSeconds<R.emergencyFoodSeconds?'recover' as Posture:null;
 if(prior&&prior.window===w){
  if(emergency&&emergency!==prior.posture)return {...prior,posture:emergency,scores,reasons:[emergency==='defend'?'emergency: a serious threat':'emergency: famine',...reasonsFor(emergency,n)]};
  return {...prior,scores};
 }
 let posture:Posture=emergency??'develop';
 if(!emergency){let top=scores.develop;for(const p of ['defend','recover','raid'] as Posture[])if(scores[p]>top+(p==='raid'?R.raidMargin:0)){top=scores[p];posture=p;}}
 return {window:w,posture,since:n.time,boldness:t.boldness,caution:t.caution,scores,reasons:reasonsFor(posture,n)};
}
export function validDirector(d:unknown):d is Director{
 const x=d as Director;return !!x&&Number.isInteger(x.window)&&x.window>=0&&['develop','defend','recover','raid'].includes(x.posture)&&Number.isFinite(x.since)&&Number.isFinite(x.boldness)&&Number.isFinite(x.caution)&&Array.isArray(x.reasons);
}
