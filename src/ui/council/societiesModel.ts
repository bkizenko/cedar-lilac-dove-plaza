import type {CouncilModel} from '../../game/rulersView';
type Neighbour=CouncilModel['neighbours'][number];
/** Pure model for the at-a-glance strip: mood, claims either way, and wards held, sorted trouble first. */
export type SocietyChip={team:number;name:string;mood:'war'|'wary'|'cool'|'cordial'|'friend'|'peace';word:string;claimsAgainst:number;claimsByUs:number;wardsHome:number;wards:number;canWed:boolean};
/** Pure model for the at-a-glance strip: mood, claims either way, and wards held, sorted trouble first. */
export function societyChips(ns:Neighbour[]):SocietyChip[]{
 return ns.map(n=>{const m=n.hostile?['war','At war']:n.atPeace?['peace','At peace']:n.trust>=60?['friend','Friendly']:n.trust>=25?['cordial','Cordial']:['cool','Reserved'];
  return {team:n.team,name:n.name,mood:m[0] as SocietyChip['mood'],word:m[1],claimsAgainst:n.casus?.filter(k=>!k.byUs).length??0,claimsByUs:n.casus?.filter(k=>k.byUs).length??0,wards:n.wards?.length??0,wardsHome:n.wards?.filter(w=>!w.endsIn||w.endsIn<=1).length??0,canWed:!!n.canMarry};})
  .sort((a,b)=>Number(b.mood==='war')-Number(a.mood==='war')||b.claimsAgainst-a.claimsAgainst||a.name.localeCompare(b.name));
}
