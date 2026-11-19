import test from 'node:test';
import assert from 'node:assert/strict';
import {lifeEventSfx,watchLifeCues} from '../src/ui/lifeEventCue.ts';
import {isLossBanner} from '../src/ui/hearth/glanceModel.ts';
test('trade landings chime, cargo taken on the road sounds low and reads as loss',()=>{
 assert.equal(lifeEventSfx('Your party is home: good terms. 12 food delivered.'),'trade');
 assert.equal(lifeEventSfx('Traders from the Kel arrived on foot, offering 4 stone for 6 food.'),'trade');
 assert.equal(lifeEventSfx('Raiders took 6 food from the unarmed party'),'lose');assert.equal(isLossBanner('Raiders took 6 food from the unarmed party'),true);
 assert.equal(lifeEventSfx('A daughter was born'),null);
});
test('only new player chronicle lines cue, even after the capped chronicle shifts',()=>{
 const g={state:{lifeHistory:[{team:0,text:'Your party is home: x. 3 food delivered.',time:1}]}},w={};
 assert.deepEqual(watchLifeCues(g,w),[],'learned on first look');
 g.state.lifeHistory.push({team:1,text:'Traded 3 wood for 2 food with us.',time:2},{team:0,text:'Raiders took 2 food from the unarmed party',time:3});
 assert.deepEqual(watchLifeCues(g,w),['lose']);assert.deepEqual(watchLifeCues(g,w),[]);
 g.state.lifeHistory.shift();g.state.lifeHistory.shift();g.state.lifeHistory.shift();g.state.lifeHistory.push({team:0,text:'Traders from the Kel arrived by sea.',time:4});
 assert.deepEqual(watchLifeCues(g,w),['trade']);
});
