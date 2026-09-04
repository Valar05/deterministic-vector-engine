#!/usr/bin/env python3
import argparse, json, re, sys, tempfile
from pathlib import Path
from xml.etree import ElementTree as ET
ALLOWED={'svg','title','desc','g','path'}; CMDS=set('MLCQZ'); INK='#171717'; WEIGHTS={'8','5','3'}
def local(tag): return tag.rsplit('}',1)[-1]
def validate(path):
 errors=[]; raw=Path(path).read_text(); root=ET.fromstring(raw)
 if local(root.tag)!='svg' or root.attrib.get('viewBox')!='0 0 800 1000': errors.append('canvas')
 paths=[]
 for e in root.iter():
  tag=local(e.tag)
  if tag not in ALLOWED: errors.append('element:'+tag)
  for banned in ('opacity','filter','mask','clip-path','style','transform','href'):
   if banned in e.attrib: errors.append('attribute:'+banned)
  if tag=='g':
   if e.attrib.get('fill')!='none': errors.append('fill')
   if e.attrib.get('stroke')!=INK: errors.append('ink')
   if e.attrib.get('stroke-width') not in WEIGHTS: errors.append('weight')
   if e.attrib.get('stroke-linecap')!='round' or e.attrib.get('stroke-linejoin')!='round': errors.append('stroke-shape')
  if tag=='path':
   paths.append(e); cmds=set(re.findall(r'[A-Za-z]',e.attrib.get('d','')))
   if not cmds or not cmds<=CMDS: errors.append('commands')
 if not 45<=len(paths)<=110: errors.append('path-count:'+str(len(paths)))
 for word in ('<image','<filter','<linearGradient','<radialGradient','<pattern','data:image','<script'):
  if word.lower() in raw.lower(): errors.append('forbidden:'+word)
 return sorted(set(errors)),len(paths)
def self_test():
 good='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">'+''.join('<g fill="none" stroke="#171717" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M 1 1 L 2 2"/></g>' for _ in range(45))+'</svg>'
 bad=good.replace('</svg>','<image href="secret.jpg"/></svg>')
 with tempfile.TemporaryDirectory() as td:
  p=Path(td)/'g.svg'; p.write_text(good); q=Path(td)/'b.svg'; q.write_text(bad)
  assert not validate(p)[0]; assert validate(q)[0]
 print('negative-controls: PASS')
if __name__=='__main__':
 ap=argparse.ArgumentParser(); ap.add_argument('svg',nargs='?'); ap.add_argument('--self-test',action='store_true'); a=ap.parse_args()
 if a.self_test: self_test()
 if a.svg:
  err,n=validate(a.svg); print(json.dumps({'file':a.svg,'paths':n,'errors':err})); sys.exit(bool(err))
