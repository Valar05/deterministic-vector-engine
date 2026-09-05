import copy
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('noodle_server',ROOT/'tools'/'noodle_server.py');server=importlib.util.module_from_spec(spec);spec.loader.exec_module(server)
class CorrespondenceServerTest(unittest.TestCase):
 def accepted(self):
  study=copy.deepcopy(json.loads((ROOT/'training'/'wonder-sparse-v1'/'shovel-studies.json').read_text())['study']);study['source']['verification']={'state':'VERIFIED','sha256':server.EXPECTED_SOURCE_SHA}
  for edge in study['attachments']:edge['state']='EVIDENCED'
  for item in study['proofEvidence']:
   for axis in server.EVIDENCE_AXES:item[axis]='POSITIVE' if axis=='CATEGORY' else 'NEUTRAL'
  for item in study['interactionEvidence']:
   for axis in server.EVIDENCE_AXES:item[axis]='POSITIVE' if axis=='CATEGORY' else 'NEUTRAL'
  for view in server.VIEWS:
   study['review'][view]['referenceHidden']=True
   for axis,verdict in server.REVIEW_EXPECTED.items():study['review'][view][axis]=[{'size':size,'verdict':verdict,'note':''} for size in server.REVIEW_SCALES]
   for _,stroke in server.all_strokes(study):
    if stroke.get('visible',{}).get(view) is False:continue
    stroke['evidence'][view]={axis:('POSITIVE' if axis=='CATEGORY' else 'NEUTRAL') for axis in server.EVIDENCE_AXES}
  study['state']='USER_ACCEPTED';study['acceptance']={'verdict':'USER_ACCEPTED','authority':'USER_GESTURE','sourceSha256':server.EXPECTED_SOURCE_SHA,'replayHash':None};study['acceptance']['replayHash']=server.acceptance_hash(study);return study
 def test_accepts_only_complete_human_correspondence_study(self):self.assertEqual(server.validate_user_accepted_study(self.accepted()),[])
 def test_persistence_is_atomic_and_content_addressed(self):
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp);receipt,failures=server.persist_user_accepted_study(self.accepted(),root);self.assertEqual(failures,[]);self.assertTrue((root/'modern-object-01-accepted.json').is_file());self.assertEqual(len(receipt),64);self.assertFalse((root/'modern-object-01-accepted.json.tmp').exists());self.assertTrue(server.accepted_study(root))
 def test_rejects_pending_primitive_and_pairwise_proof(self):
  study=self.accepted();study['proofEvidence'][0]['CATEGORY']='PENDING';study['interactionEvidence'][0]['MECHANISM']='PENDING';study['acceptance']['replayHash']=server.acceptance_hash(study);failures=server.validate_user_accepted_study(study);self.assertTrue(any(x.startswith('PROOF_INCOMPLETE') for x in failures));self.assertTrue(any(x.startswith('PAIR_PROOF_INCOMPLETE') for x in failures))
 def test_rejects_fixed_parts_old_graph_and_unproven_contour(self):
  study=self.accepted();study['objectProgram']['selection']['requestedComponentCount']=4;study['landmarkGraph']={};del study['parts'][0]['strokes'][0]['sourceTrace'];study['acceptance']['replayHash']=server.acceptance_hash(study);failures=server.validate_user_accepted_study(study);self.assertIn('FIXED_COMPONENT_SELECTION_FORBIDDEN',failures);self.assertIn('BAGUETTE_SLICER_GRAPH_FORBIDDEN',failures);self.assertTrue(any(x.startswith('UNPROVEN_CONTOUR') for x in failures))
 def test_rejects_machine_fleshpunk_broken_instance_and_harmful_ink(self):
  study=self.accepted();study['acceptance']['authority']='MACHINE';study['source']['id']='fleshpunk';study['review']['EXPLODED']['INSTANCE'][1]['verdict']='WRONG_INSTANCE';next(stroke for _,stroke in server.all_strokes(study) if stroke['visible']['EXPLODED'])['evidence']['EXPLODED']['NOISE']='POSITIVE';failures=server.validate_user_accepted_study(study);self.assertIn('FLESHPUNK_FORBIDDEN',failures);self.assertIn('INSTANCE_REVIEW_INCOMPLETE:EXPLODED',failures);self.assertTrue(any(x.startswith('HARMFUL_STROKE_RETAINED') for x in failures));self.assertIn('HUMAN_ACCEPTANCE_MISSING',failures)
 def test_rejects_non_object_body(self):self.assertEqual(server.validate_user_accepted_study([]),['BAD_BODY'])
if __name__=='__main__':unittest.main()
