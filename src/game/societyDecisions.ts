/** Society decision layer (M2-01, M2-02, M2-10). A rival society lists a bounded set of alternatives, scores each from its own MEASURED
 * needs, costs and risks, states the reasons, and commits to one plan that reserves resources and holds with hysteresis.
 * Pure and seeded: no Game import, no Math.random, no Date.now. The runtime (societyRuntime.ts) measures `Needs` from the live game using
 * only what the society could know (its own stores, local sight, dated intel) and applies the chosen plan through existing parties.
 * Nothing here creates goods, people or knowledge: scores and reservations only. */
import {clamp01,hash32,makeRng} from './rulerCore';

export const KINDS=['grow','stockpile','settle','trade','raid','ally','fortify','recover'] as const;
export type Kind=typeof KINDS[number];
export type Cost={food:number;wood:number;stone:number;people:number;seconds:number};
/** What a society has learned about one neighbour. Built from dated reports only (societyIntel.ts); absent neighbours are not listed. */
export type TargetView={id:number;observedAt:number;ageSeconds:number;confidence:number;defence:number;wealth:number;distance:number;hostile:boolean;allied:boolean;trust:number;grievance:number};
export type Needs={
 time:number;foodSeconds:number;food:number;foodPerSecond:number;housing:number;pop:number;adults:number;wood:number;stone:number;
 wealth:number;defence:number;threat:number;unrest:number;weariness:number;recoveryLeft:number;openLand:number;climate:number;aggro:number;exposure:number;
 expansion:{drive:number;mode:string;allow:boolean;block?:string};readyFighters:number;targets:TargetView[];
 reserved:{food:number;wood:number;stone:number};
};
export type Posture='develop'|'defend'|'recover'|'raid';
export type Alternative={kind:Kind;score:number;feasible:boolean;blocked?:string;cost:Cost;risk:number;target?:number;reasons:string[];redirects?:{target:number;score:number}[]};
export type Plan={id:number;kind:Kind;target?:number;since:number;until:number;reserve:{food:number;wood:number;stone:number};people:number;score:number;reasons:string[]};
export type Decision={choice:Alternative;change:'start'|'keep'|'switch'|'interrupt'|'expire'|'drop';why:string[];dropped?:Plan;alternatives:Alternative[]};

export const DECISION_RULES={version:1,reviewSeconds:30,minHoldSeconds:120,planSeconds:600,switchMargin:14,incumbentBonus:8,jitter:3,
 interruptFoodSeconds:150,interruptThreat:.75,growWood:36,settleCrew:3,settleWood:100,fortifyWood:40,fortifyStone:10,raidFighters:3,raidFoodSeconds:180,
 intelHalfLifeSeconds:1500,defenceScalePower:6,maximumTargets:6,reasonThreshold:6} as const;

const NEUTRAL:Record<Posture,Partial<Record<Kind,number>>>={
 develop:{},
 defend:{fortify:1.4,raid:.4,settle:.7,ally:1.15},
 recover:{recover:1.5,raid:.2,settle:.5,grow:.8,stockpile:1.2},
 raid:{raid:1.5,fortify:.9,trade:.8,settle:.8},
};
export const postureMultiplier=(p:Posture,k:Kind)=>NEUTRAL[p][k]??1;
const noCost=():Cost=>({food:0,wood:0,stone:0,people:0,seconds:0});
type Term={label:string;delta:number};
function build(kind:Kind,base:number,terms:Term[],cost:Cost,risk:number,extra:Partial<Alternative>={}):Alternative{
 const raw=base+terms.reduce((t,x)=>t+x.delta,0);
 const reasons=terms.filter(t=>Math.abs(t.delta)>=DECISION_RULES.reasonThreshold).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,4).map(t=>`${t.label} ${t.delta>0?'+':''}${Math.round(t.delta)}`);
 return {kind,score:Math.max(0,Math.min(100,Math.round(raw*10)/10)),feasible:true,cost,risk:Math.round(clamp01(risk)*100)/100,reasons,...extra};
}
const block=(a:Alternative,why:string):Alternative=>({...a,feasible:false,blocked:why,score:0});

/** Best raid target by observed reward against observed defence. Deterrence is real: a well-defended neighbour is worth less, so the raid
 * is redirected to a softer known target or abandoned. Unknown neighbours are not listed in `targets` and can never be chosen. */
export function raidTargets(n:Needs):{target:number;score:number;reward:number;deterrence:number;risk:number}[]{
 const out=[];
 for(const t of n.targets.slice(0,DECISION_RULES.maximumTargets)){
  if(t.allied||t.trust>=.6)continue;
  const reward=t.wealth*t.confidence,deterrence=clamp01(t.defence),expected=reward*(1-.85*deterrence);
  const risk=clamp01(.6*deterrence+.25*(1-t.confidence)+.15*n.weariness/100),far=clamp01(t.distance/600);
  const hunger=clamp01((600-n.foodSeconds)/600);
  const score=100*expected*(.45+.55*n.aggro)-40*risk-15*far+25*hunger*reward+10*clamp01(t.grievance)-40*n.threat*(1-n.defence);
  out.push({target:t.id,score,reward,deterrence,risk});
 }
 return out.sort((a,b)=>b.score-a.score||a.target-b.target);
}

