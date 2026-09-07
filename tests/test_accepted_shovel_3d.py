from __future__ import annotations
import hashlib, unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/"studies/saint-andrews-shovel"
ACCEPTED=BASE/"accepted.html"
RUNTIME=BASE/"runtime/runtime.js"
SHELL=BASE/"runtime/shell.html"
CSS=BASE/"runtime/runtime.css"
ACCEPTED_SHA="3218fe45e005fe2c2ae432b35fd25aea18e60e3ceec6adf1c855cb9c7015400b"

class AcceptedShovel3DTests(unittest.TestCase):
    def test_accepted_art_remains_frozen(self):
        self.assertEqual(hashlib.sha256(ACCEPTED.read_bytes()).hexdigest(),ACCEPTED_SHA)

    def test_runtime_reuses_vector_noodle_3d_mechanism(self):
        js=RUNTIME.read_text()
        for token in (
            "vector-noodle-beveled-box-quaternion-extrusion",
            "betweenQ(","axisQ(","rotateV(","matrixFor(",
            "q:[1,0,0,0]","data-layer-kind","thickness=",
            "Rotate 3D","3D vector"
        ):
            self.assertIn(token,js)
        self.assertNotIn("WebGL",js)
        self.assertNotIn("<canvas",js.lower())

    def test_touch_contract_and_controls_are_preserved(self):
        shell=SHELL.read_text(); css=CSS.read_text(); js=RUNTIME.read_text()
        for label in ("Assemble","Reference layout","Reset part","D-handle","Shaft","Socket","Blade","Move","Rotate","Scale","Light"):
            self.assertIn(f">{label}<",shell)
        self.assertIn("min-height:44px",css)
        self.assertIn("touch-action:none",css)
        self.assertIn("mode==='rotate'||mode==='scale'",js)
        self.assertIn("only this part moves",js)
        self.assertIn("Math.hypot(p.x-gesture.start.x,p.y-gesture.start.y)>8",js)

    def test_assembled_surface_is_still_the_frozen_parent(self):
        shell=SHELL.read_text()
        self.assertIn('{{ACCEPTED_SVG}}',shell)
        self.assertIn(ACCEPTED_SHA,shell)
        self.assertIn('dve-accepted-shovel-interactive-v3-3d',shell)

if __name__=="__main__":unittest.main()
