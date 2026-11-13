/** Detail: how close to the camera the highest model tier is used, and which fidelity features are on. Pure rules, no three.js, no simulation state.
 *
 * Independent of Draw distance (how FAR the world is drawn, drawDistance.ts) and of Graphics quality (pixel ratio, bloom, low/med/high). It scales only
 * the switch distances between model tiers (near / mid / far) and gates a few per-frame fidelity features (sun shadows, MSAA, baked-style AO, bump).
 *
 * Base distances (Standard) are chosen so the whole normal gameplay zoom range (orbit distance 14 .. ~90 m, default 58 m at pitch .38, i.e. about 54 m
 * horizontal from the eye to the focus and about 85 m to the screen edge) is drawn at the NEAR tier. See docs/DETAIL_AUDIT.md for the measured counts
 * behind each number. Render-only: nothing here touches heights, collision, resources, saves or the simulation. */
export type DetailLevel='standard'|'high'|'ultra';
export const DETAIL_LEVELS:readonly DetailLevel[]=['standard','high','ultra'];
export const DETAIL_LABELS:Record<DetailLevel,string>={standard:'Standard',high:'High',ultra:'Ultra'};
export const DETAIL_RULES={
 key:'hearthwild:detail',defaultLevel:'standard' as DetailLevel,
 /** multiplier on every base switch distance below */
 lodScale:{standard:1,high:1.4,ultra:2} as Record<DetailLevel,number>,
 /** Standard switch distances, metres.
  * buildings: horizontal eye-to-building, [near->mid, mid->far, far->impostor card] (was 30/70/120)
  * people: 3-D eye-to-person, [near->mid, mid->far silhouette] (was 35/70)
  * trees: base "near" radius per graphics quality; full-detail trees are inside near*FOREST fraction .4, mid inside .. 1.15 (was low 28 / med 75 / high 115)
  * items: ground items, [near->mid, mid->far], scaled by graphics quality .5/.7/1 (was 14/40; Medium graphics = 70/154) */
 buildings:[110,190,300] as readonly [number,number,number],
 people:[100,180] as readonly [number,number],
 treeNear:{low:70,med:170,high:230} as Record<'low'|'med'|'high',number>,
 items:[100,220] as readonly [number,number],
 /** the most trees drawn at the full-detail tier (nearest first); the rest of the near ring falls to the mid tier. Protects the M1 triangle budget. */
 /** the most people drawn at the near rig tier (about 770-1,100 triangles each before held items), nearest first; the rest use the mid tier */
 maxNearPeople:{standard:140,high:220,ultra:350} as Record<DetailLevel,number>,
 maxFullTrees:{standard:900,high:1400,ultra:2200} as Record<DetailLevel,number>,
 /** HERO trees: the nearest N trees inside heroTreeMetres draw the enriched near tier (twig sprays, bark relief, fruit; about 2,300-9,000 triangles each, treeHero.ts) */
 maxHeroTrees:{standard:36,high:64,ultra:110} as Record<DetailLevel,number>,
 heroTreeMetres:{standard:46,high:64,ultra:90} as Record<DetailLevel,number>,
 /** fidelity features by level */
 /** Standard has NO sun shadow map (cheap painterly contact shadows only); 0 = off */
 shadowMap:{standard:0,high:2048,ultra:2048} as Record<DetailLevel,number>,
 shadowMaxHalfExtent:{standard:0,high:90,ultra:110} as Record<DetailLevel,number>,
 msaaSamples:{standard:2,high:4,ultra:4} as Record<DetailLevel,number>,
 bump:{standard:false,high:true,ultra:true} as Record<DetailLevel,boolean>,
 grade:{standard:'neutral',high:'agx',ultra:'agx'} as Record<DetailLevel,'neutral'|'agx'>,
} as const;
export function isDetailLevel(v:unknown):v is DetailLevel{return v==='standard'||v==='high'||v==='ultra';}
export function loadDetailLevel():DetailLevel{try{const q=localStorage.getItem(DETAIL_RULES.key);return isDetailLevel(q)?q:DETAIL_RULES.defaultLevel;}catch{return DETAIL_RULES.defaultLevel;}}
export function rememberDetailLevel(l:DetailLevel):void{if(!isDetailLevel(l))return;try{localStorage.setItem(DETAIL_RULES.key,l);}catch{/* the choice still applies for this session */}}
let current:DetailLevel=DETAIL_RULES.defaultLevel;
export const getDetailLevel=():DetailLevel=>current;
export function setDetailLevel(l:DetailLevel):DetailLevel{current=isDetailLevel(l)?l:DETAIL_RULES.defaultLevel;return current;}
export const detailScale=(l:DetailLevel=current):number=>DETAIL_RULES.lodScale[l]??1;
/** Switch distances for a level (metres). */
export function buildingLodDistances(l:DetailLevel=current):readonly [number,number,number]{const k=detailScale(l),b=DETAIL_RULES.buildings;return [b[0]*k,b[1]*k,b[2]*k];}
export function personLodDistances(l:DetailLevel=current):readonly [number,number]{const k=detailScale(l),p=DETAIL_RULES.people;return [p[0]*k,p[1]*k];}
export function treeNearMetres(q:'low'|'med'|'high',l:DetailLevel=current):number{return DETAIL_RULES.treeNear[q]*detailScale(l);}
export function itemLodDistances(q:'low'|'med'|'high',l:DetailLevel=current):readonly [number,number]{const k=detailScale(l)*(q==='high'?1:q==='med'?.7:.5),i=DETAIL_RULES.items;return [i[0]*k,i[1]*k];}
/** building render tier (0 near, 1 mid, 2 far, 3 impostor card) for a horizontal distance */
export function buildingTierAt(metres:number,l:DetailLevel=current):0|1|2|3{const d=buildingLodDistances(l);return metres<d[0]?0:metres<d[1]?1:metres<d[2]?2:3;}
export function personTierAt(metres:number,l:DetailLevel=current):0|1|2{const d=personLodDistances(l);return metres<d[0]?0:metres<d[1]?1:2;}
export function itemTierAt(metres:number,q:'low'|'med'|'high',l:DetailLevel=current):0|1|2{const d=itemLodDistances(q,l);return metres<d[0]?0:metres<d[1]?1:2;}
/** Half extent (metres) of the sun's shadow box for an orbit distance: tight when zoomed in (sharp texels), wide when zoomed out. */
export function shadowHalfExtent(orbitDist:number,l:DetailLevel=current):number{return Math.max(36,Math.min(DETAIL_RULES.shadowMaxHalfExtent[l],orbitDist*1.15+14));}
