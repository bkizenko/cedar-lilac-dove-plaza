// T9 / WQ-10 / GW-02 / GW-10 (Grok): the Engine's farm drag uses planFieldArea for preview AND commit
// (several fields with headlands), and the banner reports fertilityPreview. View/HUD are stubs.
import test,{after} from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {testAction} from '../src/game/testing.ts';
import {planFieldArea} from '../src/game/fieldArea.ts';import {sampleSite} from '../src/game/siteSample.ts';
import {registerHooks} from 'node:module';import {readFileSync,existsSync} from 'node:fs';import {fileURLToPath} from 'node:url';import ts from 'typescript';
const hook=registerHooks({resolve(specifier,context,next){const target=specifier.startsWith('@/')?new URL('../src/'+specifier.slice(2),import.meta.url).href:specifier;try{return next(target,context);}catch(error){if(target.startsWith('.')||target.startsWith('file:'))for(const suffix of['.ts','.tsx']){const url=new URL(target+suffix,context.parentURL);if(existsSync(url))return next(url.href,context);}throw error;}},load(url,context,next){if(url.endsWith('.tsx'))return{format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText};return next(url,context);}});
after(()=>hook.deregister());
const {Engine}=await import('../src/game/engine.ts');
function rig(){
  const g=new Game();g.reset(0,undefined,{size:1040,layout:'continents'});g.state.conflict='quiet';g.enterIsland();g.testMode=true;testAction(g,'cultivation');testAction(g,'supplies');g.tribe(0).seeds=500;g.revealMap=true;g.updateVision(0);
  const home=g.campOf(0);let area=null;
  for(let r=30;r<220&&!area;r+=10)for(let k=0;k<24;k++){const a={x:home.x+Math.cos(k/24*6.283)*r,z:home.z+Math.sin(k/24*6.283)*r},b={x:a.x+60,z:a.z+40};const s=sampleSite(g,{x:a.x+30,z:a.z+20,w:60,d:40});if(s.wetFraction>0)continue;const plan=planFieldArea(g,a,b);if(plan.valid===plan.tiles.length&&plan.tiles.length>1){area={a,b,plan};break;}}
  assert.ok(area,'open area near camp');
  const e=Object.create(Engine.prototype),banners=[],lines=[];let ground=area.b;
  Object.assign(e,{game:g,waterDraft:null,quarterTurn:false,fieldArea:null,fertilityKey:'',gateFacing:'north',gateFacingExplicit:false,plotWidth:1,plotDepth:1,plotSize:undefined,plotStart:null,plotPointerStart:null,bridgeSpan:undefined,ghostPos:{x:0,z:0},pointer:{x:400,y:300},nextFieldPreviewAt:0,plotPreviewKey:'',loggingMode:false,moveMode:false,audio:{play(){}},keyboard:{mode:false}});
  e.view={groundAt:()=>({...ground}),setLinePreview:p=>lines.push(p),setFieldSnap(){},setGhost(){}};e.pushHud=()=>{};const banner=g.banner.bind(g);g.banner=(t,d)=>{banners.push(t);return banner(t,d);};
  return{g,e,area,banners,lines,setGround:p=>{ground=p;}};
}
test('a wide farm drag previews the same multi-field plan it commits, with seeds and fertility in the banner',()=>{
  const{g,e,area,banners,lines}=rig();g.state.placing=null;Engine.prototype.setPlacing.call(e,'farm');
  e.plotStart={...area.a};e.plotPointerStart={x:100,y:100};e.updateGhost(true);
  assert.ok(e.fieldArea,'multi-field mode');const shown=e.fieldArea.tiles.map(t=>({...t}));assert.equal(shown.length,area.plan.tiles.length,'preview lays out the same number of fields as planFieldArea (positions may snap to a neighbouring field or grid)');
  assert.equal(lines.at(-1).length,area.plan.tiles.length);assert.ok(lines.at(-1).every(p=>p.ok));
  const msg=banners.at(-1);assert.match(msg,new RegExp(`^${area.plan.valid}/${area.plan.tiles.length} fields · \\d+ seeds`));assert.match(msg,/soil · grain ×\d/);
  const before=g.state.buildings.filter(b=>b.type==='farm').length;Engine.prototype.leftClick.call(e,400,300,false);
  const farms=g.state.buildings.filter(b=>b.type==='farm');assert.equal(farms.length-before,area.plan.valid,'every admissible tile committed');
  for(const t of shown)assert.ok(farms.some(b=>Math.abs(b.x-t.x)<1e-6&&Math.abs(b.z-t.z)<1e-6&&Math.abs(b.w-t.w)<1e-6&&Math.abs(b.d-t.d)<1e-6),'committed tile matches preview');
  assert.match(banners.at(-1),/fields laid out|field laid out/);
});
test('a drag within one field keeps the single scaled-field path',()=>{
  const{g,e,area,setGround}=rig();g.state.placing=null;Engine.prototype.setPlacing.call(e,'farm');
  e.plotStart={...area.a};e.plotPointerStart={x:100,y:100};setGround({x:area.a.x+12,z:area.a.z+10});e.updateGhost(true);assert.equal(e.fieldArea,null);assert.ok(e.plotSize);
});
