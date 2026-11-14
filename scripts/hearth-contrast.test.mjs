// Guards Hearth theme readability: every text/accent token must keep WCAG AA contrast on the panel surfaces.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../src/ui/hearth/hearth.css',import.meta.url),'utf8');
const block=css.match(/:root:not\(\[data-hw-ui\]\)\{([\s\S]*?)\n\}/)[1];
const tok=Object.fromEntries([...block.matchAll(/--(hw-[\w-]+):(#[0-9a-f]{6})/gi)].map(m=>[m[1],m[2]]));
const lum=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
const ratio=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05);};
test('Hearth text and status colours meet AA on both panel stops',()=>{
 for(const fg of ['hw-text','hw-dim','hw-gold','hw-gold-2','hw-good','hw-bad','hw-warn','hw-water'])
  for(const bg of ['hw-wood-700','hw-wood-800','hw-wood-900']){
   assert.ok(tok[fg]&&tok[bg],`token ${fg}/${bg} present`);
   assert.ok(ratio(tok[fg],tok[bg])>=4.5,`${fg} on ${bg} = ${ratio(tok[fg],tok[bg]).toFixed(2)}`);
  }
});
test('Hearth primary buttons: ink on gold meets AA',()=>{
 for(const g of ['hw-gold','hw-gold-2'])assert.ok(ratio(tok['hw-gold-ink'],tok[g])>=4.5,`ink on ${g}`);
});
test('Hearth parchment sheets: ink on parchment meets AAA',()=>{
 for(const p of ['hw-parch','hw-parch-2'])assert.ok(ratio(tok['hw-ink'],tok[p])>=7,`ink on ${p}`);
});
// Dusk palette variant (palette.css) keeps the same AA floor.
const pcss=readFileSync(new URL('../src/ui/hearth/palette.css',import.meta.url),'utf8');
const dusk=Object.fromEntries([...pcss.match(/\[data-hw-pal="dusk"\]\{([\s\S]*?)\n\}/)[1].matchAll(/--(hw-[\w-]+):(#[0-9a-f]{6})/gi)].map(m=>[m[1],m[2]]));
test('Hearth Dusk palette meets AA on every panel stop and keeps AAA ink on parchment',()=>{
 for(const fg of ['hw-text','hw-dim','hw-gold','hw-gold-2','hw-good','hw-bad','hw-warn','hw-water'])
  for(const bg of ['hw-wood-700','hw-wood-800','hw-wood-900'])assert.ok(ratio(dusk[fg],dusk[bg])>=4.5,`dusk ${fg} on ${bg} = ${ratio(dusk[fg],dusk[bg]).toFixed(2)}`);
 for(const g of ['hw-gold','hw-gold-2'])assert.ok(ratio(dusk['hw-gold-ink'],dusk[g])>=4.5,`dusk ink on ${g}`);
 for(const p of ['hw-parch','hw-parch-2'])assert.ok(ratio(dusk['hw-ink'],dusk[p])>=7,`dusk ink on ${p}`);
});
// Colour-blind safety: faction mood is never colour alone (shape glyph in Classic, shape dot + strip texture in Hearth).
test('faction mood carries a shape or texture cue besides colour',()=>{
 const parts=readFileSync(new URL('../src/ui/council/CouncilParts.tsx',import.meta.url),'utf8');
 assert.match(parts,/loyaltyGlyph/);assert.match(parts,/\{loyaltyGlyph\(f\.loyalty\)\}/);
 assert.match(css,/\.hw-dot\.d-bad\{[^}]*clip-path/);assert.match(css,/span\[data-mood=bad\]\{background-image/);assert.match(css,/span\[data-mood=mid\]\{background-image/);
});
