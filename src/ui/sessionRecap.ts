/** Tally of the village chronicle (state.lifeHistory) for the recap card. Pure; reads only recorded lines and
 * never mints events. Groups lines the chronicle already wrote by their own wording. */
export type RecapEvent={team:number;text:string;time:number};
const GROUPS:[key:string,one:string,many:string,re:RegExp][]=[
 ['births','birth','births',/\bwas born\b/i],
 ['deaths','death','deaths',/\b(died|killed|perished|is dead|is gone|drowned)\b/i],
 ['arrivals','arrival','arrivals',/\b(arrived|taken in|joined|welcomed|walk toward your hall)\b/i],
 ['works','finished work','finished works',/\b(finished|completed|is complete|was built|forms|is home)\b/i],
 ['lost','loss of goods','losses of goods',/\b(lost|spoiled|stolen|ruined|burned|destroyed)\b/i],
 ['harvests','harvest','harvests',/\bharvest(ed|s)?\b/i],
 ['raids','raid','raids',/\b(raid(ed|ers|s)?|attack(ed|s)?)\b/i],
 ['treaties','treaty','treaties',/\b(treaty|peace|alliance|weds|tribute)\b/i],
];
export function sessionRecap(history:readonly RecapEvent[]|undefined,since:number,team=0){
 const counts:Record<string,number>={},latest:string[]=[];
 for(const e of history??[]){if(e.team!==team||!(e.time>since))continue;const g=GROUPS.find(([,,,re])=>re.test(e.text));if(!g)continue;counts[g[0]]=(counts[g[0]]||0)+1;latest.push(e.text.replace(/^\[Contact \d+\] /,''));}
 const summary=GROUPS.filter(([k])=>counts[k]).map(([k,one,many])=>`${counts[k]} ${counts[k]===1?one:many}`).join(' · ');
 return {summary,counts,latest:latest.slice(-3)};
}
/** Digest for a viewer who hid the tab for a while: only when away at least minAwayMs and the chronicle recorded
 * something after the moment they left. Returns null otherwise. */
export function awayDigest(history:readonly RecapEvent[]|undefined,leftAtGameTime:number,awayMs:number,minAwayMs=5*60_000){
 if(!(awayMs>=minAwayMs))return null;const r=sessionRecap(history,leftAtGameTime);return r.summary?r:null;
}
