// T8 / WQ-8 / GW-08 control (Grok): the Engine's R-key/Rotate button state reaches both the
// placement preview (placementIssue + ghost yaw) and the commit (placeBuilding). View/HUD are stubs.
import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {testAction} from '../src/game/testing.ts';import {BUILDINGS} from '../src/game/constants.ts';
import {buildingQuarterTurns} from '../src/game/footprints.ts';
import {after} from 'node:test';import {registerHooks} from 'node:module';import {readFileSync,existsSync} from 'node:fs';import {fileURLToPath} from 'node:url';import ts from 'typescript';
const hook=registerHooks({resolve(specifier,context,next){const target=specifier.startsWith('@/')?new URL('../src/'+specifier.slice(2),import.meta.url).href:specifier;try{return next(target,context);}catch(error){if(target.startsWith('.')||target.startsWith('file:'))for(const suffix of['.ts','.tsx']){const url=new URL(target+suffix,context.parentURL);if(existsSync(url))return next(url.href,context);}throw error;}},load(url,context,next){if(url.endsWith('.tsx'))return{format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText};return next(url,context);}});
after(()=>hook.deregister());
const {Engine}=await import('../src/game/engine.ts');
const TYPE='barracks',W=BUILDINGS[TYPE].w,D=BUILDINGS[TYPE].d;
function rig(){
  const g=new Game();g.reset(1,undefined,{size:1040,layout:'pangaea'});g.enterIsland();g.testMode=true;testAction(g,'supplies');g.revealMap=true;g.updateVision(0);
  const home=g.campOf(0);let spot=null;for(let r=40;r<240&&!spot;r+=6)for(let k=0;k<24;k++){const x=Math.round((home.x+Math.cos(k/24*6.283)*r)/2)*2,z=Math.round((home.z+Math.sin(k/24*6.283)*r)/2)*2;if(!g.placementIssue(TYPE,x,z)&&!g.placementIssue(TYPE,x,z,0,undefined,undefined,undefined,true)){spot={x,z};break;}}
  assert.ok(spot,'open site');
  const e=Object.create(Engine.prototype),ghosts=[];Object.assign(e,{game:g,waterDraft:null,quarterTurn:false,gateFacing:'north',gateFacingExplicit:false,plotWidth:1,plotDepth:1,plotSize:undefined,plotStart:null,plotPointerStart:null,bridgeSpan:undefined,ghostPos:{x:0,z:0},pointer:{x:1,y:1},nextFieldPreviewAt:0,plotPreviewKey:'',loggingMode:false,moveMode:false});
  e.view={groundAt:()=>({...spot}),setLinePreview(){},setGhost:(...a)=>ghosts.push(a)};e.pushHud=()=>{};e.audio={play(){}};e.keyboard={mode:false};
  return{g,e,spot,ghosts};
}
test('R/Rotate toggles a quarter turn only for turnable buildings and resets on a new placement',()=>{
  const{g,e}=rig();g.state.placing='house';assert.equal(e.canRotatePlacement(),false);assert.equal(e.rotatePlacement(),false);assert.equal(e.quarterTurn,false);
  g.state.placing=null;Engine.prototype.setPlacing.call(e,TYPE);assert.equal(g.state.placing,TYPE);assert.equal(e.canRotatePlacement(),true);
  assert.equal(e.rotatePlacement(),true);assert.equal(e.quarterTurn,true);
  Engine.prototype.setPlacing.call(e,'house');assert.equal(e.quarterTurn,false,'switching building drops the turn');
});
test('the turned ghost and the committed building agree: swapped footprint, quarter-turn yaw',()=>{
  const{g,e,spot,ghosts}=rig();g.state.placing=null;Engine.prototype.setPlacing.call(e,TYPE);e.rotatePlacement();
  const last=ghosts.at(-1);assert.equal(last[0],TYPE);assert.equal(last[10],true,'ghost drawn turned');assert.equal(last[4],true,'preview says valid');assert.equal(g.state.placeIssue,null);
  const before=g.state.buildings.length;Engine.prototype.leftClick.call(e,1,1,false);
  assert.equal(g.state.buildings.length,before+1);const b=g.state.buildings.at(-1);assert.equal(b.type,TYPE);assert.equal(b.w,D);assert.equal(b.d,W);assert.equal(buildingQuarterTurns(b),1);
  assert.ok(Math.abs(b.x-spot.x)<1e-6&&Math.abs(b.z-spot.z)<1e-6);
});
test('without a turn the commit keeps the catalogue footprint',()=>{
  const{g,e}=rig();g.state.placing=null;Engine.prototype.setPlacing.call(e,TYPE);
  Engine.prototype.leftClick.call(e,1,1,false);const b=g.state.buildings.at(-1);assert.equal(b.type,TYPE);assert.equal(b.w,W);assert.equal(b.d,D);assert.equal(buildingQuarterTurns(b),0);
});
