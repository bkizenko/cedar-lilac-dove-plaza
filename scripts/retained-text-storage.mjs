import{existsSync,lstatSync,realpathSync,readFileSync}from'node:fs';
import{resolve,relative,sep,join,extname}from'node:path';
import{gunzipSync}from'node:zlib';
export const RETAINED_TEXT_DIRECTORY='.retained-text';
export const MAX_RETAINED_TEXT_BYTES=64*1024*1024;
export const retainedTextExtension=file=>['.js','.mjs','.css','.json','.map','.txt','.webmanifest'].includes(extname(file).toLowerCase());
/** Storage is private, outside static; the public URL and MIME always use the original path. */
export function retainedTextPath(release,file){const rel=relative(resolve(release,'static'),resolve(file));if(!rel.startsWith('assets'+sep)||rel.split(sep).includes('..')||!retainedTextExtension(file))return null;return join(resolve(release,RETAINED_TEXT_DIRECTORY),rel+'.gz');}
/** Hardlinks are regular files. Symlinks, including escaping ancestor directories,
 * cannot turn a public static request into a read outside the selected tree. */
export function containedRegularFile(root,file){try{const directory=lstatSync(root);if(!directory.isDirectory()||directory.isSymbolicLink()||!lstatSync(file).isFile())return false;const base=realpathSync(root),actual=realpathSync(file);return actual.startsWith(base+sep);}catch{return false;}}
export function readRetainedText(file){return gunzipSync(readFileSync(file),{maxOutputLength:MAX_RETAINED_TEXT_BYTES});}
/** Identity is acceptable by default; explicit coding preferences beat '*'. */
export function retainedEncoding(header){
 const values=new Map();for(const part of String(header||'').split(',')){const [name,...parameters]=part.trim().toLowerCase().split(';');if(!name)continue;let q=1;for(const p of parameters){const m=p.trim().match(/^q\s*=\s*(.+)$/);if(m){q=Number(m[1]);if(!Number.isFinite(q)||q<0||q>1)q=0;}}values.set(name,q);}
 const gzip=values.get('gzip')??values.get('*')??0,identity=values.get('identity')??(values.get('*')===0?0:1);
 if(gzip>0)return'gzip';if(identity>0)return'identity';return null;
}
export function compressedStaticFile(release,file){const storage=retainedTextPath(release,file);return storage&&existsSync(storage)&&containedRegularFile(resolve(release,RETAINED_TEXT_DIRECTORY),storage)?storage:null;}
