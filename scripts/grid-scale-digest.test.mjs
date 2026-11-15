import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {Game} from '../src/game/sim.ts';
// Deterministic digest of nav grid + fog + territory + a short run for existing sizes. The EXPECTED values were
// captured on the code BEFORE the grids became size-derived; any change here means behaviour changed for an existing size.
function rng(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
export function digest(size){
 const real=Math.random;Math.random=rng(12345);
 try{
  const g=new Game();g.reset(4242,22,{size,layout:'pangaea'});g.enterIsland();g.rebuildWalk();
  for(let i=0;i<240;i++)g.step(.25);
  const h=createHash('sha256');
  h.update(Buffer.from(g.walk.buffer,g.walk.byteOffset,g.walk.byteLength));
  h.update(Buffer.from(g.vision.buffer,g.vision.byteOffset,g.vision.byteLength));
  h.update(Buffer.from(g.territory.buffer,g.territory.byteOffset,g.territory.byteLength));
  h.update(JSON.stringify(g.state.units.map(u=>[u.id,u.type,+u.x.toFixed(2),+u.z.toFixed(2)])));
  return {hash:h.digest('hex'),walk:g.walk.length,vision:g.vision.length};
 }finally{Math.random=real;}
}
const EXPECTED={1040:"1f2495ce5182c8326854d3997b9e0fecf32e285a3040782d386b6f653be643a1",2080:"6939e5d8a70c3fa472974a0af81a9963d53d1213ec74fb7cd0f9e0d03aec628d"};
for(const size of [1040,2080])test(`existing size ${size}: walk 520x520, fog 192x192, digest unchanged`,()=>{
 const d=digest(size);console.log('DIGEST',size,JSON.stringify(d));
 assert.equal(d.walk,520*520);assert.equal(d.vision,192*192);
 assert.equal(d.hash,EXPECTED[size]);
});
