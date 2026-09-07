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
ACCEPTED_SVG_SHA="7511c9fd8ff9e833b22cd3d4af5e3e0a88dd435c17de665535e37ea0a5227dda"

def sha_bytes(data:bytes)->str:return hashlib.sha256(data).hexdigest()
def sha(p:Path)->str:return sha_bytes(p.read_bytes())
def accepted_svg_bytes()->bytes:
    m=re.search(rb'(<svg\b.*?</svg>)',ACCEPTED.read_bytes(),re.S)
    if not m: raise AssertionError("accepted artifact has no SVG")
    return m.group(1)

class AcceptedShovelInteractiveTests(unittest.TestCase):
    def test_visual_parent_is_frozen(self):
        self.assertEqual(sha(ACCEPTED),ACCEPTED_SHA)
        art=accepted_svg_bytes()
        self.assertEqual(sha_bytes(art),ACCEPTED_SVG_SHA)
        self.assertEqual(SOURCE.read_bytes().rstrip(b'\r\n'),art)

    def test_interactive_contains_exact_accepted_svg(self):
        expected=accepted_svg_bytes().decode('utf-8')
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
