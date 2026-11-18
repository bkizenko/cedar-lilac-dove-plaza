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
// 11-18: re-captured on main; grid sizes unchanged, the short-run unit positions moved with intended sim changes since the snapshot (e.g. raid party 3f70afe5).
const EXPECTED={1040:"12c32311c4846a868d52aa3177909ead98342fc968a11ce9662d615513af4069",2080:"69e911bcec2cfb4065c5d96b0ec55dbfc2b0492d1a68dc6996e3f1b074aa06fd"};
for(const size of [1040,2080])test(`existing size ${size}: walk 520x520, fog 192x192, digest unchanged`,()=>{
 const d=digest(size);console.log('DIGEST',size,JSON.stringify(d));
 assert.equal(d.walk,520*520);assert.equal(d.vision,192*192);
 assert.equal(d.hash,EXPECTED[size]);
});
