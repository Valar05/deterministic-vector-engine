#!/usr/bin/env python3
import argparse, hashlib, json, math
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/'training/wonder-v2/corpus-manifest.json'
DERIVED=ROOT/'training/wonder-v2/derived'

def sha(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
 return h.hexdigest()

def verify_sources(manifest):
 failures=[]
 for s in manifest['sources']:
  p=Path(s['path'])
  if not p.is_file():failures.append('MISSING:'+s['id']);continue
  if sha(p)!=s['sha256']:failures.append('HASH_MISMATCH:'+s['id']);continue
  with Image.open(p) as im:
   if list(im.size)!=[s['width'],s['height']]:failures.append('DIMENSION_MISMATCH:'+s['id'])
 return failures

def cell_rect(w,h,col,cols,row,rows,labelled=False):
 x0=round(w*col/cols)+4;x1=round(w*(col+1)/cols)-4
 y0=round(h*row/rows)+(26 if labelled else 7);y1=round(h*(row+1)/rows)-5
 return [x0,y0,x1,y1]

def panel_specs(manifest):
 byid={s['id']:s for s in manifest['sources']};out=[]
 for q in manifest['transformationQuartets']:
  col=q['refs']['column'];group=q['group'];qid=q['id']
  if group=='utility':
   for state,source,row in [('normal_assembled','utility-normal',0),('normal_exploded','utility-normal',1),('flesh_assembled','utility-fleshpunk',0),('flesh_exploded','utility-fleshpunk',1)]:
    s=byid[source];out.append({'id':f'{qid}:{state}','quartet':qid,'source':source,'state':state,'rect':cell_rect(s['width'],s['height'],col,5,row,2,state.endswith('assembled'))})
  elif group=='infrastructure':
   source='infrastructure-transformations';s=byid[source]
   for state,c,r in [('normal_assembled',col,0),('normal_exploded',col,1),('flesh_assembled',col+5,0),('flesh_exploded',col+5,1)]:
    out.append({'id':f'{qid}:{state}','quartet':qid,'source':source,'state':state,'rect':cell_rect(s['width'],s['height'],c,10,r,2,state.endswith('assembled'))})
  else:
   source=group+'-transformations';s=byid[source]
   for state,row in [('normal_assembled',0),('normal_exploded',1),('flesh_assembled',2),('flesh_exploded',3)]:
    out.append({'id':f'{qid}:{state}','quartet':qid,'source':source,'state':state,'rect':cell_rect(s['width'],s['height'],col,5,row,4,state.endswith('assembled'))})
 for sid in manifest['macroStudies']:
  s=byid[sid];split=round(s['height']*.455)
  out.append({'id':f'{sid}:assembled','macro':sid,'source':sid,'state':'assembled','rect':[8,8,s['width']-8,split-3]})
  out.append({'id':f'{sid}:exploded','macro':sid,'source':sid,'state':'exploded','rect':[8,split+3,s['width']-8,s['height']-8]})
 return out

def isolate_ink(image,max_dim):
 rgb=np.asarray(image.convert('RGB'),dtype=np.float32)
 scale=min(1.0,max_dim/max(rgb.shape[:2]))
 if scale<1:
  image=image.resize((max(1,round(image.width*scale)),max(1,round(image.height*scale))),Image.Resampling.LANCZOS)
  rgb=np.asarray(image.convert('RGB'),dtype=np.float32)
 gray=rgb.mean(axis=2);local=ndimage.gaussian_filter(gray,5.0)
 chroma=rgb.max(axis=2)-rgb.min(axis=2)
 mask=((gray<205)&(gray<local-8)) | (gray<120) | ((chroma>22)&(gray<190)&(gray<local-3))
 mask=ndimage.binary_opening(mask,np.ones((2,2),bool))
 mask=ndimage.binary_closing(mask,np.ones((2,2),bool))
 mask[:2,:]=False;mask[-2:,:]=False;mask[:,:2]=False;mask[:,-2:]=False
 return mask

def thin(binary,max_iter=96):
 im=binary.astype(np.uint8).copy();im[[0,-1],:]=0;im[:,[0,-1]]=0
 for _ in range(max_iter):
  changed=False
  for phase in (0,1):
   p2=np.roll(im,1,0);p3=np.roll(np.roll(im,1,0),-1,1);p4=np.roll(im,-1,1);p5=np.roll(np.roll(im,-1,0),-1,1)
   p6=np.roll(im,-1,0);p7=np.roll(np.roll(im,-1,0),1,1);p8=np.roll(im,1,1);p9=np.roll(np.roll(im,1,0),1,1)
   n=p2+p3+p4+p5+p6+p7+p8+p9
   a=sum(term.astype(np.uint8) for term in [((p2==0)&(p3==1)),((p3==0)&(p4==1)),((p4==0)&(p5==1)),((p5==0)&(p6==1)),((p6==0)&(p7==1)),((p7==0)&(p8==1)),((p8==0)&(p9==1)),((p9==0)&(p2==1))])
   if phase==0:cond=(p2*p4*p6==0)&(p4*p6*p8==0)
   else:cond=(p2*p4*p8==0)&(p2*p6*p8==0)
   remove=(im==1)&(n>=2)&(n<=6)&(a==1)&cond
   remove[[0,-1],:]=False;remove[:,[0,-1]]=False
   if remove.any():im[remove]=0;changed=True
  if not changed:break
 return im.astype(bool)

def rdp(points,eps=1.25):
 if len(points)<3:return points
 a=np.array(points[0],float);b=np.array(points[-1],float);v=b-a
 arr=np.array(points,float)
 if np.dot(v,v)==0:d=np.linalg.norm(arr-a,axis=1)
 else:d=np.abs(v[0]*(arr[:,1]-a[1])-v[1]*(arr[:,0]-a[0]))/np.linalg.norm(v)
 i=int(np.argmax(d))
 if d[i]>eps:return rdp(points[:i+1],eps)[:-1]+rdp(points[i:],eps)
 return [points[0],points[-1]]

def trace_edges(skel):
 ys,xs=np.nonzero(skel);pixels={(int(x),int(y)) for y,x in zip(ys,xs)}
 dirs=[(-1,-1),(0,-1),(1,-1),(-1,0),(1,0),(-1,1),(0,1),(1,1)]
 def neigh(p):return [(p[0]+dx,p[1]+dy) for dx,dy in dirs if (p[0]+dx,p[1]+dy) in pixels]
 nodes={p for p in pixels if len(neigh(p))!=2};visited=set();paths=[]
 def key(a,b):return tuple(sorted((a,b)))
 for start in list(nodes)+list(pixels):
  for nxt in neigh(start):
   if key(start,nxt) in visited:continue
   path=[start,nxt];visited.add(key(start,nxt));prev,start2=start,nxt
   while start2 not in nodes or start2==start:
    options=[q for q in neigh(start2) if q!=prev and key(start2,q) not in visited]
    if not options:break
    q=options[0];visited.add(key(start2,q));path.append(q);prev,start2=start2,q
    if start2==start:break
   if len(path)>=7:paths.append(rdp(path))
 paths.sort(key=lambda p:sum(math.hypot(b[0]-a[0],b[1]-a[1]) for a,b in zip(p,p[1:])),reverse=True)
 return paths[:900]

def bezier(points):
 if len(points)<2:return ''
 pts=[(float(x),float(y)) for x,y in points];d=f'M {pts[0][0]:.1f} {pts[0][1]:.1f}'
 for i in range(len(pts)-1):
  p0=pts[i-1] if i else pts[i];p1=pts[i];p2=pts[i+1];p3=pts[i+2] if i+2<len(pts) else p2
  c1=(p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6);c2=(p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6)
  d+=f' C {c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}'
 return d

def graph_for(image,max_dim):
 mask=isolate_ink(image,max_dim);skel=thin(mask);paths=trace_edges(skel);h,w=skel.shape
 labels,count=ndimage.label(skel,np.ones((3,3),int));components=[]
 for label in range(1,count+1):
  yy,xx=np.nonzero(labels==label);n=len(xx)
  if n<8:continue
  components.append({'pixels':n,'cx':round(float(xx.mean()/w),4),'cy':round(float(yy.mean()/h),4),'width':round(float((xx.max()-xx.min()+1)/w),4),'height':round(float((yy.max()-yy.min()+1)/h),4)})
 components.sort(key=lambda c:c['pixels'],reverse=True)
 entries=[]
 for i,p in enumerate(paths):
  length=sum(math.hypot(b[0]-a[0],b[1]-a[1]) for a,b in zip(p,p[1:]));xs=[x for x,y in p];ys=[y for x,y in p];area=(max(xs)-min(xs))*(max(ys)-min(ys))/(w*h)
  role='PRIMARY_SILHOUETTE_CANDIDATE' if length>.28*(w+h) and area>.08 else 'STRUCTURE_CANDIDATE' if length>.07*(w+h) else 'DETAIL_OR_ANNOTATION_CANDIDATE'
  entries.append({'id':f'p{i:04d}','role':role,'length':round(length,2),'d':bezier(p)})
 return {'width':w,'height':h,'inkPixels':int(mask.sum()),'skeletonPixels':int(skel.sum()),'junctionPixels':int((ndimage.convolve(skel.astype(int),np.ones((3,3),int))-skel.astype(int)>3).sum()),'paths':entries,'components':components[:48]}

def svg_for(graph,title):
 paths=''.join(f'<path data-role="{p["role"]}" d="{p["d"]}"/>' for p in graph['paths'])
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {graph["width"]} {graph["height"]}" role="img" aria-label="{title}"><rect width="100%" height="100%" fill="#fffdf7"/><g fill="none" stroke="#11100d" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round">{paths}</g></svg>'

def main():
 ap=argparse.ArgumentParser();ap.add_argument('command',choices=['verify','build']);ap.add_argument('--max-dim',type=int,default=360);args=ap.parse_args()
 manifest=json.loads(MANIFEST.read_text());failures=verify_sources(manifest)
 if failures:print(json.dumps({'state':'DENY','failures':failures},indent=2));return 1
 specs=panel_specs(manifest)
 if args.command=='verify':print(json.dumps({'state':'VERIFIED','sources':len(manifest['sources']),'panels':len(specs),'quartets':len(manifest['transformationQuartets'])},indent=2));return 0
 DERIVED.mkdir(parents=True,exist_ok=True);byid={s['id']:s for s in manifest['sources']};opened={};records=[]
 for i,spec in enumerate(specs,1):
  src=spec['source'];opened.setdefault(src,Image.open(byid[src]['path']).convert('RGB'));crop=opened[src].crop(spec['rect']);graph=graph_for(crop,args.max_dim)
  stem=spec['id'].replace(':','--');graph_path=DERIVED/(stem+'.graph.json');svg_path=DERIVED/(stem+'.svg')
  graph_path.write_text(json.dumps({'schema':'vector-noodle.centerline-graph.v1','status':'TEACHER_PROPOSAL','accepted':False,'panel':spec,**graph},separators=(',',':'))+'\n')
  svg_path.write_text(svg_for(graph,spec['id']))
  records.append({**spec,'graph':str(graph_path.relative_to(ROOT)),'svg':str(svg_path.relative_to(ROOT)),'width':graph['width'],'height':graph['height'],'paths':len(graph['paths']),'components':len(graph['components']),'skeletonPixels':graph['skeletonPixels']})
  if i%10==0:print(json.dumps({'progress':i,'total':len(specs)}),flush=True)
 for im in opened.values():im.close()
 index={'schema':'vector-noodle.derived-corpus.v1','state':'TEACHER_PROPOSALS','accepted':False,'sourceManifestHash':hashlib.sha256(MANIFEST.read_bytes()).hexdigest(),'panels':records}
 (DERIVED/'index.json').write_text(json.dumps(index,indent=2)+'\n');print(json.dumps({'state':'BUILT','panels':len(records),'paths':sum(r['paths'] for r in records),'output':str(DERIVED/'index.json')},indent=2));return 0
if __name__=='__main__':raise SystemExit(main())
