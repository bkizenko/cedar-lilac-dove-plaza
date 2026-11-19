import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildLockReason} from '../src/ui/buildLockReason.ts';
test('locked build entry names the one missing thing from the real cost and housing checks',()=>{
 assert.equal(buildLockReason({wood:20,stone:5},{wood:20,stone:5}),null,'affordable entry is not locked');
 assert.equal(buildLockReason({wood:20,stone:5},{wood:12,stone:0}),'Needs 8 more logs','first short good only');
 assert.equal(buildLockReason({stone:5},{stone:2.4}),'Needs 3 more stone');
 assert.equal(buildLockReason({seeds:4},{}),'Needs 4 more seeds');
 assert.equal(buildLockReason({wood:20},{wood:0},'Finish one home before others copy it'),'Finish one home before others copy it','housing issue outranks stock');
 assert.equal(buildLockReason({},{}, null),null);
});
test('Hearth and Classic build menus both render the lock line at 16px or larger',()=>{
 const hearth=readFileSync(new URL('../src/ui/hearth/parts.tsx',import.meta.url),'utf8'),classic=readFileSync(new URL('../src/ui/Hud.tsx',import.meta.url),'utf8'),css=readFileSync(new URL('../src/ui/hearth/hearth.css',import.meta.url),'utf8');
 assert.match(hearth,/buildLockReason\(b\.cost[^)]*,have,home\)/);assert.match(hearth,/data-build-lock/);
 assert.match(classic,/buildLockReason\(/);assert.match(classic,/text-base[^"]*" data-build-lock/);
 assert.match(css,/\.hw-tile-lock\{[^}]*font-size:max\(16px/);assert.match(css,/\.hw-tile-lock\{[^}]*overflow-wrap:anywhere/,'long reasons wrap inside a 390px tile');
});
