#!/usr/bin/env python3
from __future__ import annotations
import argparse,hashlib,json,time
from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont,ImageOps

ROOT=Path(__file__).resolve().parent.parent
SOURCES=[
 {"id":"ink-contact-sheet-v2","role":"canonical-contact-sheet","path":"/storage/emulated/0/Pictures/file_000000002ed48230afe64eda4f061e6c.png","sha256":"b7a993d5a2dd983764f567fe40f1a17613bf3523fe15dfff4fc7daee2df61fbb","grid":[5,2]},
 {"id":"pressure-valve-hires","role":"line-quality-reference","path":"/storage/emulated/0/Pictures/Fleshpunk/Fleshpunk_Pressure_Valve_Gate_BEST.png","sha256":"f3a1022019157ae819e74df5665392da7d31a249d690b02937f358572791c727"},
 {"id":"canary-hires","role":"line-quality-reference","path":"/storage/emulated/0/Pictures/Fleshpunk/fleshpunk-canary-ink-v1.png","sha256":"f93f7eb1002dca4a96e206caad7322f07d028d7585e638f25d6bbb6000f3aef7"}
]
EXCLUDED=[{"id":"colored-contact-sheet-v1","sha256":"c8a6aa1f0ff506722a3ef7ddf95da609e5005f9aa7d0c9a8797b22018731b12f","reason":"ink-only commission"}]

def sha(data:bytes)->str:return hashlib.sha256(data).hexdigest()
def atomic(path:Path,data:bytes):
 path.parent.mkdir(parents=True,exist_ok=True);tmp=path.with_name('.'+path.name+'.tmp');tmp.write_bytes(data);tmp.replace(path);assert path.read_bytes()==data

def source_image(spec):
 p=Path(spec['path']);data=p.read_bytes()
 if sha(data)!=spec['sha256']:raise SystemExit(f"SOURCE_HASH_MISMATCH:{spec['id']}")
 image=Image.open(p).convert('L');return p,data,image

def panels(image:Image.Image):
 cols,rows=5,2;w,h=image.size;panel_h=int(h*.93/rows);result=[]
 for row in range(rows):
  for col in range(cols):
   x0=round(col*w/cols);x1=round((col+1)*w/cols);y0=row*panel_h
   crop=image.crop((x0,y0+int(panel_h*.09),x1,y0+int(panel_h*.80)))
   result.append(crop)
 return result

def components(mask:np.ndarray)->int:
 small=np.asarray(Image.fromarray((mask*255).astype('uint8')).resize((128,96),Image.Resampling.NEAREST))>0
 seen=np.zeros_like(small,dtype=bool);count=0
 for y,x in zip(*np.where(small&~seen)):
  if seen[y,x]:continue
  q=[(y,x)];seen[y,x]=True;size=0
  while q:
   cy,cx=q.pop();size+=1
   for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
    ny,nx=cy+dy,cx+dx
    if 0<=ny<small.shape[0] and 0<=nx<small.shape[1] and small[ny,nx] and not seen[ny,nx]:seen[ny,nx]=True;q.append((ny,nx))
  if size>=3:count+=1
 return count

def metrics(image:Image.Image):
 sample=ImageOps.contain(image,(512,512));a=np.asarray(sample,dtype=np.uint8);ink=a<210;dark=a<75
 htrans=np.count_nonzero(ink[:,1:]!=ink[:,:-1]);vtrans=np.count_nonzero(ink[1:,:]!=ink[:-1,:]);boundary=max(1,htrans+vtrans)
 stroke=(2*np.count_nonzero(ink)/boundary)/min(a.shape)
 row=np.mean(ink,axis=1);col=np.mean(ink,axis=0)
 return {"inkRatio":float(np.mean(ink)),"darkRatio":float(np.mean(dark)),"strokeRatio":float(stroke),"transitionRatio":float(boundary/ink.size),"componentCount":components(ink),"rowRhythm":float(np.std(row)),"columnRhythm":float(np.std(col)),"aspect":float(image.width/image.height)}

