import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import {createHash} from 'node:crypto';import {PersonMethodProfile} from '../src/game/personMethodProfile.ts';import {decodeGame,gameSnapshot} from '../src/game/persistence.ts';import {terrainWalkCacheStats} from '../src/game/terrainWalkCache.ts';
class Board{assign(g,u){return this.refresh(g,u);}refresh(g,u){return u+1;}labelNavigation(){return 17;}}
class Fake{constructor(){this.workBoard=new Board();}steer(u){return u+2;}workerAI(u){return this.steer(u);}interactionSpot(){throw Error('original');}nearestWalk(){return this;}}
test('per-instance this/return/throw semantics, exact restoration and unrelated prototype identity',()=>{
 let clock=0;const p=new PersonMethodProfile(()=>clock++),a=new Fake(),b=new Fake(),before={steer:a.steer,worker:a.workerAI,board:a.workBoard.assign};p.setEnabled(true,a);
 assert.notEqual(a.steer,b.steer);assert.equal(b.steer,before.steer);assert.equal(a.workerAI(4),6);assert.equal(a.nearestWalk(),a);assert.throws(()=>a.interactionSpot(),/original/);
 let rows=p.report().methods;assert.equal(rows.find(x=>x.method==='Game.workerAI').selfTotalMs,2);assert.equal(rows.find(x=>x.method==='Game.workerAI').totalMs,3);assert.equal(rows.find(x=>x.method==='Game.steer').totalMs,1);
 assert.equal(a.workBoard.assign(a,4),5);p.setEnabled(false);assert.equal(a.steer,before.steer);assert.equal(a.workerAI,before.worker);assert.equal(a.workBoard.assign,before.board);assert.equal(Object.hasOwn(a,'steer'),false);
 const count=p.report().methods.reduce((n,r)=>n+r.calls,0);a.workerAI(8);assert.equal(p.report().methods.reduce((n,r)=>n+r.calls,0),count);
});
test('replacement game/workboard, own descriptors, outsider replacement, bounded samples and disposal',()=>{
 let clock=0;const p=new PersonMethodProfile(()=>clock++),a=new Fake(),b=new Fake(),own=()=>41;Object.defineProperty(a,'steer',{value:own,configurable:true,writable:false,enumerable:true});const descriptor=Object.getOwnPropertyDescriptor(a,'steer');p.setEnabled(true,a);for(let i=0;i<400;i++)a.steer();assert.equal(p.report().methods[0].inclusive.samples,240);
 p.attach(b);assert.deepEqual(Object.getOwnPropertyDescriptor(a,'steer'),descriptor);const oldBoard=b.workBoard,assign=Board.prototype.assign;b.workBoard=new Board();p.attach(b);assert.equal(oldBoard.assign,assign);assert.notEqual(b.workBoard.assign,assign);
 const replacement=()=>79;b.steer=replacement;p.dispose();assert.equal(b.steer,replacement);assert.equal(b.workBoard.assign,assign);assert.equal(p.enabled,false);p.reset();assert.deepEqual(p.report().methods,[]);
});
const file='/tmp/hearthwild-owned-UI-V18-100-residents-60-buildings.json';
test('actual100/60 Game.step state/RNG/cache parity with probes on/off and after restoration',{skip:!existsSync(file)},()=>{
 const data=JSON.parse(readFileSync(file,'utf8')),original=Math.random,runs=[],hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
 try{for(const mode of['off','on','on','off']){let seed=71,draws=0;Math.random=()=>{draws++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};const g=decodeGame(structuredClone(data));g.quality='low';g.state.paused=false;g.state.speed=1;const sampler={height:g.height,waterAt:g.waterAt,travelHeight:g.travelHeight},originalSteer=g.steer,p=new PersonMethodProfile();p.setEnabled(mode==='on',g);g.rebuildWalk();g.rebuildWalk();const primed=terrainWalkCacheStats(g);assert.ok(primed.builds>=1&&primed.hits>=2,'exercise actual static cache hits with probes active');const marks=[];
 for(let i=1;i<=180;i++){g.step(1/30);if(i%30===0)marks.push([i,hash(gameSnapshot(g)),seed,draws,terrainWalkCacheStats(g)]);}
 assert.deepEqual({height:g.height,waterAt:g.waterAt,travelHeight:g.travelHeight},sampler);assert.deepEqual(g.simulationErrors,[]);assert.ok(g.state.time>=5.99);
 if(mode==='on'){assert.ok(p.report().methods.some(r=>r.method==='Game.steer'&&r.calls>0));assert.ok(p.report().methods.some(r=>r.method==='WorkBoard.labelNavigation'&&r.calls>0));}
 p.dispose();assert.equal(g.steer,originalSteer);const count=p.report().methods.reduce((n,r)=>n+r.calls,0);g.step(1/30);assert.equal(p.report().methods.reduce((n,r)=>n+r.calls,0),count);
 runs.push({marks,final:hash(gameSnapshot(g)),seed,draws,cache:terrainWalkCacheStats(g)});
 }for(const r of runs.slice(1))assert.deepEqual(r,runs[0]);}finally{Math.random=original;}
});
