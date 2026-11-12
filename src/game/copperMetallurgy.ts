import type {Game} from './sim';
/** Game units, not kilograms or a historical assay. The ore/metal distinction
 * follows Historic England's Archaeometallurgy guidelines (charcoal reduction
 * of oxide/carbonate ores); quantities and time remain explicit tuning knobs. */
export const COPPER_METALLURGY_RULES={version:1,orePerBatch:8,charcoalPerBatch:2,metalPerBatch:4,workSeconds:90,orePackedLiters:4,metalPackedLiters:1} as const;
export function copperOreEnabled(g:Game,team:number){return g.tribe(team)?.copperMetallurgyVersion===1;}
export function copperAdoptionIssue(g:Game,team=0){
 if(g.state.ended)return 'The chapter has ended';
 if(!g.tribe(team)?.alive)return 'Choose a living community';
 if(copperOreEnabled(g,team))return 'Ore smelting is already adopted';
 return g.state.buildings.some(b=>b.team===team&&b.type==='kiln'&&g.finished(b))?null:'Finish a kiln to try ore smelting';
}
/** Existing usable metal, loaded legacy copper and paid jobs never convert. */
export function adoptCopperMetallurgy(g:Game,team=0){if(copperAdoptionIssue(g,team))return false;g.tribe(team).copperMetallurgyVersion=1;return true;}
