import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('neighbour card shows the rival government from saved governance state',()=>{
 const v=readFileSync(new URL('../src/game/rulersView.ts',import.meta.url),'utf8'),u=readFileSync(new URL('../src/ui/council/DiplomacySheet.tsx',import.meta.url),'utf8');
 assert.match(v,/government:\(gv=>/);assert.match(u,/data-government="1"/);
});
