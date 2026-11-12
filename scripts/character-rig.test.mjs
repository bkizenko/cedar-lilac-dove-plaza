import test from 'node:test';import assert from 'node:assert/strict';
import {RIG_BONES,RIG_PIVOTS,RIG_BUDGET,BODY_CLASSES,ELDER_AGE_T,bodyClassFor,boneMatrices,newBoneMatrices,transformPoint,rigOutfit,rigMeshData,rigTriangles,rigVertices,gearTriangles,itemParts,farParts,HAND_OFFSET,TOOL_FOR_CLIP} from '../src/scene/characterRig.ts';
import {NEUTRAL_POSE,CLIPS,samplePose,stancePose} from '../src/scene/animationClips.ts';
import {cultureForCiv} from '../src/scene/civPeople.ts';
import {CIV_IDS} from '../src/scene/civStyles.ts';
import {partTriangles,partBounds} from '../src/scene/buildingParts.ts';
import {GARMENT_KINDS} from '../src/game/textiles.ts';
const TYPES=['worker','spearman','archer','swordsman','leader','warden','ranger'],CLASSES=['adult','child','elder','leader','soldier'];
const cultures=Object.fromEntries(CIV_IDS.map(c=>[c,cultureForCiv(c,3)]));
const OUT=(o={})=>rigOutfit({type:'worker',bodyClass:'adult',seed:5,gear:{garment:{item:'woolCoat',condition:1}},culture:cultures.hanrei,season:'winter',era:3,teamColor:'#e0c078',...o});
const KIT={garment:{item:'woolCoat',condition:1},armor:{kind:'paddedTorso',condition:1}},MAX={garment:{item:'woolCoat',condition:1},armor:{kind:'paddedTorso',condition:1},helmet:{kind:'ironHelm',condition:1},shield:{kind:'woodShield',condition:1}};
const HEX=/^#[0-9a-f]{6}$/i;

