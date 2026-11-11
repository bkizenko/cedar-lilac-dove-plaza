import test from 'node:test';import assert from 'node:assert/strict';
import {resolveRenderStyle,parseRenderStyle,DEFAULT_RENDER_STYLE} from '../src/scene/renderStyle.ts';
test('render style defaults to the current classic graphics and is opt-in only',()=>{
 assert.equal(DEFAULT_RENDER_STYLE,'classic');
 assert.equal(resolveRenderStyle('',null),'classic');
 assert.equal(resolveRenderStyle('?render=bogus','nonsense'),'classic');
 assert.equal(resolveRenderStyle('?render=h',null),'carvedH');
 assert.equal(resolveRenderStyle('','carvedH'),'carvedH');
 assert.equal(resolveRenderStyle('?render=classic','carvedH'),'classic','query wins over stored preference');
 assert.equal(parseRenderStyle(undefined),null);
});
