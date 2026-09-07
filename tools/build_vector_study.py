#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, re
from pathlib import Path

SHELL = '''<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">\n<title>{title}</title>\n<style>*{{box-sizing:border-box}}html,body{{margin:0;width:100%;height:100%;overflow:hidden;background:#bdae9e}}main{{width:100%;height:100%;display:grid;place-items:center}}svg{{display:block;width:100%;height:100%;max-width:100vw;max-height:100vh}}</style>\n</head><body data-build="dve-vector-study-v1"><main>{svg}</main></body></html>'''

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def validate(svg: str) -> None:
    if not svg.lstrip().startswith('<svg') or '</svg>' not in svg:
        raise SystemExit('source must be one SVG root')
    low=svg.lower()
    if '<image' in low or 'data:image/' in low or '<script' in low:
        raise SystemExit('raster/script content forbidden')
    if re.search(r'(?:href|src)=["\']https?://', svg, re.I):
        raise SystemExit('external assets forbidden')

def build(source: Path, output: Path, title: str, manifest: Path | None) -> dict:
    svg=source.read_text(encoding='utf-8')
    validate(svg)
    html=SHELL.format(title=title, svg=svg.strip()).encode('utf-8')
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(html)
    record={'source':str(source),'source_sha256':sha(svg.encode()),'output':str(output),'output_sha256':sha(html),'bytes':len(html)}
    if manifest:
        manifest.parent.mkdir(parents=True,exist_ok=True)
        manifest.write_text(json.dumps(record,indent=2,sort_keys=True)+'\n')
    return record

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('source',type=Path)
    ap.add_argument('output',type=Path)
    ap.add_argument('--title',default="Saint Andrew's Shovel — cognitive match study")
    ap.add_argument('--manifest',type=Path)
    a=ap.parse_args()
    print(json.dumps(build(a.source,a.output,a.title,a.manifest),sort_keys=True))
if __name__=='__main__': main()
