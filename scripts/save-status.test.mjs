import test from 'node:test';import assert from 'node:assert/strict';
const {slotInfo,ageText,autosaveLine}=await import('../src/ui/saveStatus.ts');
test('slot info reads header facts and tolerates junk',()=>{
 assert.deepEqual(slotInfo('latest',{savedAt:5,state:{seed:7,worldgenVersion:21}}),{kind:'latest',label:'Latest',savedAt:5,seed:7,generation:21});
 assert.equal(slotInfo('backup',{state:{seed:7}}).generation,1,'old saves without a generator version read as 1');
 assert.equal(slotInfo('backup',null),null);assert.equal(slotInfo('backup',{state:5}),null);
});
test('age text is plain language',()=>{
 const now=1e12;assert.equal(ageText(now-10e3,now),'just now');assert.equal(ageText(now-5*60e3,now),'5 min ago');assert.equal(ageText(now-3*3600e3,now),'3 h ago');assert.equal(ageText(now-86400e3,now),'yesterday');assert.equal(ageText(null,now),'time unknown');
});
test('autosave line: fallback is a slower save, a failed commit is bad, test lab is explained',()=>{
 const base={mode:'worker confirmed',failure:null,failedCommits:0,nextAttemptMs:null};
 assert.equal(autosaveLine(base).tone,'good');
 const fb=autosaveLine({...base,mode:'synchronous fallback',failure:{reason:'timeout',phase:'serialize'},nextAttemptMs:30000});
 assert.equal(fb.tone,'warn');assert.match(fb.detail,/too slow/);assert.match(fb.detail,/30 s/);assert.match(fb.text,/working/);
 assert.equal(autosaveLine({...base,failedCommits:2}).tone,'bad');
 assert.match(autosaveLine({...base,testMode:true}).text,/Test Lab/);
});
test('menu view renders slots, health line and the terrain promise',async()=>{
 const {registerHooks}=await import('node:module');const {readFileSync}=await import('node:fs');const ts=(await import('typescript')).default;
 registerHooks({resolve(sp,c,n){try{return n(sp,c);}catch(e){if(sp.startsWith('.')&&!/\.[a-z]+$/.test(sp)){try{return n(sp+'.tsx',c);}catch{return n(sp+'.ts',c);}}throw e;}},load(u,c,n){if(u.endsWith('.tsx'))return{format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(new URL(u),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText};return n(u,c);}});
 const {createElement:h}=await import('react');const {renderToStaticMarkup}=await import('react-dom/server');
 const {SaveStatusView}=await import('../src/ui/hearth/SaveStatus.tsx');const now=1e12;
 const html=renderToStaticMarkup(h(SaveStatusView,{now,auto:{tone:'warn',text:'Autosave is working, in a slower way',detail:'x'},slots:[{kind:'latest',label:'Latest',savedAt:now-60e3,seed:3,generation:21},{kind:'protected',label:'Protected',savedAt:null,seed:3,generation:1}]}));
 assert.match(html,/Latest.*1 min ago.*Seed 3.*Gen 21/);assert.match(html,/Protected/);assert.match(html,/never changes its terrain/);assert.match(renderToStaticMarkup(h(SaveStatusView,{now,auto:null,slots:[]})),/No saved copy yet/);
});
