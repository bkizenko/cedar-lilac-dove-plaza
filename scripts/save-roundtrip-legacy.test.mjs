// Saves written by OLDER code must keep loading. SAVE_VERSION has stayed 17 while the schema grew, so every field added
// since is a place an old village could be rejected. Fixtures: committed saves in scripts/fixtures and
// scripts/fixtures/legacy-saves (written by the code at the listed commits). HW_LEGACY_SAVES=<dir> adds more.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
import {jsonCopy} from './save-roundtrip-helpers.mjs';
const here=path.dirname(new URL(import.meta.url).pathname);
const dirs=[path.join(here,'fixtures'),path.join(here,'fixtures','legacy-saves'),process.env.HW_LEGACY_SAVES].filter(d=>d&&fs.existsSync(d));
const files=dirs.flatMap(d=>fs.readdirSync(d).filter(f=>f.endsWith('.json')).map(f=>path.join(d,f)));
// October builds (13th-29th) wrote worldgenVersion 10 with no worldOptions. The default request they used is no longer
// reproducible: the regenerated terrain sits 4-8 m off the saved trees, so these cannot be restored faithfully. They are
// refused with a specific reason rather than loaded onto the wrong land.
const UNRECOVERABLE=/save-(0b82d6f8|be93ce5e)-v10/;
let n=0;
for(const f of files){
  let data;try{data=JSON.parse(fs.readFileSync(f,'utf8'));}catch{continue;}
  if(!data||typeof data!=='object'||data.version===undefined||!data.state)continue;n++;
  if(UNRECOVERABLE.test(f)){test(`unrecoverable legacy save ${path.basename(f)} is refused with a specific reason`,()=>{assert.throws(()=>decodeGame(jsonCopy(data)),/does not match its saved trees/);});continue;}
  test(`legacy save ${path.basename(f)} validates, loads, steps and saves again`,()=>{
    validateGameSave(jsonCopy(data));
    const g=decodeGame(jsonCopy(data));
    g.state.paused=false;for(let i=0;i<200;i++)g.step(.25);
    validateGameSave(jsonCopy(encodeGame(g)));
  });
}
test('at least one legacy save fixture was exercised',()=>{assert.ok(n>=1);});
