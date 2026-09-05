#!/usr/bin/env python3
import argparse
import copy
import hashlib
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parent.parent
MAX_BODY=262144
EXPECTED_SOURCE_SHA='e4202ceb87bae2ab00d98b25999ab1105eda878d38904d97d070b63aff1fa923'
REVIEW_SCALES=(96,220,360)
VIEWS=('ASSEMBLED','EXPLODED')
EVIDENCE_AXES=('CATEGORY','INSTANCE','MECHANISM','AFFORDANCE','NOISE','SCALE','CROSS_VIEW')
REVIEW_EXPECTED={'CATEGORY':'RECOGNIZABLE','INSTANCE':'MATCHED','MECHANISM':'PRESERVED','CROSS_VIEW':'SAME_OBJECT'}
BUILD_MARKER='empty-glass-correspondence-v6'
def acceptance_hash(data):
 candidate=copy.deepcopy(data);candidate.pop('acceptance',None);candidate.pop('state',None)
 text=json.dumps(candidate,sort_keys=True,separators=(',',':'),ensure_ascii=False);value=0x811c9dc5;encoded=text.encode('utf-16-le','surrogatepass')
 for index in range(0,len(encoded),2):value^=encoded[index]|(encoded[index+1]<<8);value=(value*0x01000193)&0xffffffff
 return f'fnv1a32-{value:08x}'
