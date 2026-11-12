// Explicit selected releases + age cutoff. No default scan/apply of a real village.
import{mkdirSync,readdirSync,lstatSync,statSync,readFileSync,writeFileSync,openSync,fsyncSync,closeSync,renameSync,unlinkSync,linkSync,existsSync,realpathSync,rmSync}from'node:fs';
import{join,resolve,dirname}from'node:path';import{pathToFileURL}from'node:url';import{gzipSync}from'node:zlib';import{createHash}from'node:crypto';
import{retainedTextExtension,retainedTextPath,readRetainedText,containedRegularFile,MAX_RETAINED_TEXT_BYTES}from'./retained-text-storage.mjs';
function privateDirectory(root,dir){let current=root;for(const part of dir.slice(root.length+1).split('/')){current=join(current,part);if(existsSync(current)){const s=lstatSync(current);if(!s.isDirectory()||s.isSymbolicLink())throw Error('Unsafe compressed storage directory: '+current);}else mkdirSync(current);}}
const checksum=b=>createHash('sha256').update(b).digest('hex'),same=(a,b)=>a.dev===b.dev&&a.ino===b.ino&&a.size===b.size&&a.mtimeMs===b.mtimeMs;
export function repackRetainedText(releases,{before,apply=false}={}){
 if(!Number.isFinite(before)||before<=0||before>Date.now())throw Error('Provide an explicit past age cutoff (before, epoch milliseconds)');
 if(!Array.isArray(releases)||!releases.length)throw Error('Select explicit release directories');
 const roots=[...new Set(releases.map(p=>realpathSync(resolve(p))))],groups=new Map(),skipped={recent:0,nonText:0,unsafe:0,tooLarge:0};
 for(const root of roots){if(!containedRegularFile(root,join(root,'functions/__server.func/index.mjs')))throw Error('Not a complete selected play release: '+root);const base=join(root,'static/assets');if(!existsSync(base))continue;
  const visit=dir=>{for(const e of readdirSync(dir,{withFileTypes:true})){const file=join(dir,e.name);if(e.isDirectory()){if(realpathSync(file).startsWith(root+'/'))visit(file);else skipped.unsafe++;continue;}if(!e.isFile()||!containedRegularFile(join(root,'static'),file)){skipped.unsafe++;continue;}if(!retainedTextExtension(file)){skipped.nonText++;continue;}const s=statSync(file);if(s.mtimeMs>=before){skipped.recent++;continue;}if(s.size>MAX_RETAINED_TEXT_BYTES){skipped.tooLarge++;continue;}const key=s.dev+':'+s.ino,g=groups.get(key)||{stat:s,links:[]};g.links.push({root,file,stat:s});groups.set(key,g);}};visit(base);
 }
 const report={apply,before:new Date(before).toISOString(),releases:roots,selectedLinks:0,uniqueRawBytes:0,rawBytesWhoseEveryLinkIsSelected:0,compressedUniqueBytes:0,removedLinks:0,unchangedCompressionLinks:0,notSmaller:0,verified:[],skipped};
 for(const group of groups.values()){report.selectedLinks+=group.links.length;report.uniqueRawBytes+=group.stat.size;if(group.stat.nlink===group.links.length)report.rawBytesWhoseEveryLinkIsSelected+=group.stat.size;if(!apply)continue;
  const first=group.links[0],raw=readFileSync(first.file),hash=checksum(raw),gzip=gzipSync(raw,{level:6});if(gzip.length>=raw.length){report.notSmaller+=group.links.length;continue;}
  // Install/verify EVERY target first. A crash or conflict leaves raw links available.
  let shared;for(const entry of group.links){const storage=retainedTextPath(entry.root,entry.file);if(!storage)throw Error('Unsafe retained storage path');privateDirectory(entry.root,dirname(storage));if(existsSync(storage)){if(!containedRegularFile(join(entry.root,'.retained-text'),storage)||!readRetainedText(storage).equals(raw))throw Error('Existing compressed URL has different bytes: '+entry.file);report.unchangedCompressionLinks++;}
   else if(shared){linkSync(shared,storage);}
   else{const temporary=storage+'.tmp-'+process.pid;let fd;try{fd=openSync(temporary,'wx');writeFileSync(fd,gzip);fsyncSync(fd);closeSync(fd);fd=undefined;if(!readRetainedText(temporary).equals(raw))throw Error('Compression verification failed');renameSync(temporary,storage);}finally{if(fd!==undefined)closeSync(fd);rmSync(temporary,{force:true});}}
   if(!readRetainedText(storage).equals(raw))throw Error('Stored bytes differ: '+entry.file);shared??=storage;
  }
  // Refuse a concurrent edit/replace. Never rewrite any shared raw inode.
  for(const entry of group.links){if(!same(lstatSync(entry.file),entry.stat)||!readFileSync(entry.file).equals(raw))throw Error('Raw asset changed during repack: '+entry.file);}
  for(const entry of group.links){unlinkSync(entry.file);report.removedLinks++;}
  const compressedInodes=new Set();for(const entry of group.links){const stored=statSync(retainedTextPath(entry.root,entry.file)),id=stored.dev+':'+stored.ino;if(!compressedInodes.has(id)){compressedInodes.add(id);report.compressedUniqueBytes+=stored.size;}}report.verified.push({sha256:hash,rawBytes:raw.length,gzipBytes:gzip.length,links:group.links.length});
 }
 return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const args=process.argv.slice(2),apply=args.includes('--apply'),at=args.indexOf('--before');if(at<0)throw Error('Usage: repack-retained-text.mjs --before ISO_DATE [--apply] RELEASE...');const before=Date.parse(args[at+1]);args.splice(at,2);const roots=args.filter(x=>x!=='--apply');console.log(JSON.stringify(repackRetainedText(roots,{before,apply}),null,2));}
