/** Modular wonder kit grammar (pure). A wonder = FUNCTION CORE (keeps its gameplay identity) + seeded assembly of
 * hand-authored KIT PIECES chosen and placed by a per-civ grammar, on the real site. Pieces are generated at canonical
 * size classes so one mesh serves many placements (translate + quarter-turn only): `meshKeys` and `instances` tell the
 * renderer what to instance. Materials are civStyles slots (`${civ}.wall` ...) plus shared water, fire and foliage. */
import {hashSeed,part,partBounds,partsAtLod,partTriangles,floatingParts,seededRandom,chance,pick,range,type Part,type Rng,type LodTier,type BuildingSpec} from './buildingParts';
import {rotateParts} from './buildingFamilies';
import {ensureTiers,ensureCore,ensureNearSupport} from './buildingFamiliesCivic';
import {CIVS,CIV_IDS,matId,materialTable,type CivId,type CivMaterials,type Swatch} from './civStyles';
import {groundSite,plinthSpec,type SiteSampleLike} from './siteGrounding';
export type WonderFunction='observatory'|'terraceGarden'|'harbor'|'millMarket'|'cistern'|'assembly';
export const WONDER_FUNCTIONS:WonderFunction[]=['observatory','terraceGarden','harbor','millMarket','cistern','assembly'];
export type KitId='baseTerrace'|'plinth'|'causeway'|'colonnade'|'tholos'|'arch'|'dome'|'spire'|'pylonPair'|'zigguratTiers'|'pagodaTiers'|'statue'|'gate'|'wall'|'brazier'|'relief'|'waterFeature'|'bannerPair';
export type CoreId='sightRing'|'cascadeTerraces'|'basinQuay'|'millRace'|'cisternPit'|'bemaTiers';
export const KIT_IDS:KitId[]=['baseTerrace','plinth','causeway','colonnade','tholos','arch','dome','spire','pylonPair','zigguratTiers','pagodaTiers','statue','gate','wall','brazier','relief','waterFeature','bannerPair'];
export const CORE_OF:Record<WonderFunction,CoreId>={observatory:'sightRing',terraceGarden:'cascadeTerraces',harbor:'basinQuay',millMarket:'millRace',cistern:'cisternPit',assembly:'bemaTiers'};
export type Size='S'|'M'|'L'|'XL';const K:Record<Size,number>={S:.6,M:1,L:1.6,XL:2.4};
export const SHARED_MATERIALS:Record<string,Swatch>={'shared.water':{hex:'#5d8fa8',roughness:.2},'shared.fire':{hex:'#f0a03a',roughness:.6},'shared.foliage':{hex:'#5a7d3a',roughness:.95}};
export type Axis='processional'|'cross'|'radial'|'linear'|'spiral';
export type WonderOptions={footprint?:{w:number;d:number};wealth?:number;era?:number;wear?:number;/** pin choices; unpinned ones come from the seed */crown?:KitId;axis?:Axis;enclosure?:'wall'|'colonnade'|'none';water?:boolean;density?:number};
export type WonderPreset={v:1;seed:number;civ:CivId;family:WonderFunction;options:WonderOptions};
type V3=[number,number,number];
/** Piece generators work in a canonical frame at scale k; every dimension is multiplied once, so (kit,variant,size,civ) fully determines the mesh. */
type Gen=(c:C)=>void;type C={civ:CivId;v:number;k:number;parts:Part[];m:(s:keyof CivMaterials|'water'|'fire'|'foliage')=>Part['mat'];
 b:(s:keyof CivMaterials,sz:V3,p:V3,lod?:LodTier,rot?:V3)=>void;cy:(s:keyof CivMaterials|'water'|'fire'|'foliage',d:number,h:number,p:V3,lod?:LodTier,sides?:number,top?:number)=>void;x:(shape:Part['shape'],s:keyof CivMaterials|'water'|'fire'|'foliage',sz:V3,p:V3,lod?:LodTier,rot?:V3,sides?:number)=>void};
const mkC=(civ:CivId,v:number,size:Size):C=>{const k=K[size],parts:Part[]=[],m=(s:string)=>(s==='water'||s==='fire'||s==='foliage'?`shared.${s}`:matId(civ,s as keyof CivMaterials)) as Part['mat'],sc=(a:V3):V3=>[a[0]*k,a[1]*k,a[2]*k];
 return {civ,v,k,parts,m,b:(s,sz,p,lod=1,rot)=>void parts.push(part('box',m(s),sc(sz),sc(p),lod,rot)),cy:(s,d,h,p,lod=1,sides=12,top)=>void parts.push(part('cylinder',m(s),[d*k,h*k,(top??d)*k],sc(p),lod,undefined,sides)),x:(shape,s,sz,p,lod=1,rot,sides)=>void parts.push(part(shape,m(s),sc(sz),sc(p),lod,rot,sides))};};
