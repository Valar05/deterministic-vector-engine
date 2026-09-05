#!/usr/bin/env python3
import argparse,base64,hashlib,hmac,json,os,shutil,subprocess,time
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
STATE=Path(os.environ.get('NOODLE_STATE_ROOT',ROOT/'.noodle-state')).resolve()
ORGAN=Path(os.environ.get('ORGAN_BIN','/storage/emulated/0/Documents/GodotProjects/organ-noodle-authority-worktree/organ')).resolve()
KEY=Path(os.environ.get('ORGAN_AUTHORITY_KEY_FILE','/data/data/com.termux/files/usr/tmp/organ-noodle-authority-v1.key')).resolve()
JOB_PATTERN='job-'
def canonical(value):return json.dumps(value,sort_keys=True,separators=(',',':')).encode()
def sha(data):return hashlib.sha256(data).hexdigest()
def load(path):return json.loads(path.read_text())
def atomic(path,value):
 path.parent.mkdir(parents=True,exist_ok=True);temp=path.with_name(path.name+f'.{os.getpid()}.tmp');temp.write_text(json.dumps(value,indent=2,sort_keys=True)+'\n');os.replace(temp,path)
def invoke(*args):
 env={**os.environ,'ORGAN_AUTHORITY_KEY_FILE':str(KEY)};result=subprocess.run([str(Path(os.environ.get('PYTHON_BIN',shutil.which('python') or '')).resolve()),str(ORGAN),*map(str,args)],cwd=ROOT,text=True,capture_output=True,timeout=45,env=env)
 if result.returncode:raise RuntimeError(result.stderr.strip() or result.stdout.strip())
 return json.loads(result.stdout)
def main():
 parser=argparse.ArgumentParser();parser.add_argument('job_id');parser.add_argument('candidate_hash');args=parser.parse_args()
 if not args.job_id.startswith(JOB_PATTERN) or len(args.job_id)!=20:raise RuntimeError('INVALID_JOB_ID')
 if len(args.candidate_hash)!=64:raise RuntimeError('INVALID_CANDIDATE_HASH')
 if not ORGAN.is_file() or not KEY.is_file() or len(KEY.read_bytes())!=32:raise RuntimeError('ORGAN_AUTHORITY_UNAVAILABLE')
 job=load(STATE/'jobs'/f'{args.job_id}.json');candidate=job['candidate'];
 if job.get('state')!='AWAITING_USER' or job.get('candidateHash')!=args.candidate_hash:raise RuntimeError('CANDIDATE_AUTHORITY_MISMATCH')
 accepted_path=STATE/'accepted'/'registry.json'
 try:accepted=load(accepted_path)
 except FileNotFoundError:accepted={'schema':'vector-noodle.accepted-registry.v1','capabilities':[]}
 promoted={**candidate,'active':True,'provenance':{**candidate['provenance'],'promotion':{'type':'organ-sealed-user-acceptance','candidateHash':args.candidate_hash,'jobId':args.job_id}}}
 accepted['capabilities']=[item for item in accepted['capabilities'] if item['id']!=promoted['id']]+[promoted];accepted['capabilities'].sort(key=lambda item:item['id']);output=(json.dumps(accepted,indent=2,sort_keys=True)+'\n').encode()
 git=Path(shutil.which('git') or '').resolve();node=Path(shutil.which('node') or '').resolve();python=Path(shutil.which('python') or '').resolve()
 head=subprocess.run([str(git),'rev-parse','HEAD'],cwd=ROOT,text=True,capture_output=True,check=True).stdout.strip()
 rel=accepted_path.relative_to(ROOT).as_posix();authority={name:sha(f'{name}:{args.candidate_hash}'.encode()) for name in ('plan_hash','amendment_hash','seed_hash')}
 verify={'id':'noodle-promotion-production-compile','argv':[str(node),'tools/verify_noodle_promotion.mjs'],'cwd':'.','env':{'NOODLE_STATE_ROOT':str(STATE),'NOODLE_EXPECTED_ID':candidate['id'],'NOODLE_EXPECTED_HASH':args.candidate_hash,'NOODLE_EXPECTED_PROMPT':job['intent']['prompt']},'timeout_seconds':20}
 permit={'schema':'organ-authority-v1','campaign_id':f'noodle-promote-{args.job_id}','workspace_root':str(ROOT),'base_head':head,'authority':authority,'allowed_paths':[rel],'protected_files':{},'git_binary':str(git),'verification':[verify],'nonce':sha(f'nonce:{args.job_id}:{args.candidate_hash}'.encode())}
 permit['permit_hmac_sha256']=hmac.new(KEY.read_bytes(),canonical(permit),hashlib.sha256).hexdigest()
 mission={'schema':'organ-mission-v1','id':f'noodle-promote-{candidate["id"]}','workspace_root':str(ROOT),'state_root':str((STATE/'organ-runtime').relative_to(ROOT)),'authority':authority,'files':[{'path':rel,'expected_before':sha(accepted_path.read_bytes()) if accepted_path.is_file() else 'ABSENT','source':{'kind':'inline','data_b64':base64.b64encode(output).decode(),'sha256':sha(output)},'transforms':[{'kind':'identity'}]}],'performance':{'predicted_elapsed_ms':2500,'predicted_input_tokens':0,'predicted_output_tokens':0,'soundness':{'candidate_identity':5,'explicit_user_gate':5,'production_compile':5,'rollback':5}}}
 run=STATE/'organ-requests'/args.job_id;run.mkdir(parents=True,exist_ok=True);permit_path=run/'permit.json';mission_path=run/'mission.json';plan_path=run/'plan.json';atomic(permit_path,permit);atomic(mission_path,mission)
 invoke('plan',mission_path,'--authority-permit',permit_path,'--out',plan_path);started=time.monotonic_ns();result=invoke('apply',plan_path,'--authority-permit',permit_path);elapsed=max(1,(time.monotonic_ns()-started)//1_000_000);verified=invoke('verify',result['receipt'])
 print(json.dumps({'state':'ORGAN_PROMOTED','jobId':args.job_id,'candidateHash':args.candidate_hash,'receipt':result['receipt'],'receiptSeal':verified['receipt_seal'],'measuredApplyMs':elapsed},sort_keys=True))
if __name__=='__main__':
 try:main()
 except Exception as error:print(json.dumps({'state':'REJECT','reason':str(error)},sort_keys=True));raise SystemExit(2)
