import {registerHooks} from 'node:module';import {readFileSync} from 'node:fs';import tsxCompiler from 'typescript';
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if(specifier.startsWith('.')&&!/\.[a-z]+$/.test(specifier))return next(specifier+'.tsx',context);throw error;}},load(url,context,next){if(url.endsWith('.css'))return{format:'module',shortCircuit:true,source:''};if(url.endsWith('.tsx'))return{format:'module',shortCircuit:true,source:tsxCompiler.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{target:tsxCompiler.ScriptTarget.ES2022,module:tsxCompiler.ModuleKind.ESNext,jsx:tsxCompiler.JsxEmit.ReactJSX}}).outputText};return next(url,context);}});
import test from 'node:test';import assert from 'node:assert/strict';import {createElement as h} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
const {DiplomacySheet}=await import('../src/ui/council/DiplomacySheet.tsx');const {HandoverCard,FactionsStrip,GloryBars,FameFeed}=await import('../src/ui/council/CouncilParts.tsx');const {LeaderPortrait}=await import('../src/ui/h/LeaderPortrait.tsx');
const id={version:1,symbol:'sun',pattern:'band',primary:'#315847',secondary:'#733d35',emblem:'#f6e5ba'};
const nb=[{team:1,name:'Marsh Folk',bond:'allied by marriage',trust:70,grievance:5,atPeace:true,canMarry:true,means:['would join a defensive war'],identity:id},{team:2,name:'Ridge Clan',bond:'rivals',trust:10,grievance:55,hostile:true,canMarry:false,means:['a vendetta is brewing'],identity:id}];
test('diplomacy sheet lists hostile neighbours first, shows bars and only offers family actions where marriage exchange is possible',()=>{
 const html=renderToStaticMarkup(h(DiplomacySheet,{neighbours:nb,onAct(){},feedback:'Done'}));
 assert.ok(html.indexOf('Ridge Clan')<html.indexOf('Marsh Folk'));assert.match(html,/At odds/);assert.match(html,/At peace/);
 assert.equal((html.match(/Exchange hostages/g)||[]).length,1);assert.match(html,/role="status"/);assert.equal(renderToStaticMarkup(h(DiplomacySheet,{neighbours:[],onAct(){}})),'');
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
 const html=renderToStaticMarkup(h(UiThemeToggle));assert.match(html,/Field/);assert.match(html,/Classic/);assert.match(html,/aria-pressed="true"/);
});
test('action feedback list marks accepted and refused outcomes by glyph and tone, not colour alone',async()=>{
 const {FeedbackList}=await import('../src/ui/council/useActionFeedback.tsx');
 const html=renderToStaticMarkup(h(FeedbackList,{items:[{id:2,ok:false,text:'They refuse'},{id:1,ok:true,text:'Marriage arranged'}]}));
 assert.match(html,/aria-live="polite"/);assert.match(html,/data-ok="false"[^>]*>.*✕.*They refuse/);assert.match(html,/data-ok="true"[^>]*>.*✓.*Marriage arranged/);
});
