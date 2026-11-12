#!/usr/bin/env python3
"""Share APFS blocks for byte-identical old review files; retain independent edits.
Default is a read-only plan. Never traverses a symlink or touches releases/saves.
"""
import argparse, ctypes, errno, hashlib, json, os, pathlib, stat, subprocess, time, uuid
ROOT=pathlib.Path(__file__).resolve().parent.parent
_LIB=ctypes.CDLL(None,use_errno=True)
_CLONE=getattr(_LIB,'clonefile',None)
if _CLONE:
 _CLONE.argtypes=[ctypes.c_char_p,ctypes.c_char_p,ctypes.c_int];_CLONE.restype=ctypes.c_int

def _regular(path):
 try:
  s=path.lstat()
  return s if stat.S_ISREG(s.st_mode) and s.st_nlink==1 and not getattr(s,'st_flags',0)&sum(getattr(stat,k,0) for k in ['UF_IMMUTABLE','UF_APPEND','SF_IMMUTABLE','SF_APPEND','UF_NOUNLINK']) else None
 except OSError:return None

def _metadata(path):
 # Exact metadata equality avoids replacing provenance, quarantine or ACLs.
 s=path.lstat();name=os.fsencode(path)
 listing=_LIB.listxattr;listing.argtypes=[ctypes.c_char_p,ctypes.c_void_p,ctypes.c_size_t,ctypes.c_int];listing.restype=ctypes.c_ssize_t
 size=listing(name,None,0,0)
 if size<0:raise OSError(ctypes.get_errno(),'Cannot inspect extended attributes')
 buf=ctypes.create_string_buffer(size)
 if listing(name,buf,size,0)!=size:raise OSError('Extended attributes changed')
 getter=_LIB.getxattr;getter.argtypes=[ctypes.c_char_p,ctypes.c_char_p,ctypes.c_void_p,ctypes.c_size_t,ctypes.c_uint32,ctypes.c_int];getter.restype=ctypes.c_ssize_t
 attrs={}
 for attr in buf.raw.split(b'\0'):
  if not attr:continue
  n=getter(name,attr,None,0,0,0)
  if n<0:raise OSError('Cannot inspect extended attribute')
  value=ctypes.create_string_buffer(n)
  if getter(name,attr,value,n,0,0)!=n:raise OSError('Extended attribute changed')
  attrs[attr]=value.raw
 get_acl=_LIB.acl_get_file;get_acl.argtypes=[ctypes.c_char_p,ctypes.c_int];get_acl.restype=ctypes.c_void_p
 text_acl=_LIB.acl_to_text;text_acl.argtypes=[ctypes.c_void_p,ctypes.POINTER(ctypes.c_ssize_t)];text_acl.restype=ctypes.c_void_p
 free_acl=_LIB.acl_free;free_acl.argtypes=[ctypes.c_void_p];free_acl.restype=ctypes.c_int
 acl=get_acl(name,0x100)
 if not acl:
  error=ctypes.get_errno()
  if error==errno.ENOENT:return (s.st_uid,s.st_gid,getattr(s,'st_flags',0),attrs,b'')
  raise OSError(error,'Cannot inspect ACL')
 text=None
 try:
  length=ctypes.c_ssize_t();text=text_acl(acl,ctypes.byref(length))
  if not text:raise OSError('Cannot serialize ACL')
  acl_value=ctypes.string_at(text,length.value)
 finally:
  if text:free_acl(text)
  free_acl(acl)
 return (s.st_uid,s.st_gid,getattr(s,'st_flags',0),attrs,acl_value)

def _safe_parents(path,root):
 try:
  relative=path.relative_to(root)
  p=root
  if root.is_symlink() or not root.is_dir():return False
  for part in relative.parts[:-1]:
   p=p/part
   if not stat.S_ISDIR(p.lstat().st_mode):return False
  return True
 except (ValueError,OSError):return False

