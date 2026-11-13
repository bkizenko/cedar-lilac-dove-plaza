import{readFileSync}from'node:fs';import assert from'node:assert/strict';
import{Game}from'../../src/game/sim.ts';import{ensureRulers}from'../../src/game/rulersRuntime.ts';import{decodeGame}from'../../src/game/persistence.ts';import{societyRelation}from'../../src/game/societyRelations.ts';
/** AUTHORED read-only contact story, not an earned diplomatic encounter. Reuse
 * a real earned ruler checkpoint when supplied; alter initial contact metadata
 * only. No actor, stock, terrain, vision, ruler trait or simulation-time grants. */
export function diplomaticVoiceStory(baseFile=process.env.DIPLOMATIC_BASE_SAVE){
 let g;if(baseFile)g=decodeGame(JSON.parse(readFileSync(baseFile,'utf8')));else{g=new Game();g.reset(123456,10);g.enterIsland();}
 ensureRulers(g); // rulers are founded lazily (pure seeded init, no time/stock/vision change) on first read or step
 assert.ok(g.state.rulers&&[1,2].every(t=>g.state.rulers.societies[String(t)]));
 assert.equal(societyRelation(g,0,2).known,false,'Need one genuinely unobserved society in the source checkpoint');
 const before=structuredClone(g.state),vision=Array.from(g.vision);
 const relations=(g.state.societyRelations||[]).filter(r=>!((r.from===0&&r.to===1)||(r.from===1&&r.to===0)));
 for(const[from,to]of[[0,1],[1,0]])relations.push({...societyRelation(g,from,to),from,to,known:true,lastContactSeconds:g.state.time});
 g.state.societyRelations=relations;
 const after=structuredClone(g.state);delete before.societyRelations;delete after.societyRelations;assert.deepEqual(after,before);assert.deepEqual(Array.from(g.vision),vision);
 g.state.paused=true; // loads always come back paused; pin it so the reload byte-compare checks only the read model
 return{g,metadata:{scope:'AUTHORED initial contact-only read-model story; no earned diplomacy or campaign credit',base:baseFile||'natural123456/generation10 opening',knownTeam:1,unmetTeam:2,authoredFields:['societyRelations0to1','societyRelations1to0'],bodyGoodsTerrainVisionTimeUnchanged:true}};
}
