import test from 'node:test';import assert from 'node:assert/strict';
import {resolveRenderStyle,parseRenderStyle,DEFAULT_RENDER_STYLE,isCarvedStyle} from '../src/scene/renderStyle.ts';
test('render style consumes the graphics.ts contract, defaults to current graphics, opt-in only',()=>{
 assert.equal(DEFAULT_RENDER_STYLE,'current');
 assert.equal(resolveRenderStyle('',null),'current');
 assert.equal(resolveRenderStyle('?render=bogus','nonsense'),'current');
 assert.equal(resolveRenderStyle('?render=h',null),'optionH');
 assert.equal(resolveRenderStyle('','optionH'),'optionH');
 assert.equal(resolveRenderStyle('','carvedH'),'current','only graphics.ts stored values are honoured');
 assert.equal(resolveRenderStyle('?render=current','optionH'),'current','query wins over stored preference');
 assert.equal(parseRenderStyle(undefined),null);assert.ok(isCarvedStyle('optionH'));assert.ok(!isCarvedStyle('current'));
});
