import type {Game} from '@/game/sim';
import {FOW} from '@/game/constants';
import {terrainInfluenceModel} from '@/game/terrainInfluenceRuntime';
import {MINIMAP_RULES} from '../minimapModel';
import {TERRITORY_CONTESTED,TERRITORY_NONE,type OverlaySources,type ResourceKind,type RGB} from './overlayModel';

/** Teams whose claims the player may see: their own, plus rivals whose camp they have found. */
export function knownTeams(camps:readonly {team:number;known:boolean}[]|undefined){
 return [0,...(camps??[]).filter(c=>c.known&&c.team!==0).map(c=>c.team)];
}
export function parseColor(hex:string|undefined,fallback:RGB=[200,200,200]):RGB{
 const m=/^#?([0-9a-f]{6})$/i.exec(hex??'');if(!m)return fallback;
 const n=parseInt(m[1],16);return [n>>16&255,n>>8&255,n&255];
}
/** The terrain-influence field exists only for games that switched it on (new games); older saves have territory only. */
export const hasInfluenceGradient=(g:Game)=>!!g.state.terrainInfluence;
/** Live sources for the painter. Cheap to build; the heavy reads (gradient, resource list) are only made for the layers that are on. */
export function overlaySourcesOf(g:Game,hud:{tribes:readonly {id:number;color:string}[];camps?:readonly {team:number;known:boolean}[]},active:ReadonlySet<string>):OverlaySources{
 const known=new Set(knownTeams(hud.camps)),colors=new Map(hud.tribes.map(t=>[t.id,parseColor(t.color)]));
 const size=g.world.size;
 const out:OverlaySources={
  worldSize:size,pixels:MINIMAP_RULES.pixels,
  explored:(x,z)=>g.exploredAt(x,z),
  color:t=>colors.get(t)??[210,210,210],
 };
 if(active.has('territory'))out.teamAt=(x,z)=>{
  const gx=Math.floor((x/size+.5)*FOW),gz=Math.floor((z/size+.5)*FOW);
  if(gx<0||gz<0||gx>=FOW||gz>=FOW)return TERRITORY_NONE;
  const v=g.territory[gz*FOW+gx];
  return v===255?TERRITORY_NONE:v===254?TERRITORY_CONTESTED:known.has(v)?v:TERRITORY_NONE;
 };
 if(active.has('influence')&&hasInfluenceGradient(g))out.gradient=terrainInfluenceModel(g,[...known]);
 if(active.has('water'))out.water=(x,z)=>g.height(x,z)<g.waterAt(x,z);
 if(active.has('resources')){
  const list:{x:number;z:number;kind:ResourceKind}[]=[];
  const take=(nodes:readonly {x:number;z:number;amount:number}[],kind:ResourceKind)=>{for(const n of nodes)if(n.amount>0)list.push({x:n.x,z:n.z,kind});};
  take(g.state.trees,'tree');take(g.state.forage,'forage');take(g.state.stones,'stone');take(g.state.copper,'copper');take(g.state.iron,'iron');take(g.state.fish,'fish');
  out.resources=list;
 }
 return out;
}