def _identity(s):return (s.st_dev,s.st_ino,s.st_size,s.st_mtime_ns,s.st_ctime_ns,s.st_mode)
def _digest(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
 return h.digest()

def _clone_file(source,target):
 if _CLONE is None:raise OSError('Native copy-on-write cloning is unavailable; no copy fallback')
 if _CLONE(os.fsencode(source),os.fsencode(target),0):raise OSError(ctypes.get_errno(),'Native clone failed')

def compact_file(source,target,source_root,target_root,apply=False,minimum_bytes=65536,cutoff_ns=None,hashes=None):
 if not _safe_parents(source,source_root) or not _safe_parents(target,target_root):return ('unsafe',0)
 a,b=_regular(source),_regular(target)
 if not a or not b:return ('unsafe',0)
 if a.st_size!=b.st_size or b.st_size<minimum_bytes or cutoff_ns is not None and b.st_mtime_ns>cutoff_ns:return ('ineligible',0)
 cache=hashes if hashes is not None else {}
 key=(str(source),_identity(a));digest=cache.get(key)
 if digest is None:digest=_digest(source);cache[key]=digest
 if _digest(target)!=digest:return ('different',0)
 if _regular(source) is None or _identity(source.lstat())!=_identity(a) or _identity(target.lstat())!=_identity(b):return ('changed',0)
 try:
  original_metadata=_metadata(target)
  if _metadata(source)!=original_metadata:return ('metadata_differs',0)
 except OSError:return ('metadata_unavailable',0)
 if not apply:return ('matched',b.st_size)
 tmp=target.with_name('.cow-'+uuid.uuid4().hex)
 try:
  _clone_file(source,tmp)
  if getattr(tmp.lstat(),'st_flags',0)!=getattr(b,'st_flags',0):os.chflags(tmp,getattr(b,'st_flags',0))
  # A source edited between hash and clone must never replace the old review.
  if _digest(tmp)!=digest or _metadata(tmp)!=original_metadata or not _safe_parents(target,target_root) or _regular(target) is None or _identity(target.lstat())!=_identity(b):return ('changed',0)
  os.chmod(tmp,stat.S_IMODE(b.st_mode));os.utime(tmp,ns=(b.st_atime_ns,b.st_mtime_ns))
  if _metadata(tmp)!=original_metadata or _regular(target) is None or _identity(target.lstat())!=_identity(b):return ('changed',0)
  os.replace(tmp,target)
  return ('cloned',b.st_size)
 except OSError:return ('clone_failed',0)
 finally:
  if tmp.exists():tmp.unlink()

def active_locations():
 ps=subprocess.run(['ps','-Ao','pid=,command='],capture_output=True,text=True,check=True)
 cwd=subprocess.run(['lsof','-a','-d','cwd','-Fn'],capture_output=True,text=True)
 if cwd.returncode not in (0,1) or not cwd.stdout.strip():raise RuntimeError('Cannot establish active working directories; no compaction performed')
 return (ps.stdout+'\n'+cwd.stdout).lower()

def eligible_review(review,root,cutoff,active):
 if review.parent!=root/'.play' or review.name=='releases' or review.is_symlink() or not review.is_dir() or review.stat().st_mtime_ns>cutoff:return False
 deps=review/'node_modules'
 if not (review/'src/game/sim.ts').is_file() or not (review/'package.json').is_file() or not deps.is_symlink() or deps.resolve()!=(root/'node_modules').resolve():return False
 return str(review).lower() not in active and ('.play/'+review.name).lower() not in active

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--apply',action='store_true');p.add_argument('--review');p.add_argument('--minimum-age-hours',type=float,default=24);args=p.parse_args()
 if args.minimum_age_hours<1:p.error('Keep at least the last hour of review files untouched')
 if _CLONE is None:raise RuntimeError('Native copy-on-write cloning is unavailable')
 play=ROOT/'.play';cutoff=time.time_ns()-int(args.minimum_age_hours*3600*1e9)
 files=subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().split('\0')
 files=[f for f in files if f and not f.startswith(('.play/','.vercel/','.git/','sources/'))]
 active=active_locations();candidates=[]
 for review in sorted(play.iterdir()):
  if args.review and review.name!=args.review:continue
  if not eligible_review(review,ROOT,cutoff,active):continue
  candidates.append(review)
 if args.review and not candidates:raise RuntimeError('Requested review is unavailable, recent, active or outside the safe snapshot layout')
 before=os.statvfs(ROOT);free_before=before.f_bavail*before.f_frsize;hashes={};rows=[]
 for review in candidates:
  # Recheck live processes before mutating each old snapshot.
  if args.apply:
   active=active_locations()
   if str(review).lower() in active or ('.play/'+review.name).lower() in active:continue
  counts={};size=0
  for relative in files:
   status,n=compact_file(ROOT/relative,review/relative,ROOT,review,args.apply,cutoff_ns=cutoff,hashes=hashes)
   counts[status]=counts.get(status,0)+1;size+=n
  row={'review':review.name,'counts':counts,'matchedLogicalBytes':size};rows.append(row);print(json.dumps(row),flush=True)
 after=os.statvfs(ROOT);report={'mode':'apply' if args.apply else 'plan','reviews':len(rows),'matchedLogicalBytes':sum(r['matchedLogicalBytes'] for r in rows),'filesystemFreeBefore':free_before,'filesystemFreeAfter':after.f_bavail*after.f_frsize,'filesystemFreeDelta':after.f_bavail*after.f_frsize-free_before,'note':'Free-space change includes other filesystem activity; APFS sharing means logical bytes are not a reclaim promise. All different files and all review source remain present.','rows':rows}
 if args.apply:
  path=play/('review-compaction-'+time.strftime('%Y%m%d-%H%M%S')+'.json');path.write_text(json.dumps(report,indent=2)+'\n');report['reportPath']=str(path)
 print(json.dumps({'summary':{k:v for k,v in report.items() if k!='rows'}}))
if __name__=='__main__':main()
