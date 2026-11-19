import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {villageChronicle,RULERS_YEAR_SECONDS_VIEW} from '../src/ui/villageChronicle.ts';
import {RULERS_YEAR_SECONDS} from '../src/game/rulersRuntime.ts';
test('one village chronicle merges life history and the ruling house log, newest first, nothing invented',()=>{
 assert.equal(RULERS_YEAR_SECONDS_VIEW,RULERS_YEAR_SECONDS,'view mirror stays equal to the rulers year');
 const life=[{team:0,time:10,text:'Ana was born'},{team:1,time:20,text:'Rival news'},{team:0,time:400,text:'[Contact 2] Traders arrived on foot'}];
 const house=['2: Old Bram died; his daughter Ceri takes the seat','not a dated line','5: Peace sworn with Reedfolk'];
 const before=JSON.stringify({life,house});const c=villageChronicle(life,house);
 assert.deepEqual(c.map(l=>[l.time,l.source,l.text]),[[450,'house','Peace sworn with Reedfolk'],[400,'village','Traders arrived on foot'],[180,'house','Old Bram died; his daughter Ceri takes the seat'],[10,'village','Ana was born']]);
 assert.deepEqual(villageChronicle(undefined,undefined),[],'old saves with no feeds show the empty note');
 assert.equal(JSON.stringify({life,house}),before);
});
test('Hearth History tab and Classic village history both read the merged chronicle',()=>{
 for(const f of ['../src/ui/hearth/screens.tsx','../src/ui/VillageHistory.tsx']){const s=readFileSync(new URL(f,import.meta.url),'utf8');assert.match(s,/villageChronicle\(engine\.game\.state\.lifeHistory,\s*engine\.game\.state\.rulers\?\.societies\?\.\['0'\]\?\.dynasty\?\.log\)/,f);}
});
