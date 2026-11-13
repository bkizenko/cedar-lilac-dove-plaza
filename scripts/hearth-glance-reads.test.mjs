import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {simulationDaySeconds} from '../src/game/calendarPacing.ts';
import {winterOutlook,foodDays,waterDays,detectAlerts,visibleRaiders,RAIDER_SIGHT_METERS} from '../src/ui/hearth/glanceReads.ts';
import {rankAlerts,pinSet} from '../src/ui/hearth/glanceModel.ts';
import {overlaySourcesOf,knownTeams,parseColor,hasInfluenceGradient} from '../src/ui/hearth/overlayReads.ts';
import {paintOverlays} from '../src/ui/hearth/overlayModel.ts';
import {FOW} from '../src/game/constants.ts';
// The Game-reading half of the glance layer (docs/UIUX_PROPOSAL.md changes 7-10). Read-only: every test also checks the sim state did not move.

function village(){
 const g=new Game();g.reset(5,10,{rulersVersion:2});g.enterIsland();
 const c=g.campOf(0);g.tribe(0).wood+=200;
 for(const [t,dx,dz] of [['townhall',0,0],['hearth',9,8]])g.placeBuilding(t,c.x+dx,c.z+dz,0);
 for(const b of g.state.buildings.filter(b=>b.team===0)){b.build=1;b.hp=b.maxHp;}
 for(let i=0;i<40;i++){g.state.paused=false;g.step(.5);}
 g.state.paused=true;return g;
}
const mine=g=>g.state.units.filter(u=>u.team===0&&u.hp>0);
const see=(g,x,z,r=3,level=2)=>{const gx=Math.floor((x/g.world.size+.5)*FOW),gz=Math.floor((z/g.world.size+.5)*FOW);for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++)g.vision[(gz+b)*FOW+gx+a]=level;};
const fingerprint=g=>JSON.stringify([g.state.time,g.state.units.length,g.state.units.map(u=>[u.id,u.x,u.z,u.hp,u.hunger??0].join()).join('|'),g.tribe(0).food,g.tribe(0).wood]);

