// Prepared, not executed here. Run only against the coordinator's frozen built
// preview in a disposable browser context; never the user's browser/profile.
// Player Test Lab reveal is explicitly VISUAL-ONLY, not NPC knowledge credit.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const url=process.env.HEARTHWILD_TEST_URL;
const input=process.env.NPC_SEA_CAPTURE_PATH;
assert.ok(url&&input,'Provide HEARTHWILD_TEST_URL for the frozen built preview and NPC_SEA_CAPTURE_PATH for its actual outbound snapshot');
assert.ok(['127.0.0.1','localhost'].includes(new URL(url).hostname),'Use the isolated local built preview');
const bytes=readFileSync(input),inputHash=createHash('sha256').update(bytes).digest('hex'),save=JSON.parse(bytes);
const voyage=save.state.seaExploration.voyages.find(v=>v.team===1&&v.phase==='outbound');
assert.ok(voyage,'snapshot must contain the physically admitted outbound NPC mission');
const ids={boat: voyage.boatId,crew:voyage.crew};
const directory=resolve(process.env.NPC_SEA_UI_OUTPUT||'.play/npc-sea-built-ui');mkdirSync(directory,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:process.env.HEARTHWILD_HEADED!=='1',args:['--enable-unsafe-swiftshader']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{localStorage.setItem('hearthwild:graphics-quality','low');localStorage.setItem('hearthwild:render-style','current');});
 await page.goto(url,{waitUntil:'commit',timeout:30000});
 await page.waitForFunction(()=>window.__engine?.game?.started,undefined,{timeout:30000});
 const imported=await page.evaluate(async data=>window.__engine.importVillage(new File([JSON.stringify(data)],'actual-npc-outbound.json',{type:'application/json'})),save);
 assert.equal(imported.applied,true,JSON.stringify(imported));
 // Use the actual public Test Lab/reveal controls. This preserves the imported
 // authored village as the original and confines reveal to the test copy.
 const menu=page.getByRole('button',{name:'Menu',exact:true});
 if(await menu.getAttribute('aria-expanded')==='false')await menu.click();
 await page.getByRole('button',{name:'Test lab',exact:true}).click();
 await page.getByLabel('Reveal the whole map',{exact:true}).check();
 await page.getByRole('button',{name:'Close testing panel',exact:true}).click();
 if(await menu.getAttribute('aria-expanded')==='true')await menu.click();
 const beforeKnowledge=await page.evaluate(()=>JSON.stringify(window.__engine.game.state.rivalKnowledge));
 async function inspect(){
  return page.evaluate(({boat,crew})=>{
   const e=window.__engine,g=e.game,v=e.view,b=g.state.boats.find(b=>b.id===boat);
   if(!g.testMode||!g.revealMap||!b)throw Error('Expected actual hull in visual-only revealed Test Lab copy');
   g.state.paused=true;v.look.set(b.x,g.waterAt(b.x,b.z),b.z);v.dist=32;v.updateCamera(.016);v.sync(g,0);v.render();
   const Matrix=v.riverboats.matrixWorld.constructor,matrix=new Matrix();
   const legacy=g.state.boats.filter(b=>!b.hullClass&&b.hp>0&&(b.team===0||g.exploredAt(b.x,b.z))),index=legacy.findIndex(b=>b.id===boat);
   if(index<0||index>=v.riverboats.count)throw Error('Actual NPC hull has no submitted shared-hull instance');
   v.riverboats.getMatrixAt(index,matrix);const hullTransform={x:matrix.elements[12],y:matrix.elements[13],z:matrix.elements[14]};
   const rendered=[...v.unitInstanceOwners.values()].flat().map(u=>u.id);
   const aboard=crew.map(id=>{const u=g.state.units.find(u=>u.id===id);return{id,boat:u?.boat?.id,phase:u?.boat?.phase,rendered:rendered.includes(id),x:u?.x,z:u?.z};});
   // The injured legacy canoe owner is legitimately ashore. Count ONLY actual
   // nonaboard attachment owners; three aboard people must add no head canoes.
   const attachments=g.state.units.filter(u=>u.hp>0&&!u.shelterId&&(u.team===0||g.visibleAt(u.x,u.z))&&!u.boat&&u.haulage==='canoe');
   const canoe=v.haulageMeshes.get('canoe');
   const worldCorners=[];
   for(let i=0;i<(canoe?.count??0);i++){canoe.getMatrixAt(i,matrix);worldCorners.push({x:matrix.elements[12],y:matrix.elements[13],z:matrix.elements[14]});}
   return {time:g.state.time,boat:{id:b.id,team:b.team,x:b.x,z:b.z,hp:b.hp},hullTransform,hullInstances:v.riverboats.count,aboard,attachmentOwners:attachments.map(u=>u.id),canoeAttachments:canoe?.count??0,attachmentTransforms:worldCorners,testMode:g.testMode,revealMap:g.revealMap,simulationErrors:g.simulationErrors,phase:g.state.seaExploration.voyages.find(v=>v.boatId===boat)?.phase};
  },ids);
 }
 function check(snapshot){
  assert.equal(snapshot.boat.id,ids.boat);assert.equal(snapshot.boat.team,1);
  assert.ok(Math.hypot(snapshot.hullTransform.x-snapshot.boat.x,snapshot.hullTransform.z-snapshot.boat.z)<.001,'submitted mesh follows the actual owned hull');
  for(const u of snapshot.aboard){assert.equal(u.boat,ids.boat);assert.equal(u.phase,'aboard');assert.equal(u.rendered,true);assert.ok(!snapshot.attachmentOwners.includes(u.id),'aboard crew is excluded from personal/head-canoe attachments');}
  assert.equal(snapshot.canoeAttachments,snapshot.attachmentOwners.length,'no extra personal canoe instances for aboard crew');
  assert.deepEqual(snapshot.simulationErrors,[]);
 }
 const before=await inspect();check(before);
 await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
 const firstImage=join(directory,'npc-hull-before.png');await page.screenshot({path:firstImage});
 let after=before;
 for(let block=0;block<10&&Math.hypot(after.boat.x-before.boat.x,after.boat.z-before.boat.z)<1;block++){
  await page.evaluate(()=>{const e=window.__engine,g=e.game;g.state.paused=false;for(let i=0;i<20;i++)g.step(.1);g.state.paused=true;e.pushHud();});
  await page.evaluate(()=>new Promise(done=>requestAnimationFrame(done)));
  after=await inspect();
 }
 check(after);const movedMeters=Math.hypot(after.boat.x-before.boat.x,after.boat.z-before.boat.z);
 assert.ok(movedMeters>=1,'normal Game.step moves the same actual hull;no transforms/orders/crew positions were injected');
 assert.ok(after.time-before.time<=33,'inspection uses a bounded short motion sample');
 await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
 const secondImage=join(directory,'npc-hull-after.png');await page.screenshot({path:secondImage});
 assert.deepEqual(errors,[]);
 assert.equal(createHash('sha256').update(readFileSync(input)).digest('hex'),inputHash,'original authored snapshot remains unchanged');
 const report={passed:true,scope:'Built current-style Low visual inspection of actual authored native NPC voyage;public Test Lab reveal is visual-only. No NPC knowledge/autonomy/FPS/latest-map gate credit.',url,input:resolve(input),inputHash,before,after,movedMeters,errors,screenshots:[firstImage,secondImage],knowledgeBeforeMotion:beforeKnowledge,knowledgeAfterMotion:await page.evaluate(()=>JSON.stringify(window.__engine.game.state.rivalKnowledge)),needsHumanVisualReview:true};
 writeFileSync(join(directory,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:report.passed,boat:ids.boat,crew:ids.crew,movedMeters,screenshots:report.screenshots,report:join(directory,'report.json'),scope:report.scope,needsHumanVisualReview:true}));
 await context.close();
}finally{await browser.close();}
