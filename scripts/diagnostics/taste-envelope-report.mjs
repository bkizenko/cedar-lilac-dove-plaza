// Writes docs/metrics/taste-envelope-2026-11-13.json: worst-scoring seeds (before repair) and the rules that caught them, legacy free/remix violation tallies, distance stats.
// node --import ./scripts/game-loader.mjs scripts/diagnostics/taste-envelope-report.mjs
import fs from 'node:fs';
import * as T from '../../src/scene/tasteEnvelope.ts';
import {skinFromCiv} from '../../src/scene/civSkin.ts';
import {generateCiv} from '../../src/game/civGenerator.ts';
const N=200,rolesOf=p=>Object.fromEntries(T.ROLES.map(k=>[k,p[k].hex]));
const sampled=[],raw=[];
for(let s=1;s<=N;s++){
 const a=T.sampleGenome(s),va=T.validateGenome(a),ra=T.repairGenome(a);sampled.push({seed:s,before:va.score,after:ra.verdict.score,rerolls:ra.rerolls,rules:[...new Set(va.violations.map(v=>v.rule))]});
 const b=T.rawGenome(s),vb=T.validateGenome(b),rb=T.repairGenome(b);raw.push({seed:s,before:vb.score,after:rb.verdict.score,rerolls:rb.rerolls,n:vb.violations.length,rules:[...new Set(vb.violations.map(v=>v.rule))],examples:vb.violations.slice(0,4).map(v=>v.rule+': '+v.detail)});
}
const tally=l=>l.reduce((t,x)=>{x.rules.forEach(r=>t[r]=(t[r]||0)+1);return t;},{});
const legacy=[];for(let gs=1;gs<=N;gs++)for(const mode of ['free','remix']){const s=skinFromCiv(generateCiv(gs,0,mode));const v=T.checkPalette(rolesOf(s.palette),'generated');legacy.push({id:s.id,mode,rules:[...new Set(v.map(x=>x.rule))]});}
const legacyBad=legacy.filter(x=>x.rules.length);
let minT=9,minP=9,minF=9;for(let g=1;g<=60;g++){const c=T.castGenomes(g,8);for(let i=0;i<8;i++)for(let j=i+1;j<8;j++){const d=T.genomeDistance(c[i],c[j]);minT=Math.min(minT,d.total);minP=Math.min(minP,d.palette);minF=Math.min(minF,d.form);}}
const out={generated:'2026-11-13',seeds:N,
 sampler:{failBeforeRepair:sampled.filter(x=>x.rules.length).length,failAfterRepair:sampled.filter(x=>x.after<1).length,rerolled:sampled.filter(x=>x.rerolls).length,ruleTally:tally(sampled),worst:sampled.sort((a,b)=>a.before-b.before).slice(0,10)},
 unconstrained:{failBeforeRepair:raw.filter(x=>x.rules.length).length,failAfterRepair:raw.filter(x=>x.after<1).length,rerolled:raw.filter(x=>x.rerolls).length,ruleTally:tally(raw),worst:raw.sort((a,b)=>a.before-b.before).slice(0,10)},
 legacyFreeRemixPalettes:{total:legacy.length,outsideEnvelope:legacyBad.length,ruleTally:tally(legacyBad)},
 cast60x8:{minTotal:+minT.toFixed(3),minPalette:+minP.toFixed(3),minForm:+minF.toFixed(3)}};
fs.writeFileSync(new URL('../../docs/metrics/taste-envelope-2026-11-13.json',import.meta.url),JSON.stringify(out,null,1));
console.log(JSON.stringify({sampler:{...out.sampler,worst:out.sampler.worst.slice(0,3)},unconstrained:{...out.unconstrained,worst:out.unconstrained.worst.slice(0,5)},legacy:out.legacyFreeRemixPalettes,cast:out.cast60x8},null,1));
