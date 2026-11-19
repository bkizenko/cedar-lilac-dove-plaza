// Red-green safe colour vision: status colours keep AA on every panel stop of both palettes and stay apart under
// simulated deuteranopia and protanopia (Machado et al. 2009 severity 1.0 matrices on linear RGB).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../src/ui/hearth/hearth.css',import.meta.url),'utf8'),pcss=readFileSync(new URL('../src/ui/hearth/palette.css',import.meta.url),'utf8');
const toks=b=>Object.fromEntries([...b.matchAll(/--(hw-[\w-]+):(#[0-9a-f]{6})/gi)].map(m=>[m[1],m[2]]));
const warm=toks(css.match(/:root:not\(\[data-hw-ui\]\)\{([\s\S]*?)\n\}/)[1]),dusk=toks(pcss.match(/\[data-hw-pal="dusk"\]\{([\s\S]*?)\n\}/)[1]),safe=toks(pcss.match(/\[data-hw-cvd="safe"\]\{([\s\S]*?)\n\}/)[1]);
const lin=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
const lum=c=>.2126*c[0]+.7152*c[1]+.0722*c[2];
const ratio=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05);};
const M={deuteranopia:[[.367322,.860646,-.227968],[.280085,.672501,.047413],[-.01182,.04294,.968881]],protanopia:[[.152286,1.052583,-.204868],[.114503,.786281,.099216],[-.003882,-.048116,1.051998]]};
const sim=(c,m)=>m.map(r=>Math.min(1,Math.max(0,r[0]*c[0]+r[1]*c[1]+r[2]*c[2])));
const gam=c=>c.map(v=>v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055);
const dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
test('safe status colours meet AA on warm and dusk panels',()=>{
 for(const [name,pal] of [['warm',warm],['dusk',dusk]])for(const fg of ['hw-good','hw-bad','hw-warn'])for(const bg of ['hw-wood-700','hw-wood-800','hw-wood-900'])
  assert.ok(ratio(lin(safe[fg]),lin(pal[bg]))>=4.5,`${name} ${fg} on ${bg} = ${ratio(lin(safe[fg]),lin(pal[bg])).toFixed(2)}`);
});
test('safe good/bad/warn stay distinct under simulated red-green colour blindness, more than the standard set',()=>{
 for(const [kind,m] of Object.entries(M)){
  const s=k=>gam(sim(lin(safe[k]),m)),w=k=>gam(sim(lin(warm[k]),m));
  assert.ok(dist(s('hw-good'),s('hw-bad'))>=.3,`${kind} good vs bad = ${dist(s('hw-good'),s('hw-bad')).toFixed(2)}`);
  assert.ok(dist(s('hw-good'),s('hw-warn'))>=.2,`${kind} good vs warn`);
  assert.ok(dist(s('hw-good'),s('hw-bad'))>dist(w('hw-good'),w('hw-bad')),`${kind}: safe set separates better than standard`);
 }
});
test('setting is offered in Interface settings, remembered per viewer, and chips gain a shape',()=>{
 const ui=readFileSync(new URL('../src/ui/uiTheme.tsx',import.meta.url),'utf8');
 assert.match(ui,/hearthwild\.ui\.colourVision/);assert.match(ui,/Red-green safe/);assert.match(ui,/applyCvd\(cvd\)/,'applied at boot');
 for(const k of ['good','bad','warn'])assert.match(pcss,new RegExp(`\\[data-hw-cvd="safe"\\] \\.hw-chip\\.t-${k}::before\\{content:`));
});
