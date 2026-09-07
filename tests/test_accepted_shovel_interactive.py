from __future__ import annotations
import hashlib, importlib.util, re, tempfile, unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/"studies/saint-andrews-shovel"
ACCEPTED=BASE/"accepted.html"
SOURCE=BASE/"source.svg"
DIST=BASE/"dist/index.html"
SHELL=BASE/"runtime/shell.html"
CSS=BASE/"runtime/runtime.css"
JS=BASE/"runtime/runtime.js"
BUILDER=ROOT/"tools/build_accepted_shovel_spa.py"
ACCEPTED_SHA="3218fe45e005fe2c2ae432b35fd25aea18e60e3ceec6adf1c855cb9c7015400b"
SOURCE_SHA="b4e94882f519d472c81048d72e5b3a10ce8f60bea3288d4bd0e4e2de758349a7"

def sha(p:Path)->str:return hashlib.sha256(p.read_bytes()).hexdigest()

class AcceptedShovelInteractiveTests(unittest.TestCase):
    def test_visual_parent_is_frozen(self):
        self.assertEqual(sha(ACCEPTED),ACCEPTED_SHA)
        self.assertEqual(sha(SOURCE),SOURCE_SHA)

    def test_interactive_contains_exact_accepted_svg(self):
        accepted=ACCEPTED.read_text()
        expected=re.search(r'(<svg\b.*?</svg>)',accepted,re.S).group(1)
        dist=DIST.read_text()
        m=re.search(r'<!-- ACCEPTED_SHOVEL_BEGIN[^>]* -->\n(.*?)\n<!-- ACCEPTED_SHOVEL_END -->',dist,re.S)
        self.assertIsNotNone(m)
        self.assertEqual(m.group(1),expected)

    def test_control_contract_is_present_and_raster_free(self):
        dist=DIST.read_text()
        for label in ("Assemble","Reference layout","Reset part","D-handle","Shaft","Socket","Blade","Move","Rotate","Scale","Light"):
            self.assertIn(f">{label}<",dist)
        low=dist.lower()
        self.assertNotIn("<image",low)
        self.assertNotIn("data:image/",low)
        self.assertIn("drag a part to pull only that part free",dist)
        self.assertIn(">8",dist)
        self.assertIn("only this part moves",dist)

    def test_builder_replays_identical_bytes(self):
        spec=importlib.util.spec_from_file_location("builder",BUILDER)
        mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
        with tempfile.TemporaryDirectory() as td:
            out=Path(td)/"index.html"
            mod.build(ACCEPTED,SHELL,CSS,JS,out)
            self.assertEqual(out.read_bytes(),DIST.read_bytes())

if __name__=="__main__":unittest.main()
