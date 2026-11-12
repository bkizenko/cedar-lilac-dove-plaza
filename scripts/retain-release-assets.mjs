import {constants,copyFileSync,existsSync,linkSync,mkdirSync,readdirSync,lstatSync} from 'node:fs';
import {join,relative} from 'node:path';
/** Old pages may still request earlier chunks/audio. Both release trees are
 * immutable: share old files, while keeping every freshly built file intact. */
export function retainReleaseAssets(previous,release){
 const result={linked:0,copied:0,existing:0};
 function visit(source,target){
  if(!existsSync(source))return;
  mkdirSync(target,{recursive:true});
  for(const entry of readdirSync(source,{withFileTypes:true})){
   const from=join(source,entry.name),to=join(target,entry.name);
   if(entry.isDirectory()){visit(from,to);continue;}
   if(!entry.isFile())continue;
   if(existsSync(to)||existsSync(join(release,'.retained-text',relative(join(release,'static'),to)+'.gz'))){result.existing++;continue;}
   try{linkSync(from,to);result.linked++;}
   catch(error){
    if(error.code==='EEXIST'){result.existing++;continue;}
    if(!['EXDEV','EPERM','ENOTSUP','EOPNOTSUPP'].includes(error.code))throw error;
    try{copyFileSync(from,to,constants.COPYFILE_EXCL);result.copied++;}
    catch(copyError){if(copyError.code==='EEXIST')result.existing++;else throw copyError;}
   }
  }
 }
 for(const folder of ['assets','audio','licenses'])visit(join(previous,'static',folder),join(release,'static',folder));
 // Private compressed assets retain their ORIGINAL public URL. A new raw build
 // always wins, and compressed chunks stay hardlinked across later releases.
 function compressed(dir,relativePath='assets'){
  if(!existsSync(dir)||!lstatSync(dir).isDirectory()||lstatSync(dir).isSymbolicLink())return;
  for(const e of readdirSync(dir,{withFileTypes:true})){const from=join(dir,e.name),rel=join(relativePath,e.name);if(e.isDirectory()){compressed(from,rel);continue;}if(!e.isFile()||!e.name.endsWith('.gz'))continue;
   const to=join(release,'.retained-text',rel);if(existsSync(join(release,'static',rel.slice(0,-3)))||existsSync(to)){result.existing++;continue;}mkdirSync(join(to,'..'),{recursive:true});try{linkSync(from,to);result.linked++;}catch(error){if(error.code==='EEXIST'){result.existing++;continue;}if(!['EXDEV','EPERM','ENOTSUP','EOPNOTSUPP'].includes(error.code))throw error;try{copyFileSync(from,to,constants.COPYFILE_EXCL);result.copied++;}catch(e){if(e.code==='EEXIST')result.existing++;else throw e;}}
  }
 }
 const privateRoot=join(previous,'.retained-text');if(existsSync(privateRoot)&&lstatSync(privateRoot).isDirectory()&&!lstatSync(privateRoot).isSymbolicLink())compressed(join(privateRoot,'assets'));
 return result;
}
