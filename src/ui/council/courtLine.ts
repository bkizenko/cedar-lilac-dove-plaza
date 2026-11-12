import type {RivalCourt} from '../../game/rulersView';
/** One plain-words line about a known neighbour's court: who rules, who follows, who stands in. Pure; old data (no court) gives null. */
export function courtLine(c?:RivalCourt):string|null{
 if(!c)return null;
 const lead=`${c.ruler}, ${c.rulerAge}, leads House ${c.house}`;
 if(c.extinct)return `${lead}; the line has no heir and may end.`;
 const parts=[c.regent?`${c.regent} holds the seat as regent`:'',c.heir?`${c.heir.name}, ${c.heir.age}${c.heir.adult?'':' (a child)'}${c.heir.legit?'':', of doubtful birth'}, would follow`:''].filter(Boolean);
 return parts.length?`${lead}; ${parts.join('; ')}.`:`${lead}.`;
}
/** Names a change in a rival court (new ruler, regency begun/ended) for the notes stack; null when nothing visible changed. */
export function rivalCourtChange(name:string,prev:RivalCourt|undefined,now:RivalCourt|undefined):{title:string;body:string}|null{
 if(!prev||!now)return null;
 if(prev.ruler!==now.ruler)return {title:`${name}: ${prev.ruler} has left the seat`,body:`${now.ruler} now leads House ${now.house}.${now.regent?` ${now.regent} rules as regent.`:''}${now.heir?` ${now.heir.name} is next in line.`:''}`};
 if(!prev.regent&&now.regent)return {title:`${name}: a regency begins`,body:`${now.regent} rules for ${now.ruler}.`};
 if(prev.regent&&!now.regent)return {title:`${name}: the regency ends`,body:`${now.ruler} rules in their own right.`};
 return null;
}
