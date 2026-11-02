import type {Game} from './sim';
import type {Building} from './types';
import {sampleHeight} from './worldgen';
export const EXCAVATION_RULES={version:1,depths:[.5,1,1.5,2] as readonly number[],defaultDepth:1,maximumBankGrade:.30,subdivisions:16,coarseCellsPerTile:2,maximumTiles:512,maximumCuts:512,workSecondsPerCubicMeter:6,minimumWorkSeconds:18,waterClearanceMeters:.35,maximumNaturalGrade:.24} as const;
export type TerrainCut={version:1;id:number;buildingId:number;team:number;x:number;z:number;w:number;d:number;depth:number;volumeCubicMeters:number;workSeconds:number;legacyPaid?:boolean};
type ExcavationState={excavations?:TerrainCut[];excavationDepth?:number};
type ExcavationBuilding=Building&{excavationDepth?:number;excavationVolume?:number;excavationWorkSeconds?:number};
const state=(g:Game)=>g.state as Game['state']&ExcavationState;
export const excavationCuts=(g:Game)=>state(g).excavations||[];
export function excavationDepth(g:Game){const n=state(g).excavationDepth;return EXCAVATION_RULES.depths.includes(n!)?n!:EXCAVATION_RULES.defaultDepth;}
export function setExcavationDepth(g:Game,depth:number){if(!EXCAVATION_RULES.depths.includes(depth))return false;state(g).excavationDepth=depth;return true;}
export function cutRadius(cut:Pick<TerrainCut,'depth'>){return 1.5*cut.depth/EXCAVATION_RULES.maximumBankGrade;}
export function cutAmount(cut:Pick<TerrainCut,'x'|'z'|'w'|'d'|'depth'>,x:number,z:number){
 const dx=Math.max(0,Math.abs(x-cut.x)-cut.w*.18),dz=Math.max(0,Math.abs(z-cut.z)-cut.d*.18),q=Math.min(1,Math.hypot(dx,dz)/cutRadius(cut));
 return cut.depth*(1-q*q*(3-2*q));
}
export function cutBounds(c:Pick<TerrainCut,'x'|'z'|'w'|'d'|'depth'>){const r=cutRadius(c);return{x0:c.x-c.w*.18-r,x1:c.x+c.w*.18+r,z0:c.z-c.d*.18-r,z1:c.z+c.d*.18+r};}
export type ExcavationTile={x:number;z:number;key:number;heights:Float32Array;cuts:TerrainCut[]};
export type ExcavationTerrain={world:Game['world'];records:TerrainCut[];count:number;tileSize:number;width:number;tiles:Map<number,ExcavationTile>;revision:number;buildingIds:Set<number>};
const cache=new WeakMap<Game,ExcavationTerrain>();
const raw=(g:Game,x:number,z:number)=>sampleHeight(g.world.heights,x,z,g.world.size);
function tileKeys(g:Game,cut:Pick<TerrainCut,'x'|'z'|'w'|'d'|'depth'>,size:number,width:number){const b=cutBounds(cut),half=g.world.size/2,keys:number[]=[];for(let z=Math.max(0,Math.floor((b.z0+half)/size));z<=Math.min(width-1,Math.floor((b.z1+half)/size));z++)for(let x=Math.max(0,Math.floor((b.x0+half)/size));x<=Math.min(width-1,Math.floor((b.x1+half)/size));x++)keys.push(z*width+x);return keys;}
/** Lazy derived refinement: 289 shared samples per active tile, no global upsample. */
export function excavationTerrain(g:Game):ExcavationTerrain{
 const records=state(g).excavations||EMPTY,old=cache.get(g);if(old?.world===g.world&&old.records===records&&old.count===records.length)return old;
 const tileSize=g.world.size/g.world.segs*EXCAVATION_RULES.coarseCellsPerTile,width=Math.ceil(g.world.size/tileSize),incremental=old?.world===g.world&&old.records===records&&old.count<records.length;
 const tiles=incremental?old.tiles:new Map<number,ExcavationTile>(),dirty=new Set<number>(),start=incremental?old.count:0,n=EXCAVATION_RULES.subdivisions;
 for(let i=start;i<records.length;i++)for(const key of tileKeys(g,records[i],tileSize,width)){
  let tile=tiles.get(key);if(!tile){tile={x:key%width,z:Math.floor(key/width),key,heights:new Float32Array((n+1)**2),cuts:[]};tiles.set(key,tile);}tile.cuts.push(records[i]);dirty.add(key);
 }
 for(const key of dirty){const t=tiles.get(key)!;for(let iz=0;iz<=n;iz++)for(let ix=0;ix<=n;ix++){
  const x=(t.x+ix/n)*tileSize-g.world.size/2,z=(t.z+iz/n)*tileSize-g.world.size/2;let cut=0;for(const c of t.cuts)cut=Math.max(cut,cutAmount(c,x,z));t.heights[iz*(n+1)+ix]=raw(g,x,z)-cut;
 }}
 const result={world:g.world,records,count:records.length,tileSize,width,tiles,revision:(old?.revision||0)+1,buildingIds:new Set(records.map(c=>c.buildingId))};cache.set(g,result);return result;
}
const EMPTY:TerrainCut[]=[];
/** Exact same triangles as the local terrain renderer, including its precision. */
export function excavationHeightAt(g:Game,x:number,z:number,baseHeight:number){
 if(!state(g).excavations?.length)return baseHeight;const terrain=excavationTerrain(g),gx=(x+g.world.size/2)/terrain.tileSize,gz=(z+g.world.size/2)/terrain.tileSize;if(gx<0||gz<0||gx>=terrain.width||gz>=terrain.width)return baseHeight;const tile=terrain.tiles.get(Math.floor(gz)*terrain.width+Math.floor(gx));if(!tile)return baseHeight;
 const n=EXCAVATION_RULES.subdivisions,px=(gx-tile.x)*n,pz=(gz-tile.z)*n,ix=Math.min(n-1,Math.max(0,Math.floor(px))),iz=Math.min(n-1,Math.max(0,Math.floor(pz))),fx=px-ix,fz=pz-iz,stride=n+1,i=iz*stride+ix,a=tile.heights[i],b=tile.heights[i+1],c=tile.heights[i+stride],d=tile.heights[i+stride+1];
 return fx+fz<=1?a+(b-a)*fx+(c-a)*fz:d+(c-d)*(1-fx)+(b-d)*(1-fz);
}
function proposal(g:Game,b:Pick<Building,'id'|'team'|'x'|'z'|'w'|'d'>,depth=(b as ExcavationBuilding).excavationDepth??(b.team===0?excavationDepth(g):EXCAVATION_RULES.defaultDepth)):TerrainCut{return{version:1,id:b.id,buildingId:b.id,team:b.team,x:b.x,z:b.z,w:b.w,d:b.d,depth,volumeCubicMeters:0,workSeconds:0};}
export function excavationVolume(g:Game,cut:TerrainCut){
 const bounds=cutBounds(cut),step=.5,fine=g.world.size/g.world.segs*EXCAVATION_RULES.coarseCellsPerTile/EXCAVATION_RULES.subdivisions,half=g.world.size/2;let volume=0;
 const additional=(x:number,z:number)=>{const h=raw(g,x,z),existing=h-excavationHeightAt(g,x,z,h),difference=cutAmount(cut,x,z)-existing;return difference>1e-5?difference:0;};
 for(let x=bounds.x0+step/2;x<bounds.x1;x+=step)for(let z=bounds.z0+step/2;z<bounds.z1;z+=step){
  const gx=(x+half)/fine,gz=(z+half)/fine,ix=Math.floor(gx),iz=Math.floor(gz),fx=gx-ix,fz=gz-iz,x0=ix*fine-half,z0=iz*fine-half;
  const a=additional(x0,z0),b=additional(x0+fine,z0),c=additional(x0,z0+fine),d=additional(x0+fine,z0+fine),lowering=fx+fz<=1?a+(b-a)*fx+(c-a)*fz:d+(c-d)*(1-fx)+(b-d)*(1-fz);
  volume+=Math.max(0,lowering)*step*step;
 }
 return volume;
}
export function configureExcavation(g:Game,building:Building){if(building.type!=='trench')return;const b=building as ExcavationBuilding,legacyCredit=b.excavationWorkSeconds===undefined&&b.build>0&&b.build<1?b.build*18:0;if(b.excavationDepth===undefined)b.excavationDepth=b.team===0?excavationDepth(g):EXCAVATION_RULES.defaultDepth;if(b.excavationVolume===undefined)b.excavationVolume=excavationVolume(g,proposal(g,b));if(b.excavationWorkSeconds===undefined)b.excavationWorkSeconds=Math.max(EXCAVATION_RULES.minimumWorkSeconds,b.excavationVolume*EXCAVATION_RULES.workSecondsPerCubicMeter);if(legacyCredit>0)b.build=Math.min(b.build,legacyCredit/b.excavationWorkSeconds);}
const workRevisions=new WeakMap<Building,{world:Game['world'];records:TerrainCut[]|undefined;count:number}>();
/** Neighboring completed cuts reduce remaining soil, preserving already performed labor. */
export function excavationWorkNeed(g:Game,building:Building){
 configureExcavation(g,building);const b=building as ExcavationBuilding,records=state(g).excavations,count=records?.length||0,old=workRevisions.get(b);
 if(b.build<1&&(!old||old.world!==g.world||old.records!==records||old.count!==count)){
  const paid=b.build*(b.excavationWorkSeconds??18),volume=excavationVolume(g,proposal(g,b)),need=Math.max(EXCAVATION_RULES.minimumWorkSeconds,volume*EXCAVATION_RULES.workSecondsPerCubicMeter);
  b.excavationVolume=volume;b.excavationWorkSeconds=Math.max(need,paid);b.build=Math.min(1,paid/b.excavationWorkSeconds);workRevisions.set(b,{world:g.world,records,count});
 }
 return b.excavationWorkSeconds??EXCAVATION_RULES.minimumWorkSeconds;
}
export function excavationIssue(g:Game,b:Pick<Building,'id'|'team'|'x'|'z'|'w'|'d'>,depth?:number){
 const cut=proposal(g,b,depth),bounds=cutBounds(cut);if(!EXCAVATION_RULES.depths.includes(cut.depth))return'Choose a trench depth from 0.5 to 2 m';
 if(Math.max(Math.abs(bounds.x0),Math.abs(bounds.x1),Math.abs(bounds.z0),Math.abs(bounds.z1))>g.world.size/2-2)return'The trench banks would extend beyond the map';
 const derived=excavationTerrain(g),keys=tileKeys(g,cut,derived.tileSize,derived.width),added=keys.filter(k=>!derived.tiles.has(k)).length;
 if(excavationCuts(g).length>=EXCAVATION_RULES.maximumCuts||derived.tiles.size+added>EXCAVATION_RULES.maximumTiles)return'Too many separate excavations — extend existing trenches';
 for(const other of g.state.buildings)if(other.id!==b.id&&other.hp>0&&other.type!=='trench'&&other.type!=='moat'&&Math.max(bounds.x0,other.x-other.w/2)<Math.min(bounds.x1,other.x+other.w/2)&&Math.max(bounds.z0,other.z-other.d/2)<Math.min(bounds.z1,other.z+other.d/2))return'Trench banks need clear ground away from structures and fields';
 for(const list of [g.state.trees,g.state.forage,g.state.stones,g.state.copper,g.state.iron])for(const node of list)if(node.amount>0&&cutAmount(cut,node.x,node.z)>.03)return'Clear or gather the resources on the trench banks first';
 for(let z=bounds.z0;z<=bounds.z1;z+=1)for(let x=bounds.x0;x<=bounds.x1;x+=1){const amount=cutAmount(cut,x,z);if(amount<.01)continue;const h=raw(g,x,z),grade=Math.hypot(raw(g,x+1,z)-raw(g,x-1,z),raw(g,x,z+1)-raw(g,x,z-1))/2;
  if(h-amount<Math.max(g.waterAt(x,z),g.waterAt(x,z)-g.world.waterY+g.world.baseWaterY+.55)+EXCAVATION_RULES.waterClearanceMeters)return'This depth would reach water — choose shallower or higher ground';
  if(grade>EXCAVATION_RULES.maximumNaturalGrade)return'Trench banks need gentler natural ground';
 }
 return null;
}
export function commitExcavation(g:Game,b:Building){
 if(b.type!=='trench'||b.build<1||b.hp<=0||b.plannedCost)return false;if(excavationCuts(g).some(c=>c.buildingId===b.id))return true;
 configureExcavation(g,b);if(excavationIssue(g,b))return false;const cut=proposal(g,b);cut.volumeCubicMeters=excavationVolume(g,cut);cut.workSeconds=excavationWorkNeed(g,b);(state(g).excavations??=[]).push(cut);
 for(const u of g.state.units)if(u.hp>0&&cutAmount(cut,u.x,u.z)>.001)u.y=excavationHeightAt(g,u.x,u.z,raw(g,u.x,u.z));
 for(const list of [g.state.trees,g.state.forage,g.state.stones,g.state.copper,g.state.iron])for(const node of list)if(cutAmount(cut,node.x,node.z)>.001)node.y=excavationHeightAt(g,node.x,node.z,raw(g,node.x,node.z));
 g.state.walkDirty=true;g.workBoard.reset();return true;
}
/** Existing completed paid trenches may migrate once; unfinished plans never dig. */
export function migratePaidTrenches(g:Game){for(const b of g.state.buildings)if(b.type==='trench'&&b.build>=1&&b.hp>0&&!b.plannedCost&&(b as ExcavationBuilding).excavationDepth===undefined&&(b as ExcavationBuilding).excavationWorkSeconds===undefined&&!excavationCuts(g).some(c=>c.buildingId===b.id)){
 const cut=proposal(g,b,EXCAVATION_RULES.defaultDepth);if(excavationIssue(g,b,cut.depth))continue;cut.volumeCubicMeters=excavationVolume(g,cut);cut.workSeconds=18;cut.legacyPaid=true;(state(g).excavations??=[]).push(cut);g.state.walkDirty=true;
}}