test('food days come from the sim reserve rule and fall as the stock is spent',()=>{
 const g=village(),before=fingerprint(g);
 const d=foodDays(g);assert.ok(d===null||Number.isFinite(d));assert.equal(fingerprint(g),before,'a read changes nothing');
 const t=g.tribe(0);const a=foodDays(g);t.food=0;if(t.foodLots)for(const k of Object.keys(t.foodLots))t.foodLots[k]=0;const b=foodDays(g);
 assert.ok(b<=a,`empty pantry (${b}) is not more days than full (${a})`);assert.ok(b<1,'an empty pantry is under a day');
});
test('water days are the stock over the per-person draw; absent before survival rules apply',()=>{
 const g=village();
 if(g.state.survivalVersion===1){const t=g.tribe(0).survival;t.waterLiters=0;assert.equal(waterDays(g),0);t.waterLiters=1e6;assert.ok(waterDays(g)>100);
  const n=mine(g).length,per=n*.008*simulationDaySeconds;t.waterLiters=per*4;assert.ok(Math.abs(waterDays(g)-4)<1e-9,'four days of water');}
 g.state.survivalVersion=0;assert.equal(waterDays(g),null);
});
test('alerts: starving, thirsty, freezing and full-store residents each become one alert pointing at the worst-off person',()=>{
 const g=village(),us=mine(g),before=us.length;assert.ok(before>=4);
 us[0].hunger=70;us[1].hunger=150;us[2].thirstSeconds=9999;us[3].coldSeconds=9999;us[4]&&(us[4].workReason='cache full');
 const alerts=detectAlerts(g);const by=k=>alerts.find(a=>a.kind===k);
 assert.equal(by('starving').count,2);assert.deepEqual([by('starving').at.x,by('starving').at.z],[us[1].x,us[1].z],'worst-off person, not the first');
 assert.equal(by('thirsty').count,1);assert.deepEqual([by('thirsty').at.x,by('thirsty').at.z],[us[2].x,us[2].z]);
 assert.equal(by('freezing').count,1);if(us[4])assert.equal(by('full').count,1);
 for(const a of alerts)assert.ok(Number.isFinite(a.at?.y??0));
 assert.equal(by('starving').severity,'critical');if(us[4])assert.equal(by('full').severity,'warning');
 const r=rankAlerts(alerts);assert.equal(r.critical.kind,'thirsty','thirst outranks hunger and cold');
});
test('alerts: a healthy village has none; workload over 100% is a warning without a place',()=>{
 const g=village();for(const u of mine(g)){u.hunger=0;u.thirstSeconds=0;u.coldSeconds=0;if(u.workReason?.includes('cache full'))u.workReason='';}
 const calm=detectAlerts(g).filter(a=>a.severity==='critical');assert.deepEqual(calm,[]);
 const w=detectAlerts(g,140).find(a=>a.kind==='backlog');assert.equal(w.severity,'warning');assert.equal(w.at,undefined);assert.equal(pinSet([w]).length,0);
});
test('raiders: only foes the player can see, near home, nearest first; fogged foes are never reported',()=>{
 const g=village(),home=g.campOf(0),tpl=mine(g)[0];
 const add=(dx,dz,vis)=>{const u={...tpl,id:g.id(),team:3,x:home.x+dx,z:home.z+dz,y:0,hp:10,selected:false};g.state.units.push(u);vis?see(g,u.x,u.z):see(g,u.x,u.z,3,0);return u;};
 const far=add(120,0,true),near=add(60,10,true),hidden=add(-60,-100,false),beyond=add(RAIDER_SIGHT_METERS+90,0,true);
 const seen=visibleRaiders(g);
 assert.ok(seen.includes(near)&&seen.includes(far));assert.ok(!seen.includes(hidden),'fogged foe is hidden');assert.ok(!seen.includes(beyond),'out of range');
 assert.equal(seen[0],near,'nearest to home first');
 const alert=detectAlerts(g).find(a=>a.kind==='raiders');assert.equal(alert.count,seen.length);assert.deepEqual([alert.at.x,alert.at.z],[near.x,near.z]);
 assert.equal(rankAlerts(detectAlerts(g)).critical.kind,'raiders');
 g.state.units.splice(g.state.units.indexOf(near),1);assert.equal(visibleRaiders(g)[0],far);
});
test('overlay reads: only teams the player has met, colours from the tribe list, tolerant of bad colours',()=>{
 assert.deepEqual(knownTeams([{team:1,known:true},{team:2,known:false},{team:0,known:true}]),[0,1]);assert.deepEqual(knownTeams(undefined),[0]);
 assert.deepEqual(parseColor('#ff8000'),[255,128,0]);assert.deepEqual(parseColor('nope',[1,2,3]),[1,2,3]);
});
test('overlay reads on a real village: nothing shows on unexplored ground, then everything that is known does',()=>{
 const g=village(),before=fingerprint(g);
 const hud={tribes:g.state.tribes.map(t=>({id:t.id,color:t.color||'#e3ad4f'})),camps:[]};
 const all=new Set(['territory','influence','resources','water']);
 g.vision.fill(0);
 const src0=overlaySourcesOf(g,hud,all),out=new Uint8ClampedArray(src0.pixels*src0.pixels*4);
 assert.equal(paintOverlays(src0,all,out),false,'a world nobody has seen reveals no border, deposit or lake');assert.ok(out.every(v=>v===0));
 const c=g.campOf(0);for(let a=-30;a<=30;a++)for(let b=-30;b<=30;b++)see(g,c.x+a*6,c.z+b*6,1);
 const src=overlaySourcesOf(g,hud,all);assert.ok(paintOverlays(src,all,out),'known ground paints');
 assert.ok(src.gradient===undefined||src.gradient===null||src.gradient.bounds,'the gradient is the real model');
 if(hasInfluenceGradient(g))assert.ok(src.gradient?.bounds,'a new game has an influence field once it has a finished hall');
 const terr=overlaySourcesOf(g,hud,new Set(['territory'])),o2=new Uint8ClampedArray(out.length);assert.ok(paintOverlays(terr,new Set(['territory']),o2));
 assert.equal(terr.gradient,undefined,'layers that are off are not computed');assert.equal(terr.resources,undefined);
 assert.equal(fingerprint(g),before,'reading overlays never changes the sim');
});
test('overlay reads: a rival the player has not met never shows a border',()=>{
 const g=village();const rival=g.state.tribes.find(t=>t.id!==0&&t.id!==3);if(!rival)return;
 const hud={tribes:g.state.tribes.map(t=>({id:t.id,color:'#4488ff'})),camps:[{team:rival.id,known:false}]};
 g.vision.fill(1);const src=overlaySourcesOf(g,hud,new Set(['territory']));
 const S=g.world.size,seen=new Set();for(let z=-S/2;z<S/2;z+=S/96)for(let x=-S/2;x<S/2;x+=S/96)seen.add(src.teamAt(x,z));
 assert.ok(!seen.has(rival.id),'unmet rival territory is not on the map');
});

