import {registerHooks} from 'node:module';import {readFileSync} from 'node:fs';import tsxCompiler from 'typescript';
registerHooks({resolve(specifier,context,next){if(specifier.startsWith('@/')){const url=new URL('../src/'+specifier.slice(2),import.meta.url).href;let last;for(const ext of ['', '.ts', '.tsx']){try{return next(url+ext,context);}catch(e){last=e;}}throw last;}try{return next(specifier,context);}catch(error){if(specifier.startsWith('.')&&!/\.[a-z]+$/.test(specifier)){try{return next(specifier+'.tsx',context);}catch{return next(specifier+'.ts',context);}}throw error;}},load(url,context,next){if(url.endsWith('.css'))return{format:'module',shortCircuit:true,source:''};if(url.endsWith('.tsx'))return{format:'module',shortCircuit:true,source:tsxCompiler.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{target:tsxCompiler.ScriptTarget.ES2022,module:tsxCompiler.ModuleKind.ESNext,jsx:tsxCompiler.JsxEmit.ReactJSX}}).outputText};return next(url,context);}});
import test from 'node:test';import assert from 'node:assert/strict';import {createElement as h} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
// Rendered Hearth glance components (docs/UIUX_PROPOSAL.md changes 7-10 and Help). Needs react, react-dom, typescript and lucide-react in node_modules.
const {SupplyBar,PriorityStack,AlertPins,OverlayToggles}=await import('../src/ui/hearth/glance.tsx');
const {HelpBody,HELP_GROUPS}=await import('../src/ui/hearth/help.tsx');
const {Game}=await import('../src/game/sim.ts');
const text=html=>html.replace(/<[^>]+>/g,'|').split('|').map(s=>s.trim()).filter(Boolean);

function world(){const g=new Game();g.reset(5,10,{rulersVersion:2});g.enterIsland();for(let i=0;i<20;i++){g.state.paused=false;g.step(.5);}g.state.paused=true;return g;}
const engine=g=>({game:g,pushHud(){},focusIdle(){},focusMinimap(){},acceptRoute(){},declineRoute(){},view:{}});
const hud=(g,o={})=>({...g.snapshot(),started:true,awaitingStart:false,founding:false,selection:{kind:'none'},...o});

