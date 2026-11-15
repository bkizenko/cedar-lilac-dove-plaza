import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Headless layout contract: floating panels must start to the right of the left rail, and the top bar must stay clear of the rail.
const css=readFileSync(new URL('../src/ui/hearth/hearth.css',import.meta.url),'utf8');
const last=(n)=>{const a=[...css.matchAll(new RegExp(`--${n}:\\s*(\\d+)px`,'g'))];return +a[a.length-1][1];};
const edge=last('hw-edge'),railW=last('hw-rail-w'),gap=last('hw-rail-gap'),topH=last('hw-top-h'),railTop=last('hw-rail-top'),hit=last('hw-hit');
test('rail width token fits its buttons plus padding',()=>{
 assert.ok(railW>=hit+12,`rail ${railW} < button ${hit} + 12 padding`);
});
test('panel left (bottom cluster) is at or beyond the rail right edge',()=>{
 assert.match(css,/--hw-panel-left:calc\(var\(--hw-edge\) \+ var\(--hw-rail-w\) \+ var\(--hw-rail-gap\)\)/);
 assert.match(css,/@media \(min-width:761px\)\{\s*\.hw-bottom\{left:var\(--hw-panel-left\)\}/);
 assert.ok(edge+railW+gap>=edge+railW);
});
test('rail starts below the top bar',()=>{assert.ok(railTop>=topH+4);assert.match(css,/\.hw-rail\{position:absolute;left:var\(--hw-s3\);top:92px/);assert.equal(edge,12);});
test('selection card height is capped by viewport minus top bar and bottom reserve at every desktop size',()=>{
 assert.match(css,/\.hw-sel\{max-height:max\(160px,min\(66dvh,620px,calc\(100dvh - var\(--hw-top-h\) - var\(--hw-bottom-reserve\)/);
 const reserve=last('hw-bottom-reserve');
 for(const h of [720,900,1080,1440]){
  const cap=Math.max(160,Math.min(.66*h,620,h-topH-reserve-2*edge));
  assert.ok(h-cap-edge>=topH,`sel top clears top bar at height ${h}`);
 }
});
