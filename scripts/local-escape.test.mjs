import test from 'node:test';import assert from 'node:assert/strict';
import {localEscapeStep} from '../src/game/localEscape.ts';
// A narrow L passage has no direct line from its origin to the safe coarse cell.
function fixture(){
 const u={x:0,z:0,y:4,r:.3};let checks=0;
 const clear=(x,z)=>(Math.abs(z)<.35&&x>=-.1&&x<=3.1)||(Math.abs(x-3)<.35&&z>=-.1&&z<=3.1);
 const g={state:{time:0},navigationRevision:()=>1,travelHeight:()=>4,walkable:(x,z)=>Math.hypot(x-3,z-3)<.3,canStep:(_u,x,z)=>{checks++;return clear(x,z);}};
 return {g,u,clear,checks:()=>checks};
}
test('local recovery walks a bent corridor without crossing its walls',()=>{
 const {g,u,clear}=fixture();
 for(let i=0;i<30&&!g.walkable(u.x,u.z);i++){
  const p=localEscapeStep(g,u);assert.ok(p);assert.ok(clear(p.x,p.z));assert.ok(Math.hypot(p.x-u.x,p.z-u.z)<=.61);Object.assign(u,p);g.state.time+=.1;
 }
 assert.ok(g.walkable(u.x,u.z));
});
test('blocked searches are bounded and cached rather than retried every frame',()=>{
 const {g,u,checks}=fixture();g.walkable=()=>false;
 assert.equal(localEscapeStep(g,u),null);const first=checks();assert.ok(first<1000);
 assert.equal(localEscapeStep(g,u),null);assert.equal(checks(),first);
 g.state.time=3;localEscapeStep(g,u);assert.ok(checks()>first);
});
