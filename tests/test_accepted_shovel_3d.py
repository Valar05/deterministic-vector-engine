from __future__ import annotations
import hashlib, unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/"studies/saint-andrews-shovel"
ACCEPTED=BASE/"accepted.html"
RUNTIME=BASE/"runtime/runtime.js"
PARTS=BASE/"runtime/3d"
SHELL=BASE/"runtime/shell.html"
CSS=BASE/"runtime/runtime.css"
ACCEPTED_SHA="3218fe45e005fe2c2ae432b35fd25aea18e60e3ceec6adf1c855cb9c7015400b"
RUNTIME_SHA="a3a8b7497f504cdb17ac1c30831b2b125bcf5fcc42ac970f3d0c292f3914e3f4"
PART_SHA={
    "01.js":"8e55892e6e88223ebec840bb7e5e3dea9be2cb991c001a965ac331a5695a8291",
    "02.js":"fcdc062a3144dc506e0a30044289d6f56ce66fbbdd95033edff6b451b8223ad0",
    "03.js":"5688d5493445f32c2bce22cbe7ef41c11d6e2d14853bfb654c927e2c36c5c28c",
    "04.js":"5a18394fa9bb9cb38511661a5a9881c06b8c983d7c1cc69a9d88f71f9b321cae",
    "05.js":"d206a42debafb69915ed784b5e2219408b0158d0ca14c229ad39e212faa20297",
}

def sha(data:bytes)->str:return hashlib.sha256(data).hexdigest()

class AcceptedShovel3DTests(unittest.TestCase):
    def test_accepted_art_remains_frozen(self):
        self.assertEqual(sha(ACCEPTED.read_bytes()),ACCEPTED_SHA)

    def test_runtime_chunks_and_assembly_are_exact(self):
        chunks=[]
        for name,expected in PART_SHA.items():
            data=(PARTS/name).read_bytes()
            self.assertEqual(sha(data),expected,name)
            chunks.append(data)
        joined=b"".join(chunks)
        self.assertEqual(sha(joined),RUNTIME_SHA)
        self.assertEqual(RUNTIME.read_bytes(),joined)

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
        shell=SHELL.read_text();css=CSS.read_text();js=RUNTIME.read_text()
        for label in ("Assemble","Reference layout","Reset part","D-handle","Shaft","Socket","Blade","Move","Rotate","Scale","Light"):
            self.assertIn(f">{label}<",shell)
        self.assertIn("min-height:44px",css)
        self.assertIn("touch-action:none",css)
        self.assertIn("mode==='rotate'||mode==='scale'",js)
        self.assertIn("only this part moves",js)
        self.assertIn("Math.hypot(p.x-gesture.start.x,p.y-gesture.start.y)>8",js)

    def test_assembled_surface_is_still_frozen_parent(self):
        shell=SHELL.read_text()
        self.assertIn('{{ACCEPTED_SVG}}',shell)
        self.assertIn(ACCEPTED_SHA,shell)
        self.assertIn('dve-accepted-shovel-interactive-v3-3d',shell)

if __name__=="__main__":unittest.main()
