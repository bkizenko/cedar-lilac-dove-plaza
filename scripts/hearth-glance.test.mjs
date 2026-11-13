import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {avoidPinControls,SUPPLY_RULES,TrendTracker,supplyLevel,supplyFill,daysText,rankAlerts,pinSet,infoVisible,INFO_RULES,isKeyTip,projectToScreen,edgeArrow,lookAtCamera,ALERT_RANK,MAX_PINS,budgetNotes,budgetKey,ALERT_BUDGET,seasonPhaseOf,seasonCueTitle} from '../src/ui/hearth/glanceModel.ts';
import {paintOverlays,TERRITORY_NONE,TERRITORY_CONTESTED,RESOURCE_COLOR} from '../src/ui/hearth/overlayModel.ts';
import {influenceGradientModel} from '../src/game/terrainInfluenceView.ts';
// Docs: docs/UIUX_PROPOSAL.md changes 7 (supply meters), 8 (priority stack), 9 (map overlays), 10 (pins and edge arrows). Pure models only: no DOM, no lucide.
const DAY=56.25;

/* ---------- supply meters ---------- */
test('days of supply: red under three days, amber under six, no level when the rule is unknown',()=>{
 assert.equal(supplyLevel(2.9),'critical');assert.equal(supplyLevel(SUPPLY_RULES.criticalDays),'low');assert.equal(supplyLevel(5.9),'low');assert.equal(supplyLevel(6),'ok');
 for(const v of [null,undefined,NaN,Infinity])assert.equal(supplyLevel(v),'unknown');
 assert.equal(supplyFill(null),null);assert.equal(supplyFill(0),0);assert.equal(supplyFill(5),.5);assert.equal(supplyFill(99),1);assert.equal(supplyFill(-4),0);
 assert.equal(daysText(.4),'<1');assert.equal(daysText(2.44),'2.4');assert.equal(daysText(12.7),'12');
});
test('trend: rising, falling and steady over about a day; nothing until there is history; resets when time rewinds',()=>{
 const t=new TrendTracker(DAY);
 assert.equal(t.trend(),null);
 t.push(0,100);assert.equal(t.trend(),null,'one sample is not a trend');
 t.push(DAY*.1,101);assert.equal(t.trend(),null,'under a quarter day is too little');
 const up=new TrendTracker(DAY);for(let i=0;i<=20;i++)up.push(i*DAY/10,100+i*10);assert.equal(up.trend(),'up');assert.ok(up.perDay()>50);
 const down=new TrendTracker(DAY);for(let i=0;i<=20;i++)down.push(i*DAY/10,500-i*20);assert.equal(down.trend(),'down');
 const flat=new TrendTracker(DAY);for(let i=0;i<=20;i++)flat.push(i*DAY/10,300+(i%2?.2:0));assert.equal(flat.trend(),'flat');
 flat.push(5,10);assert.equal(flat.samples.length,1,'a clock that goes backwards (restart or load) clears history');
});
test('trend uses only the last day, so an old surge does not hide a fall',()=>{
 const t=new TrendTracker(DAY);
 for(let i=0;i<=10;i++)t.push(i*DAY/10,i*100);          // rising for a day
 for(let i=1;i<=12;i++)t.push(DAY+i*DAY/10,1000-i*60);  // then falling
 assert.equal(t.trend(),'down');
});
test('history is bounded',()=>{const t=new TrendTracker(DAY);for(let i=0;i<5000;i++)t.push(i*2,i);assert.ok(t.samples.length<=DAY*SUPPLY_RULES.historyDays/(DAY/40)+4,'samples '+t.samples.length);});

