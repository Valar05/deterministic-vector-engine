import importlib.util,json,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def load_module(name,path):
 spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
builder=load_module("wonder_builder",ROOT/"tools/build_wonder_corpus.py")
class WonderCorpusTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.manifest=json.loads((ROOT/"training/wonder-v2/corpus-manifest.json").read_text());cls.index=json.loads((ROOT/"training/wonder-v2/derived/index.json").read_text());cls.study=json.loads((ROOT/"training/wonder-v2/causal-study.json").read_text())
 def test_exact_sources_and_panels(self):
  self.assertEqual(builder.verify_sources(self.manifest),[]);self.assertEqual(len(self.manifest["sources"]),11);self.assertEqual(len(builder.panel_specs(self.manifest)),110);self.assertEqual(self.manifest["transformationQuartetCount"],25)
 def test_source_hash_ablation_fails_closed(self):
  changed=json.loads(json.dumps(self.manifest));changed["sources"][0]["sha256"]="0"*64;self.assertIn("HASH_MISMATCH:punnett-ancestral-pressure-module",builder.verify_sources(changed))
 def test_derived_index_binds_current_manifest(self):
  import hashlib
  self.assertEqual(self.index["sourceManifestHash"],hashlib.sha256((ROOT/"training/wonder-v2/corpus-manifest.json").read_bytes()).hexdigest())
 def test_all_panel_ids_unique_and_derived(self):
  ids=[p["id"] for p in self.index["panels"]];self.assertEqual(len(ids),110);self.assertEqual(len(set(ids)),110);self.assertGreater(sum(p["paths"] for p in self.index["panels"]),10000)
 def test_centerline_candidates_are_cubic_and_unaccepted(self):
  record=self.index["panels"][0];graph=json.loads((ROOT/record["graph"]).read_text());self.assertEqual(graph["status"],"TEACHER_PROPOSAL");self.assertFalse(graph["accepted"]);self.assertTrue(any(" C " in p["d"] for p in graph["paths"]))
 def test_all_quartets_have_causal_program_and_correspondence(self):
  self.assertEqual(len(self.study["studies"]),25)
  for s in self.study["studies"]:self.assertTrue(s["editProgram"]["proposition"] and s["editProgram"]["preserve"] and s["editProgram"]["propagate"] and s["correspondences"])
 def test_leave_one_out_has_no_identity_leak(self):
  loo=self.study["leaveOneOut"];self.assertEqual((loo["passed"],loo["total"]),(20,25))
  for result in loo["results"]:self.assertNotIn(result["heldOut"],[n["id"] for n in result["neighbors"]])
 def test_weapon_mutations_require_human_labels(self):
  self.assertEqual(self.study["weaponMutations"],"HUMAN_LABEL_REQUIRED");self.assertTrue(all(v=="HUMAN_LABEL_REQUIRED" for v in self.manifest["weaponMutationLabels"].values()))
 def test_machine_does_not_claim_artistic_acceptance(self):
  self.assertFalse(self.study["accepted"]);self.assertEqual(self.study["state"],"STRUCTURAL_STUDY_COMPLETE_AWAITING_HUMAN");runtime=(ROOT/"src/vector-imagegen.mjs").read_text().lower();self.assertNotIn("causal-study",runtime);self.assertNotIn("scipy",runtime);self.assertNotIn("pillow",runtime)
if __name__=="__main__":unittest.main()
