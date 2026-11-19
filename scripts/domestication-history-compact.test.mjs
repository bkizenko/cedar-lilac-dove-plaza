import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {animalHandlingLines} from '../src/ui/animalHandling.ts';
test('per-animal handling lines come from recorded outcomes and saved cooldowns, never odds',()=>{
 const recent=[{animalId:4,species:'goat',purpose:'pen',outcome:'refused'},{animalId:4,species:'goat',purpose:'pen',outcome:'refused'},{animalId:9,species:'donkey',purpose:'pack',outcome:'success'},{animalId:7,species:'sheep',purpose:'pen',outcome:'abandoned'}];
 const wild=[{id:4,species:'goat',domestication:{attempts:3,cooldownUntil:130,temperament:.4}},{id:7,species:'sheep',domestication:{attempts:1,cooldownUntil:50}}];
 const before=JSON.stringify({recent,wild});const l=animalHandlingLines(recent,wild,100);
 assert.deepEqual(l,['goat #4 · 3 tries · 2 refused · calms in 30s','Pack donkey #9 · 1 try · handled','sheep #7 · 1 try · ready to try again']);
 assert.ok(l.every(x=>!/%|chance|odds/i.test(x)),'unresolved odds stay hidden');
 assert.deepEqual(animalHandlingLines([],wild,100),[]);assert.equal(JSON.stringify({recent,wild}),before);
});
test('husbandry panel shows the by-animal list inside the existing handling history disclosure',()=>{
 const s=readFileSync(new URL('../src/ui/HusbandryControls.tsx',import.meta.url),'utf8');
 assert.match(s,/<summary>Handling history<\/summary>[\s\S]*animalHandlingLines\(handling\.recent,g\.state\.wildlife,g\.state\.time\)[\s\S]*<\/details>\}/);
});
