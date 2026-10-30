import {ageInfrastructureIssue,ageReserveIssue} from '@/game/advancement';
import {AGE_COST,AGES} from '@/game/constants';
import type {HudSnapshot} from '@/game/types';
import type {Engine} from '@/game/engine';
export function AgeReadiness({hud,engine,onAdvance}:{hud:HudSnapshot;engine:Engine|null;onAdvance:()=>void}){
 const need=AGE_COST[hud.age+1];if(!need)return <p>Final age reached.</p>;
 const issues=[...new Set([hud.ageIssue,engine?ageInfrastructureIssue(engine.game,0):null,engine?ageReserveIssue(engine.game,0):null].filter(Boolean))];
 const rows=[{name:'People',have:hud.pop,need:need.pop||0},
 ...(['food','wood','stone','copper','iron'] as const).map(k=>({name:k==='wood'?'Timber':k[0].toUpperCase()+k.slice(1),have:hud[k],need:need[k]||0}))].filter(r=>r.need>0);
 return <section className="age-readiness" aria-label="Next age requirements">
  <h3>Next: {AGES[hud.age+1]}</h3>
  <div className="age-readiness-grid">{rows.map(r=><div key={r.name}>
   <div><span>{r.name}</span><strong>{Math.floor(r.have)} / {r.need} {r.have>=r.need?'✓':''}</strong></div>
   <progress aria-label={r.name} value={Math.max(0,Math.min(r.have,r.need))} max={r.need}/>
  </div>)}</div>
  <p>Required reserves stay in your stores.</p>
  {issues.map(issue=><p className="text-bronze-bright" key={issue}>{issue}</p>)}
  <button type="button" disabled={!hud.canAge||!!hud.ended} onClick={()=>{engine?.ageUp();onAdvance();}}>Choose next age</button>
 </section>;
}
