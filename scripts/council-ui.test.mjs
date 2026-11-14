import {registerHooks} from 'node:module';import {readFileSync} from 'node:fs';import tsxCompiler from 'typescript';
registerHooks({resolve(specifier,context,next){if(specifier.startsWith('@/')){const url=new URL('../src/'+specifier.slice(2),import.meta.url).href;let last;for(const ext of ['', '.ts', '.tsx']){try{return next(url+ext,context);}catch(e){last=e;}}throw last;}try{return next(specifier,context);}catch(error){if(specifier.startsWith('.')&&!/\.[a-z]+$/.test(specifier)){try{return next(specifier+'.tsx',context);}catch{return next(specifier+'.ts',context);}}throw error;}},load(url,context,next){if(url.endsWith('.css'))return{format:'module',shortCircuit:true,source:''};if(url.endsWith('.tsx'))return{format:'module',shortCircuit:true,source:tsxCompiler.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{target:tsxCompiler.ScriptTarget.ES2022,module:tsxCompiler.ModuleKind.ESNext,jsx:tsxCompiler.JsxEmit.ReactJSX}}).outputText};return next(url,context);}});
import test from 'node:test';import assert from 'node:assert/strict';import {createElement as h} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
const {DiplomacySheet}=await import('../src/ui/council/DiplomacySheet.tsx');const {HandoverCard,FactionsStrip,GloryBars,FameFeed}=await import('../src/ui/council/CouncilParts.tsx');const {LeaderPortrait}=await import('../src/ui/h/LeaderPortrait.tsx');
const id={version:1,symbol:'sun',pattern:'band',primary:'#315847',secondary:'#733d35',emblem:'#f6e5ba'};
const nb=[{team:1,name:'Marsh Folk',bond:'allied by marriage',trust:70,grievance:5,atPeace:true,canMarry:true,means:['would join a defensive war'],identity:id},{team:2,name:'Ridge Clan',bond:'rivals',trust:10,grievance:55,hostile:true,canMarry:false,means:['a vendetta is brewing'],identity:id}];
test('diplomacy sheet lists hostile neighbours first, shows bars and only offers family actions where marriage exchange is possible',()=>{
 const html=renderToStaticMarkup(h(DiplomacySheet,{neighbours:nb,onAct(){},feedback:'Done'}));
 assert.ok(html.indexOf('Ridge Clan')<html.indexOf('Marsh Folk'));assert.match(html,/At odds/);assert.match(html,/At peace/);
 assert.equal((html.match(/Exchange hostages/g)||[]).length,1);assert.match(html,/role="status"/);assert.equal(renderToStaticMarkup(h(DiplomacySheet,{neighbours:[],onAct(){}})),'');
});
test('diplomacy sheet lists standing grievances in both directions with lapse and legitimacy cost',()=>{
 const casus=[{byUs:true,kind:'raid',strength:40,endsIn:3,cost:2,reason:'We hold raids and cattle-lifting; citing it costs the holder 2 legitimacy.'},{byUs:false,kind:'claim',strength:30,endsIn:0,cost:5,reason:'They hold a claim on their lands; citing it costs the holder 5 legitimacy.'}];
 const html=renderToStaticMarkup(h(DiplomacySheet,{neighbours:[{...nb[0],casus}],onAct(){}}));
 assert.match(html,/Standing grievances/);assert.match(html,/We hold<\/span> raids and cattle-lifting; lapses in 3 yr/);assert.match(html,/They hold<\/span> a claim on their lands; lapses in under a year/);assert.match(html,/costs 5 legitimacy/);
 assert.doesNotMatch(renderToStaticMarkup(h(DiplomacySheet,{neighbours:nb,onAct(){}})),/Standing grievances/);
 assert.match(html,/Needs attention: 1 claim held against us/);assert.doesNotMatch(renderToStaticMarkup(h(DiplomacySheet,{neighbours:nb,onAct(){}})),/claim.? held against us/);
});
test('leader portrait is deterministic and stays unknown without a recorded relation',()=>{
 const p={leaderId:7,worldSeed:5,era:2,name:'Ada',society:'Marsh Folk',colors:{primary:'#315847',secondary:'#733d35'}};
 const a=renderToStaticMarkup(h(LeaderPortrait,p)),b=renderToStaticMarkup(h(LeaderPortrait,p));assert.equal(a,b);assert.match(a,/know little of their mind/);assert.match(renderToStaticMarkup(h(LeaderPortrait,{...p,relation:60})),/known friend/);
});
test('council parts render empty-safe',()=>{assert.equal(renderToStaticMarkup(h(FameFeed,{log:[]})),'');assert.equal(renderToStaticMarkup(h(GloryBars,{glory:[],score:0})),'');assert.equal(renderToStaticMarkup(h(FactionsStrip,{factions:[],coalitionLoss:0})),'');assert.ok(renderToStaticMarkup(h(HandoverCard,{h:{law:'tanistry',rulerAge:60,yearlyRisk:12,extinct:false,others:[]}})).includes('Handover'));});
test('capitulation terms are valid engine commands and offers query is accepted',async()=>{
 const {isEngineDispatchCommand}=await import('../src/game/engineDispatch.ts');const {isEngineReadQuery}=await import('../src/game/engineReadModels.ts');const {TERMS}=await import('../src/ui/council/CapitulationTerms.tsx');
 assert.ok(isEngineReadQuery({kind:'capitulation-offers'}));assert.equal(isEngineReadQuery({kind:'capitulation-offers',x:1}),false);
 for(const t of TERMS)assert.ok(isEngineDispatchCommand({kind:'accept-capitulation',frontId:3,outcome:t.id}),t.id);
 assert.equal(isEngineDispatchCommand({kind:'accept-capitulation',frontId:3,outcome:'nope'}),false);assert.ok(isEngineDispatchCommand({kind:'refuse-capitulation',frontId:3}));
});
test('classic palette restores the original tokens and the toggle renders both choices',async()=>{
 const {UiThemeToggle}=await import('../src/ui/uiTheme.tsx');const {readFileSync}=await import('node:fs');
 const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');assert.match(css,/:root\[data-hw-ui="classic"\]\{[^}]*--color-ink:#1a1610/);
 const html=renderToStaticMarkup(h(UiThemeToggle));assert.match(html,/New/);assert.match(html,/Classic/);assert.match(html,/aria-pressed="true"/);
});
test('action feedback list marks accepted and refused outcomes by glyph and tone, not colour alone',async()=>{
 const {FeedbackList}=await import('../src/ui/council/useActionFeedback.tsx');
 const html=renderToStaticMarkup(h(FeedbackList,{items:[{id:2,ok:false,text:'They refuse'},{id:1,ok:true,text:'Marriage arranged'}]}));
 assert.match(html,/aria-live="polite"/);assert.match(html,/data-ok="false"[^>]*>.*✕.*They refuse/);assert.match(html,/data-ok="true"[^>]*>.*✓.*Marriage arranged/);
});
test('diplomacy sheet shows the wards ledger: who is held where, years left and the effect',()=>{
 const w=[{name:'Little Ines',age:9,kind:'foster',heldByUs:true,sinceYear:3,endsIn:7,effect:'Goes home at sixteen and the bond rises.'},{name:'Tam',age:22,kind:'hostage',heldByUs:false,sinceYear:2,endsIn:0,effect:'Held for eight years.'}];
 const html=renderToStaticMarkup(h(DiplomacySheet,{neighbours:[{...nb[0],wards:w}],onAct(){}}));
 assert.match(html,/Kin in each other/);assert.match(html,/Little Ines/);assert.match(html,/fostered with us; home in 7 yr/);assert.match(html,/a hostage in Marsh Folk; home in under a year/);
 assert.doesNotMatch(renderToStaticMarkup(h(DiplomacySheet,{neighbours:nb,onAct(){}})),/Kin in each other/);
});
test('diplomacy sheet shows what the neighbour remembers, fading, and nothing when empty',()=>{
 const memory=[{kind:'foster',text:'We sent Tam to them as a foster child',year:30,weight:90},{kind:'truce',text:'A truce was sworn',year:2,weight:18}];
 const html=renderToStaticMarkup(h(DiplomacySheet,{neighbours:[{...nb[0],memory}],onAct(){}}));
 assert.match(html,/What Marsh Folk remembers/);assert.match(html,/We sent Tam to them as a foster child\. <span[^>]*>Fresh in mind/);assert.match(html,/Nearly forgotten/);
 assert.doesNotMatch(renderToStaticMarkup(h(DiplomacySheet,{neighbours:nb,onAct(){}})),/remembers/);
});
test('ruler change reads as an event: mourning toast with the chronicle line, silent when nothing changed',async()=>{
 const {describeRulerChange}=await import('../src/ui/RulerEventToast.tsx');
 const c={enabled:true,ruler:{name:'Brenna',age:19,headline:'bold and untested'},house:{name:'Ash',generation:2,family:[]},log:['41: Orm died aged 63'],handover:{}};
 const d=describeRulerChange({ruler:'Orm',generation:1,house:'Ash'},c);
 assert.equal(d.tone,'mourning');assert.match(d.title,/Orm is dead/);assert.match(d.body,/Orm died aged 63/);assert.match(d.body,/Brenna, 19, takes the seat/);
 assert.equal(describeRulerChange({ruler:'Brenna',generation:2,house:'Ash'},c),null);
 assert.equal(describeRulerChange({ruler:'Orm',generation:1,house:'Ash'},{...c,log:[]}).tone,'rise');
 assert.match(describeRulerChange({ruler:'Orm',generation:1,house:'Ash'},{...c,handover:{regent:'Dara'}}).body,/Dara rules as regent/);
});
test('hearth capitulation terms group outcomes by severity, show will and clock, and send valid commands',async()=>{
 const {TermsOffers}=await import('../src/ui/hearth/councilCards.tsx');const {TERMS}=await import('../src/ui/council/CapitulationTerms.tsx');
 const sent=[],o={id:4,defenderName:'Ridge Clan',score:.82,expiresIn:7.2,measured:{casualties:5,captured:2,lostArmed:3,buildingLoss:1}};
 const html=renderToStaticMarkup(h(TermsOffers,{offers:[o],send:c=>sent.push(c),feedback:[]}));
 assert.match(html,/Ridge Clan offers terms/);assert.match(html,/82%/);assert.match(html,/8s/);assert.match(html,/tier-ruinous/);assert.match(html,/1 building lost/);assert.match(html,/Refuse and press the attack/);
 for(const t of TERMS)assert.ok(html.includes(t.label),t.label);assert.equal((html.match(/class="hw-term"/g)||[]).length,TERMS.length);
 assert.equal(renderToStaticMarkup(h(TermsOffers,{offers:[],send(){},feedback:[]})),'');
});
test('hearth captive card shows resistance and guard state, offers typed commands, and is empty-safe',async()=>{
 const {CaptiveList}=await import('../src/ui/hearth/councilCards.tsx');const {isEngineDispatchCommand}=await import('../src/game/engineDispatch.ts');const {isEngineReadQuery}=await import('../src/game/engineReadModels.ts');
 const cs=[{id:9,name:'Tamsin',fromTeam:2,fromName:'Ridge Clan',resistance:72,guarded:false,canEscort:true},{id:10,name:'Oren',fromTeam:2,fromName:'Ridge Clan',resistance:10,guarded:true,canEscort:false}];
 const html=renderToStaticMarkup(h(CaptiveList,{captives:cs,send(){},feedback:[]}));
 assert.match(html,/Held captive/);assert.match(html,/Resistance 72 percent/);assert.match(html,/Unguarded/);assert.match(html,/Guarded/);assert.equal((html.match(/Escort/g)||[]).length,1);assert.equal((html.match(/Free everyone from Ridge Clan/g)||[]).length,1);
 assert.equal(renderToStaticMarkup(h(CaptiveList,{captives:[],send(){},feedback:[]})),'');assert.match(renderToStaticMarkup(h(CaptiveList,{captives:[],send(){},feedback:[{id:1,ok:true,text:'Released; walking home with belongings'}]})),/Released; walking home with belongings/);
 assert.ok(isEngineReadQuery({kind:'captives'}));assert.equal(isEngineReadQuery({kind:'captives',x:1}),false);
 assert.ok(isEngineDispatchCommand({kind:'free-captives',team:2}));assert.ok(isEngineDispatchCommand({kind:'repatriate-captive',unitId:9}));assert.ok(isEngineDispatchCommand({kind:'escort-captive',unitId:9}));assert.equal(isEngineDispatchCommand({kind:'free-captives',team:'x'}),false);
});

