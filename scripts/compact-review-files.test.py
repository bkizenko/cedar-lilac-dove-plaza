import importlib.util,pathlib,tempfile,unittest,os,sys,stat,ctypes
sys.dont_write_bytecode=True
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('compact',pathlib.Path(__file__).with_name('compact-review-files.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Tests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.root=pathlib.Path(self.temp.name);self.source=self.root/'canonical';self.review=self.root/'review';self.source.mkdir();self.review.mkdir();self.a=self.source/'asset';self.b=self.review/'asset';self.a.write_bytes(b'a'*70000);self.b.write_bytes(self.a.read_bytes())
 def tearDown(self):self.temp.cleanup()
 def run_file(self,**kw):return m.compact_file(self.a,self.b,self.source,self.review,**kw)
 def test_plan_is_readonly_and_clone_keeps_both_edit_directions_independent(self):
  old=self.b.stat().st_ino;self.assertEqual(self.run_file(),('matched',70000));self.assertEqual(self.b.stat().st_ino,old)
  self.assertEqual(self.run_file(apply=True),('cloned',70000));self.assertNotEqual(self.b.stat().st_ino,self.a.stat().st_ino)
  self.a.write_bytes(b'c'*70000);self.assertEqual(self.b.read_bytes(),b'a'*70000);self.b.write_bytes(b'd'*70000);self.assertEqual(self.a.read_bytes(),b'c'*70000)
 def test_different_recent_and_linked_files_are_not_replaced(self):
  self.b.write_bytes(b'b'*70000);old=self.b.stat().st_ino;self.assertEqual(self.run_file(apply=True)[0],'different');self.assertEqual(self.b.stat().st_ino,old)
  self.b.write_bytes(self.a.read_bytes());self.assertEqual(self.run_file(apply=True,cutoff_ns=1)[0],'ineligible');self.b.unlink();self.b.symlink_to(self.a);self.assertEqual(self.run_file(apply=True)[0],'unsafe');self.b.unlink();os.link(self.a,self.b);self.assertEqual(self.run_file(apply=True)[0],'unsafe')
 def test_parent_symlink_and_source_race_leave_review_unchanged(self):
  nested=self.review/'nested';nested.symlink_to(self.source,target_is_directory=True);self.assertEqual(m.compact_file(self.a,nested/'asset',self.source,self.review,apply=True)[0],'unsafe')
  original=m._clone_file
  def changed(a,b):a.write_bytes(b'x'*70000);original(a,b)
  with patch.object(m,'_clone_file',changed):self.assertEqual(self.run_file(apply=True)[0],'changed')
  self.assertEqual(self.b.read_bytes(),b'a'*70000);self.assertEqual(list(self.review.glob('.cow-*')),[])
 def test_original_permissions_are_preserved_and_different_attributes_are_skipped(self):
  os.chmod(self.b,0o600);self.assertEqual(self.run_file(apply=True),('cloned',70000));self.assertEqual(stat.S_IMODE(self.b.stat().st_mode),0o600)
  setter=m._LIB.setxattr;setter.argtypes=[ctypes.c_char_p,ctypes.c_char_p,ctypes.c_void_p,ctypes.c_size_t,ctypes.c_uint32,ctypes.c_int];setter.restype=ctypes.c_int
  value=ctypes.create_string_buffer(b'qa')
  self.assertEqual(setter(os.fsencode(self.a),b'com.hearthwild.qa',value,2,0,0),0)
  old=self.b.stat().st_ino;self.assertEqual(self.run_file(apply=True)[0],'metadata_differs');self.assertEqual(self.b.stat().st_ino,old)
 def test_concurrent_review_replacement_is_never_overwritten(self):
  original=m._clone_file
  def changed(a,tmp):
   replacement=self.b.with_name('replacement');replacement.write_bytes(b'e'*70000);os.replace(replacement,self.b);original(a,tmp)
  with patch.object(m,'_clone_file',changed):self.assertEqual(self.run_file(apply=True)[0],'changed')
  self.assertEqual(self.b.read_bytes(),b'e'*70000)
 def test_recent_active_release_and_symlinked_reviews_are_excluded(self):
  play=self.source/'.play';play.mkdir();review=play/'old-review';review.mkdir();(review/'src/game').mkdir(parents=True);(review/'src/game/sim.ts').write_text('source');(review/'package.json').write_text('{}');(self.source/'node_modules').mkdir();(review/'node_modules').symlink_to(self.source/'node_modules',target_is_directory=True);os.utime(review,ns=(1,1))
  self.assertTrue(m.eligible_review(review,self.source,2,''));self.assertFalse(m.eligible_review(review,self.source,2,str(review)));self.assertFalse(m.eligible_review(review,self.source,2,'node server .play/old-review/output'))
  self.assertFalse(m.eligible_review(review,self.source,0,''));link=play/'linked';link.symlink_to(review,target_is_directory=True);self.assertFalse(m.eligible_review(link,self.source,2,''));release=play/'releases';review.rename(release);self.assertFalse(m.eligible_review(release,self.source,2,''))
 def test_tracked_file_flags_survive_native_clone(self):
  os.chflags(self.a,64);os.chflags(self.b,64)
  self.assertEqual(self.run_file(apply=True),('cloned',70000));self.assertEqual(self.b.stat().st_flags,64)
 def test_clone_failure_preserves_original_without_copy_fallback(self):
  old=self.b.stat().st_ino
  with patch.object(m,'_clone_file',side_effect=OSError('unsupported')):self.assertEqual(self.run_file(apply=True)[0],'clone_failed')
  self.assertEqual(self.b.stat().st_ino,old);self.assertEqual(self.b.read_bytes(),b'a'*70000)
if __name__=='__main__':unittest.main()