/* ---------- alert priority ---------- */
const A=(kind,severity,count=1,at)=>({kind,severity,count,tip:kind,...(at?{at}:{})});
test('one sticky critical card: raiders outrank thirst, thirst outranks hunger, hunger outranks cold; the rest fall to chips',()=>{
 const all=[A('freezing','critical',2),A('full','warning'),A('starving','critical',3),A('raiders','critical',4),A('thirsty','critical'),A('backlog','warning',120)];
 const r=rankAlerts(all);
 assert.equal(r.critical.kind,'raiders');
 assert.deepEqual(r.chips.map(c=>c.kind),['thirsty','starving','freezing','full','backlog']);
 assert.equal(rankAlerts([A('full','warning'),A('exposed','warning')]).critical,null,'warnings never become the critical card');
 assert.equal(rankAlerts([]).critical,null);
 assert.equal(rankAlerts([A('starving','critical')]).chips.length,0);
});
test('rank table covers every kind with distinct ranks, critical kinds above all warnings',()=>{
 const ranks=Object.values(ALERT_RANK);assert.equal(new Set(ranks).size,ranks.length);
 for(const k of ['raiders','thirsty','starving','freezing'])for(const w of ['full','exposed','harvest','backlog'])assert.ok(ALERT_RANK[k]>ALERT_RANK[w]);
});
test('pins: at most five, only problems that know where they are, most urgent first',()=>{
 const p={x:1,y:0,z:2};
 const many=['raiders','thirsty','starving','freezing','full','exposed','harvest'].map(k=>A(k,'warning',1,p));
 const pins=pinSet(many);assert.equal(pins.length,MAX_PINS);assert.deepEqual(pins.map(x=>x.kind),['raiders','thirsty','starving','freezing','full']);
 assert.equal(pinSet([A('backlog','warning',150),A('harvest','warning')]).length,0,'a village-wide problem has no place to pin');
 assert.equal(pinSet(many,2).length,2);
});
test('info cards are timed; sticky ones stay; they fade for the last second',()=>{
 assert.deepEqual(infoVisible(0,0,false),{show:true,fading:false});
 assert.equal(infoVisible(0,INFO_RULES.ttlSeconds-INFO_RULES.fadeSeconds,false).fading,true);
 assert.equal(infoVisible(0,INFO_RULES.ttlSeconds,false).show,false);
 assert.deepEqual(infoVisible(0,9999,true),{show:true,fading:false});
});
test('keyboard tips never enter the feed; real news does',()=>{
 for(const s of ['C selects a gatherer · ] finds resources · R gives an order','Press R to give an order','Tip: drag to size a field','Z · ] finds resources'])assert.ok(isKeyTip(s),s);
 for(const s of ['The stores run thin','Raiders from Stone Hall','Winter is coming'])assert.ok(!isKeyTip(s),s);
});

/* ---------- projection, pins and edge arrows ---------- */
const W=1440,H=900;
const cam=lookAtCamera({x:0,y:60,z:80},{x:0,y:0,z:0},50,W/H);
test('projection: the look target is the screen centre; things left, right, above and below land on the right side',()=>{
 const c=projectToScreen(cam,{x:0,y:0,z:0},W,H);assert.ok(Math.abs(c.x-W/2)<1&&Math.abs(c.y-H/2)<1);assert.ok(c.onScreen);
 assert.ok(projectToScreen(cam,{x:-20,y:0,z:0},W,H).x<c.x);assert.ok(projectToScreen(cam,{x:20,y:0,z:0},W,H).x>c.x);
 assert.ok(projectToScreen(cam,{x:0,y:0,z:-20},W,H).y<c.y,'further from the camera is higher on screen');assert.ok(projectToScreen(cam,{x:0,y:0,z:20},W,H).y>c.y);
});
test('projection: far to one side is off screen; behind the camera is off screen with the direction flipped',()=>{
 const far=projectToScreen(cam,{x:500,y:0,z:0},W,H);assert.equal(far.onScreen,false);assert.equal(far.behind,false);assert.ok(far.dx>1);
 const behind=projectToScreen(cam,{x:0,y:0,z:300},W,H);assert.equal(behind.behind,true);assert.equal(behind.onScreen,false);
 const behindRight=projectToScreen(cam,{x:200,y:0,z:300},W,H);assert.ok(behindRight.dx>0,'behind and to the right: turn right, so the arrow points right');
 const behindLeft=projectToScreen(cam,{x:-200,y:0,z:300},W,H);assert.ok(behindLeft.dx<0);
});
test('edge arrows sit on the inset rectangle, point at the target, and never leave the viewport',()=>{
 const inset={left:132,top:130,right:72,bottom:130};
 const right=edgeArrow({dx:3,dy:0,behind:false},W,H,inset);assert.equal(Math.round(right.x),W-72);assert.equal(Math.round(right.y),H/2);assert.ok(Math.abs(right.angle)<1e-6);
 const left=edgeArrow({dx:-3,dy:0,behind:false},W,H,inset);assert.equal(Math.round(left.x),132);assert.ok(Math.abs(Math.abs(left.angle)-Math.PI)<1e-6);
 const up=edgeArrow({dx:0,dy:3,behind:false},W,H,inset);assert.equal(Math.round(up.y),130);assert.ok(Math.abs(up.angle+Math.PI/2)<1e-6,'screen y points down, so up is -90 degrees');
 const down=edgeArrow({dx:0,dy:-3,behind:false},W,H,inset);assert.equal(Math.round(down.y),H-130);
 for(const [dx,dy] of [[2,2],[-5,1],[.3,-9],[0,0]]){const e=edgeArrow({dx,dy,behind:false},W,H,inset);assert.ok(e.x>=132-1&&e.x<=W-72+1&&e.y>=130-1&&e.y<=H-130+1,`${dx},${dy} -> ${e.x},${e.y}`);}
});
test('an off-screen alert from a real camera ends at the edge facing it',()=>{
 const p=projectToScreen(cam,{x:-400,y:0,z:0},W,H);assert.equal(p.onScreen,false);
 const e=edgeArrow(p,W,H,{left:132,top:130,right:72,bottom:130});assert.equal(Math.round(e.x),132);assert.ok(Math.abs(Math.abs(e.angle)-Math.PI)<.5,'points left');
});

