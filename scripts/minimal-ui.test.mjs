import test from 'node:test';import assert from 'node:assert/strict';
import {knowledgeCards,craftingBoxes,ledgerView,seasonEndReport,notificationsView,viewWords,clipWords,WORD_LIMITS,NOTICE_RULES,SEASON_REPORT_WINDOW_SECONDS,URGENT_KINDS} from '../src/ui/h/minimalModels.ts';
const LONG=Array.from({length:200},(_,i)=>'word'+i).join(' ');
const topic=(o={})=>({id:'crop:emmer',title:'Emmer wheat trial and cultivation methods for the valley',need:LONG,stage:'experiment',observation:LONG,experiment:LONG,result:LONG,progress:{completed:2,required:4,unit:'seed samples planted in trial plots'},metrics:{yield:3},actions:[{id:'trial:emmer',label:'Try planting emmer in a trial plot now',blockedReason:null}],limitation:LONG,...o});
const S=(season,food,partial=false)=>({season,partial,totals:{food,wood:food/2,stone:3,copper:0,iron:0,weapons:1},stock:{food:50,wood:20,stone:4,copper:0,iron:0,weapons:2}});
test('knowledge cards stay under the word cap even for essay-length source text, with real evidence only',()=>{
 for(const stage of['need','observation','experiment','proven','adoption']){const v=knowledgeCards([topic({stage})]);const c=v.cards[0];assert.ok(viewWords(c)<=WORD_LIMITS.knowledgeCard,stage+' '+viewWords(c));assert.ok(c.evidence.length>=1&&c.evidence.length<=3);}
 const need=knowledgeCards([topic({stage:'need',observation:'',progress:undefined,limitation:undefined,result:''})]).cards[0];assert.deepEqual(need.evidence,[{label:'Evidence',value:'none yet',tone:'seen'}],'an unexplored topic has no invented evidence');
 const trial=knowledgeCards([topic({stage:'experiment'})]).cards[0];assert.ok(trial.evidence.some(e=>e.value==='2/4'),'trial progress comes from real counts');assert.ok(!trial.evidence.some(e=>e.label==='Result'),'no result before it is proven');
 assert.ok(knowledgeCards([topic({stage:'proven'})]).cards[0].evidence.some(e=>e.label==='Result'||e.label==='Seen'));
 const blocked=knowledgeCards([topic({actions:[{id:'x',label:'Do it',blockedReason:LONG}]})]).cards[0];assert.equal(blocked.action.enabled,false);assert.ok(wordsOfWhy(blocked)<=8);
 const many=Array.from({length:20},(_,i)=>topic({id:'t'+i,title:'T'+i,stage:['need','experiment','observation','proven','adoption'][i%5]}));const r=knowledgeCards(many,6);assert.equal(r.cards.length,6);assert.equal(r.more,14);assert.equal(r.cards[0].stage,'experiment','what is in progress comes first');
});
const wordsOfWhy=c=>(c.action.why||'').trim().split(/\s+/).length;
test('crafting boxes: icon, progress, one short line only when stalled; capped list',()=>{
 const e=(o={})=>({recipe:'grindGrainStation',label:LONG,progress:.5,phase:'working',worker:'Ana',...o});
 const v=craftingBoxes([e(),e({blockedReason:LONG,progress:.2}),e({paused:true}),e({progress:0,phase:'collecting',worker:undefined}),e({progress:1}),e({progress:2})],4);
 assert.equal(v.boxes.length,4);assert.equal(v.more,2);for(const b of v.boxes)assert.ok(viewWords(b)<=WORD_LIMITS.craftBox,'box words '+viewWords(b));
 assert.deepEqual(v.boxes.map(b=>b.state),['working','blocked','paused','waiting']);assert.equal(v.boxes[0].cause,undefined,'a working box has no explanation');assert.equal(v.boxes[3].cause,'Needs a free worker');
 assert.equal(craftingBoxes([e({progress:NaN})]).boxes[0].percent,0);assert.equal(craftingBoxes([e({progress:3})]).boxes[0].percent,100);assert.equal(craftingBoxes([e({output:{kind:'bread',amount:4}})]).boxes[0].icon,'bread');assert.equal(craftingBoxes([e({recipe:'sewHideCoat'})]).boxes[0].icon,'cloth');
});
test('ledger tabs: production, history and comparison from real samples; empty states are one short note',()=>{
 const input={active:S(2,40,true),history:[S(0,30),S(1,60),S(2,50),S(3,20),S(0,45),S(1,70)]};
 for(const tab of['production','history','seasons']){const v=ledgerView(tab,input);assert.equal(v.tab,tab);assert.ok(viewWords(v)<=WORD_LIMITS.ledgerTab,tab+' '+viewWords(v));}
 const prod=ledgerView('production',input);assert.equal(prod.rows[0].value,'40');assert.equal(prod.rows[0].delta,'-30');assert.equal(prod.note,'Season in progress');
 const hist=ledgerView('history',input);assert.equal(hist.rows.length,6);assert.equal(hist.rows[0].label,'Summer','newest first');assert.deepEqual(hist.sparkline.food,[30,60,50,20,45,70]);
 const cmp=ledgerView('seasons',input);assert.match(cmp.title,/Summer vs Summer/,'year on year once a year is finished');assert.equal(cmp.rows[0].delta,'+10');
 const two=ledgerView('seasons',{active:S(2,1),history:[S(0,30),S(1,60)]});assert.match(two.title,/Summer vs Spring/);assert.equal(ledgerView('seasons',{active:S(0,1),history:[S(0,30)]}).note,'Needs two finished seasons');assert.equal(ledgerView('history',{active:S(0,1),history:[]}).note,'No finished season yet');
 assert.equal(ledgerView('seasons',{active:S(0,1),history:[S(0,30),S(1,60,true)]}).rows.length,0,'a partial season is never compared');
});
test('the season report appears only in the window after a season ends',()=>{
 const input={active:S(2,1),history:[S(0,30),S(1,60)]};
 assert.equal(seasonEndReport({...input}),null,'unknown timing means no report');assert.equal(seasonEndReport({...input,secondsSinceSeasonEnd:SEASON_REPORT_WINDOW_SECONDS+1}),null);assert.equal(seasonEndReport({...input,secondsSinceSeasonEnd:-5}),null);
 const r=seasonEndReport({...input,secondsSinceSeasonEnd:10});assert.equal(r.title,'Summer ended');assert.ok(viewWords(r)<=WORD_LIMITS.seasonReport,''+viewWords(r));assert.equal(r.rows[0].delta,'+30');
 assert.equal(seasonEndReport({active:S(0,1),history:[],secondsSinceSeasonEnd:5}),null,'nothing to report before a finished season');
});
test('notifications: urgent needs only, one line cause and remedy, never a raid landing, rate-limited, at most three',()=>{
 const sig=(o={})=>({id:'a',kind:'starvation',urgency:.9,cause:LONG,remedy:LONG,...o});
 const all=[sig(),sig({id:'b',kind:'dehydration',urgency:.7}),sig({id:'c',kind:'freezing',urgency:.8}),sig({id:'d',kind:'homeless',urgency:.65}),sig({id:'e',kind:'raid-landing',urgency:1}),sig({id:'raid-1',kind:'sickness',urgency:1}),sig({id:'f',kind:'workers-idle',urgency:.3}),sig({id:'g',kind:'discovery',urgency:1}),sig({id:'h',kind:'attack',urgency:1})];
 const v=notificationsView(all,{},100);assert.equal(v.items.length,NOTICE_RULES.maximum);assert.deepEqual(v.items.map(i=>i.kind),['starvation','freezing','dehydration']);for(const n of v.items)assert.ok(viewWords(n)<=WORD_LIMITS.notice,'notice words '+viewWords(n));
 assert.ok(!v.items.some(n=>/raid|landing|attack/.test(n.kind+n.id)),'no raid notices ever');assert.ok(!v.items.some(n=>n.kind==='discovery'),'not urgent, not shown');
 const again=notificationsView(all,v.shown,110);assert.ok(!again.items.some(n=>n.id==='a'),'the same notice does not repeat within a minute');assert.ok(notificationsView(all,v.shown,100+NOTICE_RULES.repeatSeconds).items.some(n=>n.id==='a'),'but it may return');
 assert.equal(notificationsView([sig({urgency:.59})],{},0).items.length,0);assert.equal(notificationsView([sig({urgency:NaN})],{},0).items.length,0);assert.equal(notificationsView([sig(),sig({id:'a2'})],{},0).items.length,1,'one notice per kind');
 assert.ok(URGENT_KINDS.every(k=>!/raid|attack|landing/.test(k)));assert.match(v.items[0].line,/ - /);
});
test('word counter and clipping behave',()=>{
 assert.equal(clipWords('one two three',5),'one two three');assert.equal(clipWords(LONG,4),'word0 word1 word2…');assert.equal(clipWords(undefined,3),'');assert.equal(viewWords({id:'long id with words',title:'a b c',n:4,state:'x y'}),4);
});