const PIECES:Record<KitId,{variants:number;radius:number;gen:Gen}>={
 baseTerrace:{variants:3,radius:5,gen:c=>{const n=2+c.v%2;let w=9,y=0;for(let i=0;i<n;i++){if(c.v===1)c.cy(i%2?'wall2':'wall',w,.5,[0,y,0],2,16);else c.b(i%2?'wall2':'wall',[w,.5,w*.9],[0,y,0],2);y+=.5;w*=.76;}if(c.v!==1)c.x('wedge','wall2',[2.4,n*.5,1.4],[0,0,4.5*.9+.7],1,[0,0,0]);}},
 plinth:{variants:3,radius:4.5,gen:c=>{c.b('wall',[9,.6,7],[0,0,0],2);c.b('wall2',[8,.25,6],[0,.6,0],2);if(c.v>0)for(const sx of[-1,1])for(const sz of[-1,1])c.b('trim',[.5,.9,.5],[sx*4,.85,sz*3],1);if(c.v===2)c.x('wedge','wall2',[3,.85,1.2],[0,0,4.1],1);}},
 causeway:{variants:3,radius:5,gen:c=>{c.b('wall',[2.4,.45,10],[0,0,0],2);for(let i=0;i<5;i++)for(const s of[-1,1]){if(c.v===0)c.cy('trim',.35,1.1,[s*1.35,.45,-4+i*2],1,6);else if(c.v===1)c.b('wall2',[.3,.5,1.4],[s*1.35,.45,-4+i*2],1);else c.x('cone','accent',[.4,.9,.4],[s*1.35,.45,-4+i*2],0,undefined,5);}}},
 colonnade:{variants:3,radius:4.5,gen:c=>{const n=6+c.v*2;c.b('wall2',[9,.3,2],[0,0,0],2);for(let i=0;i<n;i++){const x=-4.2+i*8.4/(n-1);if(c.v===1)c.b('wall',[.55,3.2,.55],[x,.3,0],2);else c.cy('wall',.55,3.2,[x,.3,0],2,10,.45);if(c.v===2&&i%2===0)c.cy('wall',.4,3,[x,.3,.7],1,8);}c.b('trim',[9,.5,1.8],[0,3.5,0],2);if(c.v!==1)c.x('prism','roof',[2,1,9],[0,4,0],1,[0,0,0]);}},
 tholos:{variants:3,radius:3.4,gen:c=>{const n=8+c.v*2;c.cy('wall2',6.6,.35,[0,0,0],2,16);for(let i=0;i<n;i++){const a=i/n*Math.PI*2;c.cy('wall',.45,3,[Math.cos(a)*2.8,.35,Math.sin(a)*2.8],2,8,.38);}c.cy('trim',6.2,.4,[0,3.35,0],2,16);if(c.v===1)c.x('cone','roof',[6.8,2,6.8],[0,3.75,0],1,undefined,16);else if(c.v===2)c.x('sphere','roof',[5.8,3,5.8],[0,3.75,0],1);else c.cy('accent',.8,.4,[0,3.75,0],0,8);}},
 arch:{variants:3,radius:2.4,gen:c=>{for(const s of[-1,1])c.b('wall',[1,4,1.2],[s*1.5,0,0],2);if(c.v===0){c.b('trim',[4,.8,1.4],[0,4,0],2);c.x('prism','roof',[1.4,.9,4.2],[0,4.8,0],1,[0,Math.PI/2,0]);}else if(c.v===1){c.b('trim',[3.6,.5,1.3],[0,4,0],2);c.b('wall2',[2.4,.5,1.2],[0,4.5,0],2);c.b('wall',[1.2,.5,1.1],[0,5,0],1);}else{c.b('trim',[4,.5,1.4],[0,4,0],2);c.x('sphere','wall',[3,1.6,1.3],[0,4.5,0],1);}}},
 dome:{variants:3,radius:3.4,gen:c=>{c.cy('wall',6,2.2,[0,0,0],2,16);if(c.v===0)c.x('sphere','roof',[6.2,3.4,6.2],[0,2.2,0],2);else if(c.v===1){c.x('sphere','roof',[5.6,5.4,5.6],[0,2.2,0],2);c.x('cone','accent',[.8,1.6,.8],[0,7.4,0],1,undefined,6);}else{c.cy('wall2',5,.8,[0,2.2,0],2,16);c.cy('wall',3.6,.8,[0,3,0],2,16);c.x('sphere','roof',[3.2,2,3.2],[0,3.8,0],1);}c.cy('trim',6.3,.25,[0,2.1,0],0,16);}},
 spire:{variants:3,radius:1.6,gen:c=>{if(c.v===0){let d=3,y=0;for(let i=0;i<6;i++){c.cy('wall2',d,1.5,[0,y,0],2,4,d*.85);y+=1.5;d*=.78;}c.x('cone','accent',[d,1.2,d],[0,y,0],1,undefined,6);}else if(c.v===1){c.b('wall',[2.2,.8,2.2],[0,0,0],2);c.cy('wall',1.6,8,[0,.8,0],2,4,.5);c.x('pyramid','accent',[.7,1,.7],[0,8.8,0],1);}else{for(let i=0;i<4;i++){c.cy('wall',2.6-i*.5,2,[0,i*2,0],2,8);c.cy('roof',3.3-i*.55,.35,[0,i*2+2,0],1,8,2.2-i*.4);}c.x('cone','accent',[.5,1.6,.5],[0,8.4,0],1,undefined,5);}}},
 pylonPair:{variants:3,radius:3.6,gen:c=>{for(const s of[-1,1]){c.cy('wall',3.4,6.5,[s*2.6,0,0],2,4,2.4);c.b('trim',[2.4,.35,1.8],[s*2.6,6.5,0],1,[0,0,0]);}c.b('wall2',[3,1.6,2],[0,5,0],2);if(c.v===1)for(const s of[-1,1])c.cy('wall2',.5,7,[s*4.8,0,1.5],1,8);if(c.v===2)c.x('prism','roof',[2.2,1.1,3.2],[0,6.6,0],1,[0,Math.PI/2,0]);}},
 zigguratTiers:{variants:3,radius:4.6,gen:c=>{const n=3+c.v;let w=9;for(let i=0;i<n;i++){c.b(i%2?'wall2':'wall',[w,1.3,w*.95],[0,i*1.3,0],2);w*=.74;}c.b('wall',[w*.9,1.8,w*.8],[0,n*1.3,0],2);c.x('hip','roof',[w,.6,w*.85],[0,n*1.3+1.8,0],1);c.x('wedge','wall2',[2,n*1.3,n*1.3*.8],[0,0,4.3],1,[0,0,0]);}},
 pagodaTiers:{variants:3,radius:3.4,gen:c=>{const n=3+c.v;let w=5.6,y=0;c.b('accent',[7,.4,7],[0,0,0],2);y=.4;for(let i=0;i<n;i++){c.b('wall',[w*.75,1.8,w*.75],[0,y,0],2);c.x('hip','roof',[w*1.2,.9,w*1.2],[0,y+1.8,0],2);y+=2.5;w*=.82;}c.x('cone','accent',[.35,1.6,.35],[0,y,0],1,undefined,6);}},
 statue:{variants:4,radius:1.6,gen:c=>{c.b('wall2',[2.2,1.2,2.2],[0,0,0],2);if(c.v===0){c.b('wall',[1,2.2,.7],[0,1.2,0],2);c.x('sphere','wall',[.8,.8,.8],[0,3.4,0],1);}else if(c.v===1){c.b('wall',[1.1,1.1,1.1],[0,1.2,0],2);c.b('wall',[.8,1.4,.6],[0,2.3,0],2);c.x('sphere','wall',[.7,.7,.7],[0,3.7,0],1);c.b('wall',[1.3,.2,.3],[0,3,0],0);}else if(c.v===2){c.b('wall',[1.7,1,.8],[0,1.2,0],2);c.b('wall',[.7,.8,.6],[.7,2.2,0],2);c.x('sphere','wall',[.7,.6,.6],[.9,3,0],1);c.b('wall',[.3,.5,.3],[-.7,2.2,0],0);}else{c.cy('wall',.9,3.4,[0,1.2,0],2,6,.5);c.x('cone','accent',[.7,1,.7],[0,4.6,0],1,undefined,5);}}},
 gate:{variants:3,radius:2.6,gen:c=>{for(const s of[-1,1])c.b('wall',[1.8,3.6,1.4],[s*1.9,0,0],2);c.b('wall2',[5.6,1,1.4],[0,3.6,0],2);if(c.v===1)for(const s of[-1,1])c.x('cone','accent',[.5,.9,.5],[s*2,4.6,0],0,undefined,5);if(c.v===2)for(const s of[-1,1])c.b('accent',[.12,2.6,.9],[s*.7,0,0],0);}},
 wall:{variants:3,radius:4.4,gen:c=>{c.b('wall',[9,2.4,.8],[0,0,0],2);if(c.v===0)for(let i=0;i<6;i++)c.b('wall2',[.8,.6,.9],[-3.8+i*1.5,2.4,0],1);else if(c.v===1)for(let i=0;i<4;i++)c.b('wall2',[.7,3,.9],[-3.4+i*2.3,0,0],1);else c.x('wedge','roof',[9.2,.8,1.2],[0,2.4,0],1,[0,0,0]);}},
 brazier:{variants:3,radius:.9,gen:c=>{if(c.v===0){for(let i=0;i<3;i++){const a=i*2.1;c.cy('wall2',.15,1.3,[Math.cos(a)*.4,0,Math.sin(a)*.4],1,5);}c.cy('trim',1,.35,[0,1.3,0],1,8);}else if(c.v===1){c.cy('wall',.8,1.2,[0,0,0],1,8,.5);c.cy('trim',1.1,.3,[0,1.2,0],1,8);}else{c.b('wall2',[.9,.9,.9],[0,0,0],1);c.cy('trim',.9,.3,[0,.9,0],1,6);}c.x('cone','fire',[.6,.7,.6],[0,v1(c),0],0,undefined,5);}},
 relief:{variants:3,radius:2.6,gen:c=>{c.b('wall',[5,3.4,.5],[0,0,0],2);for(let i=0;i<(2+c.v);i++)c.b('wall2',[1,2.4-i*.4,.12],[-1.6+i*(3.2/(1+c.v)),.5,.31],0);c.b('cloth',[1.4,1.9,.05],[0,.7,.34],1);}},
 waterFeature:{variants:3,radius:3.2,gen:c=>{if(c.v===0){c.cy('wall',6,.6,[0,0,0],2,16);c.cy('water',5.2,.1,[0,.5,0],1,16);c.x('cone','water',[.5,1.6,.5],[0,.6,0],0,undefined,6);}else if(c.v===1){c.b('wall',[2.4,.5,8],[0,0,0],2);c.b('water',[1.6,.08,7.6],[0,.45,0],1);}else{for(let i=0;i<3;i++){c.b('wall',[4-i*1,.5,3],[0,i*.5,-i*.0],2);c.b('water',[3-i*.8,.06,2.6],[0,i*.5+.45,0],1);}}}},
 bannerPair:{variants:3,radius:1.4,gen:c=>{for(const s of[-1,1]){c.cy('trim',.14,6,[s*1.1,0,0],1,5);c.b('cloth',[.9,1.6,.04],[s*1.1+.5,3.8,0],1);if(c.v>0)c.x('cone','accent',[.3,.4,.3],[s*1.1,6,0],0,undefined,5);}}},
};
const v1=(c:C)=>c.v===0?1.65:1.5;
const CORES:Record<CoreId,{variants:number;radius:number;gen:Gen}>={
 sightRing:{variants:3,radius:6,gen:c=>{const n=12+c.v*4;c.cy('wall2',13,.4,[0,0,0],2,24);for(let i=0;i<n;i++){const a=i/n*Math.PI*2;if(Math.abs(Math.atan2(Math.sin(a),Math.cos(a))-Math.PI/2)<.45)continue;if(c.v===1)c.b('wall',[1.2,3.4,.9],[Math.cos(a)*5.5,.4,Math.sin(a)*5.5],2,[0,-a+Math.PI/2,0]);else c.cy('wall',.9,3.6+(i%3)*.4,[Math.cos(a)*5.5,.4,Math.sin(a)*5.5],2,8,.7);}c.cy('trim',.6,4.4,[0,.4,0],2,8,.3);c.cy('accent',1.2,.3,[0,.4,0],1,10);}},
 cascadeTerraces:{variants:3,radius:6,gen:c=>{const n=3+c.v;for(let i=0;i<n;i++){c.b(i%2?'wall2':'wall',[12-i*2,.7,3.6],[0,i*.7,-4.5+i*2.8],2);c.b('water',[1.1,.06,3.4],[0,i*.7+.7,-4.5+i*2.8],1);c.b('wall2',[10-i*2,.35,1.2],[0,i*.7+.7,-4.5+i*2.8+1.5],0);}for(const s of[-1,1])for(let i=0;i<n;i++)c.x('sphere','foliage',[1.2,1,1.2],[s*(3.4-i*.4),i*.7+.7,-4.5+i*2.8],0);}},
 basinQuay:{variants:3,radius:6,gen:c=>{c.cy('wall',12.5,.5,[0,0,0],2,24);c.cy('water',9,.1,[0,.4,0],1,24);for(let i=0;i<9;i++){const a=Math.PI*.15+i*Math.PI*.7/8;c.b('wall2',[2,.9,.6],[Math.cos(a)*5.4,.5,-Math.sin(a)*5.4],1,[0,a,0]);}c.b('wall',[2.6,.5,2],[0,.5,5.2],1);c.cy('trim',.3,1.6,[2.2,.5,5.2],0,6);}},
 millRace:{variants:3,radius:6,gen:c=>{c.b('wall',[12,.5,3.2],[0,0,0],2);c.b('water',[11,.08,2.2],[0,.45,0],1);c.b('wall2',[3.6,3.2,3],[-3,.5,-2.5],2);c.cy('wood'as any,2,0,[0,0,0],0);c.parts.pop();c.parts.push(part('cylinder',matId(c.civ,'trim') as Part['mat'],[3*c.k,.5*c.k,3*c.k],[2*c.k,1.9*c.k,0],2,[Math.PI/2,0,0],12));c.x('prism','roof',[3.8,1.2,3.2],[-3,3.7,-2.5],1,[0,Math.PI/2,0]);}},
 cisternPit:{variants:3,radius:6,gen:c=>{c.b('wall',[11,.9,9],[0,0,0],2);c.b('water',[8.6,.08,6.6],[0,.85,0],1);for(const [x,z,sx,sz] of[[0,-4.6,11,.8],[0,4.6,11,.8],[-5.6,0,.8,9],[5.6,0,.8,9]] as [number,number,number,number][])c.b('wall2',[sx,1.4,sz],[x,.9,z],2);if(c.v>0)for(let i=0;i<3+c.v;i++)c.cy('wall',.7,3,[-4+i*8/(2+c.v),.9,0],2,8);if(c.v===2)c.b('roof',[10,.3,8],[0,3.9,0],1);}},
 bemaTiers:{variants:3,radius:6,gen:c=>{const n=3+c.v;for(let i=0;i<n;i++){c.cy(i%2?'wall2':'wall',12-i*2.2,.55,[0,i*.55,0],2,20);}c.cy('trim',3.4,.5,[0,n*.55,0],2,12);c.b('wall2',[2,.8,1.4],[0,n*.55+.5,0],1);for(const s of[-1,1])c.b('wall',[.7,.5,6],[s*5.6,0,0],0);}},
};
// the millRace piece used an inline wheel; keep helper table typed
export type PlacedPiece={kit:KitId|CoreId;variant:number;size:Size;x:number;z:number;quarter:number;meshKey:string;radius:number;role:'base'|'core'|'crown'|'flank'|'enclosure'|'water'|'relief'|'banner'};
export type WonderKitPlan={v:1;preset:WonderPreset;civ:CivId;family:WonderFunction;footprint:{w:number;d:number};parts:Part[];pieces:PlacedPiece[];meshKeys:string[];instances:number;materials:Record<string,Swatch>;
 identity:{function:WonderFunction;core:CoreId;satisfied:boolean;sightAzimuth?:number;basin?:{cx:number;cz:number;r:number};bema?:{x:number;z:number}};axis:Axis;silhouette:string;grounding:{needsPlinth:boolean;floorY:number};spec:BuildingSpec;
 triangles:[number,number,number]};