def all_strokes(data):return [(part,stroke) for part in data.get('parts',[]) for stroke in part.get('strokes',[])]
def validate_user_accepted_study(data):
 if not isinstance(data,dict):return ['BAD_BODY']
 failures=[];source=data.get('source',{});verification=source.get('verification',{});acceptance=data.get('acceptance',{}) or {};program=data.get('objectProgram',{});selection=program.get('selection',{})
 if data.get('schema')!='vector-noodle.mechanism-line-study.v1':failures.append('BAD_SCHEMA')
 if data.get('subjectId')!='modern-object-01':failures.append('BAD_TARGET')
 if data.get('derivation',{}).get('method')!='CORRESPONDENCE_FIRST_PROOF_CARRYING':failures.append('CORRESPONDENCE_FIRST_REQUIRED')
 if data.get('landmarkGraph') is not None:failures.append('BAGUETTE_SLICER_GRAPH_FORBIDDEN')
 if data.get('explodedStrokes') or data.get('studies'):failures.append('INDEPENDENT_EXPLODED_GEOMETRY_FORBIDDEN')
 if program.get('schema')!='vector-noodle.object-program.v1':failures.append('OBJECT_PROGRAM_MISSING')
 if selection.get('requestedComponentCount') is not None or selection.get('fractionalFallbackCuts') is not False:failures.append('FIXED_COMPONENT_SELECTION_FORBIDDEN')
 if source.get('class')!='MODERN_OBJECT' or source.get('sha256')!=EXPECTED_SOURCE_SHA:failures.append('BAD_SOURCE')
 if verification.get('state')!='VERIFIED' or verification.get('sha256')!=EXPECTED_SOURCE_SHA:failures.append('SOURCE_UNVERIFIED')
 if 'flesh' in json.dumps(data,sort_keys=True).lower():failures.append('FLESHPUNK_FORBIDDEN')
 parts=data.get('parts',[]);attachments=data.get('attachments',[])
 if len(parts)<2:failures.append('PART_GRAPH_MISSING')
 if any(part.get('name') is not None or part.get('semanticRole') is not None for part in parts):failures.append('ONTOLOGY_LABEL_FORBIDDEN')
 if any(edge.get('state')!='EVIDENCED' for edge in attachments):failures.append('ATTACHMENT_UNKNOWN')
 for part,stroke in all_strokes(data):
  trace=stroke.get('sourceTrace',{})
  if trace.get('view')!='EXPLODED' or trace.get('componentId')!=part.get('sourceComponentId') or trace.get('closure')!='SOURCE_REGION_BOUNDARY' or len(trace.get('maskSha256',''))!=64:failures.append(f'UNPROVEN_CONTOUR:{stroke.get("id")}')
 proofs=data.get('proofEvidence',[])
 expected_targets={p.get('id') for p in parts}|{a.get('id') for a in attachments}
 if {p.get('targetId') for p in proofs}!=expected_targets:failures.append('PROOF_TARGET_MISMATCH')
 for item in proofs:
  if any(item.get(axis)=='PENDING' or item.get(axis) is None for axis in EVIDENCE_AXES):failures.append(f'PROOF_INCOMPLETE:{item.get("targetId")}')
  if item.get('NOISE')=='POSITIVE':failures.append(f'HARMFUL_PRIMITIVE:{item.get("targetId")}')
  if not any(item.get(axis)=='POSITIVE' for axis in ('CATEGORY','INSTANCE','MECHANISM','AFFORDANCE','CROSS_VIEW')):failures.append(f'UNPROVEN_PRIMITIVE:{item.get("targetId")}')
 interactions=data.get('interactionEvidence',[])
 if not interactions:failures.append('PAIRWISE_INTERVENTION_MISSING')
 for item in interactions:
  if len(item.get('inputs',[]))!=2 or any(item.get(axis)=='PENDING' or item.get(axis) is None for axis in EVIDENCE_AXES):failures.append(f'PAIR_PROOF_INCOMPLETE:{item.get("id")}')
 for view in VIEWS:
  visible=[stroke for _,stroke in all_strokes(data) if stroke.get('visible',{}).get(view) is not False]
  if not 1<=len(visible)<=20:failures.append(f'BAD_STROKE_COUNT:{view}')
  review=data.get('review',{}).get(view,{})
  if review.get('referenceHidden') is not True:failures.append(f'REFERENCE_REVIEW_INVALID:{view}')
  for axis,expected in REVIEW_EXPECTED.items():
   if any(next((item.get('verdict') for item in review.get(axis,[]) if item.get('size')==size),None)!=expected for size in REVIEW_SCALES):failures.append(f'{axis}_REVIEW_INCOMPLETE:{view}')
  for stroke in visible:
   evidence=stroke.get('evidence',{}).get(view,{})
   if any(evidence.get(axis)=='PENDING' or evidence.get(axis) is None for axis in EVIDENCE_AXES):failures.append(f'EVIDENCE_INCOMPLETE:{stroke.get("id")}:{view}')
   if evidence.get('NOISE')=='POSITIVE':failures.append(f'HARMFUL_STROKE_RETAINED:{stroke.get("id")}:{view}')
   if not any(evidence.get(axis)=='POSITIVE' for axis in ('CATEGORY','INSTANCE','MECHANISM','AFFORDANCE','CROSS_VIEW')) and evidence.get('NOISE')!='NEGATIVE':failures.append(f'UNPROVEN_STROKE:{stroke.get("id")}:{view}')
 if data.get('state')!='USER_ACCEPTED' or acceptance.get('verdict')!='USER_ACCEPTED' or acceptance.get('authority')!='USER_GESTURE':failures.append('HUMAN_ACCEPTANCE_MISSING')
 if acceptance.get('sourceSha256')!=EXPECTED_SOURCE_SHA or acceptance.get('replayHash')!=acceptance_hash(data):failures.append('ACCEPTANCE_BINDING_INVALID')
 return list(dict.fromkeys(failures))
