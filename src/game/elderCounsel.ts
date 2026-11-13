/**
 * One line of counsel from the best-skilled living elder (read model; pure, no state, no RNG).
 * Driven only by the per-person skill model (skills.ts): the elder is the oldest-wisdom adult who is at least "skilled" in something.
 * Absent when the skill model is off (old saves), nobody qualifies, or the only candidates are captives, dependents or the dead.
 */
import type {Game} from './sim';
import {isDependent} from './settlement';
import {personName} from './people';
import {skillAgeYears,wisdom,levelWord,topSkills,entryMastery,type SkillId} from './skills';
import {skillsEnabled,unitRecord} from './skillRuntime';
export const ELDER_MIN_YEARS=50,ELDER_MIN_MASTERY=.35;
export type ElderCounsel={id:number;name:string;age:number;skill:SkillId;skillLabel:string;level:string;line:string};
const SAYING:Record<SkillId,string>={
 farming:'Seed the field early and keep it weeded; the granary is won in spring.',herding:'Count the herd every evening; a lost beast is a lost winter.',
 hunting:'Hunt where the tracks are fresh and never take the last of a herd.',fishing:'Fish the slack water and keep the nets mended before the run.',
 foraging:'Gather what ripens now and dry what will keep.',woodcutting:'Fell in the cold months, season the logs, and leave young trees standing.',
 mining:'Prop the roof before you break the rock.',building:'A house is only as good as its footing; lay the foundation twice as careful as the walls.',
 hauling:'Share the load across more hands and the road gets short.',pottery:'Dry the clay slowly or the fire will split it.',
 weaving:'Spin more thread than you think you need; the loom is always hungry.',smithing:'Learn the fire before you learn the hammer.',
 tanning:'Work the hide while it is fresh; patience in the pit saves the leather.',toolmaking:'A good tool outlasts the one who made it; mend before you replace.',
 cooking:'Eat the soft food first and cure the rest.',healing:'Rest and clean water mend more than any herb.',
 sailing:'Read the sky before you cast off, and never sail without a second paddle.',trading:'A fair bargain brings the trader back next season.',
 leading:'Listen to every elder before the hall decides.',fighting:'The best fight is the one a strong wall prevents.',
};
export function elderCounsel(g:Game,team=0):ElderCounsel|null{
 if(!skillsEnabled(g))return null;
 let best:{score:number;u:Game['state']['units'][number];skill:SkillId;m:number}|null=null;
 for(const u of g.state.units){
  if(u.team!==team||u.hp<=0||u.prisoner||u.enslavedFrom!==undefined||isDependent(g,u))continue;
  const years=skillAgeYears(u);if(years<ELDER_MIN_YEARS)continue;
  const rec=unitRecord(u),top=topSkills(rec,1)[0];if(!rec||!top||top.mastery<ELDER_MIN_MASTERY)continue;
  const m=entryMastery(rec,top.id),score=m*(.6+.4*wisdom(years))+years*1e-6-u.id*1e-9;
  if(!best||score>best.score)best={score,u,skill:top.id,m};
 }
 if(!best)return null;
 const name=personName(best.u),age=Math.floor(skillAgeYears(best.u)),level=levelWord(best.m),label=topSkills(unitRecord(best.u),1)[0].label.toLowerCase();
 return{id:best.u.id,name,age,skill:best.skill,skillLabel:label,level,line:SAYING[best.skill]};
}
