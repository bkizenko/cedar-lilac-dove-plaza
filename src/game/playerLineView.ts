/** Plain-language strings for faction reactions (UI data; no logic). */
export type {Faction} from './houses';
export const FACTION_VIEW={
 pleased:(k:string)=>`The ${label(k)} welcome the change.`,
 angered:(k:string)=>`The ${label(k)} fear the new ruler.`,
 same:(_k:string)=>'',
};
const label=(k:string)=>({kin:'kin',warriors:'war-leaders',priests:'priests',elders:'elders',merchants:'merchants',landholders:'landholders',commons:'common folk',assembly:'assembly'} as Record<string,string>)[k]??k;
