import {existsSync,lstatSync,readFileSync,readdirSync,realpathSync,rmSync,statSync,statfsSync,writeFileSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';import {execFileSync} from 'node:child_process';import {retainReleaseAssets} from './retain-release-assets.mjs';
const directory=p=>existsSync(p)&&lstatSync(p).isDirectory()&&!lstatSync(p).isSymbolicLink();
export function releasePlan(root,{active='',liveNames=[]}={}){
 root=realpathSync(root);const play=resolve(root,'.play'),releases=join(play,'releases');if(!directory(play)||!directory(releases))throw Error('Release directories must be real directories');
 const current=realpathSync(join(play,'current'));if(dirname(current)!==releases||!directory(current)||!directory(join(current,'static'))||['assets','audio','licenses'].some(f=>existsSync(join(current,'static',f))&&!directory(join(current,'static',f))))throw Error('Current release layout is unsafe');
 const kept=new Set(liveNames);
 for(const name of ['current','previous-release-path','next-release-path']){
  const p=join(play,name);if(!existsSync(p))continue;const raw=name==='current'?p:resolve(readFileSync(p,'utf8').trim());const value=existsSync(raw)?realpathSync(raw):raw;if(dirname(value)===releases)kept.add(value.slice(releases.length+1));
 }
 // Explicit user keeps, including the pre-overhaul graphics baseline.
 const config=join(play,'kept-releases.json');if(existsSync(config)){const data=JSON.parse(readFileSync(config,'utf8'));if(!Array.isArray(data.kept)||data.kept.some(r=>typeof r.name!=='string'||r.name.includes('/')||!r.reason))throw Error('Invalid kept-release records');for(const row of data.kept)kept.add(row.name);}
 for(const entry of readdirSync(play,{withFileTypes:true})){const p=join(play,entry.name);if(!entry.isSymbolicLink()||!existsSync(p))continue;const target=realpathSync(p);if(dirname(target)===releases)kept.add(target.slice(releases.length+1));}
 const remove=[],keep=[];for(const name of readdirSync(releases)){
  const p=join(releases,name);const valid=directory(p)&&existsSync(join(p,'functions/__server.func/index.mjs'))&&directory(join(p,'static'))&&!['assets','audio','licenses'].some(f=>existsSync(join(p,'static',f))&&!directory(join(p,'static',f)));
  if(kept.has(name)||!valid||active.toLowerCase().includes(p.toLowerCase())||active.toLowerCase().includes(('.play/releases/'+name).toLowerCase()))keep.push(name);else remove.push(name);
 }
 return{play,releases,current,remove,keep};
}
function processLocations(){const ps=execFileSync('ps',['-Ao','pid=,command='],{encoding:'utf8'});let cwd;try{cwd=execFileSync('lsof',['-a','-d','cwd','-Fn'],{encoding:'utf8',stdio:['ignore','pipe','pipe']});}catch(e){if(e.status!==1||!e.stdout?.length)throw e;cwd=e.stdout.toString();}if(!cwd.trim())throw Error('Cannot establish active directories');return ps+'\n'+cwd;}
async function liveReleases(){const names=[];for(const port of [8086,8101]){const r=await fetch(`http://127.0.0.1:${port}/__hearthwild_health`,{signal:AbortSignal.timeout(3000)});const health=await r.json();if(health.service!=='hearthwild-play'||typeof health.release!=='string')throw Error('Cannot identify running game release');names.push(health.release);}return names;}
export async function pruneReleases(root,{apply=false,protection=async()=>({active:processLocations(),liveNames:await liveReleases()})}={}){
 const plan=releasePlan(root,await protection());if(!apply)return plan;
 const before=statfsSync(root),removed=[],assets=[];
 for(const name of plan.remove){
  const fresh=releasePlan(root,await protection());if(!fresh.remove.includes(name))continue;const path=join(fresh.releases,name),identity=statSync(path);
  // Keep lazy-loaded chunks/audio for already-open villages before dropping an old server bundle.
  assets.push({name,...retainReleaseAssets(path,fresh.current)});
  const last=releasePlan(root,await protection());if(!last.remove.includes(name)||statSync(path).ino!==identity.ino)continue;
  rmSync(path,{recursive:true});removed.push(name);
 }
 const after=statfsSync(root),report={removed,kept:releasePlan(root,await protection()).keep,retainedAssets:assets,filesystemFreeDelta:Number(after.bavail*after.bsize-before.bavail*before.bsize),note:'Only inactive completed release directories removed. Current/rollback/user-kept releases and old lazy assets retained; filesystem delta includes other activity.'};
 const reportPath=join(plan.play,'release-prune-'+new Date().toISOString().replaceAll(':','-')+'.json');writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');return{...report,reportPath};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');const result=await pruneReleases(root,{apply:process.argv.includes('--apply')});console.log(JSON.stringify(result));}
