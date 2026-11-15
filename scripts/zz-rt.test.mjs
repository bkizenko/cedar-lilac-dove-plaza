import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '/home/claude/cedar-lilac-dove-plaza/src/game/sim.ts';
import { encodeGame, decodeGame, validateGameSave } from '/home/claude/cedar-lilac-dove-plaza/src/game/persistence.ts';
test('roundtrip after play',()=>{
 for(const seed of [1,42]){
 const g=new Game();g.reset(seed,21);g.enterIsland();
 let stage='fresh';
 for(let i=0;i<4000;i++){ g.step(0.25); if(i%1000===0){ try{ validateGameSave(JSON.parse(JSON.stringify(encodeGame(g)))); }catch(e){ console.log('FAIL at',i,e.message); throw e; } } }
 }
});
