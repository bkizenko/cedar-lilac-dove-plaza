import test from 'node:test';
import assert from 'node:assert/strict';
import {workdayAt} from '../src/game/daylight.ts';
import {GameAudio} from '../src/game/audio.ts';

test('seasonal adult work windows cover sixteen to eighteen hours, including lamplit winter hours',()=>{
 for(let t=0;t<1800;t+=30){const shift=workdayAt(t,12);assert.ok(shift.hours>=16&&shift.hours<=18);assert.ok(shift.working);assert.equal(workdayAt(t,shift.start-.01).working,false);assert.equal(workdayAt(t,shift.start).working,true);assert.equal(workdayAt(t,shift.end).working,false);}
 assert.ok(workdayAt(550,12).hours>workdayAt(1450,12).hours+1.5);
});
test('fishing ambience is soft, unpitched and rate-limited across many fishers',()=>{
 const a=new GameAudio(),noise=[],tones=[];a.ctx={currentTime:0};a.noiseBurst=(...args)=>noise.push(args);a.tone=(...args)=>tones.push(args);
 a.play('fish');for(let i=0;i<100;i++){a.ctx.currentTime=i*.02;a.play('fish');}
 assert.equal(noise.length,1);assert.equal(tones.length,0);assert.ok(noise[0][1]<.02);
 a.ctx.currentTime=2.5;a.play('fish');assert.equal(noise.length,2);a.play('horn');assert.equal(tones.length,3,'background work never suppresses warnings');
});
test('sound voices fade in from silence and disconnect completed noise nodes',()=>{
 const a=new GameAudio(),events=[],nodes=[];
 function node(){const n={gain:{setValueAtTime:(...v)=>events.push(['start',...v]),linearRampToValueAtTime:(...v)=>events.push(['attack',...v]),exponentialRampToValueAtTime(){},setTargetAtTime(){}},frequency:{},detune:{},connect(){},disconnect(){this.disconnected=true;},start(){},stop(){}};nodes.push(n);return n;}
 a.ctx={currentTime:2,createOscillator:node,createGain:node,createBiquadFilter:node,createBufferSource:node};a.sfx=node();a.noise={};
 a.tone(320,.08);a.noiseBurst(.28,.018,650);assert.equal(events.filter(e=>e[0]==='start'&&e[1]===0).length,2);assert.equal(events.filter(e=>e[0]==='attack'&&e[2]>2).length,2);
 for(const n of nodes)if(n.onended)n.onended();assert.ok(nodes.slice(1).every(n=>n.disconnected));
});
