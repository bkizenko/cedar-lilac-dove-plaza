import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {IRRIGATION_PLAYER_RELEASE_READY} from '../src/game/irrigation.ts';
import {WaterControls} from '../src/ui/WaterControls.tsx';
test('unqualified passive irrigation has no public enable or dig controls and does not initialize state',()=>{
 assert.equal(IRRIGATION_PLAYER_RELEASE_READY,false);
 const game={state:{time:0},tribe:()=>({})},building={id:1,type:'farm',x:0,z:0,w:8,d:6};
 const before=JSON.stringify(game.state);
 assert.equal(renderToStaticMarkup(React.createElement(WaterControls,{game,building,refresh:()=>assert.fail('read must not mutate')})),'');
 assert.equal(JSON.stringify(game.state),before);
});
