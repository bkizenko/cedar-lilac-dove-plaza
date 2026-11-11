import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
import {GRAPHICS_RULES} from '../src/game/graphics.ts';
registerHooks({resolve(specifier,context,next){if(specifier.startsWith('@/'))return next(new URL(`../src/${specifier.slice(2)}.ts`,import.meta.url).href,context);return next(specifier,context);}});
const {WorldView}=await import('../src/scene/world.ts');
test('all three presets apply distinct resolution budgets and keep expensive shadows opt-in',()=>{globalThis.window={devicePixelRatio:2};let ratio=0,disposed=0;const view={renderer:{setPixelRatio:n=>ratio=n,shadowMap:{}},shadowsEnabled:false,sun:{shadow:{mapSize:{set(){}},map:null}},grass:{visible:true},composer:{dispose(){disposed++;},setPixelRatio(){}},bloom:{dispose(){disposed++;}},lost:true};for(const q of ['high','med','low']){WorldView.prototype.applyQuality.call(view,q);assert.equal(ratio,GRAPHICS_RULES.profiles[q].pixelRatio);assert.equal(view.renderer.shadowMap.enabled,false);assert.equal(view.sun.castShadow,false);}assert.equal(disposed,2);view.shadowsEnabled=true;WorldView.prototype.applyQuality.call(view,'high');assert.equal(view.renderer.shadowMap.enabled,true);WorldView.prototype.applyQuality.call(view,'low');assert.equal(view.renderer.shadowMap.enabled,false);assert.equal(GRAPHICS_RULES.defaultUnitRings,true);});
test('graphics quality survives reload and unavailable storage keeps a usable default',async()=>{const {loadGraphicsQuality,rememberGraphicsQuality,GRAPHICS_PREFERENCE_KEY}=await import('../src/game/graphics.ts');const old=globalThis.localStorage,values=new Map();try{globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};assert.equal(loadGraphicsQuality(),'med');rememberGraphicsQuality('low');assert.equal(loadGraphicsQuality(),'low');values.set(GRAPHICS_PREFERENCE_KEY,'invalid');assert.equal(loadGraphicsQuality(),'med');globalThis.localStorage={getItem(){throw Error('unavailable');},setItem(){throw Error('full');}};assert.equal(loadGraphicsQuality(),'med');assert.doesNotThrow(()=>rememberGraphicsQuality('high'));}finally{globalThis.localStorage=old;}});
test('postprocessed quality finishes with the renderer display-color pass; Low retains the direct path',()=>{const renderer={domElement:{clientWidth:320,clientHeight:180},getPixelRatio:()=>1,getSize:v=>v.set(320,180)};const view={renderer,quality:'med',composer:null,bloom:null,scene:{},camera:{}};WorldView.prototype.setupComposer.call(view);assert.ok(view.composer,'postprocessing pipeline constructed');assert.equal(view.composer.passes.at(-1).isOutputPass,true,'display conversion follows all effects');view.composer.dispose();view.bloom.dispose();view.quality='low';view.composer=null;view.bloom=null;WorldView.prototype.setupComposer.call(view);assert.equal(view.composer,null);});

test('large desktop viewports stay inside the selected pixel budget without changing CSS dimensions',async()=>{
 const {graphicsPixelRatio}=await import('../src/game/graphics.ts');
 for(const quality of ['low','med','high']){
  for(const [width,height,dpr] of [[1280,800,1],[1440,900,2],[2560,1600,2],[3840,2160,2]]){
   const ratio=graphicsPixelRatio(quality,width,height,dpr);
   assert.ok(width*height*ratio*ratio<=GRAPHICS_RULES.profiles[quality].maximumPixels+.001);
   assert.ok(ratio<=dpr&&ratio<=GRAPHICS_RULES.profiles[quality].pixelRatio);
  }
 }
 assert.equal(graphicsPixelRatio('med',1280,800,1),1);
});

test('Low limits render pixels while Medium and High budgets remain unchanged',async()=>{
 const {graphicsPixelRatio}=await import('../src/game/graphics.ts');
 assert.equal(GRAPHICS_RULES.profiles.low.maximumPixels,800000);
 assert.equal(GRAPHICS_RULES.profiles.med.maximumPixels,2100000);
 assert.equal(GRAPHICS_RULES.profiles.high.maximumPixels,3200000);
 const ratio=graphicsPixelRatio('low',2560,1600,2);
 assert.ok(Math.abs(2560*1600*ratio*ratio-800000)<.001);
 assert.equal(GRAPHICS_RULES.defaultUnitRings,true);
});
