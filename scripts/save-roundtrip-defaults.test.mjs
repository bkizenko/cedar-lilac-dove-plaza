// "Every persisted field has a load default": a field added to the game state must never make an older save unloadable.
// For each field that a real save carries, delete it from every entity and require the save to still load, unless the
// field is on the explicit allowlist of fields that genuinely cannot be absent. A NEW field failing here means:
// give it a default in persistence.ts (treat `undefined` as the default) rather than adding it to the allowlist.
import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame,validateGameSave,REQUIRED_STATE_FIELDS} from '../src/game/persistence.ts';
import {jsonCopy} from './save-roundtrip-helpers.mjs';

// Fields that the loader legitimately requires today (identity, geometry, core vitals, and referential structure).
// Frozen from the audited save v17 shape; shrink this list, never grow it casually.
const REQUIRED={
  units:['id','kind','x','y','z','team','type','hp','maxHp','speed','range','dmg','rof','cd','r','vx','vz','facing','tx','tz','gatherT','carry','wanderT','aggroT','stride','tradeTeam','ageT','stuckT','pillage','stature','tint','order','node','target'],
  buildings:['id','kind','x','y','z','team','type','hp','maxHp','w','d','cd','build','queue','rally'],
  trees:['id','kind','x','y','z','amount','maxAmt','regenT','scale','rich'],
  tribes:['id','name','food','wood','stone','copper','iron','age','aggro','expand','tech','lastRaid','thinkT','tradeCd','tension','tensionBand','spears','bows','blades','fallenT'],
  wildlife:['id','kind','x','y','z','hp','maxHp','facing','vx','vz','wanderT','fly','scale','species'],
};
// Fields whose presence is coupled to a version flag or a sibling field in the same save. Removing only one of the pair
// is an inconsistent save (the flag says the data exists), which is genuine corruption, not a missing default.
const COUPLED_STATE=['slopeModel','finiteRaiderCampVersion','worldgenVersion','worldOptions','animalBehaviourVersion','wildPlantVersion','sheepVersion'];
const COUPLED={tribes:['cultivated','survival'],wildlife:['fleece']};
function richSave(){
  const g=new Game();g.reset(31,21,{size:1040,layout:'pangaea',rulersVersion:2});g.enterIsland();g.state.paused=false;g.state.conflict='dangerous';g.state.raidT=30;
  const c=g.campOf(0);for(let i=0;i<4;i++){const u=g.spawnUnit('spearman',c.x+3+i,c.z+8,0);u.militia=true;}g.callToArms();
  for(let i=0;i<1200;i++)g.step(.25);
  return jsonCopy(encodeGame(g));
}
const raw=richSave();
const loads=(r)=>{try{validateGameSave(jsonCopy(r));return true;}catch(e){return e.message;}};
test('the saved sample itself loads (precondition)',()=>{assert.equal(loads(raw),true);decodeGame(jsonCopy(raw));});
test('every blank() state field outside the frozen required list loads from an older save that lacks it',()=>{
  const missing=[];
  for(const k of Object.keys(raw.state)){
    if(REQUIRED_STATE_FIELDS.includes(k)||COUPLED_STATE.includes(k))continue;
    const r=jsonCopy(raw);delete r.state[k];const ok=loads(r);
    if(ok!==true)missing.push(`${k}: ${ok}`);
  }
  assert.deepEqual(missing,[],'optional top-level state fields must load when absent:\n'+missing.join('\n'));
});
test('every blank() default field is recorded in REQUIRED_STATE_FIELDS or fills in on load',()=>{
  const r=jsonCopy(raw);const blank=Object.keys(Game.prototype.blank(0));
  for(const k of blank){const c=jsonCopy(raw);delete c.state[k];const ok=loads(c);
    if(COUPLED_STATE.includes(k))continue;
    if(REQUIRED_STATE_FIELDS.includes(k))assert.notEqual(ok,true,k+' is listed required yet loads without it');
    else assert.equal(ok,true,k+' is a new blank() field but an older save without it is rejected: '+ok);}
  void r;
});
for(const [coll,list] of [['units',REQUIRED.units],['buildings',REQUIRED.buildings],['trees',REQUIRED.trees],['tribes',REQUIRED.tribes],['wildlife',REQUIRED.wildlife]])
  test(`${coll}: every optional per-entity field loads when absent (new fields need a default)`,()=>{
    const names=new Set();for(const e of raw.state[coll])for(const k of Object.keys(e))names.add(k);
    const bad=[];
    for(const f of names){
      if(list.includes(f)||(COUPLED[coll]||[]).includes(f))continue;
      const c=jsonCopy(raw);for(const e of c.state[coll])delete e[f];
      const ok=loads(c);if(ok!==true)bad.push(`${coll}.${f}: ${ok}`);
    }
    assert.deepEqual(bad,[],`fields rejected when absent (add a default in persistence.ts):\n`+bad.join('\n'));
  });
test('a non-finite top-level timer is repaired, a non-finite clock is a specific named rejection',()=>{
  const r=jsonCopy(raw);r.state.eventT=null;assert.equal(loads(r),true);
  const c=jsonCopy(raw);c.state.time=null;assert.match(String(loads(c)),/non-finite state\.time/);
});
test('a rejection names the check and never a person: reason text is specific',()=>{
  const c=jsonCopy(raw);c.state.units[0].hp=null;const m=String(loads(c));
  assert.match(m,/damaged or incompatible \(.+\)/);assert.match(m,/hp/);
});
