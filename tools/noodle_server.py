#!/usr/bin/env python3
import argparse
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT=Path(__file__).resolve().parent.parent
MAX_BODY=16384
BUILD_MARKER='empty-glass-shovel-v1'
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
            curriculum=json.loads((ROOT/'training'/'wonder-sparse-v1'/'shovel-studies.json').read_text())
            return self.send_json({'state':curriculum['state'],'subject':'shovel','sourcePolicy':curriculum['sourcePolicy'],'views':[{'view':study['view'],'strokeCount':len(study['strokes'])} for study in curriculum['studies']],'machineVerdict':'AWAITING_USER_PIXEL_VERDICT'})
        if path.startswith('/.noodle-state') or path.startswith('/.git'): return self.send_error(404)
        return super().do_GET()
    def do_POST(self):
        origin=self.headers.get('Origin')
        if origin and urlparse(origin).hostname not in {'127.0.0.1','localhost'}: return self.send_json({'state':'REJECT','reason':'ORIGIN_REJECTED'},403)
        try: length=int(self.headers.get('Content-Length','0'))
        except ValueError: return self.send_json({'state':'REJECT','reason':'BAD_LENGTH'},400)
        if length<1 or length>MAX_BODY: return self.send_json({'state':'REJECT','reason':'BODY_SIZE'},413)
        try: data=json.loads(self.rfile.read(length))
        except (json.JSONDecodeError,UnicodeDecodeError): return self.send_json({'state':'REJECT','reason':'BAD_JSON'},400)
        path=urlparse(self.path).path
        if path in {'/api/noodle/compile','/api/imagegen/generate','/api/imagegen/contact-sheet'}:
            return self.send_json({'state':'REJECT','reason':'USER_REJECTED_PRIMITIVE','replacement':'/wonder/'},410)
        return self.send_json({'state':'REJECT','reason':'UNKNOWN_ENDPOINT'},404)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--host',default='127.0.0.1');parser.add_argument('--port',type=int,default=8810);args=parser.parse_args()
    if args.host not in {'127.0.0.1','localhost'}: raise SystemExit('loopback host required')
    print(json.dumps({'state':'READY','url':f'http://127.0.0.1:{args.port}/','buildMarker':BUILD_MARKER}),flush=True)
    ThreadingHTTPServer((args.host,args.port),Handler).serve_forever()
