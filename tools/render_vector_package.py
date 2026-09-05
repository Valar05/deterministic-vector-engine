#!/usr/bin/env python3
import argparse,json
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont

def pts(op,s,dx,dy):return [(round(x*s+dx),round(y*s+dy)) for x,y in op['points']]
def render_ops(draw,ops,s,dx,dy):
 for op in ops:
  width=max(1,round(op.get('w',1)*s));kind=op['type']
  if kind=='line':draw.line((op['x1']*s+dx,op['y1']*s+dy,op['x2']*s+dx,op['y2']*s+dy),fill=(17,16,13),width=width)
  elif kind=='ellipse':draw.ellipse((dx+(op['cx']-op['rx'])*s,dy+(op['cy']-op['ry'])*s,dx+(op['cx']+op['rx'])*s,dy+(op['cy']+op['ry'])*s),outline=(17,16,13),width=width)
  else:
   p=pts(op,s,dx,dy)
   if op.get('closed'):p.append(p[0])
   draw.line(p,fill=(17,16,13),width=width,joint='curve')
def main():
 a=argparse.ArgumentParser();a.add_argument('package');a.add_argument('output');x=a.parse_args();pack=json.loads(Path(x.package).read_text());im=Image.new('RGB',(1536,1024),(255,254,249));d=ImageDraw.Draw(im)
 try:font=ImageFont.truetype('/system/fonts/RobotoMono-Regular.ttf',13)
 except OSError:font=ImageFont.load_default()
 for i,item in enumerate(pack['images']):
  ox=(i%5)*307.2;oy=(i//5)*512;d.rectangle((ox,oy,ox+307.2,oy+512),outline=(17,16,13),width=1);render_ops(d,item['graph']['ops'],.384,ox,oy+55);d.text((ox+16,oy+14),f"{i+1:02d} {item['intent']['prompt'][:30].upper()}",font=font,fill=(17,16,13));d.text((ox+16,oy+485),item['svgHash'][:16],font=font,fill=(17,16,13))
 out=Path(x.output);out.parent.mkdir(parents=True,exist_ok=True);tmp=out.with_name('.'+out.name+'.tmp');im.save(tmp,'PNG',optimize=True);tmp.replace(out);assert Image.open(out).size==(1536,1024);print(json.dumps({'state':'RENDERED','path':str(out),'width':1536,'height':1024}))
if __name__=='__main__':main()
