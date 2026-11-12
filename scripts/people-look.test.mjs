import test from 'node:test';import assert from 'node:assert/strict';
let THREE=null,L=null,R=null,S=null,Life=null,K=null;try{THREE=await import('three');L=await import('../src/scene/peopleLook.ts');R=await import('../src/scene/characterRig.ts');S=await import('../src/scene/civSkin.ts');Life=await import('../src/scene/peopleLife.ts');K=await import('../src/scene/civPeople.ts');}catch(e){THREE=null;}
const skip=THREE?false:'three is not installed here (npm ci)';
const skins=()=>S.listSkins().filter(s=>s.id!=='neutral');
const CLS=['adult','child','elder','leader'],TYPES=['worker','spearman','swordsman','archer','leader'],SEAS=['spring','summer','autumn','winter'];
const outfit=(skin,type,cls,role,season,garment,gear={})=>{const look=L.lookForSkin(skin),culture=K.cultureForSkin(skin,7),ind=L.individualFor(look,culture.key,1234,cls);
 return R.rigOutfit({type,bodyClass:cls,seed:1,gear:{garment:{item:garment,condition:.9},...gear},culture,season,era:3,teamColor:'#a33',affiliation:'#a33',look,individual:ind,role,unitId:1234});};
test('people v2: every registered skin has a valid look and identity is a pure function of saved ids (save round-trip)',{skip},()=>{
 for(const s of skins()){const look=L.lookForSkin(s);assert.ok(look&&look.body&&look.skin.length>=1,s.id);
  const k='c|'+s.id,a=L.individualFor(look,k,77,'adult'),b=L.individualFor(look,k,77,'adult');assert.deepEqual(a,b);assert.deepEqual(JSON.parse(JSON.stringify(a)),a);
  assert.notDeepEqual(L.individualFor(look,k,78,'adult'),a);
  for(const v of Object.values(a))if(typeof v==='number')assert.ok(Number.isFinite(v));}
});
test('people v2: budgets, finite geometry and determinism for every skin, class, role, season and garment',{skip},()=>{
 const roles=['child','elder','farmer','hunter','smith','priest','ruler','soldier','scout','merchant','worker'];let n=0;
 for(const s of skins())for(const season of SEAS){const g=season==='winter'?'hideCoat':season==='summer'?'lightClothes':'woolCoat';
  for(const type of TYPES)for(const cls of CLS){const role=roles[(n++)%roles.length];
   const o=outfit(s,type==='leader'?'leader':type,cls,role,season,g,{armor:{kind:'paddedTorso',condition:.8},helmet:{kind:'ironHelm',condition:.8},shield:{kind:'woodShield',condition:.8}});
   const again=outfit(s,type==='leader'?'leader':type,cls,role,season,g,{armor:{kind:'paddedTorso',condition:.8},helmet:{kind:'ironHelm',condition:.8},shield:{kind:'woodShield',condition:.8}});
   assert.equal(o.key,again.key);
   for(const tier of [0,1,2]){const tris=R.rigTriangles(o,tier,K.cultureForSkin(s,7));assert.ok(Number.isFinite(tris));for(const bn of R.RIG_BONES)for(const pt of o.bones[bn])for(const v of [...pt.pos,...pt.size])assert.ok(Number.isFinite(v),'NaN '+s.id);
    assert.ok(tris<=[R.RIG_BUDGET.near,R.RIG_BUDGET.mid,R.RIG_BUDGET.far][tier],`${s.id} ${type} ${cls} tier${tier} ${tris}`);}}}});
test('people v2: cultures are distinguishable by silhouette-defining choices (not recolours)',{skip},()=>{
 const sig=s=>{const l=L.lookForSkin(s);return [l.body.height.toFixed(2),JSON.stringify(l.cuts),JSON.stringify(l.head),JSON.stringify(l.hair.styles)].join('|');};
 const seen=new Map();for(const s of skins().filter(s=>s.id.startsWith('civ:'))){const k=sig(s);assert.ok(!seen.has(k),`${s.id} duplicates ${seen.get(k)}`);seen.set(k,s.id);}
});
test('people v2: life layer is deterministic, finite and small',{skip},()=>{
 const base={parts:{hips:[0,0,0],spine:[0,0,0],head:[0,0,0],armL:[0,0,0],armR:[0,0,0],legL:[0,0,0],legR:[0,0,0]},root:[0,0,0],rootRot:[0,0,0],itemR:[0,0,0],itemL:[0,0,0]};
 for(const clip of ['idle','walk','chop','craft'])for(let id=0;id<40;id++)for(let t=0;t<200;t+=3.7){const a=JSON.stringify(Life.lifePose(base,clip,t,id)),b=JSON.stringify(Life.lifePose(base,clip,t,id));assert.equal(a,b);
  for(const x of JSON.parse(a).parts.armL.concat(JSON.parse(a).parts.head,JSON.parse(a).parts.spine)){assert.ok(Number.isFinite(x));assert.ok(Math.abs(x)<1.6);}}
 for(let x=-3;x<3;x+=.13)assert.ok(Number.isFinite(Life.strikeEase(x)));
});
