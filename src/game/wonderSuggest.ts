import type {Game} from './sim';
import {hash32} from './rulerCore';
import {reserveSeconds} from './settlement';
import {unrestOf} from './rulersRuntime';
import {ensureRulers} from './rulersRuntime';
import {societyRelation} from './societyRelations';
import {WONDER_DEFS,wonderDef,type WonderDefinition,type WonderId} from './wonderDefs';
import {WONDER_RULES,liveWonders,townHall,wonderFoundingIssue,tribeOk} from './wonderRules';
import {probeWonderSites,type SiteChoice} from './wonderSiteSearch';
import {ruinsOf} from './ruinsWorld';

/** Suggest mode: pure and read-only. Ranks every foundable wonder for a society by
 *   need      0.4  how much the wonder's effect answers a measured deficit now (food reserve, unrest, raids, ports, knowledge)
 *   civ       0.3  the society's own cast: ecology weights, faith focus and the ruler's ambitions (neutral .5 when rulers are off)
 *   terrain   0.3  the best site found (passes its requirement) and the real stone and timber stands near it
 * Infeasible wonders (era, no site, wonder already held) score 0 and carry the blocker in words. Unaffordable ones keep their score x .85 and say what is short.
 * Ties break by a seeded hash of (seed, team, wonder), so rivals using the same list stay deterministic and saves stay reproducible. */