test('hearth captive card distinguishes physical custody needs and guard replacement from legacy escort',async()=>{
 const {CaptiveList}=await import('../src/ui/hearth/councilCards.tsx');
 const people=[{id:11,name:'Ada',fromTeam:2,fromName:'Ridge Clan',resistance:60,guarded:false,canEscort:true,custody:'escorting',food:2,waterLiters:1.5},{id:12,name:'Bren',fromTeam:2,fromName:'Ridge Clan',resistance:0,guarded:true,canEscort:true,custody:'custody',food:1,waterLiters:.5},{id:13,name:'Legacy',fromTeam:2,fromName:'Ridge Clan',resistance:72,guarded:false,canEscort:true}];
 const html=renderToStaticMarkup(h(CaptiveList,{captives:people,send(){},feedback:[]}));
 assert.match(html,/Escape risk 60 percent/);assert.match(html,/Escape risk 0 percent/);assert.match(html,/Resistance 72 percent/);assert.match(html,/Under escort/);assert.match(html,/In custody/);assert.match(html,/Food 2/);assert.match(html,/Water 1.5 L/);assert.match(html,/Water 0.5 L/);assert.match(html,/Assign guard/);assert.match(html,/Replace guard/);assert.equal((html.match(/Release to walk home/g)||[]).length,2);assert.match(html,/>Escort<\/button>/);assert.match(html,/Send home/);assert.doesNotMatch(html,/forced work|forced labor/);assert.equal((html.match(/Free everyone from Ridge Clan/g)||[]).length,1);
});
test('captives navigation exists without offers and the no-house fallback still shows real custody controls',async()=>{
 const {councilTermsTab,CouncilWithoutHouse,Screen}=await import('../src/ui/hearth/screens.tsx');
 const {CaptiveList}=await import('../src/ui/hearth/councilCards.tsx');
 const captive={id:11,name:'Ada',fromTeam:2,fromName:'Ridge Clan',resistance:0,guarded:false,canEscort:true,custody:'custody',food:0,waterLiters:0};
 const only=councilTermsTab(0,1),both=councilTermsTab(2,1);assert.equal(only.label,'Captives');assert.equal(only.badge,1);assert.equal(both.label,'Terms');assert.equal(both.badge,3);assert.equal(councilTermsTab(0,0),null);
 const nav=renderToStaticMarkup(h(Screen,{title:'Council',onClose(){},tabs:[only],tab:'terms',setTab(){}},h(CaptiveList,{captives:[captive],send(){},feedback:[]})));assert.match(nav,/role="tab"/);assert.match(nav,/>Captives<\/span>/);
 const fallback=renderToStaticMarkup(h(CouncilWithoutHouse,{onClose(){},terms:null,captives:h(CaptiveList,{captives:[captive],send(){},feedback:[]})}));assert.match(fallback,/No ruling house yet/);assert.match(fallback,/Held captive/);assert.match(fallback,/Assign guard/);assert.match(fallback,/Release to walk home/);assert.match(fallback,/Food 0/);assert.match(fallback,/Water 0 L/);
});
test('neighbour news feed renders only supplied agreements, newest first, and nothing when empty',async()=>{
 const {NeighbourNews}=await import('../src/ui/council/CouncilParts.tsx');const {NeighbourNewsFeed}=await import('../src/ui/hearth/councilCards.tsx');
 const news=[{time:9,kind:'marriage',with:1,text:'12: A marriage joins the houses'},{time:3,kind:'truce',with:2,text:'4: A truce is sworn'}],nameOf=t=>t===1?'Marsh Folk':'Ridge Clan';
 for(const C of [NeighbourNews,NeighbourNewsFeed]){const html=renderToStaticMarkup(h(C,{news,nameOf}));assert.match(html,/Neighbour news/);assert.ok(html.indexOf('Marsh Folk')<html.indexOf('Ridge Clan'));assert.doesNotMatch(html,/12:|4:/);assert.equal(renderToStaticMarkup(h(C,{news:[],nameOf})),'');}
});

