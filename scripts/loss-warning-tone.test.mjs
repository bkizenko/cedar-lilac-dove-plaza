import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isLossBanner,lossFirst,infoVisible,INFO_RULES,budgetNotes} from '../src/ui/hearth/glanceModel.ts';
test('deaths and famine read as loss; routine news does not',()=>{
 for(const t of ['An elder has passed','Tor of the Kel has fallen','Ena died in the other house','Famine: food runs out','3 starving'])assert.equal(isLossBanner(t),true,t);
 for(const t of ['Hut finished','A trader has arrived','Field laid out','Storehouse full'])assert.equal(isLossBanner(t),false,t);
});
test('loss cards stay longer, fade slowly and come before routine news in the budget',()=>{
 assert.ok(INFO_RULES.lossTtlSeconds>INFO_RULES.ttlSeconds*2);assert.ok(INFO_RULES.lossFadeSeconds>INFO_RULES.fadeSeconds);
 assert.deepEqual(infoVisible(0,INFO_RULES.ttlSeconds+1,false,INFO_RULES.lossTtlSeconds,INFO_RULES.lossFadeSeconds),{show:true,fading:false});
 assert.equal(infoVisible(0,INFO_RULES.lossTtlSeconds-1,false,INFO_RULES.lossTtlSeconds,INFO_RULES.lossFadeSeconds).fading,true);
 const notes=[1,2,3,4].map(i=>({id:'n'+i,sticky:false,title:`Routine thing ${'abcd'[i-1]}`})).concat([{id:'loss',sticky:false,title:'An elder has passed',tone:'loss'}]);
 const {rows}=budgetNotes(lossFirst(notes));assert.equal(rows[0].note.id,'loss','a loss is never pushed out by routine news');
});
test('the Hearth stack holds loss banners past routine replacements and styles them muted with a mark, not colour alone',()=>{
 const src=readFileSync(new URL('../src/ui/hearth/glance.tsx',import.meta.url),'utf8');
 assert.match(src,/heldLoss\.current\.set\(hud\.banner,nowS\)/);assert.match(src,/tone:'loss',ttl:INFO_RULES\.lossTtlSeconds,fade:INFO_RULES\.lossFadeSeconds/);assert.match(src,/useInfoClock\(lossFirst\(/);
 const css=readFileSync(new URL('../src/ui/hearth/glance.css',import.meta.url),'utf8');
 assert.match(css,/\.hw-note\.n-loss\{[^}]*saturate/);assert.match(css,/\.hw-info\.n-loss\{transition:opacity 4s/);assert.match(css,/n-loss .hw-note-main b::before\{content:'\\271D/);
});
test('alert cards and chips carry a shape as well as a colour (colour-blind sweep)',()=>{
 const css=readFileSync(new URL('../src/ui/hearth/glance.css',import.meta.url),'utf8');
 assert.match(css,/\.hw-chip-btn\.t-bad\{border-style:double/);assert.match(css,/\.hw-chip-btn\.t-warn\{border-style:dashed\}/);
 assert.match(css,/\.hw-note\.n-bad \.hw-note-main b::before\{content:'\\25B2/);assert.match(css,/\.hw-note\.n-good \.hw-note-main b::before\{content:'\\2713/);
});
test('the season line adds real village facts: fields, harvest still standing, days of food, idle hands',async()=>{
 const {seasonCueTitle}=await import('../src/ui/hearth/glanceModel.ts');
 assert.equal(seasonCueTitle(0,5,{fields:3,inFields:0,idle:2}),'Spring: sow and mend · 3 fields · 2 idle');
 assert.equal(seasonCueTitle(2,9,{fields:3,inFields:14.6,idle:0}),'Autumn: bring in the harvest and fill the stores · 14 harvest still in the fields');
 assert.equal(seasonCueTitle(3,11.8,{fields:0,inFields:0,idle:0}),'Winter: ration food and keep warm · 11 days of food');
 assert.equal(seasonCueTitle(1,null,{fields:0,inFields:0,idle:0}),'Summer: tend the fields');
});
