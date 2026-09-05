#!/usr/bin/env node
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { compileNoodlePrompt, createTrainingJob, evolveKernel } from "../src/noodle-compiler.mjs";

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const STATE=resolve(process.env.NOODLE_STATE_ROOT||join(ROOT,".noodle-state"));
const JOB_ID=/^job-[a-f0-9]{16}$/;
const HASH=/^[a-f0-9]{64}$/;

function fail(reason,detail=null,code=2){const out={state:"REJECT",reason};if(detail)out.detail=detail;process.stdout.write(JSON.stringify(out));process.exitCode=code;return out;}
function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
function safeJob(id){if(!JOB_ID.test(id||""))throw new Error("INVALID_JOB_ID");return join(STATE,"jobs",`${id}.json`);}
async function json(path){return JSON.parse(await readFile(path,"utf8"));}
async function atomic(path,value){await mkdir(dirname(path),{recursive:true});const temp=`${path}.${process.pid}.tmp`;await writeFile(temp,`${JSON.stringify(value,null,2)}\n`,{encoding:"utf8",flag:"wx"});await rename(temp,path);}
async function registry(){
 const seed=await json(join(ROOT,"capabilities","registry.v1.json"));let accepted=[];
 try{accepted=(await json(join(STATE,"accepted","registry.json"))).capabilities||[];}catch(error){if(error.code!=="ENOENT")throw error;}
 return{schema:seed.schema,capabilities:[...seed.capabilities,...accepted]};
}
async function withLock(name,operation){const lock=join(STATE,"locks",`${name}.lock`);await mkdir(dirname(lock),{recursive:true});try{await mkdir(lock);}catch(error){if(error.code==="EEXIST")throw new Error("LOCKED");throw error;}try{return await operation();}finally{await rm(lock,{recursive:true,force:true});}}
async function request(prompt){
 const result=compileNoodlePrompt(prompt,await registry());if(result.state!=="NEEDS_TRAINING")return result;
 let job=createTrainingJob(result);if(job.state==="NEEDS_KERNEL_EVOLUTION")job=evolveKernel(job);
 const path=safeJob(job.jobId);return withLock(job.jobId,async()=>{try{const existing=await json(path);if(existing.gapHash!==job.gapHash)throw new Error("JOB_HASH_COLLISION");return existing;}catch(error){if(error.code!=="ENOENT")throw error;}await atomic(path,job);return job;});
}
async function status(id){return json(safeJob(id));}
async function decide(action,id,candidateHash){
 if(!HASH.test(candidateHash||""))throw new Error("INVALID_CANDIDATE_HASH");
 return withLock(id,async()=>{const path=safeJob(id),job=await json(path);if(job.candidateHash!==candidateHash)throw new Error("CANDIDATE_HASH_MISMATCH");if(job.state!=="AWAITING_USER")throw new Error("JOB_NOT_AWAITING_USER");
  if(action==="reject"){const decided={...job,state:"REJECTED",decision:{type:"USER_REJECTED",candidateHash,at:new Date().toISOString()}};await atomic(`${path}.next`,decided);await rename(`${path}.next`,path);return decided;}
  if(!process.argv.includes("--user-accepted"))throw new Error("EXPLICIT_USER_ACCEPTANCE_REQUIRED");
  const python=process.env.PYTHON_BIN||"/data/data/com.termux/files/usr/bin/python";
  const promoted=spawnSync(python,[join(ROOT,"tools","organ_promote.py"),id,candidateHash],{encoding:"utf8",env:{...process.env,NOODLE_STATE_ROOT:STATE},timeout:60000});
  let receipt;try{receipt=JSON.parse(promoted.stdout||"{}");}catch{throw new Error("ORGAN_PROMOTION_PROTOCOL_ERROR");}
  if(promoted.status!==0||receipt.state!=="ORGAN_PROMOTED")throw new Error(receipt.reason||"ORGAN_PROMOTION_REJECTED");
  const decided={...job,state:"ACTIVE",decision:{type:"USER_ACCEPTED_ORGAN_SEALED",candidateHash,at:new Date().toISOString(),receiptSeal:receipt.receiptSeal,receipt:receipt.receipt}};await atomic(`${path}.next`,decided);await rename(`${path}.next`,path);return decided;
 });
}
async function main(){
 const command=process.argv[2];let result;
 if(command==="request"){const prompt=arg("--prompt");if(prompt===null)return fail("PROMPT_REQUIRED");result=await request(prompt);}
 else if(command==="status")result=await status(process.argv[3]);
 else if(command==="accept")result=await decide("accept",process.argv[3],process.argv[4]);
 else if(command==="reject")result=await decide("reject",process.argv[3],process.argv[4]);
 else return fail("UNKNOWN_COMMAND",command);
 process.stdout.write(`${JSON.stringify(result)}\n`);
}
main().catch((error)=>fail(error.message,null,1));
