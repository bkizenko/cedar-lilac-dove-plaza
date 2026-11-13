import type {HudSnapshot} from '@/game/types';
import type {PersonSkillCard,VillageSkillCard} from '@/game/skillRuntime';
import {GameTooltip} from '../GameTooltip';
/** Person card block: top skills as a word plus a bar, a "rusty" flag and a suggested job. Words first; numbers live in the tip. */
export function SkillStrip({card}:{card:PersonSkillCard}){
 return <div className="hw-skills" role="group" aria-label="Skills">
  {card.top.length===0&&<p className="hw-skill-note">{card.note||'No settled skill yet'}</p>}
  {card.top.map(s=><GameTooltip key={s.id} title={`${s.label} · ${s.word}`} description={`${s.pct}% of the way to mastery${s.rusty?'. Rusty: out of practice, relearning is quick.':''}`}>
   <div className="hw-skill" tabIndex={0} aria-label={`${s.label}, ${s.word}${s.rusty?', rusty':''}`}><span className="hw-skill-name">{s.label}</span><span className="hw-skill-word">{s.word}</span>
    <span className="hw-skill-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.pct}><i style={{width:`${Math.max(4,s.pct)}%`}}/></span>
    {s.rusty&&<span className="hw-chip hw-skill-rusty">rusty</span>}</div></GameTooltip>)}
  {(card.suggest||card.injured)&&<p className="hw-skill-note">{card.suggest&&<>Suggested job: <b>{card.suggest.label.toLowerCase()}</b></>}{card.suggest&&card.injured&&' · '}{card.injured&&<span className="t-warn">still recovering from a wound</span>}</p>}
 </div>;
}
/** Village card: what the settlement is known for, how many hands, guild and fading flags. */
export function VillageSkillsCard({card}:{card:VillageSkillCard}){
 return <section className="hw-card hw-vskills" aria-label="Village specialisation"><div className="hw-card-head"><h3>What the village is known for</h3></div>
  <ul className="hw-vskill-list">{card.rows.map(r=><li key={r.id} className="hw-vskill"><span className="hw-skill-name">{r.label}</span><span className="hw-skill-word">{r.lapsed?'fading':r.word}</span>
   <span className="hw-skill-bar" role="progressbar" aria-label={`${r.label} tradition`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={r.tradition}><i style={{width:`${Math.max(4,r.tradition)}%`}}/></span>
   <span className="hw-vskill-meta">{r.practitioners} hands · {r.masters} masters{r.guild&&<span className="hw-chip hw-skill-guild">guild</span>}{r.lapsed&&<span className="hw-chip t-warn">no master left</span>}</span></li>)}</ul>
  {card.quarters.length>0&&<ul className="hw-chips" aria-label="Craft quarters">{card.quarters.map(q=><li key={q} className="hw-chip hw-chip-soft">{q}</li>)}</ul>}
  <p className="hw-sub">Tradition grows where many skilled hands work with local resources and fades when nobody keeps it up. It speeds that work a little; it never creates goods.</p>
 </section>;
}
export const hasVillageSkills=(hud:HudSnapshot)=>!!hud.villageSkills?.rows.length;