def persist_user_accepted_study(data,state_dir):
 failures=validate_user_accepted_study(data)
 if failures:return None,failures
 state_dir.mkdir(parents=True,exist_ok=True);canonical=json.dumps(data,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode();receipt=hashlib.sha256(canonical).hexdigest();target=state_dir/'modern-object-01-accepted.json';temporary=target.with_suffix('.json.tmp');temporary.write_bytes(canonical+b'\n');temporary.replace(target);return receipt,[]
def accepted_study(state_dir):
 try:data=json.loads((state_dir/'modern-object-01-accepted.json').read_text())
 except (FileNotFoundError,json.JSONDecodeError,UnicodeDecodeError):return False
 return not validate_user_accepted_study(data)
class Handler(SimpleHTTPRequestHandler):
 server_version='VectorNoodle/3'
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def end_headers(self):self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.send_header('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'");super().end_headers()
 def log_message(self,fmt,*args):print(f'{self.client_address[0]} {fmt%args}',flush=True)
 def send_json(self,payload,status=200):
  body=json.dumps(payload,separators=(',',':')).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
 def do_GET(self):
  route=urlparse(self.path).path
  if route=='/api/noodle/health':return self.send_json({'state':'READY','buildMarker':BUILD_MARKER,'modelFreeRuntime':True,'sourceSet':'MODERN_OBJECTS_ONLY','machineVerdict':'AWAITING_HUMAN_COMPONENT_COHERENCE'})
  if route=='/api/wonder/status':
   curriculum=json.loads((ROOT/'training'/'wonder-sparse-v1'/'shovel-studies.json').read_text());study=curriculum['study'];accepted=accepted_study(ROOT/'.noodle-state');counts={view:sum(stroke.get('visible',{}).get(view) is not False for _,stroke in all_strokes(study)) for view in VIEWS}
   return self.send_json({'state':'USER_ACCEPTED' if accepted else curriculum['state'],'subject':study['subjectId'],'sourcePolicy':curriculum['sourcePolicy'],'componentCount':len(study['parts']),'attachmentCount':len(study['attachments']),'proofAxisCount':len(EVIDENCE_AXES),'pairwiseInterventionCount':len(study.get('interactionEvidence',[])),'visibleStrokeCounts':counts,'userAccepted':accepted,'machineVerdict':'AWAITING_HUMAN_COMPONENT_COHERENCE'})
  if route.startswith('/.noodle-state') or route.startswith('/.git'):return self.send_error(404)
  return super().do_GET()
 def do_POST(self):
  origin=self.headers.get('Origin')
  if origin and urlparse(origin).hostname not in {'127.0.0.1','localhost'}:return self.send_json({'state':'REJECT','reason':'ORIGIN_REJECTED'},403)
  try:length=int(self.headers.get('Content-Length','0'))
  except ValueError:return self.send_json({'state':'REJECT','reason':'BAD_LENGTH'},400)
  if length<1 or length>MAX_BODY:return self.send_json({'state':'REJECT','reason':'BODY_SIZE'},413)
  try:data=json.loads(self.rfile.read(length))
  except (json.JSONDecodeError,UnicodeDecodeError):return self.send_json({'state':'REJECT','reason':'BAD_JSON'},400)
  route=urlparse(self.path).path
  if route=='/api/wonder/save-study':
   receipt,failures=persist_user_accepted_study(data,ROOT/'.noodle-state')
   if failures:return self.send_json({'state':'REJECT','reason':'|'.join(failures)},422)
   return self.send_json({'state':'SAVED_USER_ACCEPTED','receipt':receipt})
  if route in {'/api/noodle/compile','/api/imagegen/generate','/api/imagegen/contact-sheet'}:return self.send_json({'state':'REJECT','reason':'USER_REJECTED_PRIMITIVE','replacement':'/wonder/'},410)
  return self.send_json({'state':'REJECT','reason':'UNKNOWN_ENDPOINT'},404)
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--host',default='127.0.0.1');parser.add_argument('--port',type=int,default=8810);args=parser.parse_args()
 if args.host not in {'127.0.0.1','localhost'}:raise SystemExit('loopback host required')
 print(json.dumps({'state':'READY','url':f'http://127.0.0.1:{args.port}/','buildMarker':BUILD_MARKER}),flush=True);ThreadingHTTPServer((args.host,args.port),Handler).serve_forever()
