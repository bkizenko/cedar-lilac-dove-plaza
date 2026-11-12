import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../src/scene/world.ts',import.meta.url),'utf8');
test('Option H adapter is opt-in, default current, and never takes terrain-laid or fort buildings',()=>{
 assert.match(src,/renderStyle:'current'\|'carved'='current'/,'default render style stays current');
 for(const t of['farm','pen','gate','palisade','stonewall','trench','moat','dock','warehouse','bridge'])assert.match(src,new RegExp("CARVED_KEEP_CURRENT=new Set<string>\\(\\[[^\\]]*'"+t+"'"),t+' keeps the current renderer');
 assert.match(src,/!modular&&!b\.bridge&&!fort/,'modular, bridge and fort buildings keep exact legacy placement');
 assert.match(src,/hearthHeating\(game,b\.id\)/,'hearth lit state comes from survivalNeeds.hearthHeating');
 assert.match(src,/buildingQuarterTurns\(b\)\*Math\.PI\/2,progress:ys/,'quarter-turn yaw and build progress are preserved');
});