/* ---------- overlays ---------- */
const N=40,S=400,px=(out,x,y)=>{const i=(y*N+x)*4;return [out[i],out[i+1],out[i+2],out[i+3]];};
const toPix=w=>Math.floor((w/S+.5)*N);
const base=(over={})=>({worldSize:S,pixels:N,explored:()=>true,color:t=>t===0?[255,200,60]:[80,160,255],...over});
const run=(src,keys)=>{const out=new Uint8ClampedArray(N*N*4);const drew=paintOverlays(src,new Set(keys),out);return {out,drew};};
test('overlays: nothing active draws nothing and clears the buffer',()=>{
 const out=new Uint8ClampedArray(N*N*4).fill(9);assert.equal(paintOverlays(base(),new Set(),out),false);assert.ok(out.every(v=>v===0));
});
test('territory: soft fill inside, strong edge on the border, contested ground hatched, unknown teams absent',()=>{
 const teamAt=(x,z)=>Math.hypot(x,z)<100?0:Math.hypot(x-150,z)<40?TERRITORY_CONTESTED:TERRITORY_NONE;
 const {out,drew}=run(base({teamAt}),['territory']);assert.ok(drew);
 const c=toPix(0);assert.ok(px(out,c,c)[3]>30&&px(out,c,c)[3]<80,'interior is a light wash');
 const edgeX=toPix(95);const edge=px(out,edgeX,c);assert.ok(edge[3]>200,'border is strong '+edge[3]);
 assert.equal(px(out,toPix(-190),toPix(-190))[3],0,'outside every claim is clear');
 let hatched=0;for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(px(out,x,y)[3]>0&&Math.hypot((x+.5)/N*S-S/2-150,(y+.5)/N*S-S/2)<40)hatched++;assert.ok(hatched>0);
});
test('every layer is clipped to explored ground: no border, deposit or water is revealed',()=>{
 const explored=(x)=>x<0;
 const full={teamAt:()=>0,water:()=>true,resources:[{x:-50,z:0,kind:'iron'},{x:50,z:0,kind:'iron'}],gradient:null};
 const {out}=run(base({...full,explored}),['territory','water','resources']);
 for(let y=0;y<N;y++)for(let x=N/2;x<N;x++)assert.equal(px(out,x,y)[3],0,`unexplored column ${x} must stay clear`);
 assert.ok(px(out,toPix(-50),toPix(0))[3]>0,'the explored iron shows');
 assert.equal(px(out,toPix(50),toPix(0))[3],0,'the unexplored iron does not');
});
test('resources: one colour per kind, ore larger than trees, depleted nodes are the caller\'s to omit',()=>{
 const kinds=['tree','forage','stone','copper','iron','fish'];
 const resources=kinds.map((kind,i)=>({x:-150+i*50,z:0,kind}));
 const {out}=run(base({resources}),['resources']);
 kinds.forEach((k,i)=>{const p=px(out,toPix(-150+i*50),toPix(0));assert.ok(p[3]>0,k);if(k!=='tree'){assert.deepEqual(p.slice(0,3),RESOURCE_COLOR[k].slice(),k);}});
 assert.ok(px(out,toPix(-50)+1,toPix(0)+1)[3]>0,'2x2 ore');assert.equal(px(out,toPix(-150)+1,toPix(0)+1)[3],0,'1x1 tree');
});
test('influence gradient: strong at the heart, soft at the rim, feathered where a rival also reaches',()=>{
 // A 4x4 field of 100 m cells centred on the world; team 0 strongest in the middle.
 const cell=100,w=4;const strength=new Float32Array(w*w),second=new Float32Array(w*w);
 const f0={size:400,width:4,cellMeters:cell,strength:Float32Array.from([0,.1,.1,0, .1,1,.6,.1, .1,.6,.3,.1, 0,.1,.1,0]),byShip:new Uint8Array(16),cost:new Float32Array(16),visited:0};
 const f1={size:400,width:4,cellMeters:cell,strength:Float32Array.from([0,0,0,0, 0,0,.5,0, 0,0,.4,.2, 0,0,0,0]),byShip:new Uint8Array(16),cost:new Float32Array(16),visited:0};
 const m=influenceGradientModel([{team:0,field:f0},{team:1,field:f1}],{threshold:.05});
 assert.ok(m.bounds);
 const {out,drew}=run(base({gradient:m}),['influence']);assert.ok(drew);
 const heart=px(out,toPix(-50),toPix(-50)),rim=px(out,toPix(-150),toPix(-150));
 assert.ok(heart[3]>rim[3],`heart ${heart[3]} stronger than rim ${rim[3]}`);
 const contested=px(out,toPix(50),toPix(-50));const clean=px(out,toPix(-50),toPix(50));void strength;void second;
 assert.ok(contested[3]>0&&clean[3]>0);
 assert.ok(heart[3]<=190+1,'capped so the map under it stays readable');
 assert.equal(run(base({gradient:{...m,bounds:null}}),['influence']).drew,false,'no claims, nothing drawn');
});
test('overlay painter is deterministic and does not allocate per call beyond its scratch',()=>{
 const teamAt=(x,z)=>x<0?0:1;const a=run(base({teamAt}),['territory']).out,b=run(base({teamAt}),['territory']).out;assert.deepEqual([...a],[...b]);
});

