import type {Game} from '../game/sim';
import {personName} from '../game/people';
import {quietSeasonCue} from './quietSeason';
import {SURVIVAL_RULES} from '../game/survivalNeeds';
import {recentFinishes} from './buildFinishBeat';
/** Seconds of game time a life event stays fresh enough to retell. */
export const STORY_FRESH_SECONDS=600;
const BORING=/^(idle|waiting|resting|no job open|walking|returning|back home)\b/i;
/** Short true lines about the village right now: what named residents are doing and fresh life events. Never invented. */
export function hearthStories(g:Game):string[]{
 const out:string[]=[];
 const life=(g.state.lifeHistory??[]).filter(e=>e.team===0&&g.state.time-e.time<=STORY_FRESH_SECONDS&&e.text.length<=110).slice(-3).reverse();
 for(const e of life)out.push(e.text);
 // Barks: a short spoken line from one named resident whose real need is starting to bite (before it becomes an alert), one per need.
 const adults=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.type==='worker'&&!u.prisoner).sort((a,b)=>a.id-b.id);
 const hungry=adults.find(u=>(u.hunger??0)>=35&&(u.hunger??0)<60),cold=adults.find(u=>(u.coldSeconds??0)>=SURVIVAL_RULES.coldGraceSeconds/3&&(u.coldSeconds??0)<SURVIVAL_RULES.coldGraceSeconds),thirsty=adults.find(u=>(u.thirstSeconds??0)>=SURVIVAL_RULES.thirstGraceSeconds/3&&(u.thirstSeconds??0)<SURVIVAL_RULES.thirstGraceSeconds);
 if(hungry)out.push(`${personName(hungry)}: “My belly is empty — is there food in the store?”`);
 if(cold)out.push(`${personName(cold)}: “The wind bites. A fire would help.”`);
 if(thirsty)out.push(`${personName(thirsty)}: “My throat is dry.”`);
 for(const r of recentFinishes(g.state).slice(-1))out.push(`${r.builder}: “Our new ${r.name.toLowerCase()} stands — good work.”`);
 const people=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.type==='worker'&&!u.prisoner&&typeof u.workReason==='string'&&u.workReason.length>3&&u.workReason.length<=70&&!BORING.test(u.workReason));
 const seen=new Set<string>();
 for(const u of people.sort((a,b)=>a.id-b.id)){const what=u.workReason!.replace(/\.$/,'');if(seen.has(what))continue;seen.add(what);out.push(`${personName(u)} · ${what.charAt(0).toLowerCase()+what.slice(1)}`);if(out.length>=8)break;}
 return out;
}
/** Nothing needs the player: no banner showing, nothing being placed or selected, not paused, no quiet-season prompt. */
export function hearthIsQuiet(g:Game,season=''):boolean{
 const s=g.state;
 return !s.paused&&!(s.bannerT>0&&s.banner)&&!s.placing&&!s.selBld&&!g.selectedUnits().length&&!quietSeasonCue(s,season);
}
/** The line to show at a given rotation step, or null when the village needs attention or has nothing true to tell. */
export function hearthStoryAt(g:Game,step:number,season=''):string|null{
 if(!hearthIsQuiet(g,season))return null;
 const lines=hearthStories(g);return lines.length?lines[((step%lines.length)+lines.length)%lines.length]:null;
}
