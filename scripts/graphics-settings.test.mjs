import test from 'node:test';import assert from 'node:assert/strict';
import {GraphicsSettings,GRAPHICS_CHOICES,DRAW_CHOICES,TREE_CHOICES,TREE_STEPS,TREE_DETAIL,SETTINGS_RULES,resolveChoices,renderConfig,treeBudget,loadChoices,rememberChoice,initialEffective,DEFAULT_CHOICES} from '../src/game/graphicsSettings.ts';
import {DETAIL_RULES} from '../src/game/detailLevel.ts';
import {GRAPHICS_RULES} from '../src/game/graphics.ts';
import {DRAW_DISTANCE_RULES,drawBands} from '../src/game/drawDistance.ts';
import {botanicalTree} from '../src/scene/treeBotany.ts';

const memory=(init={})=>{const m=new Map(Object.entries(init));return {m,getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>{m.set(k,String(v));}};};
const make=(choices,storage=memory())=>{const calls=[];const g=new GraphicsSettings((e,c)=>calls.push({e:{...e},c:[...c]}),storage,choices&&{...choices});return {g,calls,storage};};
const slow=(g,ms,seconds)=>{let n=null;for(let t=0;t<seconds*1000;t+=ms){const r=g.observe(ms);if(r)n=r;}return n;};
const warm=g=>{for(let i=0;i<SETTINGS_RULES.settleSeconds*1000/16+5;i++)g.observe(16);};

test('every selection reaches the engine config: each graphics, draw and tree option, explicit and Auto, applied and persisted as chosen',()=>{
 for(const graphics of GRAPHICS_CHOICES)for(const draw of DRAW_CHOICES)for(const trees of TREE_CHOICES){
  const {g,calls,storage}=make();g.start();
  assert.ok(g.choose('graphics',graphics)&&g.choose('draw',draw)&&g.choose('trees',trees));
  const e=g.effective,cfg=renderConfig(e);
  if(graphics!=='auto')assert.equal(e.graphics,graphics);else assert.equal(e.graphics,SETTINGS_RULES.autoStart.graphics);
  if(draw!=='auto')assert.equal(e.draw,draw);else assert.equal(e.draw,SETTINGS_RULES.autoStart.draw);
  if(trees!=='auto')assert.equal(e.trees,trees);
  assert.equal(cfg.quality,e.graphics);assert.deepEqual(cfg.graphicsProfile,GRAPHICS_RULES.profiles[e.graphics]);
  assert.deepEqual(cfg.bands,drawBands(e.draw,1040));assert.equal(cfg.trees,TREE_DETAIL[e.trees]);
  // the last apply the engine saw is exactly the effective tiers
  assert.deepEqual(calls.at(-1).e,e);
  // persisted as chosen and read back identically
  assert.deepEqual(loadChoices(storage),{graphics,draw,trees});
  assert.equal(g.notice,null);
 }
});

test('Ultra, High and the top tree step are selectable and stay selected (the "cannot go above Low" bug)',()=>{
 const {g}=make();g.start();g.choose('graphics','high');g.choose('draw','ultra');g.choose('trees',5);
 assert.deepEqual(g.effective,{graphics:'high',draw:'ultra',trees:5});
 assert.equal(slow(g,120,600),null,'ten slow minutes later nothing has been lowered');
 assert.deepEqual(g.effective,{graphics:'high',draw:'ultra',trees:5});assert.equal(g.eased,false);
});

test('the governor never touches an explicit knob, however slow the frames',()=>{
 const {g,calls,storage}=make({graphics:'med',draw:'high',trees:4});g.start();warm(g);const before=calls.length;
 assert.equal(slow(g,200,900),null);assert.equal(calls.length,before,'nothing applied');assert.deepEqual(g.effective,{graphics:'med',draw:'high',trees:4});
 assert.equal(storage.m.size,0,'nothing stored by the governor');
});

