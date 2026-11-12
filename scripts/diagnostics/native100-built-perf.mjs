import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
// Usage: node scripts/diagnostics/native100-built-perf.mjs INPUT.json OUTPUT.json [LOOPBACK_URL] [EXPECTED_RELEASE]
if(!process.argv[2]||!process.argv[3])throw Error('Provide a private input fixture and a report output path; fixture content is never bundled with this harness');
const fixture=pathToFileURL(resolve(process.argv[2]));
const output=pathToFileURL(resolve(process.argv[3]));
const sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=readFileSync(fixture),fixtureSha256=sha(bytes);
const url=process.argv[4]||'http://127.0.0.1:8086',expectedRelease=process.argv[5]||'2026-11-11T22-25-07-816Z-3911598';
const target=new URL(url);if(!['http:','https:'].includes(target.protocol)||!['localhost','127.0.0.1','[::1]'].includes(target.hostname))throw Error('Only loopback game servers are supported');
const warmMilliseconds=6000,sampleMilliseconds=24000;
let browser,context,page;const errors=[],consoleErrors=[],requestFailures=[],setupTimings={};const harnessStarted=performance.now();let stage='launch';
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
 context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
 page=await context.newPage();stage='navigation';
 page.on('requestfailed',r=>requestFailures.push({url:r.url(),failure:r.failure()?.errorText}));page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
 await page.addInitScript(()=>{window.__perfContextEvents=[];for(const type of ['webglcontextlost','webglcontextrestored','webglcontextcreationerror'])document.addEventListener(type,event=>window.__perfContextEvents.push({type,at:performance.now(),statusMessage:event.statusMessage||null}),true);localStorage.setItem('hearthwild:graphics-quality','low');localStorage.setItem('hearthwild:render-style','current');});
 setupTimings.browserLaunchMilliseconds=performance.now()-harnessStarted;const health=await(await context.request.get(url+'/__hearthwild_health')).json();assert.equal(health.release,expectedRelease);
 const bootStarted=performance.now();await page.goto(url,{waitUntil:'commit',timeout:30000});stage='engine-boot';await page.waitForFunction(()=>window.__engine?.game,{},{timeout:45000});await page.bringToFront();setupTimings.bootMilliseconds=performance.now()-bootStarted;stage='fixture-import';const importStarted=performance.now();
 const imported=await page.evaluate(async text=>window.__engine.importVillage(new File([text],'native100-performance-fixture.json',{type:'application/json'})),bytes.toString('utf8'));
 setupTimings.importMilliseconds=performance.now()-importStarted;assert.equal(imported.applied,true,JSON.stringify(imported));
 stage='normal-engine-measurement';const result=await page.evaluate(async({warmMilliseconds,sampleMilliseconds})=>{
  const e=window.__engine,g=e.game,v=e.view;
  const residents=()=>g.state.units.filter(u=>u.team===0&&u.hp>0&&!u.visit&&!u.prisoner&&!u.expedition).length;
  const counts=()=>({playerResidents:residents(),allLivingUnits:g.state.units.filter(u=>u.hp>0).length,allBuildings:g.state.buildings.length,livingBuildings:g.state.buildings.filter(b=>b.hp>0).length});
  e.setQuality('low');e.setPerformanceExpanded(false);g.state.speed=1;
  if(residents()!==100)throw Error('Imported fixture is not exactly100 present living player residents');
  if(!g.started||g.awaitingStart||document.hidden)throw Error('Normal foreground Engine loop is not ready');
  if(e.profile.simulationPhases.enabled||e.profile.personMethods.enabled)throw Error('Detailed phase/person probes must be off');
  const gl=v.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
  const vendor=debug?gl.getParameter(debug.UNMASKED_VENDOR_WEBGL):null,renderer=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null;
  const label=String(renderer||gl.getParameter(gl.RENDERER));
  const rendererIdentity={vendor,renderer,maskedVendor:gl.getParameter(gl.VENDOR),maskedRenderer:gl.getParameter(gl.RENDERER),version:gl.getParameter(gl.VERSION),shadingLanguageVersion:gl.getParameter(gl.SHADING_LANGUAGE_VERSION),software:/swiftshader|llvmpipe|softpipe|software|swrast/i.test(label),classification:!debug?'unidentified':/swiftshader|llvmpipe|softpipe|software|swrast/i.test(label)?'software':'driver-reported hardware (headless; not user hardware FPS proof)'};
  const sceneCounts=()=>{let objects=0,meshes=0,visibleMeshes=0,instancedMeshes=0,submittedInstances=0;v.scene.traverse(o=>{objects++;if(o.isMesh){meshes++;if(o.visible)visibleMeshes++;}if(o.isInstancedMesh){instancedMeshes++;if(o.visible)submittedInstances+=o.count;}});return{objects,meshes,visibleMeshes,instancedMeshes,submittedInstances,buildingCull:v.buildingCameraCull?{...v.buildingCameraCull.metrics}:null};};
  const preWarm=counts();g.state.paused=false;const warmStarted=performance.now();
  await new Promise(resolve=>setTimeout(resolve,warmMilliseconds));
  const actualWarmMilliseconds=performance.now()-warmStarted;if(document.hidden||g.state.paused||g.state.speed!==1)throw Error('Game did not remain foreground and unpaused at speed1');
  e.profile.reset();const started=performance.now(),simulationStart=g.state.time,start=counts(),sceneStart=sceneCounts(),camera={look:{x:v.look.x,y:v.look.y,z:v.look.z},distance:v.dist,yaw:v.yaw,pitch:v.pitch};
  const longTasks=[],gaps=[],population=[{wallMs:0,...start}],rollingWindows=[];let observer,lastFrame=null,raf,stopped=false;
  if(PerformanceObserver.supportedEntryTypes.includes('longtask')){observer=new PerformanceObserver(list=>{for(const t of list.getEntries())longTasks.push({startMs:t.startTime-started,durationMs:t.duration,name:t.name});});observer.observe({type:'longtask'});}
  const frame=t=>{if(lastFrame!==null)gaps.push(t-lastFrame);lastFrame=t;if(!stopped)raf=requestAnimationFrame(frame);};raf=requestAnimationFrame(frame);
  const poll=setInterval(()=>population.push({wallMs:performance.now()-started,...counts()}),1000);
  const snapshots=setInterval(()=>rollingWindows.push({wallMs:performance.now()-started,profile:e.profile.report()}),5000);
  await new Promise(resolve=>setTimeout(resolve,sampleMilliseconds));
  const ended=performance.now(),end=counts(),simulationEnd=g.state.time,profile=e.profile.report(),sceneEnd=sceneCounts();
  stopped=true;cancelAnimationFrame(raf);clearInterval(poll);clearInterval(snapshots);
  if(observer){for(const t of observer.takeRecords())longTasks.push({startMs:t.startTime-started,durationMs:t.duration,name:t.name});observer.disconnect();}
  const stages=Object.fromEntries([...e.profile.samples].map(([stage,samples])=>[stage,[...samples]]));
  const summary=values=>{const a=[...values].sort((a,b)=>a-b),n=a.length;return{samples:n,meanMs:a.reduce((n,v)=>n+v,0)/Math.max(1,n),p50Ms:a[Math.max(0,Math.ceil(n*.5)-1)]||0,p95Ms:a[Math.max(0,Math.ceil(n*.95)-1)]||0,p99Ms:a[Math.max(0,Math.ceil(n*.99)-1)]||0,maxMs:a.at(-1)||0};};
  const status={quality:g.quality,viewQuality:v.quality,speed:g.state.speed,paused:g.state.paused,hidden:document.hidden,simulationErrors:[...g.simulationErrors],phaseProbes:e.profile.simulationPhases.enabled,personProbes:e.profile.personMethods.enabled,ended:g.state.ended||null};
  g.state.paused=true;
  return{preWarm,start,end,minimumPlayerResidents:Math.min(start.playerResidents,end.playerResidents,...population.map(p=>p.playerResidents)),warmMilliseconds,actualWarmMilliseconds,requestedSampleMilliseconds:sampleMilliseconds,actualSampleMilliseconds:ended-started,simulationStart,simulationEnd,simulationSeconds:simulationEnd-simulationStart,population,rendererIdentity,camera,canvas:{width:v.renderer.domElement.width,height:v.renderer.domElement.height,pixelRatio:v.renderer.getPixelRatio()},sceneStart,sceneEnd,status,profile,rollingWindows,stageRollingRawSamples:stages,stageRollingTails:Object.fromEntries(Object.entries(stages).map(([k,a])=>[k,summary(a)])),fullSamplingRafGaps:summary(gaps),fullSamplingRafRawGaps:gaps,longTasks:{supported:PerformanceObserver.supportedEntryTypes.includes('longtask'),count:longTasks.length,totalMs:longTasks.reduce((n,t)=>n+t.durationMs,0),maximumMs:Math.max(0,...longTasks.map(t=>t.durationMs)),entries:longTasks}};
 },{warmMilliseconds,sampleMilliseconds});
 assert.equal(sha(readFileSync(fixture)),fixtureSha256,'private fixture bytes changed');
 const report={scope:'Actual built391 normal foreground Engine animation loop; isolated headless Chrome context; imported declared100-resident native scale fixture, not earned campaign; Low/speed1. No manual Game.step, terrain/path/RNG overrides, screenshot or detailed phase/person probes.',release:health.release,fixtureSha256,fixtureBytes:bytes.length,fixtureUnchanged:true,browserVersion:browser.version(),headless:true,isolatedContext:true,setupTimings,limitations:['Headless renderer timing is not user hardware FPS acceptance; software renderer results cannot prove GPU performance.','RuntimeProfile stage arrays retain only latest240samples and frame arrays600; rolling snapshots are overlapping, not a full-window aggregate. Full independent RAF gaps and longtasks span actual sampling interval.','Building cull metrics are latest actual structure-review snapshot, not cumulative totals. Scene visibility counts are submitted object flags, not a GPU-visible-resident count.','Warm/sample scheduling requests30seconds total; actual timer delay is reported and any >60seconds is invalid.'],errors,consoleErrors,...result};
 writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 assert.equal(errors.length,0);assert.deepEqual(result.status.simulationErrors,[]);assert.equal(result.status.quality,'low');assert.equal(result.status.speed,1);assert.equal(result.status.paused,false);assert.equal(result.status.hidden,false);assert.equal(result.status.phaseProbes,false);assert.equal(result.status.personProbes,false);assert.ok(result.simulationSeconds>0);assert.ok(result.actualWarmMilliseconds+result.actualSampleMilliseconds<=60000,'warm+sample exceeded60seconds');
 console.log(JSON.stringify({output:output.pathname,release:report.release,fixtureSha256,minimumPlayerResidents:result.minimumPlayerResidents,renderer:result.rendererIdentity,frames:result.fullSamplingRafGaps,stageTails:result.stageRollingTails,longTasks:result.longTasks.count,errors}));
}catch(error){const failure={stage,setupTimings,totalMilliseconds:performance.now()-harnessStarted,error:String(error?.stack||error),fixtureSha256,fixtureUnchanged:sha(readFileSync(fixture))===fixtureSha256,errors,consoleErrors,requestFailures,boot:await page?.evaluate(()=>({url:location.href,title:document.title,readyState:document.readyState,hidden:document.hidden,enginePresent:!!window.__engine,canvasPresent:!!document.querySelector('canvas'),contextEvents:window.__perfContextEvents||[],existingWebGL:(()=>{const renderer=window.__engine?.view?.renderer;if(!renderer)return null;const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');return{lost:gl.isContextLost(),renderer:gl.getParameter(debug?debug.UNMASKED_RENDERER_WEBGL:gl.RENDERER),vendor:gl.getParameter(debug?debug.UNMASKED_VENDOR_WEBGL:gl.VENDOR),version:gl.getParameter(gl.VERSION)};})(),text:document.body?.innerText?.slice(0,2400)})).catch(e=>({error:String(e)}))};writeFileSync(new URL(output.href.replace(/\.json$/,'')+'.boot-failure.json'),JSON.stringify(failure,null,2)+'\n');throw error;}finally{await context?.close();await browser?.close();assert.equal(sha(readFileSync(fixture)),fixtureSha256);}
