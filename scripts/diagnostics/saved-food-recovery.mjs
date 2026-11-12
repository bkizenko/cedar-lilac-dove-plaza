// Read a copy exported by the player. Never write the supplied save or commit it.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {decodeGame,encodeGame} from '../../src/game/persistence.ts';
const [input,output]=process.argv.slice(2);assert.ok(input&&output);
const bytes=readFileSync(input),hash=b=>createHash('sha256').update(b).digest('hex');
const g=decodeGame(JSON.parse(bytes));
const initial=g.state.production.projects.filter(p=>p.team===0&&p.phase==='paused'&&/^Direct order paused paid work/.test(p.blockedReason));
const before={time:g.state.time,weather:g.state.weather,auto:g.state.autoWorkEnabled,paused:initial.map(p=>({id:p.id,recipe:p.recipe,progress:p.progress})),produced:g.state.production.metrics.edibleFoodProduced||0,readyProduced:g.state.simulationEvents?.totals['ready_food_produced:0:food']||0,people:g.state.units.filter(u=>u.team===0&&u.hp>0).length};
g.state.paused=false;
const end=g.state.time+90;for(let i=0;g.state.time<end&&i<10000;i++){g.step(.1);assert.deepEqual(g.simulationErrors,[]);}
const after={time:g.state.time,weather:g.state.weather,auto:g.state.autoWorkEnabled,produced:g.state.production.metrics.edibleFoodProduced||0,readyProduced:g.state.simulationEvents?.totals['ready_food_produced:0:food']||0,people:g.state.units.filter(u=>u.team===0&&u.hp>0).length,readyStock:g.tribe(0).foodLots,projects:initial.map(old=>{const p=g.state.production.projects.find(p=>p.id===old.id);return {id:old.id,recipe:old.recipe,phase:p?.phase,progress:p?.progress,reason:p?.blockedReason};})};
assert.ok(after.projects.some(p=>p.phase!=='paused'),'at least one original interrupted job recovers');
assert.ok(after.produced>before.produced,'real meals delivered');
assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
assert.equal(hash(readFileSync(input)),hash(bytes));
const report={scope:'90 seconds of ordinary simulation on a separate exported real village copy; original weather, navigation, actors, stocks and Auto work; no repair grants, teleport, forced completions or saved-state overwrite',inputSha256:hash(bytes),sourceUnchanged:true,simulationSeconds:after.time-before.time,before,after};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