test('Auto eases only after sustained bad frames, one rung at a time, shows a reason, never persists, and Restore undoes it',()=>{
 const {g,calls,storage}=make();g.start();
 assert.deepEqual(g.effective,{graphics:'med',draw:'medium',trees:3},'Auto starts mid-way between Low and Medium trees');
 assert.equal(slow(g,50,SETTINGS_RULES.settleSeconds-1),null,'load/settle time is not judged');
 assert.equal(g.observe(900),null,'a hitch is not load');assert.equal(g.observe(NaN),null);
 warm(g);assert.equal(slow(g,16,60),null,'60 fps never eases');
 const n=slow(g,45,SETTINGS_RULES.overSeconds*2+1);
 assert.ok(n&&n.kind==='auto'&&n.knob==='trees'&&n.to==='2','first rung: lighter trees');assert.match(n.reason,/ms/);assert.match(n.text,/Eased by Auto/);
 assert.equal(g.effective.graphics,'med');assert.equal(g.notice,n);
 assert.equal(storage.m.size,0,'an automatic easing is never written to storage');
 assert.equal(slow(g,45,SETTINGS_RULES.settleSeconds-1),null,'new tier settles before it is judged again');
 slow(g,45,200);assert.deepEqual(g.effective,{graphics:'low',draw:'low',trees:1},'floor of the ladder');
 assert.equal(slow(g,45,60),null,'cannot ease below the floor');
 const n0=calls.length;g.restore();assert.deepEqual(g.effective,{graphics:'med',draw:'medium',trees:3});assert.equal(g.notice,null);assert.ok(calls.length>n0);
 assert.equal(storage.m.size,0);
});

test('mixed: explicit graphics stays, Auto knobs ease; picking a level clears earlier easing',()=>{
 const {g}=make({graphics:'high',draw:'auto',trees:'auto'});g.start();warm(g);
 assert.deepEqual(g.effective,{graphics:'high',draw:'medium',trees:5});
 slow(g,60,400);assert.equal(g.effective.graphics,'high','explicit High survives');assert.equal(g.effective.draw,'low');assert.equal(g.effective.trees,1);
 assert.ok(g.notice);g.choose('draw','ultra');assert.equal(g.notice,null,'choosing resets');assert.equal(g.effective.draw,'ultra');assert.equal(g.effective.trees,5,'Auto knobs return to their start');
});

test('with an explicit graphics tier and trees on Auto, trees follow the tier; Low trees keep the Low radius with fewer cards, Medium and High equal the Medium and High radii',()=>{
 assert.equal(resolveChoices({graphics:'low',draw:'auto',trees:'auto'}).trees,2);
 assert.equal(resolveChoices({graphics:'med',draw:'auto',trees:'auto'}).trees,4);
 assert.equal(resolveChoices({graphics:'high',draw:'auto',trees:'auto'}).trees,5);
 assert.equal(TREE_DETAIL[4].nearMetres,DETAIL_RULES.treeNear.med);assert.equal(TREE_DETAIL[5].nearMetres,DETAIL_RULES.treeNear.high);assert.equal(TREE_DETAIL[2].nearMetres,DETAIL_RULES.treeNear.low);
 assert.ok(TREE_DETAIL[2].cardScale<1,'Low draws fewer leaf cards than before');
});

test('tree detail is monotonic across the five steps in every knob, with a step between Low and Medium',()=>{
 const keys=['nearMetres','farScale','fillerCap','fillerDetail','cardScale'];
 for(const k of keys)for(let s=1;s<5;s++)assert.ok(TREE_DETAIL[s][k]<=TREE_DETAIL[s+1][k],`${k} step ${s}->${s+1}`);
 for(const k of ['nearMetres','farScale','fillerCap','cardScale'])assert.ok(TREE_DETAIL[2][k]<TREE_DETAIL[3][k]&&TREE_DETAIL[3][k]<TREE_DETAIL[4][k],`${k}: default step 3 sits strictly between Low (2) and Medium (4)`);
 const b=drawBands('medium',1040),tri=s=>{const t=treeBudget(b,s);return t.fillerMaxTrees+t.fillerMaxBlobs;};
 for(let s=1;s<5;s++)assert.ok(tri(s)<=tri(s+1));assert.ok(tri(1)>0&&tri(1)<tri(2),'step 1 keeps a token filler so sim trees beyond the detail radius draw as cheap crowns');assert.equal(treeBudget(drawBands('low'),5).fillerMaxTrees,0,'draw Low has no filler at any step');
 assert.equal(TREE_STEPS.length,5);
});

