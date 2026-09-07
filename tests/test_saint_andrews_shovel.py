from pathlib import Path
import hashlib, subprocess, sys, tempfile, re

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'studies/saint-andrews-shovel/source.svg'
BUILD=ROOT/'tools/build_vector_study.py'

def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()

def test_source_is_raster_free_and_whole_object_only():
    s=SRC.read_text().lower()
    assert '<image' not in s and 'data:image/' not in s and '<script' not in s
    assert 'gripclip' in s and 'shaftsurfaceclip' in s
    assert 'wooddepth' in s and 'gundepth' in s and 'bladedepth' in s and 'ivorydepth' in s

def test_handle_grain_is_clipped():
    s=SRC.read_text()
    grain=[m.group(0) for m in re.finditer(r'<path d="M[^>]+stroke="#3d2414"[^>]*/>',s)]
    handle=[g for g in grain if float(re.search(r'd="M\s*[0-9.]+\s+([0-9.]+)',g).group(1)) < 160]
    assert handle and all('clip-path="url(#gripClip)"' in g for g in handle)

def test_build_is_byte_deterministic():
    with tempfile.TemporaryDirectory() as td:
        a=Path(td)/'a.html'; b=Path(td)/'b.html'
        subprocess.run([sys.executable,str(BUILD),str(SRC),str(a)],check=True,capture_output=True,text=True)
        subprocess.run([sys.executable,str(BUILD),str(SRC),str(b)],check=True,capture_output=True,text=True)
        assert digest(a)==digest(b)
