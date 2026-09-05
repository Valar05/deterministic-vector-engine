import fs from 'node:fs';
import path from 'node:path';
const lock=JSON.parse(fs.readFileSync(new URL('../training/wonder-v1/toolchain-lock.json',import.meta.url)));
const modelRoot=process.env.WONDER_FLORENCE_MODEL_DIR;
const result={schema:'vector-noodle.region-teacher-preflight.v1',status:'TEACHER_UNAVAILABLE',accepted:false,model:lock.florence,reason:'MODEL_NOT_ACQUIRED',proposals:[]};
if (modelRoot && fs.existsSync(path.join(modelRoot,'config.json'))) {
  result.reason='ADAPTER_NOT_ENABLED_UNTIL_SOURCE_SET_SEALED';
  result.status='TEACHER_LOCKED';
}
console.log(JSON.stringify(result,null,2));
process.exitCode=2;
