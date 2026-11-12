import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from 'playwright';
const profile=mkdtempSync(join(tmpdir(),'hearthwild-display-built-')),errors=[],report={passed:0,total:4,scope:'Real first-run hint/Menu/dismiss persistence and actual Three lighting under explicitly authored visual-only weather/time probes. No simulation progression, campaign, original-village mutation or performance claim.'};let context,stage='launch';
try{
 context=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,viewport:{width:1440,height:1000},args:['--enable-unsafe-swiftshader']});const page=context.pages()[0];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('hearthwild:graphics-quality','low'));await page.goto(process.env.HEARTHWILD_BUILT_URL||'http://127.0.0.1:8103/',{waitUntil:'commit'});await page.waitForFunction(()=>window.__engine?.game,null,{timeout:60000});
 await page.evaluate(()=>{const e=window.__engine;e.enterIsland();e.game.state.paused=true;e.pushHud();});
 stage='first-run hint opens actual Menu';const hint=page.getByRole('note',{name:'Display options hint'});await hint.waitFor();await hint.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('combobox',{name:'World visual style',exact:true}).waitFor();assert.equal(await hint.count(),0);assert.equal(await page.evaluate(()=>localStorage.getItem('hearthwild.ui.hintGraphics')),'1');report.passed++;
 stage='existing style and quality controls remain independent';await page.getByRole('combobox',{name:'World visual style',exact:true}).selectOption('optionH');await page.waitForFunction(()=>window.__engine.view.getStyle()==='optionH');assert.equal(await page.evaluate(()=>window.__engine.game.quality),'low');assert.equal(await page.evaluate(()=>localStorage.getItem('hearthwild:render-style-v2')),'optionH');report.passed++;
 stage='real Three intensities follow H on both map palettes, default and weather unchanged';const samples=await page.evaluate(()=>{
  const e=window.__engine,g=e.game,v=e.view,oldStyle=v.getStyle(),oldMap=v.getMapStyle(),rows=[];
  // This probe only supplies lighting inputs to the real Three adapter; it
  // never changes the game clock, units, terrain, goods or simulation rules.
  for(const map of ['classic','painterly'])for(const mode of ['clear','storm','night']){
   const probe=Object.create(g);probe.state={...g.state,weather:mode==='storm'?'storm':'clear'};probe.daylight=()=>({sunrise:6,sunset:18});probe.dayPhase=()=>mode==='night'?.05:6.5/24;probe.isNight=()=>mode==='night';probe.seasonMix=()=>({snow:0,winter:0,autumn:0,spring:1,summer:0});v.setMapStyle(map,false);const values={};
   for(const style of ['current','village','optionH']){v.setStyle(style);v.updateDay(probe,1);values[style]={sun:v.sun.intensity,hemi:v.hemi.intensity};}
   rows.push({map,mode,values});
  }
  v.setMapStyle(oldMap,false);v.setStyle(oldStyle);v.updateDay(g,1);return rows;
 });
 for(const row of samples){const {current,village,optionH}=row.values;assert.deepEqual(village,current,`${row.map}/${row.mode}: default intensity preserved`);for(const light of ['sun','hemi']){assert.ok(Number.isFinite(optionH[light])&&optionH[light]>=0);if(row.mode==='clear')assert.ok(optionH[light]<village[light]&&optionH[light]>village[light]*.7,`${row.map}: bounded H dawn blend actually reaches renderer`);else assert.equal(optionH[light],village[light],`${row.map}/${row.mode}: no extra weather/night dimming`);}}
 report.lighting=samples;report.passed++;
 stage='dismissal survives actual reload';await page.reload({waitUntil:'commit'});await page.waitForFunction(()=>window.__engine?.game,null,{timeout:60000});await page.evaluate(()=>{const e=window.__engine;e.enterIsland();e.game.state.paused=true;e.pushHud();});assert.equal(await page.getByRole('note',{name:'Display options hint'}).count(),0);assert.deepEqual(errors,[]);report.passed++;
}catch(e){report.failure={stage,message:e.message.slice(0,2200)};process.exitCode=1;}finally{await context?.close();rmSync(profile,{recursive:true,force:true});report.errors=errors;console.log(JSON.stringify(report,null,2));}
