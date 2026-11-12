import {registerHooks} from 'node:module';import {readFileSync} from 'node:fs';import tsxCompiler from 'typescript';
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if(specifier.startsWith('.')&&!/\.[a-z]+$/.test(specifier))return next(specifier+'.tsx',context);throw error;}},load(url,context,next){if(url.endsWith('.tsx'))return{format:'module',shortCircuit:true,source:tsxCompiler.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{target:tsxCompiler.ScriptTarget.ES2022,module:tsxCompiler.ModuleKind.ESNext,jsx:tsxCompiler.JsxEmit.ReactJSX}}).outputText};return next(url,context);}});
import test from 'node:test';import assert from 'node:assert/strict';import {createElement as h} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
const {StartupHint,STARTUP_HINT_KEY}=await import('../src/ui/hearth/StartupHint.tsx');
test('first-run hint shows once, offers Menu and a dismiss, and stays hidden after it was seen',()=>{
 const store=new Map();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)}});
 const html=renderToStaticMarkup(h(StartupHint,{onOpenMenu(){}}));assert.match(html,/>Menu<\/button>/);assert.match(html,/Dismiss hint/);assert.ok(html.replace(/<[^>]+>/g,' ').trim().split(/\s+/).length<=12,'first-run hint stays brief');
 const withHelp=renderToStaticMarkup(h(StartupHint,{onOpenMenu(){},onOpenHelp(){}}));assert.match(withHelp,/>Help<\/button>/);
 store.set(STARTUP_HINT_KEY,'1');assert.equal(renderToStaticMarkup(h(StartupHint,{onOpenMenu(){}})),'');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}}});assert.equal(renderToStaticMarkup(h(StartupHint,{onOpenMenu(){}})),'');
});
