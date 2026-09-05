#!/usr/bin/env python3
import argparse
import copy
import hashlib
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT=Path(__file__).resolve().parent.parent
MAX_BODY=65536
EXPECTED_SHOVEL_SHA='e4202ceb87bae2ab00d98b25999ab1105eda878d38904d97d070b63aff1fa923'
REVIEW_SCALES=(96,220,360)

def acceptance_hash(data):
    candidate=copy.deepcopy(data);candidate.pop('acceptance',None);candidate.pop('state',None)
    text=json.dumps(candidate,sort_keys=True,separators=(',',':'),ensure_ascii=False)
    value=0x811c9dc5
    encoded=text.encode('utf-16-le','surrogatepass')
    for index in range(0,len(encoded),2):
        value^=encoded[index]|(encoded[index+1]<<8);value=(value*0x01000193)&0xffffffff
    return f'fnv1a32-{value:08x}'
BUILD_MARKER='empty-glass-shovel-finish-v3'

def validate_user_accepted_study(data):
    if not isinstance(data,dict): return ['BAD_BODY']
    failures=[]
    source=data.get('source',{}) if isinstance(data,dict) else {}
    verification=source.get('verification',{})
    acceptance=data.get('acceptance',{}) or {}
    strokes=data.get('strokes',[]) if isinstance(data,dict) else []
    reviews=data.get('review',{}).get('scales',[]) if isinstance(data,dict) else []
    if data.get('schema')!='vector-noodle.sparse-line-study.v1': failures.append('BAD_SCHEMA')
    if data.get('subjectId')!='shovel' or data.get('view') not in {'ASSEMBLED','EXPLODED'}: failures.append('BAD_TARGET')
    if source.get('class')!='MODERN_OBJECT' or source.get('sha256')!=EXPECTED_SHOVEL_SHA: failures.append('BAD_SOURCE')
    if verification.get('state')!='VERIFIED' or verification.get('sha256')!=EXPECTED_SHOVEL_SHA: failures.append('SOURCE_UNVERIFIED')
    if 'flesh' in json.dumps(data,sort_keys=True).lower(): failures.append('FLESHPUNK_FORBIDDEN')
    if not 1<=len(strokes)<=20: failures.append('BAD_STROKE_COUNT')
    if any(stroke.get('ablationImportance')!='ESSENTIAL' for stroke in strokes): failures.append('ABLATION_INCOMPLETE')
    if data.get('review',{}).get('referenceHidden') is not True: failures.append('REFERENCE_REVIEW_INVALID')
    if any(next((review.get('verdict') for review in reviews if review.get('size')==size),None)!='RECOGNIZABLE' for size in REVIEW_SCALES): failures.append('SCALE_REVIEW_INCOMPLETE')
    if data.get('state')!='USER_ACCEPTED' or acceptance.get('verdict')!='USER_ACCEPTED' or acceptance.get('authority')!='USER_GESTURE': failures.append('HUMAN_ACCEPTANCE_MISSING')
    if acceptance.get('sourceSha256')!=EXPECTED_SHOVEL_SHA or acceptance.get('replayHash')!=acceptance_hash(data): failures.append('ACCEPTANCE_BINDING_INVALID')
    return failures

def persist_user_accepted_study(data,state_dir):
    failures=validate_user_accepted_study(data)
    if failures: return None,failures
    state_dir.mkdir(parents=True,exist_ok=True)
    canonical=json.dumps(data,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
    receipt=hashlib.sha256(canonical).hexdigest()
    target=state_dir/f"shovel-accepted-{data['view'].lower()}.json"
    temporary=target.with_suffix('.json.tmp');temporary.write_bytes(canonical+b'\n');temporary.replace(target)
    return receipt,[]

def load_accepted_views(state_dir):
    accepted=[]
    for view in ('ASSEMBLED','EXPLODED'):
        target=state_dir/f"shovel-accepted-{view.lower()}.json"
        try: data=json.loads(target.read_text())
        except (FileNotFoundError,json.JSONDecodeError,UnicodeDecodeError): continue
        if not validate_user_accepted_study(data): accepted.append(view)
    return accepted

class Handler(SimpleHTTPRequestHandler):
    server_version='VectorNoodle/1'
    def __init__(self,*args,**kwargs): super().__init__(*args,directory=str(ROOT),**kwargs)
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'")
        super().end_headers()
    def log_message(self,fmt,*args): print(f'{self.client_address[0]} {fmt%args}',flush=True)
    def send_json(self,payload,status=200):
        body=json.dumps(payload,separators=(',',':')).encode()
        self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
    def do_GET(self):
        path=urlparse(self.path).path
        if path=='/api/noodle/health': return self.send_json({'state':'READY','buildMarker':BUILD_MARKER,'modelFreeRuntime':True,'sourceSet':'MODERN_OBJECTS_ONLY','machineVerdict':'AWAITING_USER_PIXEL_VERDICT'})
        if path=='/api/wonder/status':
            curriculum=json.loads((ROOT/'training'/'wonder-sparse-v1'/'shovel-studies.json').read_text());accepted=load_accepted_views(ROOT/'.noodle-state')
            return self.send_json({'state':'USER_ACCEPTED' if len(accepted)==2 else curriculum['state'],'subject':'shovel','sourcePolicy':curriculum['sourcePolicy'],'views':[{'view':study['view'],'strokeCount':len(study['strokes']),'userAccepted':study['view'] in accepted} for study in curriculum['studies']],'acceptedViews':accepted,'machineVerdict':'AWAITING_USER_PIXEL_VERDICT'})
        if path.startswith('/.noodle-state') or path.startswith('/.git'): return self.send_error(404)
        return super().do_GET()
    def do_POST(self):
        origin=self.headers.get('Origin')
        if origin and urlparse(origin).hostname not in {'127.0.0.1','localhost'}: return self.send_json({'state':'REJECT','reason':'ORIGIN_REJECTED'},403)
        try: length=int(self.headers.get('Content-Length','0'))
        except ValueError: return self.send_json({'state':'REJECT','reason':'BAD_LENGTH'},400)
        if length<1 or length>MAX_BODY: return self.send_json({'state':'REJECT','reason':'BODY_SIZE'},413)
        raw=self.rfile.read(length)
        try: data=json.loads(raw)
        except (json.JSONDecodeError,UnicodeDecodeError): return self.send_json({'state':'REJECT','reason':'BAD_JSON'},400)
        path=urlparse(self.path).path
        if path=='/api/wonder/save-study':
            receipt,failures=persist_user_accepted_study(data,ROOT/'.noodle-state')
            if failures: return self.send_json({'state':'REJECT','reason':'|'.join(failures)},422)
            return self.send_json({'state':'SAVED_USER_ACCEPTED','view':data['view'],'receipt':receipt})
        if path in {'/api/noodle/compile','/api/imagegen/generate','/api/imagegen/contact-sheet'}:
            return self.send_json({'state':'REJECT','reason':'USER_REJECTED_PRIMITIVE','replacement':'/wonder/'},410)
        return self.send_json({'state':'REJECT','reason':'UNKNOWN_ENDPOINT'},404)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--host',default='127.0.0.1');parser.add_argument('--port',type=int,default=8810);args=parser.parse_args()
    if args.host not in {'127.0.0.1','localhost'}: raise SystemExit('loopback host required')
    print(json.dumps({'state':'READY','url':f'http://127.0.0.1:{args.port}/','buildMarker':BUILD_MARKER}),flush=True)
    ThreadingHTTPServer((args.host,args.port),Handler).serve_forever()
