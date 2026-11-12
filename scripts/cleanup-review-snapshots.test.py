import gzip,hashlib,importlib.util,json,pathlib,subprocess,tempfile,unittest
SPEC=importlib.util.spec_from_file_location('cleanup',pathlib.Path(__file__).with_name('cleanup-review-snapshots.py'));m=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(m)
class CleanupTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.root=pathlib.Path(self.temp.name);(self.root/'.play').mkdir();(self.root/'node_modules').mkdir();self.review=self.make('finished');subprocess.run(['git','init','-q',str(self.root)],check=True)
 def tearDown(self):self.temp.cleanup()
 def make(self,name):
  d=self.root/'.play'/name;(d/'src/game').mkdir(parents=True);(d/'src/game/sim.ts').write_text('export const version = 1;\n');(d/'package.json').write_text('{}');(d/'node_modules').symlink_to(self.root/'node_modules');return d
 def test_guards_pending_active_symlink_dependencies_and_keep(self):
  self.assertTrue(m.candidate(self.review,self.root,''));self.assertFalse(m.candidate(self.review,self.root,str(self.review)));self.assertFalse(m.candidate(self.review,self.root,'.play/finished'))
  for name in m.PENDING:self.assertFalse(m.candidate(self.make(name),self.root,''))
  (self.review/'KEEP').touch();self.assertFalse(m.candidate(self.review,self.root,''));(self.review/'KEEP').unlink()
  (self.review/'node_modules').unlink();(self.review/'node_modules').mkdir();self.assertFalse(m.candidate(self.review,self.root,''))
  link=self.root/'.play/linked';link.symlink_to(self.review);self.assertFalse(m.candidate(link,self.root,''))
 def test_real_git_history_kept_empty_init_allowed(self):
  subprocess.run(['git','init','-q',str(self.review)],check=True);self.assertFalse(m.has_git_history(self.review));self.assertTrue(m.candidate(self.review,self.root,''))
  (self.review/'.git/objects/aa').mkdir();(self.review/'.git/objects/aa/blob').write_text('history');self.assertTrue(m.has_git_history(self.review));self.assertFalse(m.candidate(self.review,self.root,''))
 def test_unique_source_and_private_village_rescued_once_historical_bytes_from_git(self):
  src=self.review/'src/game/sim.ts';oid=subprocess.check_output(['git','hash-object','-w',str(src)],cwd=self.root,text=True).strip();archive=self.root/'.play/rescue';archive.mkdir()
  for rel,data in [('docs/unpublished.md','future plan'),('public/new-model.glb','originalmesh'),('.play/private-village.json','{"state":{"units":[1]}}'),('attachments/reference.txt','reference')]:
   p=self.review/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(data)
  record,before=m.snapshot_record(self.review,{oid},archive,self.root)
  self.assertEqual(record['files']['src/game/sim.ts']['storage'],'git');self.assertFalse((archive/'blobs'/(oid+'.gz')).exists())
  for rel in ['docs/unpublished.md','public/new-model.glb','.play/private-village.json','attachments/reference.txt']:
   row=record['files'][rel];self.assertEqual(gzip.decompress((archive/'blobs'/(row['gitBlob']+'.gz')).read_bytes()),(self.review/rel).read_bytes())
  count=len(list((archive/'blobs').iterdir()));m.snapshot_record(self.review,{oid},archive,self.root);self.assertEqual(len(list((archive/'blobs').iterdir())),count)
  ref=m.archive_snapshot_record(archive,record);payload=gzip.decompress((archive/ref['manifestFile']).read_bytes());self.assertEqual(json.loads(payload),record);self.assertEqual(hashlib.sha256(payload).hexdigest(),ref['manifestSha256']);m.atomic_json(archive/'manifest.json',{'snapshots':[ref]});m.remove_snapshot(self.review,self.root,before,lambda:'');self.assertFalse(self.review.exists());self.assertTrue((archive/'manifest.json').is_file())
 def test_omit_generated_and_disposable_images_keep_public_and_fixture_json(self):
  for path in ['.vercel/output/server.mjs','node_modules/library.js','.git/HEAD','screenshots/after.png','previews/demo.webp','artifacts/review.jpg','.play/build/server.js']:self.assertFalse(m.retained(path),path)
  for path in ['src/game/sim.ts','public/art.png','attachments/original.png','artifacts/evidence.json','.play/saved-village.json','docs/plan.md']:self.assertTrue(m.retained(path),path)
 def test_changed_file_or_new_file_prevents_deletion(self):
  before=m.inventory(self.review);(self.review/'src/game/sim.ts').write_text('changed');self.assertRaises(RuntimeError,m.remove_snapshot,self.review,self.root,before,lambda:'');self.assertTrue(self.review.exists())
  before=m.inventory(self.review);(self.review/'new-plan.md').write_text('new');self.assertRaises(RuntimeError,m.remove_snapshot,self.review,self.root,before,lambda:'');self.assertTrue(self.review.exists())
 def test_new_activity_or_monitor_failure_prevents_deletion(self):
  before=m.inventory(self.review);self.assertRaises(RuntimeError,m.remove_snapshot,self.review,self.root,before,lambda:str(self.review));self.assertTrue(self.review.exists())
  def failed():raise RuntimeError('monitor unavailable')
  self.assertRaises(RuntimeError,m.remove_snapshot,self.review,self.root,before,failed);self.assertTrue(self.review.exists())
 def test_corrupt_rescue_blob_cannot_authorize_deletion(self):
  p=self.review/'src/game/sim.ts';oid,sha,_=m.digest_file(p);archive=self.root/'.play/rescue';(archive/'blobs').mkdir(parents=True);(archive/'blobs'/(oid+'.gz')).write_bytes(gzip.compress(b'wrong'))
  self.assertRaises(RuntimeError,m.save_blob,p,archive,oid,sha);self.assertTrue(self.review.exists())
 def test_symlink_replacement_prevents_deletion(self):
  before=m.inventory(self.review);original=self.review;other=self.root/'.play/renamed';original.rename(other);original.symlink_to(other);self.assertRaises(RuntimeError,m.remove_snapshot,original,self.root,before,lambda:'');self.assertTrue(other.is_dir())
if __name__=='__main__':unittest.main()
