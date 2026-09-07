#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, re
from pathlib import Path

EXPECTED_ACCEPTED_SHA256="3218fe45e005fe2c2ae432b35fd25aea18e60e3ceec6adf1c855cb9c7015400b"
EXPECTED_RUNTIME_SHA256="a3a8b7497f504cdb17ac1c30831b2b125bcf5fcc42ac970f3d0c292f3914e3f4"
EXPECTED_PART_SHA256={
    "01.js":"8e55892e6e88223ebec840bb7e5e3dea9be2cb991c001a965ac331a5695a8291",
    "02.js":"fcdc062a3144dc506e0a30044289d6f56ce66fbbdd95033edff6b451b8223ad0",
    "03.js":"5688d5493445f32c2bce22cbe7ef41c11d6e2d14853bfb654c927e2c36c5c28c",
    "04.js":"5a18394fa9bb9cb38511661a5a9881c06b8c983d7c1cc69a9d88f71f9b321cae",
    "05.js":"d206a42debafb69915ed784b5e2219408b0158d0ca14c229ad39e212faa20297",
}

def sha(data: bytes)->str:
    return hashlib.sha256(data).hexdigest()

def extract_svg(html: str)->str:
    m=re.search(r'(<svg\b.*?</svg>)',html,re.S)
    if not m:
        raise SystemExit("accepted artifact has no SVG")
    return m.group(1)

def assemble_runtime(parts_dir:Path)->bytes:
    chunks=[]
    for name,expected in EXPECTED_PART_SHA256.items():
        data=(parts_dir/name).read_bytes()
        actual=sha(data)
        if actual!=expected:
            raise SystemExit(f"runtime chunk {name} changed: {actual} != {expected}")
        chunks.append(data)
    runtime=b"".join(chunks)
    actual=sha(runtime)
    if actual!=EXPECTED_RUNTIME_SHA256:
        raise SystemExit(f"assembled runtime changed: {actual} != {EXPECTED_RUNTIME_SHA256}")
    return runtime

def build(accepted:Path,shell:Path,css:Path,parts_dir:Path,runtime:Path,output:Path)->bytes:
    accepted_bytes=accepted.read_bytes()
    actual=sha(accepted_bytes)
    if actual!=EXPECTED_ACCEPTED_SHA256:
        raise SystemExit(f"accepted shovel changed: {actual} != {EXPECTED_ACCEPTED_SHA256}")
    svg=extract_svg(accepted_bytes.decode("utf-8"))
    runtime_bytes=assemble_runtime(parts_dir)
    runtime.parent.mkdir(parents=True,exist_ok=True)
    runtime.write_bytes(runtime_bytes)
    template=shell.read_text(encoding="utf-8")
    for token in ("{{ACCEPTED_SVG}}","{{CSS}}","{{JS}}"):
        if template.count(token)!=1:
            raise SystemExit(f"shell token invalid: {token}")
    html=(template
          .replace("{{ACCEPTED_SVG}}",svg)
          .replace("{{CSS}}",css.read_text(encoding="utf-8"))
          .replace("{{JS}}",runtime_bytes.decode("utf-8")))
    data=html.encode("utf-8")
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_bytes(data)
    return data

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--accepted",type=Path,default=Path("studies/saint-andrews-shovel/accepted.html"))
    ap.add_argument("--shell",type=Path,default=Path("studies/saint-andrews-shovel/runtime/shell.html"))
    ap.add_argument("--css",type=Path,default=Path("studies/saint-andrews-shovel/runtime/runtime.css"))
    ap.add_argument("--parts-dir",type=Path,default=Path("studies/saint-andrews-shovel/runtime/3d"))
    ap.add_argument("--runtime",type=Path,default=Path("studies/saint-andrews-shovel/runtime/runtime.js"))
    ap.add_argument("--output",type=Path,default=Path("studies/saint-andrews-shovel/dist/index.html"))
    a=ap.parse_args()
    data=build(a.accepted,a.shell,a.css,a.parts_dir,a.runtime,a.output)
    print(f"runtime_sha256={EXPECTED_RUNTIME_SHA256} output_sha256={sha(data)} bytes={len(data)}")

if __name__=="__main__":
    main()
