import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {foodLotLine}=await import('../src/ui/TradeProposal.tsx');
test('reserved trade food shows its identified lots by name, not a generic amount',()=>{
 assert.equal(foodLotLine({bread:4,fish:2,berries:0}),'4 bread · 2 fresh fish');
 assert.equal(foodLotLine({}),'');
 const s=readFileSync(new URL('../src/ui/TradeProposal.tsx',import.meta.url),'utf8');
 assert.match(s,/Reserved food · \{foodLotLine\(u\.tradeReservation\.foodLots\)\}/);
 assert.match(s,/<ResidentInventory residents=\{\[u\]\}\/>/,'carrier cargo uses the existing ResidentInventory component');
});
