#!/usr/bin/env python3
import hashlib, json, subprocess, sys
from pathlib import Path
from PIL import Image, ImageChops
ROOT=Path(__file__).resolve().parents[1]
def fail(msg): print('FAIL:',msg); raise SystemExit(1)
def main():
 p=ROOT/'transcription/portrait.svg'
 r=subprocess.run([sys.executable,str(ROOT/'tools/validate_lineart.py'),str(p)],capture_output=True,text=True)
 if r.returncode: fail('lineart '+r.stdout+r.stderr)
 prov=json.loads((ROOT/'transcription/portrait.provenance.json').read_text())
 if prov['privacy']!={'reference_copied_into_project':False,'exif_copied_into_project':False}: fail('privacy declaration')
 if 'No tracing' not in prov['authoring']['declaration']: fail('no-tracing declaration')
 crit=json.loads((ROOT/'transcription/critique-final.json').read_text())
 if crit['decision']!='USER_REJECTED' or crit['remaining_state']!='QUARANTINED_NEGATIVE_EXAMPLE': fail('critique state')
 if crit.get('user_verdict',{}).get('accepted') is not False: fail('missing user rejection')
 drafts=[ROOT/f'transcription/drafts/portrait-v{i}.svg' for i in range(1,5)]
 if not all(x.is_file() for x in drafts): fail('draft inventory')
 if len({hashlib.sha256(x.read_bytes()).hexdigest() for x in drafts})!=4: fail('draft distinctness')
 img=Image.open(ROOT/'transcription/qa/portrait-v4-preview.png').convert('RGB')
 bg=Image.new('RGB',img.size,'white'); box=ImageChops.difference(img,bg).getbbox()
 if not box: fail('blank preview')
 if not (box[0]>=40 and box[1]>=40 and box[2]<=760 and box[3]<=960): fail('ink bounds '+repr(box))
 html=(ROOT/'transcription/index.html').read_text()
 if 'dve-transcription-v1' not in html or './portrait.svg?v=dve-transcription-v1' not in html: fail('route marker')
 allowed={'.svg','.png','.md','.json','.html','.css'}
 count=0
 for x in (ROOT/'transcription').rglob('*'):
  if x.is_file():
   count+=1
   if x.stat().st_size>1_000_000: fail('oversize '+str(x))
   if x.suffix.lower() not in allowed: fail('unexpected file class '+str(x))
 if count>30: fail('unexpected inventory size')
 print(json.dumps({'status':'PASS','paths':json.loads(r.stdout)['paths'],'drafts':4,'preview_bounds':box,'inventory_files':count,'agent_art':'SUPERSEDED','user_pixels':'REJECTED'}))
if __name__=='__main__': main()
