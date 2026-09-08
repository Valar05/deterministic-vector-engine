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
RUNTIME_SHA="108d7fb5466a04f7930032fcd2a85a67d5cf52889d525152c0aba181f27150fc"
PART_SHA={
    "01.js":"d1e9dbc7a48bc7fd77475310a9363562c091752a58b9b87ec570bbb3af27ece4",
    "02.js":"756292e43cfa9eba0a620b4a0f8e5f5153b645e5879d95d3c8600628d6ed2f4c",
    "03.js":"74138be3eb49688bc574138c3e4b2dca5d49a8e60997d347996422fa75675dfd",
    "04.js":"6c78ff9fef93e704d46d8082e7831ac754bbf47f520ede8a423f1cfe214a967b",
    "05.js":"7cd0a89a423735f2f271ca8f1ed8d5a87d49b0aa0131ad9e7f5b2387cd597e90",
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

    def test_runtime_uses_curved_contour_surfaces_not_paper_stack(self):
        js=RUNTIME.read_text()
        for token in (
            "vector-noodle-quaternion-curved-strip-surfaces",
            "betweenQ(","axisQ(","rotateV(","stripTransform(","profileSample(",
            "curve:'cylinder'","curve:'blade'","data-surface-side","data-strip",
            "Same material/albedo on both sides","brightness=(.70+.30*clamp(facing,0,1))",
            "Rotate 3D","3D vector"
        ):
            self.assertIn(token,js)
        self.assertNotIn("brightness(.42)",js)
        self.assertNotIn("slices=7",js)
        self.assertNotIn("vector-noodle-beveled-box-quaternion-extrusion",js)
        self.assertNotIn("WebGL",js)
        self.assertNotIn("<canvas",js.lower())

    def test_touch_contract_and_controls_are_preserved(self):
        shell=SHELL.read_text();css=CSS.read_text();js=RUNTIME.read_text()
        for label in ("Assemble","Reference layout","Reset part","D-handle","Shaft","Socket","Blade","Move","Rotate","Scale","Light"):
            self.assertIn(f">{label}<",shell)
        self.assertIn("min-height:44px",css)
        self.assertIn("touch-action:none",css)
        self.assertIn("mode==='move'||mode==='rotate'||mode==='scale'",js)
        self.assertIn("only this part moves",js)
        self.assertIn("Math.hypot(p.x-gesture.start.x,p.y-gesture.start.y)>8",js)

    def test_assembled_surface_is_still_frozen_parent(self):
        shell=SHELL.read_text()
        self.assertIn('{{ACCEPTED_SVG}}',shell)
        self.assertIn(ACCEPTED_SHA,shell)
        self.assertIn('dve-accepted-shovel-interactive-v4-contour-3d',shell)

if __name__=="__main__":unittest.main()
