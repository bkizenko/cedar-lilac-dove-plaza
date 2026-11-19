import type {Game} from '../game/sim';
import {personName} from '../game/people';
import {BUILDINGS} from '../game/constants';
/** More finishes than this in one check is a rush (a load, a big batch): no beat, so the moment stays special. */
export const BEAT_MAX_AT_ONCE=2;
export type BuildWatch={ready:boolean;finished:Set<number>;builders:Map<number,Set<number>>;state?:object};
export const newBuildWatch=():BuildWatch=>({ready:false,finished:new Set(),builders:new Map()});
/** Real finishes since the last check, each named with the residents who actually worked the site. The first check only learns the village. */
export function watchBuildFinishes(g:Game,w:BuildWatch):string[]{
 if(w.state!==g.state){w.state=g.state;w.ready=false;w.builders.clear();} // a loaded or new village is learned, not celebrated
 const now=new Set<number>(),fresh:number[]=[];
 for(const b of g.state.buildings){
  if(b.team!==0||b.hp<=0)continue;
  if(g.finished(b)){now.add(b.id);if(w.ready&&!w.finished.has(b.id))fresh.push(b.id);}
 }
 for(const u of g.state.units)if(u.team===0&&u.hp>0&&u.order==='build'&&u.node&&'type' in u.node){const id=(u.node as {id:number}).id;if(!now.has(id)){const s=w.builders.get(id)??new Set<number>();s.add(u.id);w.builders.set(id,s);}}
 const wasReady=w.ready;w.ready=true;w.finished=now;
 const lines:string[]=[];
 if(wasReady&&fresh.length>0&&fresh.length<=BEAT_MAX_AT_ONCE)for(const id of fresh){
  const b=g.state.buildings.find(x=>x.id===id)!,who=[...(w.builders.get(id)??[])].map(uid=>g.state.units.find(u=>u.id===uid)).filter(u=>!!u&&u.hp>0).map(u=>personName(u!));
  const name=BUILDINGS[b.type]?.name||b.type;
  lines.push(who.length?`${name} finished — built by ${who.length>2?`${who.slice(0,2).join(', ')} and ${who.length-2} more`:who.join(' and ')}`:`${name} finished`);
 }
 for(const id of fresh)w.builders.delete(id);
 for(const id of [...w.builders.keys()])if(!g.state.buildings.some(b=>b.id===id&&b.hp>0))w.builders.delete(id);
 return lines;
}