def montage(images,binary=False):
 cells=[]
 for image in images:
  cell=ImageOps.contain(image,(232,158));canvas=Image.new('L',(240,166),255);canvas.paste(cell,((240-cell.width)//2,4));
  if binary:canvas=canvas.point(lambda v:0 if v<210 else 255)
  cells.append(canvas)
 sheet=Image.new('L',(1200,332),255)
 for i,cell in enumerate(cells):sheet.paste(cell,((i%5)*240,(i//5)*166))
 return sheet

def png_bytes(image):
 from io import BytesIO
 out=BytesIO();image.save(out,'PNG',optimize=True);return out.getvalue()

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--out',default=str(ROOT/'training'));args=parser.parse_args();out=Path(args.out);started=time.monotonic_ns()
 loaded=[];manifest=[]
 for spec in SOURCES:
  path,data,image=source_image(spec);loaded.append((spec,image));manifest.append({**spec,"path":str(path),"bytes":len(data),"width":image.width,"height":image.height,"mode":"L"})
 crops=panels(loaded[0][1]);samples=[*crops,loaded[1][1],loaded[2][1]];stats=[metrics(image) for image in samples]
 def med(key):return float(np.median([item[key] for item in stats]))
 corpus_hash=sha(''.join(item['sha256'] for item in SOURCES).encode())
 genome={"schema":"vector-noodle.ink-style-genome.v1","id":"fleshpunk-ink-v1","corpusHash":corpus_hash,"sampleCount":len(samples),"ink":"#11100d","paper":"#fffef9","strokeWidth":round(float(np.clip(med('strokeRatio')*800,1.5,3.8)),3),"secondaryStrokeRatio":0.58,"inkDensity":round(med('inkRatio'),6),"darkMarkRatio":round(med('darkRatio'),6),"transitionRatio":round(med('transitionRatio'),6),"componentMedian":round(med('componentCount')),"rowRhythm":round(med('rowRhythm'),6),"columnRhythm":round(med('columnRhythm'),6),"ribCount":int(np.clip(round(6+med('transitionRatio')*120),7,13)),"boltRadius":round(float(np.clip(1.5+med('darkRatio')*10,1.8,3.2)),3),"organicAmplitude":round(float(np.clip(12+med('rowRhythm')*90,14,28)),3),"explodedGap":round(float(np.clip(24+med('componentCount')*.8,28,52)),3),"rules":{"blackInkOnly":True,"shading":False,"rasterEmbedding":False,"deterministic":True}}
 manifest_doc={"schema":"vector-noodle.training-sources.v1","sources":manifest,"excluded":EXCLUDED,"segmentation":{"contactSheet":"five-by-two","artCropTopRatio":.09,"artCropBottomRatio":.80},"derivedCorpusHash":corpus_hash}
 atomic(out/'source-manifest.v1.json',(json.dumps(manifest_doc,indent=2,sort_keys=True)+'\n').encode());atomic(out/'style-genome.v1.json',(json.dumps(genome,indent=2,sort_keys=True)+'\n').encode());atomic(out/'metrics.v1.json',(json.dumps({"schema":"vector-noodle.ink-metrics.v1","samples":stats},indent=2,sort_keys=True)+'\n').encode());atomic(out/'stages'/'01-panel-crops.png',png_bytes(montage(crops)));atomic(out/'stages'/'02-ink-isolation.png',png_bytes(montage(crops,True)))
 glyph=Image.new('L',(1200,360),255);d=ImageDraw.Draw(glyph);sw=max(2,round(genome['strokeWidth']));d.rounded_rectangle((70,70,1130,290),30,outline=0,width=sw);d.ellipse((470,95,730,275),outline=0,width=sw)
 for i in range(genome['ribCount']):x=500+i*200/max(1,genome['ribCount']-1);d.arc((x-110,105,x+110,270),80,280,fill=0,width=max(1,round(sw*genome['secondaryStrokeRatio'])))
 for i in range(11):x=105+i*96;d.ellipse((x-3,175,x+3,181),fill=0)
 atomic(out/'stages'/'03-style-glyph.png',png_bytes(glyph));elapsed=(time.monotonic_ns()-started)//1_000_000
 print(json.dumps({"state":"TRAINED","corpusHash":corpus_hash,"genomeHash":sha((json.dumps(genome,indent=2,sort_keys=True)+'\n').encode()),"samples":len(samples),"elapsedMs":elapsed,"stages":3},sort_keys=True))
if __name__=='__main__':main()
