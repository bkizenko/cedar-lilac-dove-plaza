// ARM-FIX-1: arms of the default people path (people v2) stay slender, in proportion and hung from the shoulder, in rest and mid-swing poses.
import test from 'node:test';import assert from 'node:assert/strict';
let THREE=null,L=null,R=null,S=null,K=null,A=null,Kit=null,B=null,C=null;
try{THREE=await import('three');L=await import('../src/scene/peopleLook.ts');R=await import('../src/scene/characterRig.ts');S=await import('../src/scene/civSkin.ts');K=await import('../src/scene/civPeople.ts');A=await import('../src/scene/animationClips.ts');Kit=await import('../src/scene/peopleKit.ts');B=await import('../src/scene/buildingParts.ts');C=await import('../src/scene/carvedMesh.ts');}catch{}
const skip=THREE?false:'three is not installed here (npm ci)';
const skins=()=>S.listSkins().filter(s=>s.id!=='neutral');
const ROLE_TYPE=[['child','worker','child'],['elder','worker','elder'],['farmer','worker','adult'],['hunter','archer','adult'],['smith','worker','adult'],['priest','worker','adult'],['ruler','leader','leader'],['soldier','spearman','soldier'],['scout','ranger','adult'],['merchant','worker','adult'],['worker','worker','adult']];
const outfit=(skin,type,cls,role,season,garment,gear={})=>{const look=L.lookForSkin(skin),culture=K.cultureForSkin(S.skinById(skin),7),ind=L.individualFor(look,culture.key,1234,cls);
 return R.rigOutfit({type,bodyClass:cls,seed:1,gear:{garment:{item:garment,condition:.9},...gear},culture,season,era:3,teamColor:'#a33',affiliation:'#a33',look,individual:ind,role,unitId:1234});};
