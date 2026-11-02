import type {Game} from './sim';
import type {Building} from './types';
const CELL=16,MAX_CELLS=128,EMPTY:readonly Building[]=[];
type Index={list:Building[];length:number;revision:number;cells:Map<number,Map<number,Building[]>>;large:Building[];geometry:{body:Building;x:number;z:number;w:number;d:number}[]};
const frames=new WeakSet<Game>(),indexes=new WeakMap<Game,Index>();
function sameGeometry(g:Game,i:Index){return i.list===g.state.buildings&&i.length===g.state.buildings.length&&i.geometry.every((p,n)=>{const b=g.state.buildings[n];return b===p.body&&b.x===p.x&&b.z===p.z&&b.w===p.w&&b.d===p.d;});}
/** Only actor updates use a shared broadphase. Outside that interval every
 * query reads the live original list, including direct UI/test edits. Geometry
 * is revalidated at each actor pass; gates/HP/build status stay live references. */
export function beginBuildingQueries(g:Game){const old=indexes.get(g);if(old&&!sameGeometry(g,old))indexes.delete(g);frames.add(g);}
export function endBuildingQueries(g:Game){frames.delete(g);}
export function nearbyStepBuildings(g:Game,x:number,z:number,r:number,revision=0):readonly Building[]{
 if(!frames.has(g)||!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(r)||r<0)return g.state.buildings;
 let index=indexes.get(g);
 if(!index||index.list!==g.state.buildings||index.length!==g.state.buildings.length||index.revision!==revision||(g.state.walkDirty&&!sameGeometry(g,index))){
  const cells=new Map<number,Map<number,Building[]>>(),large:Building[]=[];
  for(const b of g.state.buildings){const x0=Math.floor((b.x-b.w*.4)/CELL),x1=Math.floor((b.x+b.w*.4)/CELL),z0=Math.floor((b.z-b.d*.4)/CELL),z1=Math.floor((b.z+b.d*.4)/CELL);
   if(!Number.isFinite(x0+x1+z0+z1)||(x1-x0+1)*(z1-z0+1)>MAX_CELLS){large.push(b);continue;}
   for(let iz=z0;iz<=z1;iz++){let row=cells.get(iz);if(!row)cells.set(iz,row=new Map());for(let ix=x0;ix<=x1;ix++){const list=row.get(ix);if(list)list.push(b);else row.set(ix,[b]);}}
  }
  index={list:g.state.buildings,length:g.state.buildings.length,revision,cells,large,geometry:g.state.buildings.map(body=>({body,x:body.x,z:body.z,w:body.w,d:body.d}))};indexes.set(g,index);
 }
 const x0=Math.floor((x-r)/CELL),x1=Math.floor((x+r)/CELL),z0=Math.floor((z-r)/CELL),z1=Math.floor((z+r)/CELL);
 if((x1-x0+1)*(z1-z0+1)>MAX_CELLS)return g.state.buildings;
 if(x0===x1&&z0===z1&&!index.large.length)return index.cells.get(z0)?.get(x0)||EMPTY;
 const selected=new Set<Building>(index.large);for(let iz=z0;iz<=z1;iz++){const row=index.cells.get(iz);if(!row)continue;for(let ix=x0;ix<=x1;ix++){const cell=row.get(ix);if(cell)for(const b of cell)selected.add(b);}}return [...selected];
}