test('rival ruler voice renders as a quoted greeting in the diplomacy sheet and is absent on old data',async()=>{
 const {DiplomacySheet}=await import('../src/ui/council/DiplomacySheet.tsx');
 const base={team:1,name:'Marsh Folk',bond:'Friendly',trust:70,canMarry:false,means:[]};
 const voice={manner:'warm',greeting:'Marsh Folk meets you at the door.',refusal:'Marsh Folk declines kindly.',gift:'Marsh Folk gives freely.'};
 const html=renderToStaticMarkup(h(DiplomacySheet,{neighbours:[{...base,voice}],onAct(){}}));
 assert.match(html,/Marsh Folk meets you at the door/);assert.match(html,/data-manner="warm"/);assert.match(html,/If refused: Marsh Folk declines kindly/);
 assert.doesNotMatch(renderToStaticMarkup(h(DiplomacySheet,{neighbours:[base],onAct(){}})),/data-manner/);
});

test('rival court line names ruler, regent and heir; rival change feed fires only on visible change; old data renders nothing',async()=>{
 const {courtLine,rivalCourtChange}=await import('../src/ui/council/courtLine.ts');
 const {DiplomacySheet}=await import('../src/ui/council/DiplomacySheet.tsx');
 const court={ruler:'Ansa',rulerAge:41,house:'Reed',law:'primogeniture',heir:{name:'Bel',age:9,adult:false,legit:true},regent:'Corr',extinct:false};
 assert.equal(courtLine(undefined),null);
 assert.match(courtLine(court),/Corr holds the seat as regent; Bel, 9 \(a child\), would follow/);
 assert.match(courtLine({...court,heir:undefined,regent:undefined,extinct:true}),/no heir/);
 assert.equal(rivalCourtChange('Marsh',court,court),null);assert.equal(rivalCourtChange('Marsh',undefined,court),null);
 assert.match(rivalCourtChange('Marsh',court,{...court,ruler:'Bel',regent:undefined}).title,/Ansa has left the seat/);
 assert.match(rivalCourtChange('Marsh',{...court,regent:undefined},court).title,/regency begins/);
 const base={team:1,name:'Marsh Folk',bond:'Friendly',trust:70,canMarry:false,means:[]};
 assert.match(renderToStaticMarkup(h(DiplomacySheet,{neighbours:[{...base,court}],onAct(){}})),/data-court="1"/);
 assert.doesNotMatch(renderToStaticMarkup(h(DiplomacySheet,{neighbours:[base],onAct(){}})),/data-court/);
});
test('compact leader portrait drops the caption, honours size, and stays seeded (toast face)',()=>{
 const p={leaderId:7,worldSeed:3,era:1,name:'Dara',society:'Marsh Folk',colors:{primary:'#315847',secondary:'#733d35'}};
 const full=renderToStaticMarkup(h(LeaderPortrait,p)),small=renderToStaticMarkup(h(LeaderPortrait,{...p,compact:true,size:56}));
 assert.match(full,/<figcaption>/);assert.doesNotMatch(small,/figcaption/);assert.match(small,/width="56" height="56"/);
 assert.equal(renderToStaticMarkup(h(LeaderPortrait,{...p,compact:true,size:56})),small);
});

