// Shared helpers for the save round-trip suite (not a test file).
import assert from 'node:assert/strict';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
export const r1=n=>typeof n==='number'?Math.round(n*1000)/1000:n;
/** Key, order-independent digest of the persisted state a player would notice drifting. */
export function digest(g){
  const s=g.state,by=(a,f)=>[...a].sort((x,y)=>x.id-y.id).map(f);
  return {
    time:r1(s.time),seed:s.seed,nextId:s.nextId,age:s.age,weather:s.weather,tribes:s.tribes.length,worldgen:s.worldgenVersion,
    tribe:s.tribes.map(t=>[t.id,r1(t.food),r1(t.wood),r1(t.stone),r1(t.copper),r1(t.iron),t.age,t.hostile?1:0,t.peaceTerm??null,t.tribute?r1(t.tribute.owed):null,t.name]),
    units:by(s.units,u=>[u.id,u.team,u.type,r1(u.x),r1(u.z),r1(u.hp),r1(u.carry),u.carryType??null,u.order,u.militia?1:0,u.pillage,u.enslavedFrom??null,u.prisoner?.phase??null,u.node?u.node.id:null,u.target?u.target.id:null,u.boat?.id??null,u.expedition?1:0,u.homeHall??null]),
    buildings:by(s.buildings,b=>[b.id,b.type,b.team,r1(b.build),r1(b.hp),b.x,b.z]),
    boats:by(s.boats||[],b=>[b.id,b.team,b.captain??null,!!b.exploration,r1(b.x),r1(b.z)]),
    wildlife:by(s.wildlife,a=>[a.id,a.species,r1(a.hp)]),
    livestock:by(s.livestock||[],a=>[a.id,a.species,a.pen,r1(a.hp),a.carcass?1:0]),
    trees:s.trees.length,stones:s.stones.length,forage:s.forage.length,
    routes:s.routes.length,
    rulers:s.rulers?{year:s.rulers.year,gens:Object.fromEntries(Object.entries(s.rulers.societies||{}).map(([k,v])=>[k,v.dynasty?.generation]))}:null,
    communities:(s.communities||[]).map(c=>[c.hall,c.team,c.status]),
    contacts:s.contacts??null,
    vision:Array.from(g.observedVision()).reduce((a,v)=>a+v,0),
  };
}
export const jsonCopy=v=>JSON.parse(JSON.stringify(v));
/** encode -> real JSON -> validate -> decode; asserts it never rejects and that the digest matches. Returns the loaded game. */
export function roundTrip(g,label=''){
  let raw;
  try{raw=jsonCopy(encodeGame(g));validateGameSave(raw);}
  catch(e){throw new Error(`[${label}] VALID LIVE STATE REJECTED ON SAVE: ${e.message}`);}
  let loaded;
  try{loaded=decodeGame(jsonCopy(raw));}
  catch(e){throw new Error(`[${label}] SAVE REJECTED ON LOAD: ${e.message}`);}
  assert.deepEqual(digest(loaded),digest(g),`[${label}] state drifted through save/load`);
  // A loaded game must itself save again (second generation) and keep running.
  try{validateGameSave(jsonCopy(encodeGame(loaded)));}catch(e){throw new Error(`[${label}] SECOND-GENERATION SAVE REJECTED: ${e.message}`);}
  return loaded;
}
export function quiet(g){g.state.paused=false;g.state.speed=1;}