export type Suggestion={id:WonderId;label:string;score:number;feasible:boolean;/** founding could start right now */ready:boolean;blocker?:string;reasons:string[];need:number;civ:number;terrain:number;site?:SiteChoice;sites:SiteChoice[]};
const c01=(v:number)=>Math.max(0,Math.min(1,v));
export type Needs={food:number;unrest:number;defence:number;port:number;knowledge:number;prestige:number};
/** Measured needs of a society, each 0..1, with the plain reason for the strongest ones. */
export function measureNeeds(g:Game,team:number):{needs:Needs;why:Record<keyof Needs,string>}{
 const t=g.tribe(team),others=g.state.tribes.map((_,i)=>i).filter(i=>i!==team&&i!==3&&!!g.tribe(i));
 const reserve=reserveSeconds(g,team),food=c01(1-reserve/900),u=unrestOf(g,team),unrest=u?c01(u.value/100):.15;
 const wars=others.filter(i=>societyRelation(g,team,i).hostile).length,lost=ruinsOf(g).filter(r=>r.team===team&&r.kind==='village').length,defence=c01(.15+.3*wars+.12*lost);
 const docks=g.state.buildings.some(b=>b.team===team&&b.type==='dock'&&b.hp>0&&g.finished(b)),port=docks?.75:.1;
 const knowledge=c01(.3+.08*(t?.age??0));
 return{needs:{food,unrest,defence,port,knowledge,prestige:.3},why:{
  food:reserve<600?`food reserve is only ${Math.round(reserve/60)} min`:'stores should last longer',unrest:u&&u.value>=15?`unrest is ${Math.round(u.value)}`:'keep the people settled',
  defence:wars?`${wars} hostile neighbour${wars>1?'s':''}`:lost?`${lost} building${lost>1?'s':''} lost`:'raiders may come',port:docks?'you have a working dock':'no dock yet',knowledge:'skills spread slowly',prestige:'renown is always worth something'}};
}
const EFFECT_NEED:Record<string,keyof Needs>={storage:'food',concord:'unrest',defence:'defence',portCapacity:'port',knowledge:'knowledge',prestige:'prestige'};
function needFit(d:WonderDefinition,n:ReturnType<typeof measureNeeds>){
 let best=n.needs.prestige*.5,why='adds renown';
 for(const e of d.effects){const k=EFFECT_NEED[e.id];if(!k||k==='prestige')continue;const v=n.needs[k];if(v>best){best=v;why=n.why[k];}}
 return{value:c01(best),why};
}
function civFit(g:Game,team:number,d:WonderDefinition){
 const civ=ensureRulers(g)?.societies?.[String(team)]?.civ;if(!civ)return{value:.5,why:''};
 const eco=civ.ecology as Record<string,number>,w=d.affinity.ecology;let num=0,den=0,top='',topv=0;
 for(const [k,wt] of Object.entries(w)){num+=(wt??0)*(eco[k]??.5);den+=wt??0;if((wt??0)*(eco[k]??0)>topv){topv=(wt??0)*(eco[k]??0);top=k;}}
 let v=den?num/den:.5;const focus=civ.faith?.focus,amb=(civ.ruler as {ambitions?:string[]}).ambitions??[];
 const faithHit=!!focus&&!!d.affinity.faith?.includes(focus),ambHit=amb.find(a=>d.affinity.ambitions?.includes(a));
 if(faithHit)v+=.1;if(ambHit)v+=.1;
 const bits=[];if(top&&topv>=.4)bits.push(`${civ.name}'s ${top==='sacred'?'devotion':top==='trade'?'trading bent':top==='threat'?'wary stance':top==='surplus'?'plenty':top==='pastoral'?'herding life':'scale'}`);
 if(faithHit)bits.push(`${focus} faith`);if(ambHit)bits.push(`ruler's ambition: ${ambHit}`);
 return{value:c01(v),why:bits.join(', ')};
}
function terrainFit(g:Game,d:WonderDefinition,site:SiteChoice|undefined){
 if(!site)return{value:0,why:''};
 const near=(list:{x:number;z:number}[],r:number)=>list.filter(n=>Math.hypot(n.x-site.x,n.z-site.z)<=r).length,stones=near(g.state.stones as never,100),trees=near(g.state.trees as never,80);
 const stoneNeed=d.cost.stone>=150?1:.6,fit=.5+.25*c01(stones/6)*stoneNeed+.15*c01(trees/20)+.1*c01(1-site.distance/300);
 const bits=[`site ${site.distance} m from the hall`];if(stones>=3)bits.push(`${stones} stone outcrops near`);if(trees>=10)bits.push('timber near');
 if(typeof site.facts.rock==='string')bits.push(`${site.facts.rock} ground`);
 return{value:c01(fit),why:bits.join(', ')};
}
/** Rank the foundable wonders for a society. `siteChecks` bounds the ground searches (best prelim scores first); the rest report 'not checked'. */
export function suggestWonders(g:Game,team:number,opts:{siteChecks?:number;limit?:number;onlyReady?:boolean;/** always ground-check this wonder (the one the panel has open) */focus?:string}={}):Suggestion[]{
 const checks=opts.siteChecks??10,n=measureNeeds(g,team),held=new Set(liveWonders(g).filter(r=>r.team===team).map(r=>r.family)),t=g.tribe(team);
 const pre=WONDER_DEFS.filter(d=>!d.earthworks).map(d=>{const nf=needFit(d,n),cf=civFit(g,team,d);return{d,nf,cf,prelim:.4*nf.value+.3*cf.value};}).sort((a,b)=>b.prelim-a.prelim||hash32('wonder-tie',g.state.seed,team,a.d.id)-hash32('wonder-tie',g.state.seed,team,b.d.id));
 let used=0;const out:Suggestion[]=[];
 for(const {d,nf,cf,prelim} of pre){
  const reasons:string[]=[];let blocker:string|undefined,sites:SiteChoice[]=[],feasible=true;
  if(held.has(d.id)){blocker=`You already hold a ${d.label}`;feasible=false;}
  else if((t?.age??0)<d.minAge){blocker='Not yet: the society has not reached this age';feasible=false;}
  else if(!townHall(g,team)){blocker='A wonder needs a finished town hall';feasible=false;}
  else if(used<checks||d.id===opts.focus){if(d.id!==opts.focus)used++;const p=probeWonderSites(g,team,d.id,4);sites=p.sites;if(!sites.length){feasible=false;blocker=p.nearest[0]?`No ground near the hall: ${p.nearest[0].toLowerCase()}`:'No ground near the hall suits it';}}
  else{feasible=false;blocker='Ground not checked yet';}
  const tf=terrainFit(g,d,sites[0]);
  if(feasible){reasons.push(`Answers a need: ${nf.why}`);if(cf.why)reasons.push(`Fits your people: ${cf.why}`);if(tf.why)reasons.push(`Ground: ${tf.why}`);
   for(const e of d.effects.filter(e=>e.id!=='prestige'))reasons.push(e.words);}
  const issue=feasible?wonderFoundingIssue(g,team,d.id):null,ready=feasible&&!issue;if(issue)blocker=issue;
  const score=feasible?(.4*nf.value+.3*cf.value+.3*tf.value)*(ready?1:.85):0;
  void prelim;out.push({id:d.id,label:d.label,score:Math.round(score*1000)/1000,feasible,ready,blocker,reasons,need:nf.value,civ:cf.value,terrain:tf.value,site:sites[0],sites});
 }
 out.sort((a,b)=>b.score-a.score||Number(b.feasible)-Number(a.feasible)||hash32('wonder-tie',g.state.seed,team,a.id)-hash32('wonder-tie',g.state.seed,team,b.id)||a.id.localeCompare(b.id));
 const list=opts.onlyReady?out.filter(s=>s.ready):out;return opts.limit?list.slice(0,opts.limit):list;
}
/** The wonder a rival society would raise now (top ready suggestion), or null. Gated by the founding stagger in wonderFounding. */
export function rivalChoice(g:Game,team:number):Suggestion|null{
 if(!tribeOk(g,team)||WONDER_RULES.maxPerTeam<=0)return null;
 return suggestWonders(g,team,{siteChecks:5,limit:1,onlyReady:true})[0]??null;
}
export const wonderIdsReady=(g:Game,team:number)=>suggestWonders(g,team,{siteChecks:WONDER_DEFS.length,onlyReady:true}).map(s=>s.id);
void wonderDef;
