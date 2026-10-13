import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,cpSync,symlinkSync,realpathSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

test('publishing preserves old hashed assets for an open village and never overwrites new ones',()=>{
 const root=mkdtempSync(join(tmpdir(),'hearthwild-release-test-'));
 try{
  for(const path of ['scripts','.vercel/output/functions/__server.func','.vercel/output/static/assets','.play/releases/old/static/assets'])mkdirSync(join(root,path),{recursive:true});
  cpSync(new URL('./play.mjs',import.meta.url),join(root,'scripts/play.mjs'));
  writeFileSync(join(root,'.vercel/output/functions/__server.func/index.mjs'),'export default {}');
  writeFileSync(join(root,'.vercel/output/static/assets/new-hash.js'),'new');
  writeFileSync(join(root,'.vercel/output/static/assets/shared.js'),'new shared');
  writeFileSync(join(root,'.play/releases/old/static/assets/old-hash.js'),'old');
  writeFileSync(join(root,'.play/releases/old/static/assets/shared.js'),'old shared');
  symlinkSync(join(root,'.play/releases/old'),join(root,'.play/current'));
  execFileSync(process.execPath,[join(root,'scripts/play.mjs'),'publish']);
  const release=realpathSync(join(root,'.play/current'));
  assert.equal(readFileSync(join(release,'static/assets/old-hash.js'),'utf8'),'old');
  assert.equal(readFileSync(join(release,'static/assets/new-hash.js'),'utf8'),'new');
  assert.equal(readFileSync(join(release,'static/assets/shared.js'),'utf8'),'new shared');
  assert.equal(readFileSync(join(root,'.play/releases/old/static/assets/shared.js'),'utf8'),'old shared');
 }finally{rmSync(root,{recursive:true,force:true});}
});