test('parties abroad card names kind, crew, stores and flags trouble; empty is silent',async()=>{
 const {PartiesCard}=await import('../src/ui/council/CouncilParts.tsx');
 const parties=[{team:0,name:'Us',crew:3,x:0,z:0,destX:9,destZ:9,distance:120,carrying:'4 food, 2 water',status:'stores running low',kind:'explore'},{team:0,name:'Us',crew:1,x:0,z:0,destX:9,destZ:9,distance:40,carrying:'8 grain for salt',status:'on the road',kind:'trade'}];
 const html=renderToStaticMarkup(h(PartiesCard,{parties}));
 assert.match(html,/Scout/);assert.match(html,/Trade caravan/);assert.match(html,/3 people, 120 m/);assert.match(html,/1 person/);assert.match(html,/Stores running low\./);assert.equal(renderToStaticMarkup(h(PartiesCard,{parties:[]})),'');
});

test('diplomacy trust and grudge bars expose meter semantics',()=>{
 const html=renderToStaticMarkup(h(DiplomacySheet,{neighbours:nb,onAct(){}}));
 assert.equal((html.match(/role="meter"/g)||[]).length,nb.length*2);assert.match(html,/aria-label="Trust in /);assert.match(html,/aria-label="Grudge held by /);assert.match(html,/aria-valuemax="100"/);
});

