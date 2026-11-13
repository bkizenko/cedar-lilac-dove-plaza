// Language audit: scans src for string literals and JSX text that use modern or bureaucratic words, suggests era-true replacements.
//   node --import ./scripts/game-loader.mjs scripts/language-audit.mjs > /tmp/audit-rows.json
import fs from 'node:fs';import path from 'node:path';
import {eraText,setEraVoice} from '../src/game/vocab.ts';
setEraVoice(true);
const WORDS=/\b(community|communities|representatives?|agreements?|stakeholders?|polic(?:y|ies)|resources?|population|citizens?|diplomats?|diplomatic|negotiat\w*|treat(?:y|ies)|factions?|delegations?|delegate|authority|mandate|proposals?|officials?|government|organi[sz]ation|puppet|slavery|annex\w*|white peace|compact|settlement|protectorate|garrison)\b/i;
const SKIP=/^(src\/(scene|lib|server)\/|.*\.test\.)/;
const rows=[];
function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=path.join(d,e.name);if(e.isDirectory())walk(f);else if(/\.(ts|tsx)$/.test(e.name)&&!SKIP.test(f))scan(f);}}
function scan(f){
 const lines=fs.readFileSync(f,'utf8').split('\n');let inBlock=false;
 lines.forEach((ln,i)=>{
  let t=ln.trim();if(inBlock){if(t.includes('*/'))inBlock=false;return;}if(t.startsWith('/*')){if(!t.includes('*/'))inBlock=true;return;}if(t.startsWith('//')||t.startsWith('*'))return;
  ln=ln.replace(/\/\/.*$/,'');
  for(const m of ln.matchAll(/(["'`])((?:\\.|(?!\1).){6,}?)\1|>([^<>{}]{6,})</g)){
   const s=(m[2]??m[3]).trim();if(!/\s/.test(s)&&!/^[A-Z]/.test(s))continue;if(/^[a-z_.:\/-]+$/.test(s)||/[{}]|=>|\bconst\b/.test(s)&&!/ /.test(s))continue;
   const w=s.match(WORDS);if(!w)continue;
   const fix=eraText(s.replace(/\$\{[^}]*\}/g,'§'),0).replace(/§/g,'${…}');
   rows.push({s:s.replace(/\$\{[^}]*\}/g,'${…}'),f:f+':'+(i+1),w:w[1].toLowerCase(),fix:fix!==s.replace(/\$\{[^}]*\}/g,'${…}')?fix:''});
  }
 });
}
walk('src');
process.stdout.write(JSON.stringify(rows));
