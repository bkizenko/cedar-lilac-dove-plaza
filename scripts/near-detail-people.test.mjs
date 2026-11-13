import test from 'node:test';import assert from 'node:assert/strict';
import * as L from '../src/scene/peopleLook.ts';import * as R from '../src/scene/characterRig.ts';import * as S from '../src/scene/civSkin.ts';import * as K from '../src/scene/civPeople.ts';
import {NEAR_PEOPLE} from '../src/scene/peopleDetail.ts';
const skins=S.listSkins().filter(s=>s.id!=='neutral');
const mk=(skin,type,cls,role,id=1234,gear={})=>{const look=L.lookForSkin(skin),culture=K.cultureForSkin(skin,7),ind=L.individualFor(look,culture.key,id,cls);
 return {o:R.rigOutfit({type,bodyClass:cls,seed:1,gear:{garment:{item:'woolCoat',condition:.9},...gear},culture,season:'summer',era:3,teamColor:'#a33',affiliation:'#a33',look,individual:ind,role,unitId:id}),culture};};
const tri=({o,culture},t)=>R.rigTriangles(o,t,culture);
test('near people detail adds triangles at the near tier only and stays under RIG_BUDGET',()=>{
 let gain=0,n=0;
 for(const s of skins.slice(0,6))for(const [type,cls,role] of [['worker','adult','worker'],['worker','adult','farmer'],['worker','elder','elder'],['worker','child','child'],['spearman','soldier','soldier']]){
  NEAR_PEOPLE.enabled=false;const b=mk(s,type,cls,role),bt=[0,1,2].map(t=>tri(b,t));
  NEAR_PEOPLE.enabled=true;const a=mk(s,type,cls,role),at=[0,1,2].map(t=>tri(a,t));
  assert.ok(at[0]>=bt[0],`${s.id} ${role}`);assert.equal(at[1],bt[1],'mid unchanged');assert.equal(at[2],bt[2],'far unchanged');
  assert.ok(at[0]<=R.RIG_BUDGET.near,`${s.id} ${role} near ${at[0]}`);gain+=at[0]-bt[0];n++;
 }
 assert.ok(gain/n>=150,`mean near gain ${gain/n}`);
});
test('people detail is per-person: asymmetry and scars differ between individuals, and are deterministic',()=>{
 NEAR_PEOPLE.enabled=true;const s=skins[0],sig=id=>JSON.stringify(mk(s,'worker','adult','worker',id).o.bones.head.map(p=>[p.pos,p.rot,p.size]));
 assert.equal(sig(10),sig(10));const set=new Set();for(let i=0;i<12;i++)set.add(sig(100+i));assert.ok(set.size>=10,'faces differ');
});
test('hands carry four fingers and a thumb each at near tier, feet carry toes or straps',()=>{
 NEAR_PEOPLE.enabled=false;const b=mk(skins[0],'worker','adult','worker').o;NEAR_PEOPLE.enabled=true;const a=mk(skins[0],'worker','adult','worker').o;
 const d=bone=>a.bones[bone].length-b.bones[bone].length;assert.ok(d('armL')>=5&&d('armR')>=5,'fingers');assert.ok(d('legL')>=1&&d('legR')>=1,'toes or straps');assert.ok(a.bones.head.length-b.bones.head.length>=12,'face');
});
