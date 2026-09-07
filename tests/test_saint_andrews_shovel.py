from pathlib import Path
import hashlib, subprocess, sys, tempfile

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'studies/saint-andrews-shovel/source.svg'
BUILD=ROOT/'tools/build_vector_study.py'

def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()

def test_source_is_raster_free_and_whole_object_only():
    s=SRC.read_text().lower()
    assert '<image' not in s and 'data:image/' not in s and '<script' not in s
    assert 'gripclip' in s and 'shaftclip' in s
    assert 'url(#woodgrain)' in s and 'clip-path="url(#gripclip)"' in s and 'clip-path="url(#shaftclip)"' in s

def test_handle_hair_regression_is_structurally_blocked():
    s=SRC.read_text().lower()
    assert '<pattern id="woodgrain"' in s
    assert '<rect x="409" y="52" width="206" height="62" rx="12" fill="url(#woodgrain)" clip-path="url(#gripclip)"' in s

def test_build_is_byte_deterministic():
    with tempfile.TemporaryDirectory() as td:
        a=Path(td)/'a.html'; b=Path(td)/'b.html'
        subprocess.run([sys.executable,str(BUILD),str(SRC),str(a)],check=True,capture_output=True,text=True)
        subprocess.run([sys.executable,str(BUILD),str(SRC),str(b)],check=True,capture_output=True,text=True)
        assert digest(a)==digest(b)
