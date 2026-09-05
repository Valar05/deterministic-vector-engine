#!/usr/bin/env python3
import argparse,hashlib,itertools,json,math
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage,signal
from scipy.spatial import cKDTree
EXPECTED='e4202ceb87bae2ab00d98b25999ab1105eda878d38904d97d070b63aff1fa923';W=397;H=397
def box_of(labels,lab):ys,xs=np.where(labels==lab);return [int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]
def components(ink,require_gap=True):
 dil=ndimage.binary_dilation(ink,iterations=1);labels,n=ndimage.label(dil);sizes=np.bincount(labels.ravel());rows=[];h,w=ink.shape
 for lab in range(1,n+1):
  if sizes[lab]<80:continue
  x0,y0,x1,y1=box_of(labels,lab)
  if x0<=5 or y0<=1 or x1>=w-5 or y1>=h-1 or (x1-x0)<w*.03 and (y1-y0)>h*.7:continue
  rows.append({'label':lab,'mass':int(sizes[lab]),'bbox':[x0,y0,x1,y1]})
 rows.sort(key=lambda r:(-r['mass'],r['bbox']));
 if not rows:raise RuntimeError('REJECT:NO_COMPONENT_REGIONS')
 if not require_gap:return dil,labels,rows[:1],None
 ratios=[rows[i]['mass']/max(1,rows[i+1]['mass']) for i in range(min(9,len(rows)-1))];cut=max(range(len(ratios)),key=lambda i:(ratios[i],-i))+1
 if cut<2 or ratios[cut-1]<1.45:raise RuntimeError('UNKNOWN:NO_PERSISTENT_COMPONENT_GAP')
 return dil,labels,rows[:cut],ratios[cut-1]
def transformed_pixels(points,matrix):
 a,b,c,d,e,f=matrix;x=points[:,1];y=points[:,0];xx=np.rint(a*x+c*y+e).astype(int);yy=np.rint(b*x+d*y+f).astype(int);keep=(xx>=0)&(xx<W)&(yy>=0)&(yy<H);return np.unique(yy[keep]*W+xx[keep])
def diverse(options,limit=8):
 out=[]
 for option in sorted(options,key=lambda q:(-q['score'],q['angle'],q['scale'],q['matrix'][4],q['matrix'][5])):
  if all(np.linalg.norm(np.array(option['targetCentroid'])-np.array(old['targetCentroid']))>28 for old in out):out.append(option)
  if len(out)==limit:break
 return out
