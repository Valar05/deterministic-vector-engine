import copy
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('noodle_server',ROOT/'tools'/'noodle_server.py')
server=importlib.util.module_from_spec(spec);spec.loader.exec_module(server)

class MechanismServerTest(unittest.TestCase):
 def accepted(self):
  curriculum=json.loads((ROOT/'training'/'wonder-sparse-v1'/'shovel-studies.json').read_text());study=copy.deepcopy(curriculum['study'])
  study['source']['verification']={'state':'VERIFIED','sha256':server.EXPECTED_SHOVEL_SHA}
  for view in server.VIEWS:
   study['review'][view]['referenceHidden']=True
   study['review'][view]['CATEGORY']=[{'size':size,'verdict':'RECOGNIZABLE','note':''} for size in server.REVIEW_SCALES]
   study['review'][view]['STRUCTURE']=[{'size':size,'verdict':'PRESERVED','note':''} for size in server.REVIEW_SCALES]
   for _,stroke in server.all_strokes(study):
    if stroke.get('visible',{}).get(view) is False:continue
    stroke['evidence'][view]={'CATEGORY':'POSITIVE','STRUCTURE':'NEUTRAL','NOISE':'NEUTRAL'}
  study['state']='USER_ACCEPTED';study['acceptance']={'verdict':'USER_ACCEPTED','authority':'USER_GESTURE','sourceSha256':server.EXPECTED_SHOVEL_SHA,'replayHash':None};study['acceptance']['replayHash']=server.acceptance_hash(study);return study
 def test_accepts_only_complete_human_mechanism_study(self):self.assertEqual(server.validate_user_accepted_study(self.accepted()),[])
 def test_persistence_is_atomic_and_content_addressed(self):
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp);receipt,failures=server.persist_user_accepted_study(self.accepted(),root);self.assertEqual(failures,[]);self.assertTrue((root/'shovel-accepted-mechanism.json').is_file());self.assertEqual(len(receipt),64);self.assertFalse((root/'shovel-accepted-mechanism.json.tmp').exists());self.assertTrue(server.accepted_study(root))
 def test_rejects_non_object_body(self):self.assertEqual(server.validate_user_accepted_study([]),['BAD_BODY'])
 def test_rejects_old_independent_exploded_payload(self):
  study=self.accepted();study['explodedStrokes']=[{'d':'M0 0L1 1'}];study['acceptance']['replayHash']=server.acceptance_hash(study);self.assertIn('INDEPENDENT_EXPLODED_GEOMETRY_FORBIDDEN',server.validate_user_accepted_study(study))
 def test_rejects_machine_fleshpunk_incomplete_structure_and_harmful_ink(self):
  study=self.accepted();study['acceptance']['authority']='MACHINE';study['source']['id']='fleshpunk';study['review']['EXPLODED']['STRUCTURE'][1]['verdict']='BROKEN';next(stroke for _,stroke in server.all_strokes(study) if stroke['visible']['EXPLODED'])['evidence']['EXPLODED']['NOISE']='POSITIVE'
  failures=server.validate_user_accepted_study(study);self.assertIn('FLESHPUNK_FORBIDDEN',failures);self.assertIn('STRUCTURE_REVIEW_INCOMPLETE:EXPLODED',failures);self.assertTrue(any(item.startswith('HARMFUL_STROKE_RETAINED') for item in failures));self.assertIn('HUMAN_ACCEPTANCE_MISSING',failures)
if __name__=='__main__':unittest.main()
