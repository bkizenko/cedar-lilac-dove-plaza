import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {compactNumber,quantityView,queueView,tooltipView} from '../src/ui/h/compactModel.ts';
test('compact numbers never round a shortage up',()=>{
 assert.equal(compactNumber(999),'999');assert.equal(compactNumber(1999),'1.9k');assert.equal(compactNumber(12345),'12k');assert.equal(compactNumber(2.5),'2.5');assert.equal(compactNumber(NaN),'–');
 assert.equal(quantityView('wood',4,20,5).state,'short');assert.equal(quantityView('wood',20,20).state,'full');assert.equal(quantityView('wood',3).state,'ok');
});
test('queue box keeps a short list and reports paused and remaining work',()=>{
 const v=queueView([{label:'Hut',progress:.5,worker:'Ana'},{label:'Kiln',progress:2,paused:true},{label:'A',progress:0},{label:'B',progress:0}]);
 assert.equal(v.rows.length,3);assert.equal(v.more,1);assert.equal(v.rows[0].percent,50);assert.equal(v.rows[1].percent,100);assert.equal(v.rows[1].detail,'paused');assert.equal(v.rows[2].detail,'waiting for a worker');
});
test('tooltip shows purpose, cost and exactly one blocking reason',()=>{
 const t=tooltipView('Granary','Keeps grain dry off the ground.',[{label:'wood',need:20,have:12},{label:'stone',need:4,have:9}],[{reason:'No builder free',remedy:'Assign a builder',severity:80},{reason:'Site too steep',severity:10}]);
 assert.equal(t.blocker.reason,'No builder free');assert.equal(t.cost[0].short,true);assert.equal(t.cost[1].short,false);
 const m=tooltipView('Granary','x',[{label:'wood',need:20,have:12}],[]);assert.equal(m.blocker.reason,'Needs 8 more wood');
 assert.equal(tooltipView('A','x',[],[]).blocker,undefined);
});
test('H UI tokens are complete, scoped opt-in and free of gloss/blur',()=>{
 const css=readFileSync(new URL('../src/ui/h/theme.css',import.meta.url),'utf8');
 for(const t of ['--h-wood','--h-inlay','--h-edge','--h-water','--h-sage','--h-control','--h-text','--h-panel','--h-blocked','--h-radius','--h-chip-h'])assert.ok(css.includes(t+':'),t);
 assert.ok(!/backdrop-filter|linear-gradient|radial-gradient|box-shadow/.test(css),'no glossy styling');
 assert.ok(css.split('{').slice(0,-1).every(s=>s.includes('[data-hw-theme="h"]')||s.trim().startsWith('/*')||s.includes('@')),'every rule scoped to the opt-in theme');
});

test('G4 leader portrait: deterministic face, era dress, stance only from actual relation',async()=>{
 const {portraitView,stanceFor}=await import('../src/ui/h/portraitModel.ts');
 const base={leaderId:7,worldSeed:3,era:0,name:'Asha',society:'Reed People',colors:{primary:'#7a8f99',secondary:'#e9c592'}};
 assert.deepEqual(portraitView(base),portraitView(base));
 assert.equal(portraitView(base).garment,'hide wrap');assert.equal(portraitView({...base,era:4}).garment,'dyed cloak');
 assert.equal(portraitView({...base,climate:'cold'}).headwear,'fur hood');
 assert.equal(stanceFor(undefined),'unknown');assert.equal(stanceFor(-60),'hostile');assert.equal(stanceFor(40),'friendly');
 assert.equal(portraitView(base).goodsText,'No goods observed yet');assert.match(portraitView({...base,knownGoods:['flint','hides','salt','fish']}).goodsText,/flint, hides, salt$/);
 const faces=new Set(Array.from({length:20},(_,i)=>{const v=portraitView({...base,leaderId:i});return v.skin+v.hair+v.hairStyle;}));assert.ok(faces.size>=8);
});
