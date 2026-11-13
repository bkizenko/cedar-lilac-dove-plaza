import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {IRRIGATION_PLAYER_RELEASE_READY} from '../src/game/irrigation.ts';
import {registerHooks} from 'node:module';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
registerHooks({resolve(s,c,next){try{return next(s,c);}catch(e){if(s.startsWith('.')||s.startsWith('file:'))for(const ext of ['.ts','.tsx']){const u=new URL(s+ext,c.parentURL);if(existsSync(u))return next(u.href,c);}throw e;}},load(url,c,next){if(url.endsWith('.tsx'))return{format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText};return next(url,c);}});
const {WaterControls}=await import('../src/ui/WaterControls.tsx');
test('unqualified passive irrigation has no public enable or dig controls and does not initialize state',()=>{
 assert.equal(IRRIGATION_PLAYER_RELEASE_READY,false);
 const game={state:{time:0},tribe:()=>({})},building={id:1,type:'farm',x:0,z:0,w:8,d:6};
 const before=JSON.stringify(game.state);
 assert.equal(renderToStaticMarkup(React.createElement(WaterControls,{game,building,refresh:()=>assert.fail('read must not mutate')})),'');
 assert.equal(JSON.stringify(game.state),before);
});
