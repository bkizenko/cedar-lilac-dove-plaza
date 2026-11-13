import {registerHooks} from 'node:module';import {readFileSync} from 'node:fs';import tsxCompiler from 'typescript';
registerHooks({resolve(specifier,context,next){if(specifier.startsWith('@/')){const url=new URL('../src/'+specifier.slice(2),import.meta.url).href;let last;for(const ext of ['', '.ts', '.tsx']){try{return next(url+ext,context);}catch(e){last=e;}}throw last;}try{return next(specifier,context);}catch(error){if(specifier.startsWith('.')&&!/\.[a-z]+$/.test(specifier)){try{return next(specifier+'.tsx',context);}catch{return next(specifier+'.ts',context);}}throw error;}},load(url,context,next){if(url.endsWith('.css'))return{format:'module',shortCircuit:true,source:''};if(url.endsWith('.tsx'))return{format:'module',shortCircuit:true,source:tsxCompiler.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{target:tsxCompiler.ScriptTarget.ES2022,module:tsxCompiler.ModuleKind.ESNext,jsx:tsxCompiler.JsxEmit.ReactJSX}}).outputText};return next(url,context);}});
import {registerHooks as rh} from 'node:module';rh({resolve(s,c,n){if(s==='lucide-react'){try{return n(s,c);}catch{return{url:'data:text/javascript,'+encodeURIComponent('export const Hammer=()=>null,Footprints=()=>null,Package=()=>null,Plus=()=>null,Users=()=>null;'),shortCircuit:true};}}return n(s,c);}});
import test from 'node:test';import assert from 'node:assert/strict';import {createElement as h} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
const {WildGlance}=await import('../src/ui/hearth/wildPanel.tsx');
const rows=[
 {icon:'🧵',kind:'work',text:'working 40%',why:'Twist sinew into cordage',section:'working',urgent:false,projectId:3,paused:false,who:'Ada'},
 {icon:'🩸',kind:'wound',text:'deer bleeding',amount:5,section:'afield',urgent:true},
 {icon:'🪢',kind:'trap',text:'2 caught',why:'snare',section:'afield',urgent:false},
 {icon:'🧠',kind:'rot',text:'3.0',why:'30% rots per 10 min',section:'stores',urgent:true},
];
const plan={sites:[],pens:[],enabled:true,hands:['Ada','Bo'],recipes:[{id:'renderFat',icon:'🧈',name:'Render fat into tallow',station:'hearth',issue:null,stations:[{id:1,free:2}]},{id:'soakHide',icon:'💧',name:'Soak a scraped hide',station:'tanner',issue:'Need 1 cleanHide at the camp cache',stations:[{id:2,free:2}]}],carcasses:[{id:9,icon:'🔪',species:'deer',parts:8}],trails:[],ready:[{projectId:4,icon:'🍇',name:'Dry berries on a rack'}]};
test('panel is icon-first: big glyph tiles, counts, progress, and words only in labels',()=>{
 const html=renderToStaticMarkup(h(WildGlance,{rows,plan,onCommand:()=>{}}));
 for(const g of['🧵','🩸','🪢','🧠','🧈','🔪','✋'])assert.ok(html.includes(g),g);
 assert.match(html,/width:40%/);assert.match(html,/Click to pause/);assert.match(html,/Blood trail: deer bleeding/);assert.match(html,/Collect: Dry berries on a rack/);
 assert.match(html,/aria-disabled="true"[^>]*>.{0,40}💧|Need 1 cleanHide/);
 assert.doesNotMatch(html.replace(/(aria-label|data-tooltip-title|data-tooltip-description)="[^"]*"/g,''),/Twist sinew into cordage/);
});
test('without a controller tiles are read-only, and with nothing happening it says so once',()=>{
 const html=renderToStaticMarkup(h(WildGlance,{rows,plan:undefined}));assert.doesNotMatch(html,/<button/);
 assert.match(renderToStaticMarkup(h(WildGlance,{rows:[],plan:undefined})),/Nothing is being hunted/);
});
test('hand count tone warns when nobody is free',()=>{
 assert.match(renderToStaticMarkup(h(WildGlance,{rows:[],plan:{...plan,hands:[]}})),/No free hands/);
});
