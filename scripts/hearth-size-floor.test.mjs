import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// The Hearth size floor (docs/UIUX_PROPOSAL.md, change 1): text >= 16px, icons >= 24px in controls, hit targets >= 48px. Pure CSS text check, no DOM.
const css=readFileSync(new URL('../src/ui/hearth/hearth.css',import.meta.url),'utf8');
const token=(name)=>{const all=[...css.matchAll(new RegExp(`--${name}:\\s*(\\d+(?:\\.\\d+)?)px`,'g'))];return all.length?+all[all.length-1][1]:NaN;};
test('floor tokens are declared and not below the floor (last declaration wins)',()=>{
 assert.ok(token('hw-fs-s')>=16,'smallest text token');
 assert.ok(token('hw-fs')>=token('hw-fs-s'));
 assert.ok(token('hw-ico-s')>=24,'smallest control icon');
 assert.ok(token('hw-hit')>=48,'tap target');
});
test('no literal font size below 16px anywhere in the Hearth stylesheet',()=>{
 const bad=[];
 for(const m of css.matchAll(/font(?:-size)?:\s*(?:[0-9]{3}\s+)?(\d+(?:\.\d+)?)px/g))if(+m[1]<16)bad.push(m[0]);
 assert.deepEqual(bad,[]);
});
test('the archived interface stays out of reach: every Hearth token block is scoped away from data-hw-ui',()=>{
 for(const m of css.matchAll(/^(:root[^{]*)\{\s*\n?\s*--hw-fs-s/gm))assert.match(m[1],/:not\(\[data-hw-ui\]\)/);
});
