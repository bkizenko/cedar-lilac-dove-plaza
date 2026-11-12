import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from 'playwright';
const profile=mkdtempSync(join(tmpdir(),'hearthwild-roof-snow-built-')),errors=[],report={passed:0,total:1,scope:'Actual saved village and linked WebGL snow uniforms under visual-only season probes. No clock, stock, population or performance claim.'};let context;
try{
 context=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,viewport:{width:1280,height:900},args:['--enable-unsafe-swiftshader']});const page=context.pages()[0];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/Shader|WebGLProgram|VALIDATE_STATUS|VALIDATE|shader error/i.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>localStorage.setItem('hearthwild:graphics-quality','low'));await page.goto(process.env.HEARTHWILD_BUILT_URL||'http://127.0.0.1:8103/',{waitUntil:'commit'});await page.waitForFunction(()=>window.__engine?.game,null,{timeout:60000});
 const save=JSON.parse(readFileSync(process.argv[2],'utf8'));save.state.paused=true;assert.equal((await page.evaluate(s=>window.__engine.importVillage(new File([JSON.stringify(s)],'private-roofs.json',{type:'application/json'})),save)).applied,true);
 const result=await page.evaluate(()=>{const e=window.__engine,g=e.game,v=e.view,before=JSON.stringify(g.state),oldStyle=v.getStyle(),rows=[],shaderErrors=[];const gl=v.renderer.getContext(),previous=v.renderer.debug.onShaderError;v.renderer.debug.onShaderError=()=>shaderErrors.push('Actual shader compilation failed');
  try{for(const style of ['village','optionH','current']){v.setStyle(style);const probe=Object.create(g);probe.seasonMix=()=>({...g.seasonMix(),snow:1,winter:1});v.paintSeason(probe,2);v.renderer.render(v.scene,v.camera);const programs=v.renderer.info.programs.filter(p=>gl.getUniformLocation(p.program,'uSnow')!==null);rows.push({style,cover:v.carvedSnow,linkedSnowPrograms:programs.length,liveSnowUniforms:programs.map(p=>gl.getUniform(p.program,gl.getUniformLocation(p.program,'uSnow'))),allLinked:programs.every(p=>gl.getProgramParameter(p.program,gl.LINK_STATUS))});}return{rows,shaderErrors,stateUnchanged:JSON.stringify(g.state)===before};}
  finally{v.renderer.debug.onShaderError=previous;v.setStyle(oldStyle);v.paintSeason(g,2);v.renderer.render(v.scene,v.camera);}
 });
 assert.equal(result.stateUnchanged,true);assert.deepEqual(result.shaderErrors,[]);assert.deepEqual(errors,[]);for(const r of result.rows){assert.equal(r.cover,r.style==='current'?0:1);assert.equal(r.allLinked,true);assert.ok(r.linkedSnowPrograms>0);assert.ok(r.liveSnowUniforms.includes(r.style==='current'?0:1));}report.actualRenderer=result.rows;report.passed++;
}catch(e){report.failure=e.message.slice(0,2000);process.exitCode=1;}finally{await context?.close();rmSync(profile,{recursive:true,force:true});report.errors=errors;console.log(JSON.stringify(report,null,2));}
