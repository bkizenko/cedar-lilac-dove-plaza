import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {riverCoherence,regionalCoherence,landformCoherence,LANDFORM_COHERENCE_RULES} from '../src/game/landformCoherence.ts';

const world=(rivers=[{pts:[{x:-150,z:0},{x:0,z:5},{x:150,z:0}],w:8}])=>({size:400,heights:new Float32Array(4),rivers,biomes:[],baseWaterY:0,waterY:0});
const zc=(x)=>x<=0?5*(x+150)/150:5*(150-x)/150;
function valley({bump=0,sea=true}={}){
  const surf=(x)=>4-x*.01+(x>0&&x<20?bump*(x/20):x>=20&&x<40?bump*(1-(x-20)/20):0);
  return{
    height:(x,z)=>sea&&x>155?-3:Math.abs(x)<=150&&Math.abs(z-zc(x))<4?surf(x)-1.5:5+Math.abs(z-zc(x))*.25-x*.01,
    surface:(x,z)=>sea&&x>155?0:Math.abs(x)<=150&&Math.abs(z-zc(x))<4?surf(x):-10,
  };
}

test('a valley river that only falls, stays in its banks and reaches the sea is coherent',()=>{
  const [r]=riverCoherence(world(),valley());
  assert.equal(r.rises,0);assert.equal(r.mouth,'open-water');assert.ok(r.containedFraction>.95,String(r.containedFraction));
  assert.equal(r.dryBedFraction,0);assert.ok(r.dropMetres>2.9&&r.dropMetres<3.1,String(r.dropMetres));assert.ok(r.sinuosity>1&&r.sinuosity<1.01);
  // orientation is inferred from the water surface, not point order
  const [rev]=riverCoherence(world([{pts:[{x:150,z:0},{x:0,z:5},{x:-150,z:0}],w:8}]),valley());assert.equal(rev.mouth,'open-water');assert.equal(rev.rises,0);
});

test('uphill reaches, dead ends and spilling banks are reported',()=>{
  const [up]=riverCoherence(world(),valley({bump:1.2}));assert.ok(up.rises>0&&up.riseMetres>.8,JSON.stringify(up));
  const [dead]=riverCoherence(world(),valley({sea:false}));assert.equal(dead.mouth,'dead-end');
  const flat={height:(x,z)=>Math.abs(z-zc(x))<4?2:3.9-x*.01,surface:(x,z)=>Math.abs(z-zc(x))<4?4-x*.01:-10};
  const [spill]=riverCoherence(world(),flat);assert.ok(spill.containedFraction<.05,String(spill.containedFraction));
});

test('regional coherence separates contiguous habitats from speckle and checks relief agrees with the label',()=>{
  const w=world([]),high=(x,z)=>x>0?10+Math.sin(x*.9)*3+Math.cos(z*.7)*3:10;
  const halves=regionalCoherence(w,{height:high,surface:()=>-10,habitat:(x)=>x>0?'hills':'plains'});
  assert.equal(halves.speckledFraction,0);assert.equal(halves.fragmentPatches,0);assert.equal(halves.habitats.hills.patches,1);assert.equal(halves.hillsRougherThanPlains,true);
  const n=LANDFORM_COHERENCE_RULES.regionGrid,kinds=['plains','forest','hills'];let s=7;const salt=new Map();
  const noise=regionalCoherence(w,{height:()=>10,surface:()=>-10,habitat:(x,z)=>{const k=`${Math.floor((x/400+.5)*n)},${Math.floor((z/400+.5)*n)}`;if(!salt.has(k)){s=(s*48271)%2147483647;salt.set(k,kinds[s%3]);}return salt.get(k);}});
  assert.ok(noise.speckledFraction>.1,String(noise.speckledFraction));assert.ok(noise.fragmentCellFraction>.3,String(noise.fragmentCellFraction));
});

test('current generator: deterministic, fast, well-formed report',()=>{
  const g=new Game();g.reset(1,24,{size:1040,layout:'pangaea'});const t=performance.now(),a=landformCoherence(g.world),ms=performance.now()-t;
  assert.ok(ms<500,`${ms}ms`);assert.deepEqual(landformCoherence(g.world),a);assert.ok(a.rivers.length>0);
  for(const r of a.rivers){assert.ok(['open-water','confluence','map-edge','dead-end'].includes(r.mouth));assert.ok(r.containedFraction>=0&&r.containedFraction<=1);assert.ok(r.dropMetres>=0);}
  assert.ok(a.regions.landCells>0);assert.ok(a.regions.speckledFraction<.05,String(a.regions.speckledFraction));
});
