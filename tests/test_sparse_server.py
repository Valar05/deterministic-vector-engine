import copy
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('noodle_server',ROOT/'tools'/'noodle_server.py')
server=importlib.util.module_from_spec(spec);spec.loader.exec_module(server)
class SparseServerTest(unittest.TestCase):
 def accepted(self):
  curriculum=json.loads((ROOT/'training'/'wonder-sparse-v1'/'shovel-studies.json').read_text());study=copy.deepcopy(curriculum['studies'][0]);study['source']['verification']={'state':'VERIFIED','sha256':server.EXPECTED_SHOVEL_SHA};study['review']['scales']=[{'size':size,'verdict':'RECOGNIZABLE','note':''} for size in server.REVIEW_SCALES]
  for stroke in study['strokes']: stroke['ablationImportance']='ESSENTIAL'
  study['review']['referenceHidden']=True;study['state']='USER_ACCEPTED';study['acceptance']={'verdict':'USER_ACCEPTED','authority':'USER_GESTURE','sourceSha256':server.EXPECTED_SHOVEL_SHA,'replayHash':None};study['acceptance']['replayHash']=server.acceptance_hash(study);return study
 def test_accepts_only_complete_human_modern_study(self): self.assertEqual(server.validate_user_accepted_study(self.accepted()),[])
 def test_persistence_is_atomic_and_content_addressed(self):
  with tempfile.TemporaryDirectory() as temp:
   receipt,failures=server.persist_user_accepted_study(self.accepted(),Path(temp));self.assertEqual(failures,[]);target=Path(temp)/'shovel-accepted-assembled.json';self.assertTrue(target.is_file());self.assertEqual(len(receipt),64);self.assertFalse(target.with_suffix('.json.tmp').exists());self.assertEqual(server.load_accepted_views(Path(temp)),['ASSEMBLED'])
 def test_rejects_non_object_body(self): self.assertEqual(server.validate_user_accepted_study([]),['BAD_BODY'])
 def test_rejects_machine_fleshpunk_and_incomplete_scale(self):
  study=self.accepted();study['acceptance']['authority']='MACHINE';study['source']['id']='fleshpunk';study['review']['scales'][1]['verdict']='GENERIC';failures=server.validate_user_accepted_study(study);self.assertIn('FLESHPUNK_FORBIDDEN',failures);self.assertIn('SCALE_REVIEW_INCOMPLETE',failures);self.assertIn('HUMAN_ACCEPTANCE_MISSING',failures)
if __name__=='__main__': unittest.main()
