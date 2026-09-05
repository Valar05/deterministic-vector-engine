#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalJson, compileNoodlePrompt, sha256 } from "../src/noodle-compiler.mjs";
const state=resolve(process.env.NOODLE_STATE_ROOT||'.noodle-state');
const id=process.env.NOODLE_EXPECTED_ID,hash=process.env.NOODLE_EXPECTED_HASH,prompt=process.env.NOODLE_EXPECTED_PROMPT;
if(!id||!hash||!prompt)throw new Error('PROMOTION_EXPECTATION_MISSING');
const registry=JSON.parse(readFileSync(resolve(state,'accepted/registry.json'),'utf8'));
const capability=registry.capabilities.find((item)=>item.id===id&&item.active===true);if(!capability)throw new Error('PROMOTED_CAPABILITY_MISSING');
const source={...capability,active:false};delete source.provenance.promotion;if(sha256(canonicalJson(source))!==hash)throw new Error('PROMOTED_CAPABILITY_HASH_MISMATCH');
const seed=JSON.parse(readFileSync('capabilities/registry.v1.json','utf8'));const result=compileNoodlePrompt(prompt,{schema:seed.schema,capabilities:[...seed.capabilities,...registry.capabilities]});if(result.state!=='COMPILED'||result.capabilityId!==id)throw new Error('PROMOTED_COMPILE_FAILED');
process.stdout.write(JSON.stringify({state:'PROMOTION_VERIFIED',capabilityId:id,svgHash:result.svgHash}));