test('slow diplomacy events: new claim against us and new neighbour news raise a cue, silent on first sight and when unchanged',async()=>{
 const {diplomacyEvents}=await import('../src/ui/RulerEventToast.tsx');
 const mk=(casus,news)=>({neighbours:[{team:2,name:'Ridge Clan',casus}],news});
 const claim={byUs:false,kind:'raid',strength:40,endsIn:5,cost:2,reason:'They hold raids and cattle-lifting.'};
 const first=diplomacyEvents(null,mk([claim],[{time:5,kind:'marriage',with:2,text:'old news'}]));
 assert.equal(first.cue,null);assert.equal(first.events.length,0);
 const none=diplomacyEvents(first.next,mk([claim],[{time:5,kind:'marriage',with:2,text:'old news'}]));assert.equal(none.cue,null);assert.equal(none.events.length,0);
 const c1=diplomacyEvents({claims:new Set(),newsTime:5},mk([claim],[]));assert.equal(c1.cue,'claim');assert.match(c1.events[0].title,/Ridge Clan raise a claim/);
 const t1=diplomacyEvents(first.next,mk([claim],[{time:9,kind:'treaty',with:2,text:'Truce sworn.'}]));assert.equal(t1.cue,'treaty');assert.match(t1.events[0].body,/Truce sworn/);
 assert.equal(diplomacyEvents({claims:new Set(),newsTime:0},mk([{...claim,byUs:true}],[])).cue,null);
});

