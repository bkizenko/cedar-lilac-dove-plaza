import type {Game} from './sim';
import {rivalKnows} from './rivalDevelopment';
import {IRON_METALLURGY_RULES} from './ironRules';
export {IRON_METALLURGY_RULES};
export const IRON_RECIPES=['smeltIron','consolidateIron'] as const;
export function ironOreEnabled(g:Game,team:number){return g.tribe(team)?.ironMetallurgyVersion===1;}
export function knownIronSources(g:Game,team=0){return g.state.iron.filter(n=>n.amount>0&&(team===0?g.exploredAt(n.x,n.z):rivalKnows(g,team,n.x,n.z)));}
export function ironAdoptionIssue(g:Game,team=0){
 if(g.state.ended)return 'The chapter has ended';
 if(!g.tribe(team)?.alive)return 'Choose a living community';
 if(ironOreEnabled(g,team))return 'Iron ore processing is already adopted';
 const forges=g.state.buildings.filter(b=>b.team===team&&b.type==='forge'&&b.hp>0&&g.finished(b));
 if(!forges.length)return 'Finish a forge with its smelting hearth before trying iron ore';
 const sources=knownIronSources(g,team);if(!sources.length)return 'Survey an actual remaining iron deposit first';
 if(!sources.some(n=>forges.some(b=>g.workBoard.connected(g,n.x,n.z,b.x,b.z))))return 'The known iron deposit needs a land route to a finished forge';
 return null;
}
/** Adoption changes future extraction, never existing metal/cargo/paid jobs. */
export function adoptIronMetallurgy(g:Game,team=0){if(ironAdoptionIssue(g,team))return false;g.tribe(team).ironMetallurgyVersion=1;return true;}