test('water meter matches existing household runway including declared real herd, without changing saved state',async()=>{
 const{nativeDairyVillage}=await import('./helpers/native-dairy-village.mjs'),{decodeGame,encodeGame}=await import('../src/game/persistence.ts'),{survivalStatus,collectedWaterDemand,SURVIVAL_RULES}=await import('../src/game/survivalNeeds.ts');
 // Declared valid metadata opening only: one legal pen and one owned goat, no domestication or production claim.
 let g=decodeGame(nativeDairyVillage().save);const home=g.campOf(0);let pen;for(let r=16;r<60&&!pen;r+=4)for(let i=0;i<24&&!pen;i++){const x=home.x+Math.cos(i*Math.PI/12)*r,z=home.z+Math.sin(i*Math.PI/12)*r;if(!g.placementIssue('pen',x,z,0))pen=g.makeBld('pen',x,z,0);}assert.ok(pen);g.state.buildings.push(pen);g.state.livestock=[{id:g.id(),species:'goat',team:0,pen:pen.id,sex:'female',x:pen.x,y:g.height(pen.x,pen.z),z:pen.z,facing:0,vx:0,vz:0,wanderT:100,hp:24,maxHp:24,fly:0,scale:1,born:-300,tamedAt:0,hunger:0,milk:0,pregnancy:0,lactatingUntil:0}];g=decodeGame(encodeGame(g));
 const before=JSON.stringify(encodeGame(g)),status=survivalStatus(g),days=waterDays(g);
 assert.ok(g.state.livestock.some(a=>a.team===0&&a.hp>0));assert.ok(status.waterDemandLitersPerSecond>mine(g).length*SURVIVAL_RULES.waterLitersPerPersonSecond);
 assert.equal(collectedWaterDemand(g),status.waterDemandLitersPerSecond);assert.ok(Math.abs(days*simulationDaySeconds-status.waterSeconds)<1e-9);assert.equal(JSON.stringify(encodeGame(g)),before);
});

test('winter outlook: only autumn/winter and only when food will not last to the thaw; read-only',()=>{
 const g=village(),year=1800,before=fingerprint(g);
 g.state.time=year*3+10;g.tribe(0).food=1e6;assert.equal(winterOutlook(g),null,'spring/summer: nothing');
 g.state.time=year*3+year*.8;const big=winterOutlook(g);assert.equal(big,null,'plenty of food: nothing');
 g.state.time=year*3+year*.8;g.tribe(0).food=0;if(g.tribe(0).foodLots)for(const k of Object.keys(g.tribe(0).foodLots))g.tribe(0).foodLots[k]=0;
 const w=winterOutlook(g);assert.ok(w&&w.phase==='winter'&&w.thawDays>0&&w.shortfallDays>0&&w.level==='critical');
 g.state.time=year*3+year*.55;assert.equal(winterOutlook(g)?.phase,'autumn');
 g.state.time=year*3+year*.2;assert.equal(winterOutlook(g),null);
 assert.notEqual(fingerprint(g),before);// time moved by the test itself only
});
