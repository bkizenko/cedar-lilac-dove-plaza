import {constants,copyFileSync,existsSync,linkSync,mkdirSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
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
   if(existsSync(to)){result.existing++;continue;}
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
 return result;
}