test('feed collapses adjacent repeats into a counted row, keeps order',async()=>{
 const {dedupeFeed}=await import('../src/ui/council/feedDedupe.ts');const {FameFeed}=await import('../src/ui/council/CouncilParts.tsx');const {FameFeed:HF}=await import('../src/ui/hearth/councilCards.tsx');
 const log=['3: Wolves took a lamb','4: Wolves took a lamb','5: Wolves took a lamb','6: A trader came'];
 assert.deepEqual(dedupeFeed([...log].reverse()),[{text:'A trader came',count:1,key:'A trader came'},{text:'Wolves took a lamb',count:3,key:'Wolves took a lamb'}]);
 for(const C of [FameFeed,HF]){const html=renderToStaticMarkup(h(C,{log}));assert.match(html,/×3/);assert.equal((html.match(/Wolves took a lamb/g)||[]).length,1);}
});

test('faction chips explain the ruler traits and demand that drive their mood',async()=>{
 const {FactionsStrip:FS}=await import('../src/ui/council/CouncilParts.tsx');const {factionReason}=await import('../src/ui/council/factionReason.ts');
 assert.match(factionReason('priests','shrines',50),/piety and tradition/);
 const html=renderToStaticMarkup(h(FS,{factions:[{kind:'warriors',power:40,loyalty:20,demand:'raids'}],coalitionLoss:40}));
 assert.match(html,/boldness, cruelty and ambition/);assert.match(html,/turning against you/);
});
test('attention inbox lists claims, wards due, hostility and unrest worst first, with glyph and word, hidden when empty',async()=>{
 const {attentionInbox}=await import('../src/ui/council/attentionInbox.ts');const {AttentionInbox}=await import('../src/ui/council/AttentionInboxPanel.tsx');
 assert.deepEqual(attentionInbox(undefined),[]);assert.equal(renderToStaticMarkup(h(AttentionInbox,{council:{enabled:true,neighbours:[],log:[]}})),'');
 const c={enabled:true,neighbours:[{...nb[0],casus:[{byUs:true,kind:'raid',strength:20,endsIn:3,cost:2,reason:'We hold raids.'}],wards:[{name:'Ana',age:9,kind:'foster',heldByUs:true,sinceYear:1,endsIn:1,effect:''}]},{...nb[1],casus:[{byUs:false,kind:'claim',strength:60,endsIn:2,cost:5,reason:'They hold a claim on their lands.'}]}],log:[],handover:{law:'tanistry',rulerAge:60,yearlyRisk:12,extinct:false,others:[],pressure:{unrest:80,stage:'Restless',claimsAgainst:1,why:['hard winters']}}};
 const items=attentionInbox(c);assert.equal(items[0].tone,'danger');assert.equal(items.at(-1).tone,'note');assert.ok(items.some(i=>i.label==='Ward to return'));
 const html=renderToStaticMarkup(h(AttentionInbox,{council:c}));assert.match(html,/Needs your attention · /);assert.match(html,/Urgent · Claim against us/);assert.match(html,/Note · Our claim/);
});
test('elder counsel: best-skilled living elder from real stats, hidden when none, query accepted, line renders',async()=>{
 const {Game}=await import('../src/game/sim.ts');const {elderCounsel}=await import('../src/game/elderCounsel.ts');const {trainEntry,skillGenome,newRecord}=await import('../src/game/skills.ts');const {isEngineReadQuery,applyEngineReadQuery}=await import('../src/game/engineReadModels.ts');
 const {ElderCounselLine}=await import('../src/ui/council/CouncilParts.tsx');
 const g=new Game();g.reset(4242,10);g.enterIsland();
 assert.equal(elderCounsel(g),null,'nobody is a skilled elder at the start');
 const adults=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.type==='worker'&&!u.militia);const a=adults[0],b=adults[1];
 for(const[u,xp]of[[a,5000],[b,9000]]){u.ageT=60*1800;u.parents=undefined;u.skills=newRecord(skillGenome(g.state.seed|0,u.id));trainEntry(u.skills,'pottery',xp,60,1);}
 const e=elderCounsel(g);assert.ok(e,'an old master is found');assert.equal(e.skill,'pottery');assert.equal(e.id,b.id,'the more skilled elder is chosen');assert.ok(e.age>=50&&e.line.length>10);
 b.hp=0;assert.equal(elderCounsel(g).id,a.id,'the dead do not counsel');
 assert.ok(isEngineReadQuery({kind:'elder-counsel'}));assert.equal(isEngineReadQuery({kind:'elder-counsel',x:1}),false);assert.equal(applyEngineReadQuery(g,{kind:'elder-counsel'}).elder.id,a.id);
 const html=renderToStaticMarkup(h(ElderCounselLine,{elder:e}));assert.match(html,/data-elder-counsel/);assert.match(html,/pottery/);assert.equal(renderToStaticMarkup(h(ElderCounselLine,{elder:null})),'');
 const off=new Game();off.reset(4242,10,{skillsVersion:0});off.enterIsland();assert.equal(elderCounsel(off),null,'old saves: skill model off');
});