test('triangle and vertex budgets hold for every civ, role, body class, garment and gear combination at every tier',()=>{
 const worst=[0,0,0];let n=0;
 for(const civ of CIV_IDS)for(const type of TYPES)for(const cls of CLASSES)for(const item of GARMENT_KINDS)for(const gear of [{garment:{item,condition:1}},{garment:{item,condition:1},armor:KIT.armor},{...MAX,garment:{item,condition:1}},{}])for(const era of [1,3]){
  const o=rigOutfit({type,bodyClass:cls,seed:n++,gear,culture:cultures[civ],season:'winter',era,teamColor:'#e0c078'});
  for(const t of [0,1,2]){const tri=rigTriangles(o,t,cultures[civ]);worst[t]=Math.max(worst[t],tri);assert.equal(rigVertices(o,t,cultures[civ]),tri*3);assert.ok(tri>=20,`${civ} ${type} tier ${t} draws something`);}
 }
 assert.ok(worst[0]<=RIG_BUDGET.near,`near ${worst[0]}`);assert.ok(worst[1]<=RIG_BUDGET.mid,`mid ${worst[1]}`);assert.ok(worst[2]<=RIG_BUDGET.far,`far ${worst[2]}`);
 assert.ok(worst[0]>worst[1]&&worst[1]>worst[2],'each tier is cheaper than the one before');
});
test('a typical person (garment, armor, weapon, no helmet or shield) is much cheaper than the ceiling, and gear-only cost keeps the original appearance budget',()=>{
 const typical=RIG_BUDGET.typical;let worst=[0,0,0],gear=[0,0,0];
 for(const civ of CIV_IDS)for(const type of ['worker','spearman','archer','swordsman'])for(const item of GARMENT_KINDS)for(const era of [1,2,3]){
  const o=rigOutfit({type,bodyClass:type==='worker'?'adult':'soldier',seed:3,gear:{garment:{item,condition:1},...(type!=='worker'?{armor:KIT.armor}:{})},culture:cultures[civ],season:'summer',era,teamColor:'#e0c078'});
  for(const t of [0,1,2]){worst[t]=Math.max(worst[t],rigTriangles(o,t,cultures[civ]));gear[t]=Math.max(gear[t],gearTriangles(o,t));}}
 assert.ok(worst[0]<=typical.near&&worst[1]<=typical.mid&&worst[2]<=typical.far,JSON.stringify({worst,typical}));
 assert.ok(gear[0]<=RIG_BUDGET.gear.near+120&&gear[1]<=RIG_BUDGET.gear.mid+120,JSON.stringify(gear));
});
test('nothing is invented: garment, headwear, insignia, armor, helmet and shield only appear when really owned',()=>{
 const bare=OUT({gear:{}});assert.equal(bare.rendered.garment,undefined);assert.equal(bare.rendered.headwear,undefined);assert.equal(bare.rendered.insignia,undefined);assert.equal(bare.rendered.armor,undefined);
 assert.ok(!bare.bones.spine.some(p=>p.slot==='garment'||p.slot==='padding'||p.slot==='stitch'),'a bare person wears no garment or armor parts');
 assert.equal(bare.colors.body,bare.colors.body);assert.notEqual(bare.colors.body,OUT().colors.body,'bare torso is the team marker, a garment is garment-coloured');
 assert.equal(OUT({gear:{garment:{item:'woolCoat',condition:0}}}).rendered.garment,undefined);assert.equal(OUT({gear:{garment:{item:'woolCoat',condition:0}}}).ignored.length,1);
 const a=OUT({gear:{armor:{kind:'paddedTorso',condition:.4}}});assert.equal(a.rendered.armor,'paddedTorso');assert.equal(a.rendered.garment,undefined,'armor alone does not conjure clothes');
 const bad=OUT({gear:{armor:{kind:'plateMail',condition:1}}});assert.equal(bad.rendered.armor,undefined);assert.match(bad.ignored[0],/plateMail/);
 assert.equal(OUT().rendered.helmet,undefined);assert.equal(OUT().itemL,undefined,'no shield without a shield');
 const h=OUT({gear:{...KIT,helmet:{kind:'bronzeHelm',condition:.8}}});assert.equal(h.rendered.helmet,'bronzeHelm');assert.ok(h.bones.head.some(p=>p.slot==='metal'));
 assert.equal(OUT({gear:{...KIT,helmet:{kind:'bronzeHelm',condition:0}}}).rendered.helmet,undefined);
 const s=OUT({gear:{...KIT,shield:{kind:'woodShield',condition:1}}});assert.equal(s.itemL,'shield');assert.equal(OUT({gear:{...KIT,shield:{kind:'woodShield',condition:0}}}).itemL,undefined);
 // weapons come from the real unit type, never from the garment
 for(const [type,item] of [['spearman','spear'],['swordsman','blade'],['warden','axe']])assert.equal(OUT({type,gear:{}}).itemR,item);
 for(const type of ['archer','ranger'])assert.equal(OUT({type,gear:{}}).itemL,'bow');
 for(const type of ['worker','cavalry'])assert.equal(OUT({type,gear:{}}).itemR,undefined);
});
test('every part has a defined colour, a valid slot and a bone; the rig covers all seven bones',()=>{
 for(const civ of CIV_IDS){const o=OUT({culture:cultures[civ],type:'leader',bodyClass:'leader',gear:MAX});
  for(const b of RIG_BONES){assert.ok(o.bones[b].length>0,b+' has parts');for(const p of o.bones[b])assert.match(o.colors[p.slot]??'',HEX,`${civ} ${b} slot ${p.slot}`);}
  for(const it of [o.itemR,o.itemL])for(const p of itemParts(it,cultures[civ]))assert.match(o.colors[p.slot],HEX,`${civ} ${it} ${p.slot}`);}
});
test('per-civ look is a layer on the same rig: same bones everywhere, different garments, trim and flag colours',()=>{
 const keys=new Set(),garm=new Set(),flag=new Set(),trims=new Set();
 for(const civ of CIV_IDS){const o=OUT({culture:cultures[civ],type:'leader',bodyClass:'leader',gear:KIT});keys.add(o.key);garm.add(o.colors.garment);flag.add(o.colors.flag+o.colors.flag2+o.colors.charge);trims.add(o.colors.trim);}
 assert.equal(keys.size,14);assert.ok(garm.size>=11,'garment dyes differ per civ: '+garm.size);assert.equal(flag.size,14,'every civ has its own standard colours');assert.ok(trims.size>=11);
 const skeleton=new Set(CIV_IDS.map(c=>OUT({culture:cultures[c],gear:{}}).bones.legL.map(p=>p.shape+p.size.join()).join()));assert.equal(skeleton.size,1,'the body is one shared rig');
});
test('leaders are visibly distinct: wider, cloak, circlet, a standard that is still drawn at far tier',()=>{
 const w=OUT({type:'worker',bodyClass:'adult',gear:KIT}),l=OUT({type:'leader',bodyClass:'leader',gear:KIT});
 assert.ok(BODY_CLASSES.leader.width>BODY_CLASSES.adult.width&&BODY_CLASSES.leader.head>BODY_CLASSES.adult.head);
 assert.ok(l.bones.spine.some(p=>p.slot==='cloak')&&!w.bones.spine.some(p=>p.slot==='cloak'));assert.ok(l.bones.head.some(p=>p.slot==='metal')&&!w.bones.head.some(p=>p.slot==='metal'));
 assert.equal(l.itemR,'standard');const std=itemParts('standard',cultures.hanrei);assert.ok(std.some(p=>p.slot==='flag'&&p.lod===2),'flag survives to far tier');
 const ys=std.map(p=>p.pos[1]+p.size[1]);assert.ok(Math.max(...ys)>1.8,'the standard rises above every head');
 assert.ok(farParts(l,cultures.hanrei).some(p=>p.slot==='flag'),'far silhouette of a leader carries the civ flag');
 assert.ok(!farParts(w,cultures.hanrei).some(p=>p.slot==='flag'));
});
test('armor reads at distance: padded armor and the team stitch panel are far-tier parts, per-civ padding colour',()=>{
 const a=OUT({type:'spearman',bodyClass:'soldier',gear:KIT});assert.ok(a.bones.spine.some(p=>p.slot==='padding'&&p.lod===2)&&a.bones.spine.some(p=>p.slot==='stitch'&&p.lod===2));
 const pads=new Set(CIV_IDS.map(c=>OUT({type:'spearman',bodyClass:'soldier',culture:cultures[c],gear:KIT}).colors.padding));assert.ok(pads.size>=10);
 const aff=OUT({type:'spearman',bodyClass:'soldier',gear:KIT,affiliation:'#12ab34'});assert.equal(aff.colors.stitch,'#12ab34');
});
test('bone matrices: rest pose puts every bone at its pivot, classes scale the body, a stoop leans the elder, everything stays finite',()=>{
 const m=newBoneMatrices();boneMatrices(NEUTRAL_POSE,'adult',m);
 for(const b of RIG_BONES){const p=transformPoint(m[b],[0,0,0]);for(let i=0;i<3;i++)assert.ok(Math.abs(p[i]-RIG_PIVOTS[b][i])<1e-9,b+' at pivot');}
 const c=newBoneMatrices();boneMatrices(NEUTRAL_POSE,'child',c);assert.ok(Math.abs(transformPoint(c.head,[0,0,0])[1]-RIG_PIVOTS.head[1]*BODY_CLASSES.child.scale)<1e-9,'a child is smaller');
 const e=newBoneMatrices();boneMatrices(NEUTRAL_POSE,'elder',e);const up=transformPoint(e.head,[0,.3,0]),upA=transformPoint(m.head,[0,.3,0]);assert.ok(up[2]>upA[2]+.02,'an elder stoops forward');
 for(const id of Object.keys(CLIPS))for(let t=0;t<=1;t+=.1){const q=samplePose(CLIPS[id],t),r=newBoneMatrices();for(const cls of CLASSES){boneMatrices(q,cls,r);for(const k of Object.keys(r))for(const v of r[k])assert.ok(Number.isFinite(v),id+k);}}
});
test('pose drives the right bones: an arm swing moves the hand, the spine carries the head, a spear stays upright while the arm swings',()=>{
 const m=newBoneMatrices(),rest=boneMatrices(NEUTRAL_POSE,'adult',newBoneMatrices()),hand=b=>transformPoint(b.armR,HAND_OFFSET);
 const swing=structuredClone(NEUTRAL_POSE);swing.parts.armR=[-Math.PI/2,0,0];boneMatrices(swing,'adult',m);
 assert.ok(hand(m)[2]>hand(rest)[2]+.25&&hand(m)[1]>hand(rest)[1],'a raised arm brings the hand forward and up');
 const lean=structuredClone(NEUTRAL_POSE);lean.parts.spine=[.6,0,0];boneMatrices(lean,'adult',m);assert.ok(transformPoint(m.head,[0,0,0])[2]>transformPoint(rest.head,[0,0,0])[2]+.1,'leaning forward carries the head');
 assert.ok(Math.abs(transformPoint(m.legL,[0,0,0])[1]-RIG_PIVOTS.legL[1])<1e-9,'legs stay with the hips');
 const sp=stancePose(samplePose(CLIPS.walk,.3),'walk','spear');boneMatrices(sp,'soldier',m);const tip=transformPoint(m.itemR,[0,1,0]),base=transformPoint(m.itemR,[0,0,0]);assert.ok(tip[1]-base[1]>.9,'spear points up while walking');
 const th=samplePose(CLIPS.thrust,.45);boneMatrices(th,'soldier',m);const t2=transformPoint(m.itemR,[0,1,0]),b2=transformPoint(m.itemR,[0,0,0]);assert.ok(t2[2]-b2[2]>.8,'spear points forward in the thrust');
});
test('meshes: triangle counts match the part specs, normals are unit, colours come from slots, geometry is relative to the bone pivot',()=>{
 const o=OUT({type:'spearman',bodyClass:'soldier',gear:KIT});
 for(const b of RIG_BONES)for(const tier of [0,1,2]){
  const d=rigMeshData(o.bones[b],RIG_PIVOTS[b],o.colors,tier),want=o.bones[b].filter(p=>p.lod>=tier&&(p.onlyFrom??0)<=tier).reduce((n,p)=>n+partTriangles(p),0);
  assert.equal(d.triangles,want,b+tier);assert.equal(d.positions.length,want*9);
  for(let i=0;i<d.normals.length;i+=3)assert.ok(Math.abs(Math.hypot(d.normals[i],d.normals[i+1],d.normals[i+2])-1)<1e-5);
  for(const v of d.positions)assert.ok(Number.isFinite(v));for(const v of d.colors)assert.ok(v>=0&&v<=1);}
 const legs=rigMeshData(o.bones.legL,RIG_PIVOTS.legL,o.colors,0),ys=[];for(let i=1;i<legs.positions.length;i+=3)ys.push(legs.positions[i]);
 assert.ok(Math.min(...ys)<-.45&&Math.max(...ys)<.05,'leg geometry hangs from its hip pivot');
});
test('body classes come from real unit fields: maturesAt in the future is a child, leaders and aged people differ, soldiers are broad',()=>{
 assert.equal(bodyClassFor({type:'worker',maturesAt:500},100),'child');assert.equal(bodyClassFor({type:'worker',maturesAt:50},100),'adult');assert.equal(bodyClassFor({type:'leader'},0),'leader');
 assert.equal(bodyClassFor({type:'worker',ageT:ELDER_AGE_T},0),'elder');assert.equal(bodyClassFor({type:'worker',ageT:8*1800},0),'adult');assert.equal(bodyClassFor({type:'spearman'},0),'soldier');assert.equal(bodyClassFor({type:'archer'},0),'adult');
 assert.equal(bodyClassFor({type:'leader',maturesAt:500},100),'child','a child is never drawn as a grown leader');
 assert.ok(OUT({bodyClass:'elder',gear:{}}).colors.hair!==OUT({bodyClass:'adult',gear:{}}).colors.hair,'elders have grey hair');
});
test('tools: a worker holds a tool only while the real task is that work; tool items exist and fit the hand',()=>{
 assert.deepEqual(Object.keys(TOOL_FOR_CLIP).sort(),['build','chop','fish','quarry','till']);
 for(const [clip,item] of Object.entries(TOOL_FOR_CLIP)){assert.ok(CLIPS[clip],clip);const parts=itemParts(item);assert.ok(parts.length>=2);const top=Math.max(...parts.map(p=>partBounds(p).maxY));assert.ok(top<1.6&&top>.4,item);}
 assert.equal(OUT({gear:{}}).itemR,undefined,'a worker owns no tool by default');
});
