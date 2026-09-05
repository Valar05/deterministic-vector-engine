#!/usr/bin/env python3
import hashlib,json,math
from collections import defaultdict
from pathlib import Path
import numpy as np
from scipy.optimize import linear_sum_assignment
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'training/wonder-v2'
DERIVED=BASE/'derived'
EVIDENCE=ROOT/'evidence/wonder-v2'

def read(path):return json.loads(Path(path).read_text())
def esc(s):return str(s).replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')
def load_graph(panel):return read(ROOT/panel['graph'])
def component_cost(a,b):
 pos=math.hypot(a['cx']-b['cx'],a['cy']-b['cy'])
 shape=abs(math.log((a['width']+.01)/(b['width']+.01)))+abs(math.log((a['height']+.01)/(b['height']+.01)))
 mass=abs(math.log((a['pixels']+1)/(b['pixels']+1)))
 return .20*pos+.45*shape+.35*mass

def match_components(a,b,limit=14):
 aa=a['components'][:limit];bb=b['components'][:limit]
 if not aa or not bb:return []
 costs=np.array([[component_cost(x,y) for y in bb] for x in aa]);rows,cols=linear_sum_assignment(costs)
 out=[]
 for i,j in zip(rows,cols):
  cost=float(costs[i,j]);out.append({'normal':int(i),'flesh':int(j),'cost':round(cost,4),'confidence':round(math.exp(-cost),4),'status':'CORRESPONDENCE_PROPOSAL'})
 return sorted(out,key=lambda x:x['cost'])

def similarity(a,b):
 a=set(a);b=set(b);return len(a&b)/len(a|b)
def loo(ontology):
 objects=ontology['objects'];results=[]
 for held,item in objects.items():
  ranked=sorted(((similarity(item['features'],other['features']),name,other['expectedFamily']) for name,other in objects.items() if name!=held),reverse=True)
  votes=defaultdict(float)
  for score,name,family in ranked[:5]:votes[family]+=score
  predicted=sorted(votes.items(),key=lambda x:(x[1],x[0]),reverse=True)[0][0]
  results.append({'heldOut':held,'expected':item['expectedFamily'],'predicted':predicted,'pass':predicted==item['expectedFamily'],'neighbors':[{'id':n,'similarity':round(s,3),'family':f} for s,n,f in ranked[:3]]})
 return results

def text(x,y,value,size=15,weight=400,anchor='start'):
 return f'<text x="{x}" y="{y}" font-family="ui-monospace,monospace" font-size="{size}" font-weight="{weight}" text-anchor="{anchor}" fill="#11100d">{esc(value)}</text>'
def frame(title,subtitle,body,w=1600,h=1000):
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-label="{esc(title)}"><rect width="100%" height="100%" fill="#fffdf7"/><g fill="none" stroke="#11100d" stroke-linecap="round" stroke-linejoin="round"><rect x="28" y="28" width="{w-56}" height="{h-56}" stroke-width="3"/><line x1="28" y1="126" x2="{w-28}" y2="126" stroke-width="2"/>{text(60,75,title,27,800)}{text(60,105,subtitle,14,600)}{body}</g></svg>'
def graph_group(graph,x,y,width,height):
 sx=width/graph['width'];sy=height/graph['height'];scale=min(sx,sy);ox=x+(width-graph['width']*scale)/2;oy=y+(height-graph['height']*scale)/2
 paths=''.join(f'<path d="{p["d"]}"/>' for p in graph['paths'])
 return f'<g transform="translate({ox:.2f} {oy:.2f}) scale({scale:.5f})" stroke-width="{1.3/scale:.3f}">{paths}</g>'
def write(path,value):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(value)