const meshCache=new Map<string,Part[]>();
export function pieceParts(id:KitId|CoreId,variant:number,size:Size,civ:CivId):Part[]{const key=`${id}.${variant}.${size}.${civ}`;let p=meshCache.get(key);if(!p){const def=(PIECES as any)[id]??(CORES as any)[id],c=mkC(civ,variant,size);def.gen(c);p=c.parts;meshCache.set(key,p);}return p;}
const radiusOf=(id:KitId|CoreId,size:Size)=>((PIECES as any)[id]??(CORES as any)[id]).radius*K[size];
/** Civ bias (not a rule): the seed picks 3 from a bias pool of 5 and still allows 1 wildcard. */
const CROWN_BIAS:Record<CivId,KitId[]>={sandrill:['arch','statue','spire','relief','dome'],nilemark:['pylonPair','spire','statue','colonnade','relief'],tigrane:['zigguratTiers','dome','arch','spire','statue'],hanrei:['pagodaTiers','gate','spire','dome','statue'],vedara:['spire','dome','colonnade','statue','zigguratTiers'],aureline:['tholos','colonnade','dome','statue','arch'],sahelan:['spire','relief','arch','zigguratTiers','statue'],quillan:['zigguratTiers','relief','gate','statue','spire'],kaaltun:['zigguratTiers','spire','statue','relief','pagodaTiers'],mekhari:['pagodaTiers','gate','spire','statue','colonnade'],brythen:['tholos','statue','spire','gate','wall'],rusvolt:['dome','spire','pagodaTiers','gate','statue'],steppan:['dome','bannerPair' as KitId,'statue','arch','spire'],skoldar:['gate','statue','spire','relief','pagodaTiers']};
const FLANK_POOL:KitId[]=['colonnade','tholos','statue','brazier','pylonPair','spire','arch','bannerPair','waterFeature','gate'];
const BASES:KitId[]=['baseTerrace','plinth','causeway'];
export const AXES:Axis[]=['processional','cross','radial','linear','spiral'];
const sizeFor=(avail:number,rad:number,max:Size='XL'):Size=>{const order:Size[]=['XL','L','M','S'];for(const s of order.slice(order.indexOf(max)))if(rad*K[s]<=avail)return s;return 'S';};
export function generateWonderKit(preset:WonderPreset,site?:SiteSampleLike):WonderKitPlan{
 const {seed,civ,family}=preset,o=preset.options,fp=o.footprint??{w:36,d:36},r=seededRandom(hashSeed(seed,civ,family,'kit')),hw=fp.w/2*.92,hd=fp.d/2*.92,core=CORE_OF[family];
 const slope=site?site.meanGrade:0,axis=o.axis??(site&&slope>.18?'linear':pick(r,AXES)),pieces:PlacedPiece[]=[];
 const placeOk=(x:number,z:number,rad:number)=>Math.abs(x)+rad<=hw+.01&&Math.abs(z)+rad<=hd+.01&&pieces.every(p=>p.role==='base'||Math.hypot(p.x-x,p.z-z)>=p.radius+rad-.4);
 const put=(kit:KitId|CoreId,role:PlacedPiece['role'],x:number,z:number,maxSize:Size,variant:number,quarter=0,must=false)=>{let size=maxSize;for(const s of(['XL','L','M','S'] as Size[]).slice((['XL','L','M','S'] as Size[]).indexOf(maxSize))){size=s;if(placeOk(x,z,radiusOf(kit,s))||role==='base')break;}
  const rad=radiusOf(kit,size);if(!must&&role!=='base'&&!placeOk(x,z,rad))return false;pieces.push({kit,variant,size,x,z,quarter,meshKey:`${kit}.${variant}.${size}.${civ}`,radius:rad,role});return true;};
 // base: biggest that fits, steered by the site (steep or wet ground gets a causeway or plinth)
 const baseKit=o.axis==='linear'||(site&&site.wetFraction>.05)?'causeway':pick(r,BASES);put(baseKit,'base',0,0,sizeFor(Math.min(hw,hd),PIECES[baseKit].radius),Math.floor(r()*3),site&&Math.abs(Math.cos(site.downhillRadians))>.7?1:0);
 // function core at the centre (or offset for a linear layout), as large as the footprint allows
 const coreSize=sizeFor(Math.min(hw,hd)*(axis==='radial'?.55:.62),CORES[core].radius,'XL'),cx=axis==='linear'?-hw*.28:0;put(core,'core',cx,axis==='processional'?hd*.12:0,coreSize,Math.floor(r()*3),0,true);
 // crown, flanks, enclosure, water, relief, banners
 const bias=CROWN_BIAS[civ],crowns=[...bias].sort(()=>r()-.5).slice(0,3);if(chance(r,.25))crowns[2]=pick(r,FLANK_POOL);const crown=(o.crown??crowns[0]) as KitId;
 const slots:[number,number,number][]=[];const A=(x:number,z:number,q=0)=>slots.push([x*hw,z*hd,q]);
 if(axis==='processional'){A(0,-.7,0);A(0,.78,2);A(-.72,-.2,1);A(.72,-.2,3);A(-.72,.4,1);A(.72,.4,3);}
 else if(axis==='cross'){A(0,-.72,0);A(0,.74,2);A(-.74,0,1);A(.74,0,3);A(-.55,-.55,0);A(.55,.55,2);}
 else if(axis==='radial'){for(let i=0;i<8;i++){const a=i/8*Math.PI*2+r()*.3;A(Math.cos(a)*.76,Math.sin(a)*.76,Math.round(a/(Math.PI/2)));}}
 else if(axis==='linear'){A(.6,-.5,0);A(.62,.3,0);A(.2,.7,2);A(-.6,.7,2);A(-.7,-.7,0);A(.1,-.75,0);}
 else{for(let i=0;i<7;i++){const a=i*.9+r(),rr=.38+i*.07;A(Math.cos(a)*rr*1.1,Math.sin(a)*rr*1.1,Math.round(a/(Math.PI/2)));}}
 const free=slots.slice(),take=()=>free.shift();
 let s=take();if(s)put(crown,'crown',s[0],s[1],'XL',Math.floor(r()*3),s[2]);
 const flanks=Array.from({length:3},()=>pick(r,FLANK_POOL)),nFl=Math.round(2+(o.density??r())*4);
 for(let i=0;i<nFl&&free.length;i++){s=take()!;const kit=flanks[i%3],pair=i%2===0&&free.length&&axis!=='spiral';put(kit,'flank',s[0],s[1],i<2?'L':'M',Math.floor(r()*3),s[2]);if(pair){const m=free.find(t=>Math.abs(t[0]+s![0])<hw*.05&&Math.abs(t[1]-s![1])<hd*.05);if(m){free.splice(free.indexOf(m),1);put(kit,'flank',m[0],m[1],i<2?'L':'M',pieces[pieces.length-1].variant,(m[2]+2)%4);}}}
 const encl=o.enclosure??pick(r,['wall','colonnade','none','wall'] as const);if(encl!=='none'){const kit:KitId=encl==='wall'?'wall':'colonnade';for(const [x,z,q] of[[0,-.97,0],[-.97,0,1],[.97,0,3]] as [number,number,number][]){const sz=sizeFor(Math.min(hw,hd)*.5,PIECES[kit].radius,'L');if(x===0||q===1||q===3)put(kit,'enclosure',x*hw,z*hd,sz,Math.floor(r()*3),q);}}
 if(o.water??chance(r,.55)){const g=free.shift()??[hw*.5,hd*.6,0];put('waterFeature','water',g[0],g[1],'M',Math.floor(r()*3),g[2]);}
 if(chance(r,.7))put('relief','relief',0,-hd*.98,'M',Math.floor(r()*3),0);put('bannerPair','banner',(r()<.5?-1:1)*hw*.5,hd*.85,'M',Math.floor(r()*3),0);
 for(let i=0;i<pick(r,[0,2,4]);i++){const x=(i%2?1:-1)*hw*(.3+.1*i),z=hd*.62;put('brazier','flank',x,z,'S',Math.floor(r()*3));}
 // flatten to world parts: canonical mesh, quarter turn, translate; floor lifted to the site's floor
 // LOD by role: base, core and crown carry the far silhouette; flanks, enclosure and water stop at mid; relief and banners are near-only.
 const CAP:Record<PlacedPiece['role'],LodTier>={base:2,core:2,crown:2,flank:1,enclosure:1,water:1,relief:0,banner:0};
 const build=(p:PlacedPiece)=>{p.meshKey=`${p.kit}.${p.variant}.${p.size}.${civ}.l${CAP[p.role]}`;p.radius=radiusOf(p.kit,p.size);return rotateParts(pieceParts(p.kit,p.variant,p.size,civ),p.quarter).map(q=>({...q,lod:Math.min(q.lod,CAP[p.role]) as LodTier,pos:[q.pos[0]+p.x,q.pos[1],q.pos[2]+p.z] as V3}));};
 const over=(ps:Part[])=>{let m=0;for(const q of ps){const b=partBounds(q);m=Math.max(m,b.maxX-fp.w/2,-fp.w/2-b.minX,b.maxZ-fp.d/2,-fp.d/2-b.minZ);}return m;};
 let built=pieces.map(build);
 for(let guard=0;guard<60;guard++){let worst=-1,wv=1e-6;built.forEach((ps,i)=>{const v=over(ps);if(v>wv){wv=v;worst=i;}});if(worst<0)break;const pc=pieces[worst],order:Size[]=['XL','L','M','S'],ix=order.indexOf(pc.size);
  if((pc.role==='core'||pc.role==='base')&&ix<3){pc.size=order[ix+1];built[worst]=build(pc);}else if(pc.role==='core'||pc.role==='base'){pc.x=0;pc.z=0;built[worst]=build(pc);if(over(built[worst])>1e-6){pieces.splice(worst,1);built.splice(worst,1);}}else{pieces.splice(worst,1);built.splice(worst,1);}}
 const g=site?groundSite(site):undefined,parts:Part[]=built.flat();
 if(site&&g?.needsPlinth)parts.push(...plinthSpec(site,fp,g).parts);
 const meshKeys=[...new Set(pieces.map(p=>p.meshKey))];
 const spec0:BuildingSpec={family:`wonder.${family}`,variantKey:String(seed),footprint:{...fp},parts,notes:{reference:`${CIVS[civ].name} ${family}, kit assembly`}};
 const tbl={...materialTable(civ),...SHARED_MATERIALS},grounded=ensureTiers(ensureNearSupport(ensureCore(parts),fp),fp).map(q=>tbl[q.mat]?q:{...q,mat:matId(civ,'wall2') as Part['mat']}),spec:BuildingSpec={...spec0,parts:grounded};
 const sampleCols=14,prof:number[]=[];for(let i=0;i<sampleCols;i++){const x0=-fp.w/2+i*fp.w/sampleCols,x1=x0+fp.w/sampleCols;let m=0;for(const p of grounded){const b=partBounds(p);if(b.maxX>=x0&&b.minX<=x1&&p.lod===2)m=Math.max(m,b.maxY);}prof.push(Math.round(m));}
 const tr=([0,1,2] as LodTier[]).map(t=>partsAtLod(spec,t).reduce((n,p)=>n+partTriangles(p),0)) as [number,number,number];
 const identity:WonderKitPlan['identity']={function:family,core,satisfied:pieces.some(p=>p.kit===core&&p.role==='core'),...(family==='observatory'?{sightAzimuth:Math.PI/2}:{}),...(family==='harbor'?{basin:{cx:cx,cz:axis==='processional'?hd*.12:0,r:coreSize==='XL'?4.5*2.4*.9:4.5*K[coreSize]*.9}}:{}),...(family==='assembly'?{bema:{x:cx,z:axis==='processional'?hd*.12:0}}:{})};
 return {v:1,preset,civ,family,footprint:{...fp},parts:grounded,pieces,meshKeys,instances:pieces.length,materials:{...materialTable(civ),...SHARED_MATERIALS},identity,axis,silhouette:prof.join('.')+'|'+pieces.filter(p=>p.role!=='banner').map(p=>p.kit+p.size+p.variant).join(','),grounding:{needsPlinth:!!g?.needsPlinth,floorY:g?.floorY??0},spec,triangles:tr};
}
// ---- presets: small JSON, validated on the way in
export const serializePreset=(p:WonderPreset)=>JSON.stringify({v:1,s:p.seed,c:p.civ,f:p.family,o:p.options});
export function deserializePreset(text:string):{ok:true;preset:WonderPreset}|{ok:false;reason:string}{
 let j:any;try{j=JSON.parse(text);}catch{return {ok:false,reason:'not JSON'};}
 if(!j||j.v!==1)return {ok:false,reason:'unknown version'};if(!Number.isInteger(j.s))return {ok:false,reason:'seed must be an integer'};if(!CIV_IDS.includes(j.c))return {ok:false,reason:'unknown civ'};if(!WONDER_FUNCTIONS.includes(j.f))return {ok:false,reason:'unknown wonder'};
 const o=j.o??{},out:WonderOptions={};
 if(o.footprint){const w=Number(o.footprint.w),d=Number(o.footprint.d);if(!(w>=16&&w<=80&&d>=16&&d<=80))return {ok:false,reason:'footprint out of range'};out.footprint={w,d};}
 for(const k of['wealth','era','wear','density'] as const)if(o[k]!==undefined){const n=Number(o[k]);if(!Number.isFinite(n))return {ok:false,reason:k+' not a number'};out[k]=Math.max(0,Math.min(k==='era'?5:1,n));}
 if(o.crown!==undefined){if(!KIT_IDS.includes(o.crown))return {ok:false,reason:'unknown crown'};out.crown=o.crown;}
 if(o.axis!==undefined){if(!AXES.includes(o.axis))return {ok:false,reason:'unknown axis'};out.axis=o.axis;}
 if(o.enclosure!==undefined){if(!['wall','colonnade','none'].includes(o.enclosure))return {ok:false,reason:'unknown enclosure'};out.enclosure=o.enclosure;}
 if(o.water!==undefined)out.water=!!o.water;
 return {ok:true,preset:{v:1,seed:j.s,civ:j.c,family:j.f,options:out}};
}
void floatingParts;
