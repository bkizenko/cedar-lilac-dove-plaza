import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../src/scene/world.ts',import.meta.url),'utf8');
test('Option H adapter is opt-in (carved only by style or query), legacy current stays switchable, and never takes terrain-laid or fort buildings',()=>{
 assert.match(src,/renderStyle:'current'\|'carved'=this\.styleId==='current'\?'current':'carved'/,'render style derives from the style id; legacy current stays selectable');
 assert.match(src,/get\('renderStyle'\)==='carved'/,'optionH query opt-in stays');
 for(const t of['farm','pen','trench','moat','bridge','lumber'])assert.match(src,new RegExp("CARVED_KEEP_CURRENT=new Set<string>\\(\\[[^\\]]*'"+t+"'"),t+' keeps the current renderer');
 assert.match(src,/!modular&&!b\.bridge&&!fort/,'modular, bridge and fort buildings keep exact legacy placement');
 assert.match(src,/hearthHeating\(game,b\.id\)/,'hearth lit state comes from survivalNeeds.hearthHeating');
 assert.match(src,/buildingQuarterTurns\(b\)\*Math\.PI\/2/,'quarter-turn yaw is preserved');assert.match(src,/progress:ys/,'build progress is preserved');
});