def main():
 manifest=read(BASE/'corpus-manifest.json');ontology=read(BASE/'functional-ontology.json');index=read(DERIVED/'index.json');panels={p['id']:p for p in index['panels']}
 if len(panels)!=110:raise SystemExit('DENY:PANEL_COUNT')
 studies=[]
 for q in manifest['transformationQuartets']:
  qid=q['id'];ng=load_graph(panels[f'{qid}:normal_exploded']);fg=load_graph(panels[f'{qid}:flesh_exploded']);obj=ontology['objects'][qid];family=ontology['families'][obj['expectedFamily']]
  metrics={'normalSkeletonDensity':round(ng['skeletonPixels']/(ng['width']*ng['height']),5),'fleshSkeletonDensity':round(fg['skeletonPixels']/(fg['width']*fg['height']),5),'normalComponents':len(ng['components']),'fleshComponents':len(fg['components'])}
  studies.append({'id':qid,'group':q['group'],'functionalFeatures':obj['features'],'expectedFamily':obj['expectedFamily'],'editProgram':{'proposition':family['proposition'],'preserve':family['preserve'],'propagate':family['propagate']},'sourceSignals':metrics,'correspondences':match_components(ng,fg)})
 results=loo(ontology);passed=sum(r['pass'] for r in results)
 output={'schema':'vector-noodle.causal-apprenticeship.v1','state':'STRUCTURAL_STUDY_COMPLETE_AWAITING_HUMAN','accepted':False,'sourceManifestHash':hashlib.sha256((BASE/'corpus-manifest.json').read_bytes()).hexdigest(),'studies':studies,'leaveOneOut':{'method':'five-nearest weighted Jaccard over functional features; held item excluded from vote','passed':passed,'total':len(results),'accuracy':round(passed/len(results),3),'results':results},'weaponMutations':'HUMAN_LABEL_REQUIRED'}
 write(BASE/'causal-study.json',json.dumps(output,indent=2)+'\n')
 EVIDENCE.mkdir(parents=True,exist_ok=True)
 # Gate 02 corpus topology
 body='';groups=['utility','medical','domestic','storage','infrastructure']
 for gi,group in enumerate(groups):
  y=180+gi*145;body+=text(70,y,group.upper(),18,800)
  names=[q['id'] for q in manifest['transformationQuartets'] if q['group']==group]
  for i,name in enumerate(names):
   x=285+i*245;body+=f'<rect x="{x}" y="{y-30}" width="215" height="72" rx="4" stroke-width="2"/>'+text(x+107,y-2,name.replace('-',' ').upper(),12,700,'middle')+text(x+107,y+23,'N  NX  F  FX',12,500,'middle')
 body+=text(70,930,'25 CAUSAL QUARTETS  •  100 PANELS  +  5 MACRO PAIRS  •  10 PANELS',15,800)
 write(EVIDENCE/'gate-02-corpus-map.svg',frame('WONDER GATE 02  —  CORPUS TOPOLOGY','HASH-SEALED SOURCES  •  PANEL ROLES BEFORE CURVES',body))
 # Gate 03 actual recovered centerlines
 left=load_graph(panels['pressure-tank:normal_exploded']);right=load_graph(panels['pressure-tank:flesh_exploded'])
 body=text(380,175,'NORMAL EXPLODED',17,800,'middle')+text(1215,175,'FLESHPUNK EXPLODED',17,800,'middle')
 body+=f'<rect x="65" y="200" width="630" height="650" stroke-width="2"/><rect x="905" y="200" width="630" height="650" stroke-width="2"/>'
 body+=graph_group(left,75,210,610,630)+graph_group(right,915,210,610,630)
 body+=text(800,900,f'{len(left["paths"])} + {len(right["paths"])} CENTERLINE BEZIER CANDIDATES',15,800,'middle')
 write(EVIDENCE/'gate-03-centerlines.svg',frame('WONDER GATE 03  —  CENTERLINE RECOVERY','ACTUAL PRESSURE-TANK PANELS  •  NO GRID OR LABEL GEOMETRY',body))
 # Gate 04 correspondence proposals
 study=next(s for s in studies if s['id']=='pressure-tank');a=left['components'];b=right['components'];body=text(335,175,'NORMAL COMPONENTS',16,800,'middle')+text(1265,175,'CULTIVATED COMPONENTS',16,800,'middle')
 for i,c in enumerate(a[:14]):
  x=90+c['cx']*480;y=220+c['cy']*620;body+=f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{7+min(13,c["pixels"]/120):.1f}" stroke-width="2"/>'+text(x+12,y-9,str(i),11,700)
 for i,c in enumerate(b[:14]):
  x=1030+c['cx']*480;y=220+c['cy']*620;body+=f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{7+min(13,c["pixels"]/120):.1f}" stroke-width="2"/>'+text(x+12,y-9,str(i),11,700)
 for m in study['correspondences']:
  ca=a[m['normal']];cb=b[m['flesh']];x1=90+ca['cx']*480;y1=220+ca['cy']*620;x2=1030+cb['cx']*480;y2=220+cb['cy']*620;dash='' if m['confidence']>.7 else ' stroke-dasharray="8 7"';body+=f'<path d="M{x1:.1f} {y1:.1f} C760 {y1:.1f} 840 {y2:.1f} {x2:.1f} {y2:.1f}" stroke-width="{1+2*m["confidence"]:.2f}"{dash}/>'
 body+=text(800,910,'SOLID = HIGHER CONFIDENCE  •  DASHED = REVIEW REQUIRED  •  ALL EDGES ARE PROPOSALS',14,800,'middle')
 write(EVIDENCE/'gate-04-correspondence.svg',frame('WONDER GATE 04  —  COMPONENT CORRESPONDENCE','PRESSURE TANK  •  GEOMETRY PROPOSES  •  FUNCTION DECIDES',body))
 # Gate 05 leave one out
 body=text(70,170,f'{passed} OF {len(results)} HELD-OUT FAMILY PREDICTIONS',18,800)
 for i,r in enumerate(results):
  col=i//13;row=i%13;x=70+col*760;y=215+row*52;mark='PASS' if r['pass'] else 'MISS';body+=f'<rect x="{x}" y="{y-25}" width="710" height="38" stroke-width="1.4"/>'+text(x+12,y,r['heldOut'].replace('-',' ').upper(),12,700)+text(x+320,y,r['expected'],11,500)+text(x+535,y,r['predicted'],11,500)+text(x+685,y,mark,11,800,'end')
 body+=text(800,930,'FAILURES REMAIN TRAINING EVIDENCE  •  NO AVERAGE MAY HIDE A MISSED OBJECT',14,800,'middle')
 write(EVIDENCE/'gate-05-leave-one-out.svg',frame('WONDER GATE 05  —  LEAVE-ONE-OBJECT-OUT','FUNCTIONAL FEATURES ONLY  •  HELD OBJECT EXCLUDED  •  NO PIXEL LABEL LEAKAGE',body))
 print(json.dumps({'state':output['state'],'quartets':len(studies),'correspondenceProposals':sum(len(s['correspondences']) for s in studies),'leaveOneOut':output['leaveOneOut'],'evidence':[p.name for p in sorted(EVIDENCE.glob('*.svg'))]},indent=2))
if __name__=='__main__':main()
