#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, re
from pathlib import Path

EXPECTED_ACCEPTED_SHA256="3218fe45e005fe2c2ae432b35fd25aea18e60e3ceec6adf1c855cb9c7015400b"
EXPECTED_RUNTIME_SHA256="108d7fb5466a04f7930032fcd2a85a67d5cf52889d525152c0aba181f27150fc"
EXPECTED_PART_SHA256={
    "01.js":"d1e9dbc7a48bc7fd77475310a9363562c091752a58b9b87ec570bbb3af27ece4",
    "02.js":"756292e43cfa9eba0a620b4a0f8e5f5153b645e5879d95d3c8600628d6ed2f4c",
    "03.js":"74138be3eb49688bc574138c3e4b2dca5d49a8e60997d347996422fa75675dfd",
    "04.js":"6c78ff9fef93e704d46d8082e7831ac754bbf47f520ede8a423f1cfe214a967b",
    "05.js":"7cd0a89a423735f2f271ca8f1ed8d5a87d49b0aa0131ad9e7f5b2387cd597e90",
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
