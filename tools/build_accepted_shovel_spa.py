#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, re
from pathlib import Path

EXPECTED_ACCEPTED_SHA256="3218fe45e005fe2c2ae432b35fd25aea18e60e3ceec6adf1c855cb9c7015400b"

def sha(data: bytes)->str:
    return hashlib.sha256(data).hexdigest()

def extract_svg(html: str)->str:
    m=re.search(r'(<svg\b.*?</svg>)',html,re.S)
    if not m: raise SystemExit("accepted artifact has no SVG")
    return m.group(1)

def build(accepted:Path,shell:Path,css:Path,js:Path,output:Path)->bytes:
    accepted_bytes=accepted.read_bytes()
    actual=sha(accepted_bytes)
    if actual!=EXPECTED_ACCEPTED_SHA256:
        raise SystemExit(f"accepted shovel changed: {actual} != {EXPECTED_ACCEPTED_SHA256}")
    svg=extract_svg(accepted_bytes.decode("utf-8"))
    template=shell.read_text(encoding="utf-8")
    for token in ("{{ACCEPTED_SVG}}","{{CSS}}","{{JS}}"):
        if template.count(token)!=1: raise SystemExit(f"shell token invalid: {token}")
    html=template.replace("{{ACCEPTED_SVG}}",svg).replace("{{CSS}}",css.read_text(encoding="utf-8")).replace("{{JS}}",js.read_text(encoding="utf-8"))
    data=html.encode("utf-8")
    output.parent.mkdir(parents=True,exist_ok=True);output.write_bytes(data)
    return data

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--accepted",type=Path,default=Path("studies/saint-andrews-shovel/accepted.html"))
    ap.add_argument("--shell",type=Path,default=Path("studies/saint-andrews-shovel/runtime/shell.html"))
    ap.add_argument("--css",type=Path,default=Path("studies/saint-andrews-shovel/runtime/runtime.css"))
    ap.add_argument("--js",type=Path,default=Path("studies/saint-andrews-shovel/runtime/runtime.js"))
    ap.add_argument("--output",type=Path,default=Path("studies/saint-andrews-shovel/dist/index.html"))
    a=ap.parse_args();data=build(a.accepted,a.shell,a.css,a.js,a.output);print(f"sha256={sha(data)} bytes={len(data)}")

if __name__=="__main__":main()
