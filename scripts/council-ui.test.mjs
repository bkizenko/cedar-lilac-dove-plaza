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
