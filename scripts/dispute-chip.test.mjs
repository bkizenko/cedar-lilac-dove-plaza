import {registerHooks} from 'node:module';import {readFileSync} from 'node:fs';import tsxCompiler from 'typescript';
registerHooks({resolve(specifier,context,next){if(specifier.startsWith('@/')){const url=new URL('../src/'+specifier.slice(2),import.meta.url).href;let last;for(const ext of ['','.ts','.tsx']){try{return next(url+ext,context)}catch(e){last=e}}throw last}return next(specifier,context)},load(url,context,next){if(/\.tsx?$/.test(url)){const source=readFileSync(new URL(url),'utf8');return{format:'module',shortCircuit:true,source:tsxCompiler.transpileModule(source,{compilerOptions:{module:tsxCompiler.ModuleKind.ESNext,target:tsxCompiler.ScriptTarget.ES2022,jsx:tsxCompiler.JsxEmit.ReactJSX}}).outputText}}return next(url,context)}});
import test from 'node:test';import assert from 'node:assert/strict';
const {disputeChip}=await import('../src/ui/council/disputeChip.ts');
const war={key:'war-2',team:2,tone:'danger',glyph:'⚔',label:'At odds',text:'Ridge Clan stand against us.'};
const unrest={key:'unrest',tone:'warn',glyph:'!',label:'Unrest',text:'Grumbling: the hall is restless.'};
const ward={key:'ward-1-Ana',team:1,tone:'note',glyph:'⌂',label:'Kin due home',text:'x'};
test('no chip without a dispute; wards and notes never raise one',()=>{assert.equal(disputeChip([]),null);assert.equal(disputeChip([ward]),null);});
test('worst dispute leads, counts roll up, tab follows the matter',()=>{
 const c=disputeChip([war,unrest,ward]);assert.equal(c.count,2);assert.equal(c.tone,'danger');assert.equal(c.label,'2 disputes');assert.equal(c.tab,'neighbours');assert.equal(c.team,2);
 const u=disputeChip([unrest]);assert.equal(u.tab,'ruler');assert.equal(u.label,'Unrest');assert.equal(u.tone,'warn');
});
test('dismissal is per event, a new event brings the chip back',()=>{
 const gone=new Set(['war-2']);assert.equal(disputeChip([war],gone),null);
 assert.equal(disputeChip([war,{...war,key:'war-3',team:3}],gone).team,3);
});
test('contested mourning and strong claims count, weak claims do not',()=>{
 assert.equal(disputeChip([{key:'mourning',tone:'note',glyph:'✦',label:'Mourning',text:'X is mourned; the succession is contested.'}]).tab,'ruler');
 assert.equal(disputeChip([{key:'mourning',tone:'note',glyph:'✦',label:'Mourning',text:'X is mourned.'}]),null);
 assert.equal(disputeChip([{key:'cb-them-2-claim',tone:'warn',glyph:'⚑',label:'Claim against us',text:'x'}]),null);
 assert.equal(disputeChip([{key:'cb-them-2-claim',tone:'danger',glyph:'⚑',label:'Claim against us',text:'x'}]).count,1);
});
