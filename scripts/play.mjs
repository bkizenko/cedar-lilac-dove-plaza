import {spawn} from 'node:child_process';
import {cpSync,mkdirSync,openSync,closeSync,writeFileSync,readFileSync,existsSync,renameSync,symlinkSync,rmSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),folder=resolve(root,'.play');
const action=process.argv[2]||'start',port=Number(process.env.PLAY_PORT||8086),url=`http://127.0.0.1:${port}/__hearthwild_health`;
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid play port');
mkdirSync(folder,{recursive:true});
if(action==='publish'){
 const build=resolve(root,'.vercel/output');
 if(!existsSync(resolve(build,'functions/__server.func/index.mjs')))throw new Error('Build the game before publishing a play release');
 const release=resolve(folder,'releases',new Date().toISOString().replace(/[:.]/g,'-'));
 cpSync(build,release,{recursive:true});
 const next=resolve(folder,'next');rmSync(next,{force:true});symlinkSync(release,next);renameSync(next,resolve(folder,'current'));
 console.log('Play release ready. The running release stays unchanged until the server restarts.');
}else if(action==='start'||action==='status'){
 let health;try{health=await (await fetch(url,{signal:AbortSignal.timeout(1500)})).json();}catch{}
 if(health?.service==='hearthwild-play'){console.log(`Game available at http://127.0.0.1:${port}/ · ${health.release}`);}
 else if(action==='status'){console.log('Stable play server is not running');process.exitCode=1;}
 else{
  if(!existsSync(resolve(folder,'current')))throw new Error('Run npm run play:publish first');
  // Never kill another server that happens to own the requested port.
  const log=openSync(resolve(folder,'server.log'),'a');
  const child=spawn(process.execPath,[resolve(root,'scripts/play-server.mjs'),resolve(folder,'current')],{cwd:root,detached:true,stdio:['ignore',log,log],env:{...process.env,PLAY_PORT:String(port)}});
  closeSync(log);child.unref();writeFileSync(resolve(folder,'server.pid'),String(child.pid));
  for(let i=0;i<40;i++){await new Promise(r=>setTimeout(r,250));try{const result=await(await fetch(url,{signal:AbortSignal.timeout(500)})).json();if(result.service==='hearthwild-play'){console.log(`Game available at http://127.0.0.1:${port}/`);process.exit(0);}}catch{}}
  throw new Error('Stable server did not start; inspect .play/server.log. An existing game server may still own the port.');
 }
}else if(action==='stop'){
 let health;try{health=await(await fetch(url,{signal:AbortSignal.timeout(1000)})).json();}catch{}
 if(health?.service!=='hearthwild-play')throw new Error('Refusing to stop an unrelated server');
 const pid=Number(readFileSync(resolve(folder,'server.pid'),'utf8'));
 if(!Number.isSafeInteger(pid)||pid<=1)throw new Error('Invalid server process record');
 process.kill(pid,'SIGTERM');console.log('Stable play server stopped');
}else throw new Error('Use start, status, publish or stop');