const bbox=(p)=>{const mn=[9,9,9],mx=[-9,-9,-9];for(const t of C.shapeTriangles(p))for(const v0 of t){const v=B.rotatePoint?v0:v0;const r=p.rot?B.rotatePoint(v,p.rot):v;for(let i=0;i<3;i++){const x=r[i]+p.pos[i];mn[i]=Math.min(mn[i],x);mx[i]=Math.max(mx[i],x);}}return {mn,mx,w:mx[0]-mn[0],h:mx[1]-mn[1],d:mx[2]-mn[2]};};
const ARMS=['armL','armR'];
test('arm proportions constant: upper arm and forearm are similar in length, slender, hand small',{skip},()=>{
 const a=Kit.ARM;assert.ok(a.upperLen/a.foreLen>.9&&a.upperLen/a.foreLen<1.25);
 assert.ok(a.upperTop/a.upperLen<.6&&a.foreTop/a.foreLen<.5&&a.upperBot<=a.upperTop&&a.foreBot<=a.foreTop,'tapering limbs, not tubes');
 assert.ok(a.handLen<=a.foreLen*.6&&a.handW<=a.foreTop,'hand no wider than the forearm top');
 assert.ok(Math.abs(a.shoulderY-a.elbowY-a.upperLen)<.01&&Math.abs(a.elbowY-a.wristY-a.foreLen*Math.cos(a.foreTilt))<.01,'segments chain');
});
test('every civ, role, class, season: arm parts fit the arm (no ballooning), hand bounded, hung from the shoulder',{skip},()=>{
 let n=0;
 for(const s of skins())for(const season of ['summer','winter'])for(const [role,type,cls] of ROLE_TYPE){const g=season==='winter'?'hideCoat':'lightClothes',o=outfit(s.id,type,cls,role,season,g,type==='spearman'?{armor:{kind:'paddedTorso',condition:.8},shield:{kind:'woodShield',condition:.8}}:{});
  const look=L.lookForSkin(s.id),ax=Kit.armX(look.body);
  for(const bn of ARMS){const sd=bn==='armL'?-1:1;let ymin=9,ymax=-9;
   for(const p of o.bones[bn]){const b=bbox(p),tag=`${s.id} ${role} ${season} ${bn} ${p.shape} ${p.col}`;n++;
    assert.ok(b.w<=.135&&b.d<=.135,`${tag} part too wide ${b.w.toFixed(3)}x${b.d.toFixed(3)}`);
    assert.ok(b.h<=.2,`${tag} part too tall ${b.h.toFixed(3)}`);
    const cx=sd*(b.mn[0]+b.mx[0])/2;assert.ok(Math.abs(cx-ax)<=.04,`${tag} part off the arm line ${cx.toFixed(3)} vs ${ax.toFixed(3)}`);
    assert.ok(b.mn[1]>=.4&&b.mx[1]<=.9&&b.mn[2]>=-.08&&b.mx[2]<=.12,`${tag} outside the arm envelope y ${b.mn[1].toFixed(2)}..${b.mx[1].toFixed(2)} z ${b.mn[2].toFixed(2)}..${b.mx[2].toFixed(2)}`);
    ymin=Math.min(ymin,b.mn[1]);ymax=Math.max(ymax,b.mx[1]);
    if(p.col===o.colors.skin&&b.mx[1]<=.535&&p.lod<=1){assert.ok(b.w<=.075*look.body.hand+.001&&b.h<=.11&&b.d<=.09*look.body.hand+.001,`${tag} hand too big ${b.w.toFixed(3)} ${b.h.toFixed(3)} ${b.d.toFixed(3)}`);}}
   assert.ok(ymax-ymin>=.38&&ymax-ymin<=.5,`${s.id} ${role} arm length ${(ymax-ymin).toFixed(3)}`);}}
 assert.ok(n>1000);
});
test('arm width to length ratios per tier stay in bounds (upper, forearm, hand)',{skip},()=>{
 for(const s of skins().slice(0,8))for(const [role,type,cls] of ROLE_TYPE){const o=outfit(s.id,type,cls,role,'summer','lightClothes');
  const ps=o.bones.armR.map(p=>({p,b:bbox(p)})).filter(x=>x.p.lod>=2&&x.p.shape==='cylinder').sort((a,b)=>b.b.mx[1]-a.b.mx[1]);
  assert.equal(ps.length,2,'two always-drawn segments (upper arm, forearm) '+s.id+role);
  const [up,fo]=ps;assert.ok(up.b.h/fo.b.h>.95&&up.b.h/fo.b.h<1.3,'upper/forearm length '+s.id+role);
  for(const x of ps){const ratio=Math.max(x.b.w,x.b.d)/x.b.h;assert.ok(ratio>.28&&ratio<.62,`${s.id} ${role} width/length ${ratio.toFixed(2)}`);}
  assert.ok(fo.b.w<up.b.w+.002,'forearm slimmer than the upper arm');}
});
const arm=(pose,cls,bn)=>{const m=R.boneMatrices(pose,cls,R.newBoneMatrices());return m[bn];};
test('mid-swing poses: walk arms swing in opposition to the legs, hands stay out of the trunk and within reach',{skip},()=>{
 const o=outfit('civ:hanrei','worker','adult','worker','summer','lightClothes'),look=L.lookForSkin('civ:hanrei'),hand=R.HAND_OFFSET;
 for(const ph of [0,.125,.25,.5,.625,.75]){const p=A.samplePose(A.CLIPS.walk,ph);
  const dl=p.parts.armL[0]*p.parts.legL[0],dr=p.parts.armR[0]*p.parts.legR[0];assert.ok(dl<=1e-9&&dr<=1e-9,'arm opposes its leg at '+ph);assert.ok(p.parts.armL[0]*p.parts.armR[0]<=1e-9,'arms oppose each other');
  const m=R.newBoneMatrices();R.boneMatrices(p,'adult',m);
  for(const bn of ARMS){const tip=R.transformPoint(m[bn],[0,-.42,.05]),sh=R.transformPoint(m[bn],[0,0,0]);const len=Math.hypot(tip[0]-sh[0],tip[1]-sh[1],tip[2]-sh[2]);assert.ok(Math.abs(len-.4231)<.01,'rigid arm length '+len);
   const hp=R.transformPoint(m[bn],hand);assert.ok(Math.abs(hp[0])>=.1,`hand inside the trunk at ${ph} ${hp[0].toFixed(3)}`);}}
 // every clip: hand reach from the shoulder bounded (the arm never stretches) 
 for(const [id,clip] of Object.entries(A.CLIPS))for(let i=0;i<=8;i++){const p=A.samplePose(clip,i/8),m=R.newBoneMatrices();R.boneMatrices(p,'adult',m);
  for(const bn of ARMS){const h=R.transformPoint(m[bn],hand);assert.ok(h[1]<1.4&&h[1]>-.2,`${id} hand height ${h[1].toFixed(2)}`);}}
 void o;void look;
});
test('rest: the hand sits at the held-item socket, arms hang beside the trunk without crossing it',{skip},()=>{
 for(const s of skins()){const look=L.lookForSkin(s.id),F=Kit.frameOf(look.body),ax=Kit.armX(look.body);
  const m=R.boneMatrices(A.NEUTRAL_POSE,'adult',R.newBoneMatrices()),hp=R.transformPoint(m.armR,R.HAND_OFFSET);
  assert.ok(Math.abs(hp[0]-ax)<=.035,`${s.id} socket ${hp[0].toFixed(3)} vs hand line ${ax.toFixed(3)}`);
  assert.ok(ax-.034>=F.cw/2-.01,`${s.id} arm clear of the chest (arm inner edge ${(ax-.034).toFixed(3)} chest half ${(F.cw/2).toFixed(3)})`);}
});
test('arm geometry keeps its triangle count in budget (same part counts, no new tiers)',{skip},()=>{
 for(const s of skins())for(const [role,type,cls] of ROLE_TYPE){const o=outfit(s.id,type,cls,role,'winter','hideCoat',{armor:{kind:'paddedTorso',condition:.8},helmet:{kind:'ironHelm',condition:.8},shield:{kind:'woodShield',condition:.8}});
  for(const t of [0,1,2])assert.ok(R.rigTriangles(o,t,K.cultureForSkin(S.skinById(s.id),7))<=[R.RIG_BUDGET.near,R.RIG_BUDGET.mid,R.RIG_BUDGET.far][t],`${s.id} ${role} tier ${t}`);}
});