/** Enumerate exactly the eight bounded alternatives with scores, costs, risks and stated reasons. Infeasible ones stay listed with the blocker. */
export function enumerate(n:Needs,posture:Posture='develop'):Alternative[]{
 const R=DECISION_RULES,hunger=clamp01((600-n.foodSeconds)/600),crowd=clamp01((n.housing-.75)/.25),unrest=clamp01(n.unrest/100);
 const out:Alternative[]=[];
 // grow: add housing and fields at home
 {const a=build('grow',18,[{label:'crowded housing',delta:55*crowd},{label:'own prosperity',delta:12*clamp01(n.wealth)},{label:'enemies near',delta:-35*n.threat},{label:'food is short',delta:-25*hunger},{label:'unrest at home',delta:-20*unrest}],{...noCost(),wood:R.growWood,seconds:240},.15+.2*n.threat);
  out.push(n.wood-n.reserved.wood<R.growWood?block(a,'not enough timber beyond what is already reserved'):n.foodSeconds<450?block(a,'food reserve is too short to add mouths'):a);}
 // stockpile: hold food before anything else
 {const a=build('stockpile',15,[{label:'food is short',delta:65*hunger},{label:'bad seasons',delta:20*n.climate},{label:'thin reserve',delta:10*(1-clamp01(n.foodSeconds/1500))}],{...noCost(),food:Math.round(n.foodPerSecond*900)},.1);out.push(a);}
 // settle: send families to a new hearth (drivers already measure push, pull, enable, brake)
 {const e=n.expansion,a=build('settle',25,[{label:'push and pull to leave',delta:70*clamp01((e.drive-.5)/1)},{label:'enemies near',delta:-30*n.threat},{label:'food is short',delta:-30*hunger}],{...noCost(),wood:R.settleWood,people:R.settleCrew,food:Math.round(n.foodPerSecond*600),seconds:900},.3+.3*n.threat);
  out.push(!e.allow?block(a,e.block||'the drivers do not point to a new hearth'):n.wood-n.reserved.wood<R.settleWood?block(a,'not enough timber for a founding party'):a);}
 // trade: barter with known, non-hostile neighbours
 {const partners=n.targets.filter(t=>!t.hostile&&t.trust>=0),a=build('trade',20,[{label:'food is short',delta:45*hunger},{label:'known partners',delta:15*clamp01(partners.length/3)},{label:'enemies near',delta:-20*n.threat}],{...noCost(),people:2,seconds:300},.15+.15*n.threat,{target:partners[0]?.id});
  out.push(partners.length?a:block(a,'no known neighbour to barter with'));}
 // raid: take from a known, valuable, softly defended neighbour
 {const ts=raidTargets(n),best=ts[0],a=build('raid',0,best?[{label:'visible wealth',delta:100*best.reward*(.45+.55*n.aggro)},{label:'their defences deter',delta:-85*best.reward*best.deterrence*(.45+.55*n.aggro)},{label:'risk',delta:-40*best.risk},{label:'hunger drives it',delta:25*hunger*best.reward},{label:'own weakness at home',delta:-40*n.threat*(1-n.defence)}]:[],{...noCost(),people:R.raidFighters,food:Math.round(n.foodPerSecond*300),seconds:600},best?.risk??1,{target:best?.target,redirects:ts.slice(1,4).map(t=>({target:t.target,score:Math.round(Math.max(0,t.score)*10)/10}))});
  out.push(!best?block(a,'no known target to strike'):n.readyFighters<R.raidFighters?block(a,'too few armed adults to spare'):n.foodSeconds<R.raidFoodSeconds?block(a,'food reserve is below the departure minimum'):n.recoveryLeft>0?block(a,'still recovering from the last strike'):a);}
 // ally: pact with a known neighbour; a common danger raises it
 {const c=n.targets.filter(t=>!t.hostile&&!t.allied&&t.trust>=.15).sort((x,y)=>y.trust-x.trust||x.id-y.id)[0],a=build('ally',15,[{label:'danger near',delta:45*n.threat},{label:'unrest at home',delta:15*unrest},{label:'warm relations',delta:15*(c?.trust??0)}],{...noCost(),people:1,seconds:120},.1,{target:c?.id});
  out.push(c?a:block(a,'no known neighbour is warm enough to treat with'));}
 // fortify: spend timber, stone and drill on defences
 {const a=build('fortify',12,[{label:'enemies near',delta:60*n.threat},{label:'wealth others may covet',delta:40*n.exposure},{label:'already defended',delta:-45*n.defence},{label:'own holdings',delta:10*clamp01(n.wealth)}],{...noCost(),wood:R.fortifyWood,stone:R.fortifyStone,people:2,seconds:600},.1);
  out.push(n.defence>=.95?block(a,'already well defended'):n.wood-n.reserved.wood<R.fortifyWood?block(a,'not enough timber for defences'):a);}
 // recover: rest after war, famine or unrest
 {const a=build('recover',10,[{label:'still recovering',delta:70*clamp01(n.recoveryLeft/600)},{label:'war-weary',delta:60*clamp01((n.weariness-30)/70)},{label:'unrest',delta:45*clamp01((n.unrest-35)/65)},{label:'famine',delta:25*clamp01((300-n.foodSeconds)/300)}],{...noCost(),food:Math.round(n.foodPerSecond*450),seconds:600},.05);out.push(a);}
 return out.map(a=>a.feasible?{...a,score:Math.max(0,Math.min(100,Math.round(a.score*postureMultiplier(posture,a.kind)*10)/10))}:a);
}

