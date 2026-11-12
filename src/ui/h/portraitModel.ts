/** G4 presentation model for a leader-encounter portrait. Pure and seeded:
 * the same leader always gets the same face; dress follows era and the
 * society's actual identity colours. Relation and goods text come only from
 * what the player's society has actually observed (Societies supplies them);
 * this model never invents stocks or attitudes. */
export type PortraitInput={leaderId:number;worldSeed:number;era:number;name:string;society:string;
 colors:{primary:string;secondary:string};relation?:number;knownGoods?:readonly string[];climate?:'temperate'|'cold'|'wet'|'arid'};
export type PortraitView={name:string;society:string;skin:string;hair:string;hairStyle:'loose'|'braided'|'cropped'|'bound';
 headwear:'none'|'fur hood'|'band'|'woven cap'|'bronze circlet';garment:'hide wrap'|'woven tunic'|'dyed cloak';garmentColor:string;trim:string;
 backdrop:string;stance:'unknown'|'wary'|'neutral'|'friendly'|'hostile';stanceText:string;goodsText:string};
const SKIN=['#f1d3b3','#e3b48f','#c98d63','#a86d47','#7d4e30','#5c3922'],HAIR=['#2b1d12','#4a3020','#6b4a2b','#8f6a3e','#b9a48a','#1c1714'];
function hash(...v:(string|number)[]){let h=0x811c9dc5;for(const x of v){const s=String(x);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193);}}return h>>>0;}
export function stanceFor(relation:number|undefined):PortraitView['stance']{
 if(relation===undefined||!Number.isFinite(relation))return 'unknown';return relation<=-40?'hostile':relation<-10?'wary':relation<25?'neutral':'friendly';
}
export function portraitView(p:PortraitInput):PortraitView{
 const h=hash(p.worldSeed,'leader',p.leaderId),era=Math.max(0,Math.min(5,Math.floor(p.era))),cold=p.climate==='cold';
 const hairStyle=(['loose','braided','cropped','bound'] as const)[(h>>>8)%4];
 const headwear=era<=0?(cold?'fur hood':'none'):era===1?(cold?'fur hood':'band'):era===2?'woven cap':'bronze circlet';
 const garment=era<=0?'hide wrap':era<=2?'woven tunic':'dyed cloak';
 const stance=stanceFor(p.relation);
 const stanceText={unknown:'You know little of their mind yet.',hostile:'Their people remember recent harm.',wary:'They are guarded with you.',neutral:'They will hear you out.',friendly:'They greet you as a known friend.'}[stance];
 const goods=(p.knownGoods??[]).slice(0,3);
 return {name:p.name,society:p.society,skin:SKIN[h%SKIN.length],hair:HAIR[(h>>>4)%HAIR.length],hairStyle,headwear,garment,
  garmentColor:garment==='hide wrap'?'#9c6433':p.colors.primary,trim:p.colors.secondary,backdrop:'#e9c592',stance,stanceText,
  goodsText:goods.length?`Seen with: ${goods.join(', ')}`:'No goods observed yet'};
}