test('top bar: icon and number per resource with a meter under food, water and people; sentences are only tooltips',()=>{
 const g=world(),html=renderToStaticMarkup(h(SupplyBar,{hud:hud(g),engine:engine(g),onOpen(){}}));
 assert.equal((html.match(/hw-supply-cell/g)||[]).length,5,'food, logs, stone, water, people before the copper age');
 assert.ok((html.match(/role="meter"/g)||[]).length>=1,'at least the people meter');
 const visible=text(html).filter(s=>!/^Council of/.test(s));
 for(const s of visible)assert.match(s,/^[\d\/]+$|^[A-Z][a-z]+folk$|^[A-Za-z ]{0,18}$/,'only numbers and the society name are visible: '+s);
 assert.ok(!/Needs attention|days at today/.test(text(html).join(' ')),'no explanatory sentence renders inline');
 assert.match(html,/aria-label="Food \d+/);
});
test('top bar: a starved pantry reads critical (red), a full house reads amber, copper and iron appear with their age',()=>{
 const g=world();g.tribe(0).food=0;if(g.tribe(0).foodLots)for(const k of Object.keys(g.tribe(0).foodLots))g.tribe(0).foodLots[k]=0;
 const base=hud(g);const html=renderToStaticMarkup(h(SupplyBar,{hud:{...base,pop:5,popCap:5,age:1,copper:3},engine:engine(g),onOpen(){}}));
 assert.match(html,/hw-supply-cell s-critical/);assert.match(html,/hw-supply-cell s-low is-warn/);assert.equal((html.match(/hw-supply-cell/g)||[]).length,6);
});
const A=(kind,severity,count,at)=>({kind,severity,count,tip:`${count} ${kind}`,at});
const noFirst=html=>html.replace(/<div class="hw-chiprow hw-firstneeds".*?<\/div>/s,'');
test('priority stack: one sticky critical card with one button, the rest as icon chips, no title, no key-tip banner',()=>{
 const g=world(),alerts=[A('starving','critical',3),A('raiders','critical',2),A('full','warning',1),A('freezing','critical',1)];
 const html=noFirst(renderToStaticMarkup(h(PriorityStack,{hud:hud(g,{banner:'C selects a gatherer · ] finds resources · R gives an order',idleWorkers:4}),engine:engine(g),alerts,onOpen(){},hidden:false})));
 assert.equal((html.match(/hw-crit/g)||[]).length,1,'exactly one critical card');assert.match(html,/Raiders near/);assert.match(html,/>Horn</);
 assert.equal((html.match(/hw-note-act/g)||[]).length,1,'one button');
 assert.equal((html.match(/hw-chip-btn/g)||[]).length,4,'starving, freezing, full and idle become chips');
 assert.ok(!text(html).includes('Needs attention'),'no title above the chips (the group keeps an aria-label)');assert.ok(!/finds resources/.test(html),'key tips never show in the stack');
});
test('priority stack: non-raid critical gets Find; real news is a timed ghost card; nothing wrong renders an empty stack',()=>{
 const g=world();
 const one=noFirst(renderToStaticMarkup(h(PriorityStack,{hud:hud(g,{idleWorkers:0}),engine:engine(g),alerts:[A('thirsty','critical',2,{x:1,y:0,z:2})],onOpen(){},hidden:false})));
 assert.match(one,/Thirsty/);assert.match(one,/>Find</);assert.equal((one.match(/hw-chip-btn/g)||[]).length,0);
 const news=noFirst(renderToStaticMarkup(h(PriorityStack,{hud:hud(g,{banner:'Winter is coming',idleWorkers:0}),engine:engine(g),alerts:[],onOpen(){},hidden:false})));
 assert.match(news,/hw-info/);assert.match(news,/Winter is coming/);assert.ok(!/hw-crit|hw-chiprow/.test(news));
 const calm=noFirst(renderToStaticMarkup(h(PriorityStack,{hud:hud(g,{banner:'',idleWorkers:0}),engine:engine(g),alerts:[],onOpen(){},hidden:false})));assert.ok(!/<article/.test(calm));
});
test('pins: one button per located alert, never more than five, each named for screen readers',()=>{
 const g=world(),p={x:0,y:0,z:0};
 const alerts=['raiders','thirsty','starving','freezing','full','exposed','harvest'].map(k=>A(k,k==='full'||k==='exposed'||k==='harvest'?'warning':'critical',1,p));
 const html=renderToStaticMarkup(h(AlertPins,{engine:engine(g),alerts}));
 assert.equal((html.match(/class="hw-pin /g)||[]).length,5);assert.equal((html.match(/Go there/g)||[]).length,5);
 assert.equal(renderToStaticMarkup(h(AlertPins,{engine:engine(g),alerts:[A('backlog','warning',130)]})),'','a problem with no place gets no pin');
});
test('map layer buttons: influence only where the game has an influence field; all are named',()=>{
 const g=world();const legacy=renderToStaticMarkup(h(OverlayToggles,{engine:{...engine(g),game:{state:{}}}})),modern=renderToStaticMarkup(h(OverlayToggles,{engine:{...engine(g),game:{state:{terrainInfluence:{version:1}}}}}));
 assert.equal((legacy.match(/<button/g)||[]).length,3);assert.equal((modern.match(/<button/g)||[]).length,4);
 for(const n of ['Territory','Resources','Water'])assert.match(legacy,new RegExp(`aria-label="${n}"`));assert.match(modern,/aria-label="Influence"/);assert.ok(!/aria-label="Influence"/.test(legacy));
});
test('help: every group has icon, title and keys; the old banner keys are all there',()=>{
 const html=renderToStaticMarkup(h(HelpBody));assert.equal((html.match(/hw-help-card/g)||[]).length,HELP_GROUPS.length);
 for(const k of ['C','R','Enter','Esc','Space'])assert.match(html,new RegExp(`<kbd>${k}</kbd>`));
 assert.match(html,/<kbd>\]<\/kbd>/);
});

test('priority stack: first-needs strip shows icon, word and reason for each unmet starting need',()=>{
 const g=world(),html=renderToStaticMarkup(h(PriorityStack,{hud:hud(g,{idleWorkers:0}),engine:engine(g),alerts:[],onOpen(){},hidden:false}));
 assert.match(html,/hw-firstneeds/);assert.match(html,/First needs/);
 for(const w of ['Water','Fire','Shelter','Food'])if(new RegExp('aria-label="'+w+':').test(html))assert.match(html,new RegExp(w+':[^"]{8,}'));
});