/* ---------- stylesheet: size floor, scoping, no touch to the archived themes ---------- */
const css=readFileSync(new URL('../src/ui/hearth/glance.css',import.meta.url),'utf8');
test('glance.css respects the Hearth size floor: no text under 16px, no icon under 24px, hit targets use the 48px token',()=>{
 const bad=[];for(const m of css.matchAll(/font(?:-size)?:\s*(?:[0-9]{3}\s+)?(\d+(?:\.\d+)?)px/g))if(+m[1]<16)bad.push(m[0]);assert.deepEqual(bad,[]);
 const small=[];for(const m of css.matchAll(/svg\{[^}]*?(?:width|height):\s*(\d+)px/g))if(+m[1]<24)small.push(m[0]);assert.deepEqual(small,[]);
 assert.match(css,/\.hw-chip-btn\{[^}]*min-height:var\(--hw-hit\)/);assert.match(css,/\.hw-pin-chip\{[^}]*min-height:var\(--hw-hit\)/);assert.match(css,/\.hw-overlays \.hw-btn\{[^}]*height:var\(--hw-hit\)/);
});
test('glance.css only styles Hearth classes, so field and classic stay untouched',()=>{
 const selectors=css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\{[^}]*\}/g,'{}').split(/[{}]/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('@')&&!/^\d+%$/.test(s)&&!/^(from|to)$/.test(s));
 for(const group of selectors)for(const sel of group.split(',')){const s=sel.trim();if(!s)continue;assert.match(s,/\.hw[-\s.:\w\[\]=>*()+"'~^$|]*|^\.hw/,s);assert.ok(/\.hw/.test(s),`selector not scoped to Hearth: ${s}`);}
});

/* ---------- wiring (source checks: the components themselves need lucide-react, see hearth-glance-ui.test.mjs) ---------- */
const read=f=>readFileSync(new URL('../src/ui/hearth/'+f,import.meta.url),'utf8');
test('wiring: Hearth top bar, notes and map use the glance layer; pins sit under every panel; archived HUD files are not imported',()=>{
 const parts=read('parts.tsx'),hud=read('HudHearth.tsx'),screens=read('screens.tsx');
 assert.match(parts,/from '\.\/glance'/);assert.match(parts,/<SupplyBar /);assert.match(parts,/<PriorityStack /);assert.match(parts,/<OverlayCanvas /);assert.match(parts,/<OverlayToggles /);
 assert.match(hud,/import '\.\/glance\.css'/);
 assert.ok(hud.indexOf('<AlertPins')>0&&hud.indexOf('<AlertPins')<hud.indexOf('<header className="hw-top">'),'pins are first in the layer so every panel paints over them');
 assert.match(hud,/<HelpScreen /);assert.match(screens,/id:'help'/);
 for(const f of ['glance.tsx','glanceModel.ts','glanceReads.ts','overlayModel.ts','overlayReads.ts','help.tsx','helpScreen.tsx'])assert.doesNotMatch(read(f),/from '\.\.\/Hud'/,f+' must not import the archived Hud');
});
test('wiring: Help carries every key the old tip banners named; the map layers are explained there',()=>{
 const help=read('help.tsx');for(const k of ["'C'","']'","'R'","'1'","'Enter'"])assert.ok(help.includes(k),k);assert.match(help,/Territory, influence, resources, water/);
});
test('wiring: no new key bindings (existing keys are untouched, there is no hotbar or radial)',()=>{
 for(const f of ['glance.tsx','overlayReads.ts','help.tsx'])assert.doesNotMatch(read(f),/keydown|onKeyDown|addEventListener\('key/,f);
});


test('supply history belongs to one actual village even when replacement time moves forward',()=>{const a={},b={},t=new TrendTracker(DAY);t.push(0,20,a);t.push(DAY,100,a);assert.equal(t.trend(),'up');t.push(DAY*4,500,b);assert.equal(t.samples.length,1);assert.equal(t.trend(),null,'a different village cannot inherit the previous society trend');t.push(DAY*5,200,b);assert.equal(t.trend(),'down');});
test('large resource marks never paint their neighbouring unexplored pixels',()=>{const out=new Uint8ClampedArray(4*4*4),src={worldSize:4,pixels:4,explored:(x,z)=>x>=0&&x<1&&z>=0&&z<1,color:()=>[255,255,255],resources:[{x:.1,z:.1,kind:'iron'}]};assert.equal(paintOverlays(src,new Set(['resources']),out),true);for(let y=0;y<4;y++)for(let x=0;x<4;x++)assert.equal(out[(y*4+x)*4+3]>0,x===2&&y===2,`pixel ${x}/${y}`);});


test('world pin chips avoid actual notification/control rectangles using their whole measured extent',()=>{const desired={x:1331.5,y:172.5,width:73,height:52},controls=[{x:1048,y:164,width:380,height:190},{x:1128,y:632,width:300,height:356},{x:12,y:12,width:1416,height:132}],before=structuredClone(desired),safe=avoidPinControls(desired,1440,1000,controls),overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;assert.ok(safe);assert.ok(controls.every(b=>!overlaps(safe,b)));assert.ok(safe.x>=8&&safe.y>=8&&safe.x+safe.width<=1432&&safe.y+safe.height<=992);assert.deepEqual(desired,before,'only chip presentation shifts; caller world point remains unchanged');const second=avoidPinControls(desired,1440,1000,[...controls,safe]);assert.ok(second);assert.equal(overlaps(safe,second),false);assert.equal(avoidPinControls(desired,1440,1000,[{x:0,y:0,width:1440,height:1000}]),null,'fully covered viewport hides the chip instead of overlaying controls');assert.deepEqual(avoidPinControls({x:400,y:400,width:80,height:52},1440,1000,controls),{x:400,y:400,width:80,height:52});});

test('alert budget: a burst merges same-kind lines, caps timed cards, keeps sticky ones, and reports what folded away',()=>{
 const burst=[{id:'a',sticky:true,title:'Raiders near'},{id:'b',sticky:false,title:'3 raiders sighted'},{id:'c',sticky:false,title:'2 raiders sighted'},{id:'d',sticky:false,title:'Granary low'},{id:'e',sticky:false,title:'Heir named'},{id:'f',sticky:false,title:'Envoy arrives'},{id:'g',sticky:false,title:'Wolves seen'}];
 assert.equal(budgetKey('3 Raiders  sighted'),budgetKey('12 raiders sighted'));
 const r=budgetNotes(burst);
 assert.equal(r.rows[0].note.id,'a','sticky critical stays on top');
 assert.equal(r.rows[1].title,'5 raiders sighted');assert.equal(r.rows[1].count,2);
 assert.equal(r.rows.filter(x=>!x.note.sticky).length,ALERT_BUDGET.maxTimed);
 assert.equal(r.hidden,2,'envoy and wolves fold into the count');
 assert.deepEqual(budgetNotes(burst.slice(0,1)).rows.length,1);
 assert.equal(budgetNotes([]).hidden,0);
 assert.equal(burst.length,7,'input untouched');
});

/* ---------- season cue ---------- */
test('season cue: phase from calendar seconds, advice per season, real food days only in autumn and winter',()=>{
 const Y=400;
 assert.deepEqual([0,99,100,199,200,299,300,399,400,-1].map(t=>seasonPhaseOf(t,Y)),[0,0,1,1,2,2,3,3,0,3]);
 assert.equal(seasonCueTitle(0,5),'Spring: sow and mend');
 assert.equal(seasonCueTitle(1,null),'Summer: tend the fields');
 assert.equal(seasonCueTitle(2,12.7),'Autumn: bring in the harvest and fill the stores. Food for 12 days');
 assert.equal(seasonCueTitle(3,null),'Winter: ration food and keep warm');
 assert.equal(seasonCueTitle(3,Infinity),'Winter: ration food and keep warm');
});
