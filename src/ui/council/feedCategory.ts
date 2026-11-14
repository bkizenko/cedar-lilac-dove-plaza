/** Chronicle line categories for the Hearth feed's mute chips. Presentation only: classifies by wording, never changes the log. */
export type FeedCategory='house'|'court'|'neighbours'|'wild';
export const FEED_CATEGORIES:readonly {id:FeedCategory;label:string}[]=[
 {id:'house',label:'Household'},{id:'court',label:'Court'},{id:'neighbours',label:'Neighbours'},{id:'wild',label:'Wild'},
];
const COURT=/\b(ruler|heir|crown|seat|throne|succe|regent|regency|coup|claim|oath|dynasty|married|marriage|wed|betroth|foster|funeral|mourn|died|tanist)/i;
const NEIGH=/\b(neighbo|envoy|treaty|alliance|ally|trade|tribute|war|raid|peace|truce|blood.?price|captive|ransom|hostage|rival|house of|border)/i;
const WILD=/\b(wolf|wolves|bear|boar|storm|flood|drought|wildfire|fire|predator|beast|famine|frost|lightning)/i;
export function feedCategory(text:string):FeedCategory{
 if(COURT.test(text))return 'court';
 if(NEIGH.test(text))return 'neighbours';
 if(WILD.test(text))return 'wild';
 return 'house';
}