test('leaf-card scale really lowers the triangle count of a botanical tree (spruce has no cards and is unchanged)',()=>{
 const tri=(id,scale,lod=0)=>botanicalTree(id,0,lod,scale).geometry.index.count/3;
 for(const id of ['oak','scotsPine','birch']){const full=tri(id,1),half=tri(id,.55);assert.ok(half<full*.95,`${id}: ${half} < ${full}`);assert.ok(half>full*.3,'still a tree');}
 assert.equal(tri('spruce',.55),tri('spruce',1));
 assert.equal(botanicalTree('oak',0,0,1),botanicalTree('oak',0,0),'scale 1 is the original cached tree');
});

test('storage: stale v1 graphics value is ignored (the old tuner wrote Low), legacy draw choice carries over, bad or blocked storage falls back to Auto and never throws',()=>{
 assert.deepEqual(loadChoices(memory({'hearthwild:graphics-quality':'low'})),DEFAULT_CHOICES,'stale tuner-written Low is not a choice');
 assert.equal(loadChoices(memory({'hearthwild:draw-distance':'high'})).draw,'high');
 assert.equal(loadChoices(memory({'hearthwild:draw-distance':'high','hearthwild:draw-choice-v2':'auto'})).draw,'auto','v2 wins');
 assert.deepEqual(loadChoices(memory({'hearthwild:graphics-choice-v2':'ultra','hearthwild:draw-choice-v2':'med','hearthwild:tree-detail-v2':'9'})),DEFAULT_CHOICES);
 assert.equal(loadChoices(memory({'hearthwild:tree-detail-v2':'3'})).trees,3);
 const boom={getItem(){throw Error('blocked');},setItem(){throw Error('full');}};
 assert.deepEqual(loadChoices(boom),DEFAULT_CHOICES);assert.equal(rememberChoice('graphics','high',boom),false);
 const {g}=make(undefined,boom);g.start();assert.ok(g.choose('graphics','high'),'the choice still applies for this session');assert.equal(g.effective.graphics,'high');
 assert.equal(rememberChoice('graphics','ultra',memory()),false);assert.deepEqual(initialEffective(memory()),{graphics:'med',draw:'medium',trees:3});
 const {g:h}=make();assert.equal(h.choose('graphics','ultra'),false);assert.equal(h.choose('trees',6),false);assert.equal(h.choose('draw','med'),false);
});

test('safety fallback lowers the effective tier even on an explicit choice, says why, is not persisted, and Restore brings the choice back',()=>{
 const {g,storage}=make({graphics:'high',draw:'high',trees:5});g.start();
 const n=g.safetyDowngrade('the graphics context was lost');
 assert.ok(n&&n.kind==='safety'&&n.knob==='graphics'&&n.from==='high'&&n.to==='med');assert.match(n.text,/context was lost/);
 assert.equal(storage.m.size,0);assert.equal(g.choices.graphics,'high');
 g.restore();assert.equal(g.effective.graphics,'high');assert.equal(g.notice,null);
 const {g:l}=make({graphics:'low',draw:'low',trees:1});assert.equal(l.safetyDowngrade('x'),null,'nothing below Low');
});

test('the engine and the view take what the controller applies: effective draw distance and tree step reach WorldView, the chosen draw level is untouched, and nothing eases on its own',async t=>{
 let WorldView;try{({WorldView}=await import('../src/scene/world.ts'));}catch(e){t.skip('world.ts not loadable in this node: '+String(e.message).slice(0,80));return;}
 const {DrawDistanceGovernor}=await import('../src/game/drawDistance.ts');
 const camera={far:0,updateProjectionMatrix(){}};
 const view={drawGovernor:new DrawDistanceGovernor('ultra'),mapSize:1040,camera,lastRenderAt:0,drawBandsNow:null,treeStep:3};
 view.applyDrawBands=WorldView.prototype.applyDrawBands;
 WorldView.prototype.setEffectiveDrawDistance.call(view,'medium');
 assert.equal(WorldView.prototype.getEffectiveDrawDistance.call(view),'medium');assert.equal(WorldView.prototype.getDrawDistance.call(view),'ultra','chosen level untouched');
 assert.ok(Math.abs(camera.far-drawBands('medium',1040).cameraFar)<1e-6);
 for(const step of TREE_STEPS){WorldView.prototype.setTreeDetail.call(view,step);assert.equal(WorldView.prototype.getTreeDetail.call(view),step);}
 // the render path no longer eases by itself
 assert.ok(!/drawGovernor\.observe/.test(WorldView.prototype.render.toString()),'view must not run its own governor');
});