/** Prevent a new structure from blocking the banks of already reserved digging. */
type ConstructionQuery={state:Game['state'];buildings:Building[];length:number;trenches:Building[]};
const constructionQueries=new WeakMap<Game,ConstructionQuery>();
/** Only building types are indexed, within a synchronous placement search.
 * Keep live trench objects and all original hp/progress/plan/bank predicates. */
export function beginExcavationConstructionQuery(g:Game,type:Building['type']){
 if(type==='trench'||type==='moat'||!Array.isArray(g.state.buildings))return()=>{};
 const previous=constructionQueries.get(g),buildings=g.state.buildings;
 constructionQueries.set(g,{state:g.state,buildings,length:buildings.length,trenches:buildings.filter(b=>b.type==='trench')});let closed=false;
 return()=>{if(closed)return;closed=true;if(previous)constructionQueries.set(g,previous);else constructionQueries.delete(g);};
}
function constructionTrenches(g:Game){const c=constructionQueries.get(g);return c&&c.state===g.state&&c.buildings===g.state.buildings&&c.length===g.state.buildings.length?c.trenches:g.state.buildings;}
export function excavationConstructionIssue(g:Game,type:Building['type'],x:number,z:number,w:number,d:number){
 if(type==='trench'||type==='moat')return null;
 for(const b of constructionTrenches(g))if(b.type==='trench'&&b.hp>0&&b.build<1&&!b.plannedCost){const bounds=cutBounds(proposal(g,b));if(Math.max(bounds.x0,x-w/2)<Math.min(bounds.x1,x+w/2)&&Math.max(bounds.z0,z-d/2)<Math.min(bounds.z1,z+d/2))return'Leave room for the trench banks being dug';}
 return null;
}
/** Persistence can validate without allocating any refined geometry. */
export function validExcavations(value:unknown,size:number,segs:number){
 if(value===undefined)return true;if(!Array.isArray(value)||value.length>EXCAVATION_RULES.maximumCuts)return false;
 const ids=new Set<number>(),tiles=new Set<number>(),tileSize=size/segs*EXCAVATION_RULES.coarseCellsPerTile,width=Math.ceil(size/tileSize);
 for(const c of value){if(!c||typeof c!=='object'||c.version!==1||!Number.isSafeInteger(c.id)||c.id<1||c.buildingId!==c.id||ids.has(c.id)||!Number.isInteger(c.team)||c.team<0||c.team>63||!['x','z','w','d','depth','volumeCubicMeters','workSeconds'].every(k=>typeof c[k]==='number'&&Number.isFinite(c[k]))||c.w<=0||c.d<=0||c.w>64||c.d>64||!EXCAVATION_RULES.depths.includes(c.depth)||c.volumeCubicMeters<0||c.volumeCubicMeters>1e6||c.workSeconds<18||c.workSeconds>1e8||c.legacyPaid!==undefined&&typeof c.legacyPaid!=='boolean')return false;
  const b=cutBounds(c);if(Math.max(Math.abs(b.x0),Math.abs(b.x1),Math.abs(b.z0),Math.abs(b.z1))>size/2-2)return false;ids.add(c.id);
  for(let z=Math.floor((b.z0+size/2)/tileSize);z<=Math.floor((b.z1+size/2)/tileSize);z++)for(let x=Math.floor((b.x0+size/2)/tileSize);x<=Math.floor((b.x1+size/2)/tileSize);x++)tiles.add(z*width+x);
  if(tiles.size>EXCAVATION_RULES.maximumTiles)return false;
 }return true;
}
