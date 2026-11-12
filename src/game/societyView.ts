/** Read-only view of the society decision layer for the owner UI. Only societies the player has met are listed; nothing here reads or writes the
 * world beyond the existing accessors, and no exact stockpile is exposed (counts are the sightings a society itself holds, dated). */
import type {Game} from './sim';
import {societyRelation} from './societyRelations';
import {planOf,directorOf,lastDecisionOf,intelOf,agreementsOf,breakawaysOf,decisionsEnabled} from './societyRuntime';
import type {Posture} from './societyDecisions';
import type {AgreementKind,AgreementStatus} from './succession';
import type {Stage,Resolution} from './breakaways';

export type SocietyLine={
 team:number;name:string;hostile:boolean;
 /** Current committed plan (kind id), who it aims at, and how long it still runs. */
 plan?:{kind:string;target?:string;endsInSeconds:number;why:string[]};
 posture?:{kind:Posture;sinceSeconds:number;why:string[]};
 /** What we hold about them (our own dated sightings) and when we last met. Ages are seconds; null = never seen. */
 known:{contactAgeSeconds:number|null;sightingAgeSeconds:number|null;structures:number;defenders:number};
 /** What they hold about us: the freshness of their picture of our village. */
 theyKnowUs:{sightingAgeSeconds:number|null;structures:number}|null;
 agreements:{kind:AgreementKind;status:AgreementStatus;sinceSeconds:number}[];
 /** Their outlying halls drifting away from them. */
 breakaways:{stage:Stage;pressure:number;resolution?:Resolution}[];
};
export type SocietyDecisionsModel={enabled:boolean;societies:SocietyLine[];own:{stage:Stage;pressure:number;resolution?:Resolution}[]};
const age=(t:number,at:number)=>at>0?Math.max(0,Math.round(t-at)):null;
export function societyDecisionsModel(g:Game):SocietyDecisionsModel{
 if(!decisionsEnabled(g))return{enabled:false,societies:[],own:[]};
 const now=g.state.time,societies:SocietyLine[]=[];
 for(let i=1;i<g.state.tribes.length;i++){
  if(i===3||!g.tribe(i)?.alive)continue;
  const rel=societyRelation(g,0,i);if(!rel.known)continue;
  const plan=planOf(g,i),dir=directorOf(g,i),last=lastDecisionOf(g,i);
  const mine=intelOf(g,0).find(r=>r.subject===i),theirs=intelOf(g,i).find(r=>r.subject===0);
  societies.push({team:i,name:g.tribe(i).name,hostile:rel.hostile,
   ...(plan?{plan:{kind:plan.kind,...(plan.target!==undefined&&g.tribe(plan.target)?{target:plan.target===0?'you':g.tribe(plan.target).name}:{}),endsInSeconds:Math.max(0,Math.round(plan.until-now)),why:(last?.why??plan.reasons).slice(0,2)}}:{}),
   ...(dir?{posture:{kind:dir.posture,sinceSeconds:Math.max(0,Math.round(now-dir.since)),why:dir.reasons.slice(0,2)}}:{}),
   known:{contactAgeSeconds:age(now,rel.lastContactSeconds),sightingAgeSeconds:mine?age(now,mine.observedAt):null,structures:mine?.structures??0,defenders:mine?.defenders??0},
   theyKnowUs:theirs?{sightingAgeSeconds:age(now,theirs.observedAt),structures:theirs.structures}:null,
   agreements:agreementsOf(g,i).filter(a=>a.status!=='lapsed'&&(a.a===0||a.b===0)).map(a=>({kind:a.kind,status:a.status,sinceSeconds:Math.max(0,Math.round(now-a.since))})),
   breakaways:breakawaysOf(g,i).filter(b=>b.stage!=='loyal'||b.resolution).map(b=>({stage:b.stage,pressure:Math.round(b.pressure*100),...(b.resolution?{resolution:b.resolution}:{})}))});
 }
 return{enabled:true,societies,own:breakawaysOf(g,0).map(b=>({stage:b.stage,pressure:Math.round(b.pressure*100),...(b.resolution?{resolution:b.resolution}:{})}))};
}
