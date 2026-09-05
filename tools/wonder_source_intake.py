#!/usr/bin/env python3
import hashlib, json, shutil, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/'training/wonder-v1/source-manifest.json'
CACHE=ROOT/'training/wonder-v1/source-cache'
def digest(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()
def verify(copy=False):
    data=json.loads(MANIFEST.read_text())
    failures=[]; receipts=[]
    for source in data['sources']:
        path=Path(source['path'])
        if not path.is_file(): failures.append(f"MISSING:{source['id']}"); continue
        actual=digest(path)
        if actual != source['sha256']: failures.append(f"HASH_MISMATCH:{source['id']}"); continue
        receipt={'id':source['id'],'sha256':actual,'bytes':path.stat().st_size,'status':'VERIFIED'}
        if copy:
            CACHE.mkdir(parents=True,exist_ok=True)
            target=CACHE/f"{source['id']}{path.suffix.lower()}"
            shutil.copyfile(path,target)
            if digest(target)!=actual: failures.append(f"COPY_MISMATCH:{source['id']}")
            else: receipt['cache']=str(target.relative_to(ROOT))
        receipts.append(receipt)
    out={'schema':'vector-noodle.source-intake-receipt.v1','manifestState':data['state'],'sealed':data['sealed'],'status':'DENY' if failures else 'VERIFIED_INTAKE_OPEN','failures':failures,'sources':receipts}
    print(json.dumps(out,indent=2))
    return 1 if failures else 0
if __name__=='__main__':
    command=sys.argv[1] if len(sys.argv)>1 else 'verify'
    if command not in ('verify','cache'): raise SystemExit('usage: wonder_source_intake.py [verify|cache]')
    raise SystemExit(verify(copy=command=='cache'))
