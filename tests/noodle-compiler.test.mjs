import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { compileNoodlePrompt, createTrainingJob, evolveKernel, parseNoodlePrompt, renderVectorProgram, sha256 } from "../src/noodle-compiler.mjs";

const registry=JSON.parse(readFileSync(new URL('../capabilities/registry.v1.json',import.meta.url)));

test('sha256 receipts are standard',()=>assert.equal(sha256('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'));
test('same controlled prompt produces identical package and pure SVG',()=>{const prompt='fleshpunk pressure valve gate exploded rotate';const a=compileNoodlePrompt(prompt,registry),b=compileNoodlePrompt(prompt,registry);assert.deepEqual(a,b);assert.equal(a.state,'COMPILED');assert.match(a.svg,/data-depth=/);assert.doesNotMatch(a.svg,/<script|foreignObject|canvas|webgl/i);});
test('machine and creature seed capabilities reach pixels',()=>{for(const prompt of ['fleshpunk pressure valve gate exploded rotate','lineart tendon hound assembled crawl']){const result=compileNoodlePrompt(prompt,registry);assert.equal(result.state,'COMPILED');assert.ok(result.svg.length>1000);}});
test('ambiguity and unknown targets stop explicitly',()=>{assert.equal(parseNoodlePrompt('pressure valve gate and tendon hound').reason,'MULTIPLE_TARGETS');assert.equal(parseNoodlePrompt('beautiful mystery').state,'NEEDS_CLARIFICATION');});
test('capability ablation changes compile into training',()=>{const empty={...registry,capabilities:registry.capabilities.filter((cap)=>cap.id!=='pressure_valve_gate')};assert.equal(compileNoodlePrompt('pressure valve gate',empty).state,'NEEDS_TRAINING');});
test('symbolic training searches layouts and emits six pixel stages',()=>{const gap=compileNoodlePrompt('fleshpunk pipes valves tendons connective tissue machine',registry);assert.equal(gap.state,'NEEDS_TRAINING');const a=createTrainingJob(gap),b=createTrainingJob(gap);assert.deepEqual(a,b);assert.equal(a.state,'AWAITING_USER');assert.equal(a.objective.alternatives.length,3);assert.equal(a.stages.length,6);assert.ok(a.stages.every((stage)=>stage.svg.startsWith('<svg')));});
test('unknown opcode fails closed as a kernel extension',()=>assert.throws(()=>renderVectorProgram([{op:'mesh'}]),/NEEDS_KERNEL_EXTENSION/));
test('safe kernel evolution synthesizes typed pixels while unknown meaning requests a reference',()=>{const derivable=createTrainingJob(compileNoodlePrompt('machine with pipes coils hinges',registry));const evolved=evolveKernel(derivable);assert.equal(evolved.state,'AWAITING_USER');assert.equal(evolved.kernelEvolution.arbitraryCode,false);assert.equal(evolved.stages.length,6);const unknown=createTrainingJob(compileNoodlePrompt('machine with pipes valves baroque',registry));const stopped=evolveKernel(unknown);assert.equal(stopped.state,'NEEDS_REFERENCE');assert.equal(stopped.imageGenerationNecessary,true);});
test('CLI requires explicit hash-bound user promotion',()=>{
 const state=mkdtempSync(join(tmpdir(),'noodle-test-')),cli=resolve('tools/noodle_cli.mjs'),env={...process.env,NOODLE_STATE_ROOT:state};
 const run=(args)=>spawnSync('node',[cli,...args],{encoding:'utf8',env});
 const first=run(['request','--prompt','pipes valves tendons connective tissue machine']);assert.equal(first.status,0,first.stdout+first.stderr);const job=JSON.parse(first.stdout);assert.equal(job.state,'AWAITING_USER');
 const denied=run(['accept',job.jobId,job.candidateHash]);assert.notEqual(denied.status,0);assert.equal(JSON.parse(denied.stdout).reason,'EXPLICIT_USER_ACCEPTANCE_REQUIRED');
 const unavailable=spawnSync('node',[cli,'accept',job.jobId,job.candidateHash,'--user-accepted'],{encoding:'utf8',env:{...env,ORGAN_BIN:join(state,'missing-organ')}});assert.notEqual(unavailable.status,0);assert.match(JSON.parse(unavailable.stdout).reason,/ORGAN_AUTHORITY_UNAVAILABLE/);
});