/** Resources a plan holds back from other uses. Bookkeeping only: nothing is removed from the treasury. */
export function reserveOf(a:Alternative):{food:number;wood:number;stone:number}{return {food:a.cost.food,wood:a.cost.wood,stone:a.cost.stone};}
export const planFrom=(a:Alternative,id:number,time:number):Plan=>({id,kind:a.kind,target:a.target,since:time,until:time+DECISION_RULES.planSeconds,reserve:reserveOf(a),people:a.cost.people,score:a.score,reasons:a.reasons});
/** The purposes a plan reserves resources FOR; spending on these never counts against the plan's own reserve. */
export const PURPOSE:Record<Kind,readonly string[]>={
 grow:['hut','house','farm','warehouse','lumber','quarry'],stockpile:['warehouse','farm','grove'],settle:['townhall'],trade:[],raid:[],ally:[],
 fortify:['watchtower','barracks','keep','palisade','wall','gate'],recover:['hut','house','farm','grove'],
};
/** May `cost` be paid from `stock` without cutting into another plan's reserve? `purpose` is the building/use being paid for. */
export function maySpend(plan:Plan|undefined,stock:{food?:number;wood?:number;stone?:number},cost:{food?:number;wood?:number;stone?:number},purpose?:string):boolean{
 if(!plan)return true;if(purpose&&PURPOSE[plan.kind].includes(purpose))return true;
 for(const k of ['food','wood','stone'] as const)if((cost[k]||0)>0&&(stock[k]||0)-(cost[k]||0)<plan.reserve[k])return false;
 return true;
}

/** Choose or keep a plan. Hysteresis: an incumbent plan is held for `minHoldSeconds`, then replaced only by an alternative that beats it by
 * `switchMargin` (with `incumbentBonus` in its favour). Interruptions override the hold: famine, a serious threat while pursuing a venture, or an
 * infeasible incumbent. Seeded jitter breaks near ties deterministically per (seed, society, review epoch). */
export function decide(alts:Alternative[],n:Needs,incumbent:Plan|undefined,seed:number,team:number):Decision{
 const R=DECISION_RULES,epoch=Math.floor(n.time/R.reviewSeconds),rng=makeRng(hash32('decide',seed,team,epoch));
 const noisy=new Map<Kind,number>(alts.map(a=>[a.kind,a.score+(rng()-.5)*R.jitter]));
 const feas=alts.filter(a=>a.feasible).sort((a,b)=>(noisy.get(b.kind)!-noisy.get(a.kind)!)||KINDS.indexOf(a.kind)-KINDS.indexOf(b.kind));
 const best=feas[0],by=(k:Kind)=>alts.find(a=>a.kind===k&&a.feasible);
 const out=(choice:Alternative,change:Decision['change'],why:string[],dropped?:Plan):Decision=>({choice,change,why,dropped,alternatives:alts});
 if(!incumbent)return out(best,'start',['no standing plan',...best.reasons]);
 const same=alts.find(a=>a.kind===incumbent.kind&&a.target===incumbent.target&&a.feasible)??alts.find(a=>a.kind===incumbent.kind&&a.feasible&&incumbent.kind!=='raid'&&incumbent.kind!=='trade'&&incumbent.kind!=='ally');
 // interruptions
 if(n.foodSeconds<R.interruptFoodSeconds&&!['stockpile','trade'].includes(incumbent.kind)){
  const pick=[by('stockpile'),by('trade')].filter(Boolean).sort((a,b)=>b!.score-a!.score)[0]!;return out(pick,'interrupt',[`food reserve under ${R.interruptFoodSeconds} s`],incumbent);}
 if(n.threat>=R.interruptThreat&&['raid','settle','grow','trade'].includes(incumbent.kind)){
  const pick=by('fortify')??by('recover')!;return out(pick,'interrupt',['a serious threat at home'],incumbent);}
 if(!same)return out(best,'drop',[`the plan to ${incumbent.kind} is no longer feasible`],incumbent);
 if(n.time>=incumbent.until)return out(best,'expire',['the plan ran its course'],incumbent);
 if(n.time-incumbent.since<R.minHoldSeconds)return out(same,'keep',['committed plan held']);
 const keepScore=noisy.get(same.kind)!+R.incumbentBonus;
 if((best.kind!==same.kind||best.target!==same.target)&&noisy.get(best.kind)!>keepScore+R.switchMargin)
  return out(best,'switch',[`${best.kind} now beats ${same.kind} by more than ${R.switchMargin}`,...best.reasons],incumbent);
 return out(same,'keep',['no alternative is clearly better']);
}