def main():
 ap=argparse.ArgumentParser();ap.add_argument('source');ap.add_argument('out');ap.add_argument('mask_dir');args=ap.parse_args();src=Path(args.source);raw=src.read_bytes()
 if hashlib.sha256(raw).hexdigest()!=EXPECTED:raise RuntimeError('REJECT:SOURCE_HASH_MISMATCH')
 image=np.array(Image.open(src).convert('L'));assembled=image[:397,:397]<150;exploded=image[397:793,:397]<150
 for ink in (assembled,exploded):ink[:5,:]=False;ink[-5:,:]=False;ink[:,:5]=False;ink[:,-5:]=False
 _,alabels,arows,_=components(assembled,False);assembled_object=alabels==arows[0]['label'];_,elabels,regions,gap=components(exploded,True);mask_dir=Path(args.mask_dir);mask_dir.mkdir(parents=True,exist_ok=True)
 candidates=[]
 for index,region in enumerate(regions,1):
  lab=region['label'];x0,y0,x1,y1=region['bbox'];mask=elabels[y0:y1,x0:x1]==lab;local=np.argwhere(mask);global_points=local+np.array([y0,x0]);cy,cx=local.mean(axis=0)
  solid=ndimage.binary_fill_holes(mask);holes=solid&~mask;hl,hn=ndimage.label(holes);hs=np.bincount(hl.ravel())
  for hid in range(1,hn+1):
   if hs[hid]>=solid.size*.09:solid[hl==hid]=False
  mask_path=mask_dir/f'component-{index:02d}.png';Image.fromarray(np.where(solid,0,255).astype('uint8')).save(mask_path)
  raw_options=[];base=mask[::2,::2];target=assembled_object[::2,::2]
  for angle in (-30,-20,-10,0,10,20,30):
   rot=ndimage.rotate(base.astype(float),angle,reshape=True,order=0)>0.5
   for scale in (.7,.8,.9,1.0,1.1,1.2):
    templ=ndimage.zoom(rot.astype(float),scale,order=0)>0.5
    if templ.shape[0]>=target.shape[0] or templ.shape[1]>=target.shape[1]:continue
    corr=signal.fftconvolve(target.astype(float),templ[::-1,::-1].astype(float),mode='valid');flat=np.argpartition(corr.ravel(),-min(12,corr.size))[-min(12,corr.size):];ty,tx=np.argwhere(templ).mean(axis=0)
    for pos in flat:
     yy,xx=np.unravel_index(pos,corr.shape);score=float(corr[yy,xx]/max(1,templ.sum()));target_c=[float((xx+tx)*2),float((yy+ty)*2)];theta=math.radians(angle);ca=math.cos(theta)*scale;sa=math.sin(theta)*scale;gc=[x0+cx,y0+cy];matrix=[ca,sa,-sa,ca,target_c[0]-(ca*gc[0]-sa*gc[1]),target_c[1]-(sa*gc[0]+ca*gc[1])]
     raw_options.append({'score':round(score,5),'angle':angle,'scale':scale,'matrix':[round(v,5) for v in matrix],'targetCentroid':[round(v,3) for v in target_c]})
  options=diverse(raw_options);assert options
  for option in options:option['_pixels']=transformed_pixels(global_points,option['matrix'])
  candidates.append({'id':f'component-{index:02d}','region':region,'maskPath':mask_path,'points':global_points,'options':options})
 best=None;target_flat=assembled_object.ravel()
 for choice in itertools.product(*[range(len(c['options'])) for c in candidates]):
  selected=[candidates[i]['options'][j] for i,j in enumerate(choice)];counts=np.bincount(np.concatenate([o['_pixels'] for o in selected]),minlength=W*H);union=counts>0;coverage=float(np.count_nonzero(union&target_flat)/max(1,np.count_nonzero(target_flat)));collision=float(np.count_nonzero(counts>1)/max(1,np.count_nonzero(union)));objective=sum(o['score'] for o in selected)+4*coverage-1.5*collision
  if best is None or objective>best[0]:best=(objective,choice,coverage,collision)
 placements=[];selected_pixels=[]
 for i,(candidate,choice) in enumerate(zip(candidates,best[1]),1):
  option=dict(candidate['options'][choice]);pixels=option.pop('_pixels');selected_pixels.append(pixels);alts=[]
  for alt in candidate['options']:
   clean={k:v for k,v in alt.items() if k!='_pixels'}
   if clean!=option:alts.append(clean)
  region=candidate['region'];placements.append({'id':candidate['id'],'explodedEvidence':{'bbox':region['bbox'],'inkMass':region['mass'],'maskSha256':hashlib.sha256(candidate['maskPath'].read_bytes()).hexdigest()},'assembledHypothesis':option,'alternatives':alts[:3],'state':'CANDIDATE_CROSS_VIEW'})
 pair=[]
 for i in range(len(selected_pixels)):
  pi=np.column_stack(np.divmod(selected_pixels[i],W));tree=cKDTree(pi)
  for j in range(i+1,len(selected_pixels)):
   pj=np.column_stack(np.divmod(selected_pixels[j],W));distance=float(tree.query(pj,k=1)[0].min());pair.append((distance,i,j))
 edges=[];seen={0}
 while len(seen)<len(placements):
  distance,i,j=min((x for x in pair if (x[1] in seen)^(x[2] in seen)),default=(999,None,None));assert i is not None;new=j if i in seen else i;old=i if i in seen else j;seen.add(new);edges.append({'id':f'attachment-{len(edges)+1:02d}','members':[placements[old]['id'],placements[new]['id']],'interfaceGap':round(distance,3),'state':'CANDIDATE_CROSS_VIEW'})
 out={'schema':'vector-noodle.paired-correspondence.v1','sourceSha256':EXPECTED,'selection':{'method':'PERSISTENT_EXPLODED_REGIONS_PLUS_JOINT_ASSEMBLED_REGISTRATION','requestedComponentCount':None,'fractionalFallbackCuts':False,'selectedCount':len(placements),'areaGapRatio':round(gap,4),'jointCoverage':round(best[2],5),'jointCollision':round(best[3],5)},'assembledEvidence':{'bbox':arows[0]['bbox'],'inkMass':arows[0]['mass']},'components':placements,'attachments':edges,'judgment':'AWAITING_HUMAN_COMPONENT_COHERENCE'}
 Path(args.out).write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({'state':'PAIRED_CORRESPONDENCE_PROPOSED','components':len(placements),'gap':round(gap,4),'coverage':round(best[2],5),'collision':round(best[3],5),'scores':[p['assembledHypothesis']['score'] for p in placements]}))
if __name__=='__main__':main()