test('attention inbox offers take-in / turn-away buttons for hungry families waiting at the hall',async()=>{
 const {attentionInbox}=await import('../src/ui/council/attentionInbox.ts');const {AttentionInbox}=await import('../src/ui/council/AttentionInboxPanel.tsx');
 const c={enabled:true,neighbours:[],log:[],refugees:[{team:3,name:'Sandrill',count:3,yearsLeft:2}]};
 const it=attentionInbox(c).find(i=>i.key==='refugees-3');assert.ok(it);assert.match(it.text,/3 people from Sandrill ask to be taken in\. They leave in 2 years/);assert.deepEqual(it.actions.map(a=>a.command),['take-in-refugees','turn-away-refugees']);
 const html=renderToStaticMarkup(h(AttentionInbox,{council:c,onAnswer(){}}));assert.match(html,/data-refugee-action="take-in-refugees"/);assert.match(html,/Turn away/);
 assert.doesNotMatch(renderToStaticMarkup(h(AttentionInbox,{council:c})),/data-refugee-action/);assert.equal(attentionInbox({enabled:true,neighbours:[],log:[]}).some(i=>i.key.startsWith('refugees')),false);
});

test('handover card shows the hall mourning lines in both palettes',async()=>{
 const {HandoverCard:Hearth}=await import('../src/ui/hearth/councilCards.tsx');
 const hv={law:'primogeniture',rulerAge:30,yearlyRisk:3,extinct:false,others:[]};
 const m={from:'Old Ardan',to:'Mira',relation:'child',contested:true,kind:'ruler-death',secondsLeft:600,carried:3,strained:1,lapsed:1};
 for(const C of [HandoverCard,Hearth]){const html=renderToStaticMarkup(h(C,{h:hv,mourning:m}));assert.ok(html.includes('Old Ardan is mourned; Mira takes the seat as their child.'),html);assert.ok(html.includes('contested'));assert.ok(html.includes('10 min of mourning left'));assert.ok(html.includes('2 agreements carried over, 1 strained, 1 lapsed.'));}
 assert.ok(!renderToStaticMarkup(h(HandoverCard,{h:hv})).includes('mourned'));
});

test('hearth fame feed folds older lines behind a 44px toggle',async()=>{
 const {FameFeed:F}=await import('../src/ui/hearth/councilCards.tsx');
 const log=Array.from({length:9},(_,i)=>`${i}: event number ${i}`);
 const html=renderToStaticMarkup(h(F,{log}));
 assert.ok(html.includes('Show 3 earlier'));assert.ok(html.includes('event number 8'));assert.ok(!html.includes('event number 0'));
 assert.ok(!renderToStaticMarkup(h(F,{log:log.slice(0,4)})).includes('earlier'));
});
