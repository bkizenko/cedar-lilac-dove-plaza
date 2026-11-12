import {registerHooks} from 'node:module';import {readFileSync} from 'node:fs';import tsxCompiler from 'typescript';
registerHooks({resolve(specifier,context,next){if(specifier.startsWith('@/')){const url=new URL('../src/'+specifier.slice(2),import.meta.url).href;let last;for(const ext of ['', '.ts', '.tsx']){try{return next(url+ext,context);}catch(e){last=e;}}throw last;}try{return next(specifier,context);}catch(error){if(specifier.startsWith('.')&&!/\.[a-z]+$/.test(specifier)){try{return next(specifier+'.tsx',context);}catch{return next(specifier+'.ts',context);}}throw error;}},load(url,context,next){if(url.endsWith('.css'))return{format:'module',shortCircuit:true,source:''};if(url.endsWith('.tsx'))return{format:'module',shortCircuit:true,source:tsxCompiler.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{target:tsxCompiler.ScriptTarget.ES2022,module:tsxCompiler.ModuleKind.ESNext,jsx:tsxCompiler.JsxEmit.ReactJSX}}).outputText};return next(url,context);}});
import test from 'node:test';import assert from 'node:assert/strict';import {createElement as h} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
const {Game}=await import('../src/game/sim.ts');const {enableWildCraft,wildStock}=await import('../src/game/wildCraft.ts');
const {applyEngineReadQuery,isEngineReadQuery}=await import('../src/game/engineReadModels.ts');const {WildCraftSheet}=await import('../src/ui/WildCraftPanel.tsx');
function game(){const g=new Game();g.reset(1,14,{size:1040,layout:'pangaea'});g.enterIsland();return g;}
test('wild-craft query is strict and absent on saves without wild-craft',()=>{
 assert.ok(isEngineReadQuery({kind:'wild-craft'}));assert.equal(isEngineReadQuery({kind:'wild-craft',x:1}),false);
 const g=game(),m=applyEngineReadQuery(g,{kind:'wild-craft'});assert.equal(m.wild.enabled,false);assert.deepEqual(m.wild.rows,[]);assert.equal(g.state.wildCraft,undefined);
});
test('stock rows group under stores, rot is flagged, and reading changes nothing',()=>{
 const g=game();enableWildCraft(g);wildStock(g,0).brain=3;wildStock(g,0).horn=2;const before=JSON.stringify(g.state.wildCraft);
 const m=applyEngineReadQuery(g,{kind:'wild-craft'}).wild;assert.equal(m.enabled,true);
 const brain=m.rows.find(r=>r.icon==='🧠'),horn=m.rows.find(r=>r.icon==='🦴');assert.equal(brain.section,'stores');assert.equal(brain.urgent,true);assert.equal(horn.urgent,false);
 assert.equal(JSON.stringify(g.state.wildCraft),before);
 const html=renderToStaticMarkup(h(WildCraftSheet,{rows:m.rows}));assert.match(html,/Hides, fat and what is rotting/);assert.match(html,/rots per 10 min/);assert.match(html,/Needs attention/);
 assert.match(renderToStaticMarkup(h(WildCraftSheet,{rows:[]})),/Nothing is being hunted/);
});
test('fighting group chips say steady, wavering or breaking in words',async()=>{
 const {GroupChips}=await import('../src/ui/hearth/parts.tsx');
 const html=renderToStaticMarkup(h(GroupChips,{groups:[{id:1,kind:'line',members:6,cohesion:90,morale:80,casualties:0,commander:true},{id:2,kind:'wedge',members:4,cohesion:30,morale:60,casualties:2,commander:false}]}));
 assert.match(html,/line group of 6, steady cohesion, steady morale/);assert.match(html,/wedge group of 4, breaking cohesion, wavering morale/);assert.equal(renderToStaticMarkup(h(GroupChips,{groups:[]})),'');
});

test('paid paused row renders an actual Resume action only when a controller is supplied',()=>{
 const rows=[{icon:'x',kind:'work',text:'paused 5%',why:'Twist sinew',section:'working',urgent:false,projectId:3,paused:true}];
 assert.match(renderToStaticMarkup(h(WildCraftSheet,{rows,onControl:()=>{}})),/Resume paid work/);assert.doesNotMatch(renderToStaticMarkup(h(WildCraftSheet,{rows})),/Resume paid work/);
});
