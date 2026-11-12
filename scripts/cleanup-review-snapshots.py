#!/usr/bin/env python3
"""Remove inactive development copies after preserving recoverable source variants.
Default is a read-only plan. Runtime releases, canonical files and direct .play
files are never removed. Unknown retained bytes are archived once, with a complete
snapshot-to-file manifest. --apply is required for deletion.
"""
import argparse,gzip,hashlib,importlib.util,json,os,pathlib,shutil,stat,subprocess,time,uuid,sys
sys.dont_write_bytecode=True
ROOT=pathlib.Path(__file__).resolve().parent.parent
PENDING={'raider-cache-62-review','v19-c2-civic-62a122e','v19-water-route-fix-62a122e'}
DERIVED={'.vercel','node_modules','.git','.tanstack','.vite','coverage','dist','build','__pycache__'}
MEDIA={'.png','.jpg','.jpeg','.webp','.gif','.mp4','.webm','.mov','.svg','.avif'}

def identity(s):return [s.st_dev,s.st_ino,s.st_size,s.st_mtime_ns,s.st_ctime_ns,s.st_mode]
def safe_directory(path):
 try:return stat.S_ISDIR(path.lstat().st_mode)
 except OSError:return False

def active_locations():
 spec=importlib.util.spec_from_file_location('review_compactor',ROOT/'scripts/compact-review-files.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
 return module.active_locations()

def active_review(review,active):
 return str(review).lower() in active.lower() or ('.play/'+review.name).lower() in active.lower()

def has_git_history(review):
 p=review/'.git'
 if p.is_symlink() or p.is_file():return True
 if not p.exists():return False
 if not safe_directory(p):return True
 # Empty git init folders contain standard hooks/config, but no durable history.
 if (p/'index').exists() or (p/'packed-refs').exists():return True
 for directory in ['objects','refs','logs']:
  top=p/directory
  if top.exists():
   for parent,dirs,files in os.walk(top,followlinks=False):
    if files or any((pathlib.Path(parent)/d).is_symlink() for d in dirs):return True
 return False

def candidate(review,root,active,pending=PENDING):
 if review.parent!=root/'.play' or review.name in pending or review.name=='releases' or not safe_directory(review):return False
 if active_review(review,active) or has_git_history(review):return False
 for marker in ['KEEP','.keep','KEEP_SNAPSHOT','.keep-snapshot']:
  if (review/marker).exists() or (review/marker).is_symlink():return False
 if not (review/'src/game/sim.ts').is_file() or not (review/'package.json').is_file():return False
 deps=review/'node_modules'
 return deps.is_symlink() and deps.resolve()==(root/'node_modules').resolve()

def inventory(review):
 """All directory/file identities, including omitted output, detect concurrent work."""
 result={}
 def visit(p,rel):
  s=p.lstat();row={'identity':identity(s)}
  if stat.S_ISLNK(s.st_mode):row['link']=os.readlink(p)
  elif not stat.S_ISREG(s.st_mode) and not stat.S_ISDIR(s.st_mode):raise RuntimeError('Special file in snapshot: '+str(p))
  result[rel]=row
  if stat.S_ISDIR(s.st_mode):
   for child in sorted(p.iterdir(),key=lambda x:x.name):visit(child,child.name if not rel else rel+'/'+child.name)
 visit(review,'');return result

def retained(relative):
 parts=pathlib.PurePosixPath(relative).parts
 if not parts:return False
 if parts[0] in DERIVED:return False
 # Nested private diagnostics can contain actual saved villages. Keep their JSON
 # and other non-media fixtures; never treat them as disposable generated output.
 if parts[0]=='.play':return not any(p in DERIVED for p in parts[1:]) and pathlib.PurePosixPath(relative).suffix.lower() not in MEDIA
 if any(p in DERIVED for p in parts):return False
 if parts[0] in {'screenshots','previews','artifacts'} and pathlib.PurePosixPath(relative).suffix.lower() in MEDIA:return False
 return True

def digest_file(path):
 s=path.lstat()
 if not stat.S_ISREG(s.st_mode):raise RuntimeError('Source is no longer regular: '+str(path))
 git=hashlib.sha1(('blob '+str(s.st_size)+'\0').encode());sha=hashlib.sha256()
 with path.open('rb') as f:
  for data in iter(lambda:f.read(1024*1024),b''):git.update(data);sha.update(data)
 if identity(path.lstat())!=identity(s):raise RuntimeError('Source changed while hashing: '+str(path))
 return git.hexdigest(),sha.hexdigest(),s.st_size

def git_objects(root):
 # Include every reachable historical file regardless of its historical path.
 data=subprocess.check_output(['git','rev-list','--objects','--all'],cwd=root,text=True)
 oids={line.split(' ',1)[0] for line in data.splitlines()}
 checked=subprocess.run(['git','cat-file','--batch-check=%(objectname) %(objecttype)'],cwd=root,input='\n'.join(oids)+'\n',capture_output=True,text=True,check=True)
 if any(line.endswith(' missing') for line in checked.stdout.splitlines()):raise RuntimeError('Historical Git objects missing; no snapshot deletion allowed')
 return {line.split(' ',1)[0] for line in checked.stdout.splitlines() if line.endswith(' blob')}

def git_blob_exists(root,oid,cache):
 if oid not in cache:
  p=subprocess.run(['git','cat-file','-t',oid],cwd=root,capture_output=True,text=True)
  cache[oid]=p.returncode==0 and p.stdout.strip()=='blob'
 return cache[oid]

def save_blob(source,archive,oid,sha256):
 blobs=archive/'blobs';blobs.mkdir(exist_ok=True);dest=blobs/(oid+'.gz')
 if dest.exists():
  with gzip.open(dest,'rb') as f:
   h=hashlib.sha256()
   for data in iter(lambda:f.read(1024*1024),b''):h.update(data)
  if h.hexdigest()!=sha256:raise RuntimeError('Rescue blob hash mismatch: '+oid)
  return
 temp=blobs/('.tmp-'+uuid.uuid4().hex)
 try:
  with temp.open('xb') as raw:
   with gzip.GzipFile(filename='',fileobj=raw,mode='wb',mtime=0) as zipped:
    with source.open('rb') as src:shutil.copyfileobj(src,zipped,1024*1024)
   raw.flush();os.fsync(raw.fileno())
  with gzip.open(temp,'rb') as f:
   h=hashlib.sha256()
   for data in iter(lambda:f.read(1024*1024),b''):h.update(data)
  if h.hexdigest()!=sha256:raise RuntimeError('Source changed during rescue: '+str(source))
  os.replace(temp,dest)
 finally:
  if temp.exists():temp.unlink()

def snapshot_record(review,known,archive=None,root=ROOT,blob_cache=None):
 before=inventory(review);files={};unknown_bytes=0;cache=blob_cache if blob_cache is not None else {}
 for rel,row in before.items():
  if not retained(rel):continue
  mode=row['identity'][-1]
  if stat.S_ISDIR(mode):continue
  if stat.S_ISLNK(mode):files[rel]={'link':row['link'],'mode':stat.S_IMODE(mode)};continue
  oid,sha,size=digest_file(review/rel)
  historical=oid in known
  if historical and archive is not None and not git_blob_exists(root,oid,cache):raise RuntimeError('Historical blob unavailable: '+oid)
  files[rel]={'gitBlob':oid,'sha256':sha,'bytes':size,'storage':'git' if historical else 'rescue','mode':stat.S_IMODE(mode),'mtimeNs':row['identity'][3]}
  if not historical:
   unknown_bytes+=size
   if archive is not None:save_blob(review/rel,archive,oid,sha)
 if inventory(review)!=before:raise RuntimeError('Snapshot changed during rescue: '+str(review))
 return {'snapshot':review.name,'files':files,'unknownLogicalBytes':unknown_bytes},before

def atomic_json(path,value):
 temp=path.with_name('.manifest-'+uuid.uuid4().hex)
 try:
  with temp.open('x') as f:json.dump(value,f,separators=(',',':'));f.write('\n');f.flush();os.fsync(f.fileno())
  os.replace(temp,path)
 finally:
  if temp.exists():temp.unlink()

def archive_snapshot_record(archive,record):
 directory=archive/'snapshots';directory.mkdir(exist_ok=True)
 target=directory/(record['snapshot']+'.json.gz');temp=directory/('.tmp-'+uuid.uuid4().hex)
 payload=json.dumps(record,separators=(',',':')).encode()+b'\n'
 try:
  with temp.open('xb') as f:
   with gzip.GzipFile(filename='',fileobj=f,mode='wb',mtime=0) as zipped:zipped.write(payload)
   f.flush();os.fsync(f.fileno())
  if gzip.decompress(temp.read_bytes())!=payload:raise RuntimeError('Snapshot manifest verification failed')
  os.replace(temp,target)
 finally:
  if temp.exists():temp.unlink()
 return {'snapshot':record['snapshot'],'manifestFile':str(target.relative_to(archive)),'manifestSha256':hashlib.sha256(payload).hexdigest(),'retainedFiles':len(record['files']),'unknownLogicalBytes':record['unknownLogicalBytes']}

def remove_snapshot(review,root,before,active_provider=active_locations,pending=PENDING):
 # Fail closed on activity errors. Recheck source and directory identities after
 # the durable rescue manifest is written and immediately before deletion.
 if not candidate(review,root,active_provider(),pending):raise RuntimeError('Snapshot became active/protected: '+review.name)
 if inventory(review)!=before:raise RuntimeError('Snapshot changed before deletion: '+review.name)
 if not safe_directory(root/'.play') or review.resolve().parent!=(root/'.play').resolve():raise RuntimeError('Unsafe snapshot parent')
 shutil.rmtree(review)

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--apply',action='store_true');p.add_argument('--review',action='append');args=p.parse_args()
 root=ROOT;play=root/'.play'
 if not safe_directory(play):raise RuntimeError('Missing regular .play directory')
 active=active_locations();known=git_objects(root);reviews=[x for x in sorted(play.iterdir()) if (not args.review or x.name in args.review) and candidate(x,root,active)]
 if args.review and set(args.review)-{x.name for x in reviews}:raise RuntimeError('Requested snapshot is missing, active or protected')
 archive=None;manifest={'version':1,'createdAt':time.time(),'gitRoot':str(root),'gitHead':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'scope':'Retained source/private fixtures; omitted derived builds and disposable review images. All historical bytes recoverable via git cat-file blob <gitBlob>; unknown bytes via blobs/<gitBlob>.gz. Releases and direct .play files untouched.','snapshots':[],'deleted':[],'errors':[]}
 if args.apply:
  archive=play/('unfinished-source-rescue-'+time.strftime('%Y%m%d-%H%M%S')+'-'+uuid.uuid4().hex[:6]);archive.mkdir();atomic_json(archive/'manifest.json',manifest)
 before_free=shutil.disk_usage(root).free;cache={oid:True for oid in known}
 for review in reviews:
  try:
   record,identities=snapshot_record(review,known,archive,root,cache)
   manifest['snapshots'].append(archive_snapshot_record(archive,record) if archive else {'snapshot':record['snapshot'],'retainedFiles':len(record['files']),'unknownLogicalBytes':record['unknownLogicalBytes']})
   if args.apply:
    atomic_json(archive/'manifest.json',manifest)
    remove_snapshot(review,root,identities)
    manifest['deleted'].append(review.name);atomic_json(archive/'manifest.json',manifest)
   print(json.dumps({'review':review.name,'retainedFiles':len(record['files']),'unknownLogicalBytes':record['unknownLogicalBytes'],'deleted':args.apply}),flush=True)
  except Exception as exc:
   manifest['errors'].append({'review':review.name,'reason':str(exc)})
   if args.apply:atomic_json(archive/'manifest.json',manifest)
   print(json.dumps({'review':review.name,'error':str(exc),'deleted':False}),flush=True)
 report={'mode':'apply' if args.apply else 'plan','candidates':len(reviews),'preservedPending':sorted(PENDING),'deleted':len(manifest['deleted']),'errors':manifest['errors'],'rescuePath':str(archive) if archive else None,'filesystemFreeDelta':shutil.disk_usage(root).free-before_free,'note':'Free-space changes include other system activity. Historical source uses existing Git blobs, unique source/private fixtures are independently archived.'}
 print(json.dumps({'summary':report}),flush=True)
 if manifest['errors']:raise SystemExit(1)
if __name__=='__main__':main()
