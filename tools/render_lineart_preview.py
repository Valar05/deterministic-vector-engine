#!/usr/bin/env python3
import argparse, math, re
from pathlib import Path
from xml.etree import ElementTree as ET
from PIL import Image, ImageDraw
TOK=re.compile(r'[MLCQZmlcqz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?')
def sample(d):
 t=TOK.findall(d); i=0; cmd=None; cur=(0.,0.); start=cur; parts=[]; pts=[]
 def add(p):
  nonlocal pts; pts.append(p)
 while i<len(t):
  if t[i].isalpha(): cmd=t[i].upper(); i+=1
  if cmd=='M':
   if pts: parts.append(pts); pts=[]
   cur=(float(t[i]),float(t[i+1])); i+=2; start=cur; add(cur); cmd='L'
  elif cmd=='L':
   cur=(float(t[i]),float(t[i+1])); i+=2; add(cur)
  elif cmd=='C':
   p0=cur; p1=(float(t[i]),float(t[i+1])); p2=(float(t[i+2]),float(t[i+3])); p3=(float(t[i+4]),float(t[i+5])); i+=6
   for n in range(1,25):
    u=n/24; v=1-u; add((v**3*p0[0]+3*v*v*u*p1[0]+3*v*u*u*p2[0]+u**3*p3[0],v**3*p0[1]+3*v*v*u*p1[1]+3*v*u*u*p2[1]+u**3*p3[1]))
   cur=p3
  elif cmd=='Q':
   p0=cur; p1=(float(t[i]),float(t[i+1])); p2=(float(t[i+2]),float(t[i+3])); i+=4
   for n in range(1,21):
    u=n/20; v=1-u; add((v*v*p0[0]+2*v*u*p1[0]+u*u*p2[0],v*v*p0[1]+2*v*u*p1[1]+u*u*p2[1]))
   cur=p2
  elif cmd=='Z': add(start); parts.append(pts); pts=[]; cmd=None
  else: raise ValueError('unsupported command')
 if pts: parts.append(pts)
 return parts
def render(src,dst,size=1000):
 root=ET.parse(src).getroot(); image=Image.new('RGB',(800,1000),'white'); draw=ImageDraw.Draw(image)
 for g in root:
  if g.tag.endswith('g'):
   width=int(float(g.attrib['stroke-width']))
   for p in g:
    if p.tag.endswith('path'):
     for pts in sample(p.attrib['d']):
      xy=[(round(x),round(y)) for x,y in pts]; draw.line(xy,fill='#171717',width=width,joint='curve')
      rad=width//2
      for x,y in (xy[0],xy[-1]): draw.ellipse((x-rad,y-rad,x+rad,y+rad),fill='#171717')
 image.save(dst)
if __name__=='__main__':
 ap=argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('dst'); a=ap.parse_args(); render(a.src,a.dst)
