import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
/* Lane B token audit: every Hearth text/surface pairing must reach WCAG AA (4.5:1 body, 3:1 for large/UI). */
const css=readFileSync(new URL('../src/ui/hearth/hearth.css',import.meta.url),'utf8');
const root=css.slice(css.indexOf(':root:not([data-hw-ui]){'),css.indexOf('}',css.indexOf(':root:not([data-hw-ui]){')));
const tok=n=>{const m=root.match(new RegExp('--'+n+':\\s*(#[0-9a-fA-F]{6})'));assert.ok(m,'token '+n);return m[1];};
const lum=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
const ratio=(a,b)=>{const [x,y]=[lum(tok(a)),lum(tok(b))].sort((p,q)=>q-p);return (x+.05)/(y+.05);};
const surfaces=['wood-950','wood-900','wood-800','wood-700'];
for(const fg of ['text','dim','gold','gold-2','good','bad','warn','water'])for(const bg of surfaces)
 test(`${fg} on ${bg} >= 4.5`,()=>assert.ok(ratio('hw-'+fg,'hw-'+bg)>=4.5,`${fg}/${bg} ${ratio('hw-'+fg,'hw-'+bg).toFixed(2)}`));
test('gold-ink on gold buttons >= 4.5',()=>{for(const bg of ['hw-gold','hw-gold-2'])assert.ok(ratio('hw-gold-ink',bg)>=4.5);});
test('ink on parchment >= 7',()=>{for(const bg of ['hw-parch','hw-parch-2'])assert.ok(ratio('hw-ink',bg)>=7);});
