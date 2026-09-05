import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {compileCorrespondenceProgram,intervenePrimitive} from '../src/perceptual-geometry.mjs';
import {allStrokes,replayHash,validateMechanismStudy} from '../src/sparse-line-study.mjs';

const require=createRequire(import.meta.url);
const vtracer=require('@visioncortex/vtracer');
const root=path.resolve(new URL('..',import.meta.url).pathname);
const training=path.join(root,'training/wonder-sparse-v1');
const sourcePath=path.join(training,'source-cache/utility-normal.png');
const studyPath=path.join(training,'shovel-studies.json');
const correspondencePath=path.join(training,'paired-correspondence.json');
const interventionsPath=path.join(training,'primitive-interventions.json');
const sourceBytes=fs.readFileSync(sourcePath);
const sourceSha256=createHash('sha256').update(sourceBytes).digest('hex');
const EXPECTED='e4202ceb87bae2ab00d98b25999ab1105eda878d38904d97d070b63aff1fa923';
if(sourceSha256!==EXPECTED)throw new Error('REJECT:SOURCE_HASH_MISMATCH');
const previous=JSON.parse(fs.readFileSync(studyPath,'utf8'));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'wonder-correspondence-'));
process.on('exit',()=>fs.rmSync(temp,{recursive:true,force:true}));
const specPath=path.join(temp,'paired-correspondence.json'),maskDir=path.join(temp,'masks');
const inference=spawnSync('python',['tools/infer_paired_components.py',sourcePath,specPath,maskDir],{cwd:root,encoding:'utf8'});
if(inference.status!==0)throw new Error('REJECT:PAIRED_INFERENCE_FAILED:'+inference.stderr.trim());
const spec=JSON.parse(fs.readFileSync(specPath,'utf8'));
function traceMask(id){
 const file=path.join(maskDir,id+'.png');
 if(!fs.existsSync(file))throw new Error('UNKNOWN:COMPONENT_MASK_MISSING:'+id);
 return vtracer.convertBuffer(fs.readFileSync(file),{clustering:'bw',mode:'polygon',filterSpeckle:5,cornerThreshold:75,lengthThreshold:3,simplify:1,pathPrecision:2,optimize:1});
}
const componentSvgs=spec.components.map(component=>traceMask(component.id));
const views={ASSEMBLED:{x:0,y:0,width:397,height:397},EXPLODED:{x:0,y:397,width:397,height:396}};
const study=compileCorrespondenceProgram(componentSvgs,spec,{sourceSha256,sourceViews:views,subjectId:'modern-object-01',sourceId:'utility-normal:column-0:paired'});
let validation=null;
let counter=1;
const singles=[];
for(const part of study.parts){
 for(const operator of ['ROTATE','SCALE','REMOVE'])for(const direction of operator==='REMOVE'?[1]:[-1,1]){
  const input={targetId:part.id,operator,direction,view:'ASSEMBLED'};
  singles.push({id:'intervention-'+String(counter++).padStart(2,'0'),kind:'SINGLE_PRIMITIVE',input,replayHash:replayHash(intervenePrimitive(study,input)),judgment:Object.fromEntries(['CATEGORY','INSTANCE','MECHANISM','AFFORDANCE','NOISE','SCALE','CROSS_VIEW'].map(axis=>[axis,'PENDING_HUMAN']))});
 }
}
for(const attachment of study.attachments)for(const direction of [-1,1]){
 const input={targetId:attachment.id,operator:'DETACH',direction,view:'ASSEMBLED'};
 singles.push({id:'intervention-'+String(counter++).padStart(2,'0'),kind:'SINGLE_ATTACHMENT',input,replayHash:replayHash(intervenePrimitive(study,input)),judgment:Object.fromEntries(['CATEGORY','INSTANCE','MECHANISM','AFFORDANCE','NOISE','SCALE','CROSS_VIEW'].map(axis=>[axis,'PENDING_HUMAN']))});
}
const interventionArtifactAxes=()=>['CATEGORY','INSTANCE','MECHANISM','AFFORDANCE','NOISE','SCALE','CROSS_VIEW'];
const pairs=[];
for(let index=0;index<study.parts.length-1;index++){
 const inputs=[{targetId:study.parts[index].id,operator:'REMOVE',direction:1,view:'ASSEMBLED'},{targetId:study.parts[index+1].id,operator:'REMOVE',direction:1,view:'ASSEMBLED'}];
 let mutated=study;for(const input of inputs)mutated=intervenePrimitive(mutated,input);
 pairs.push({id:'pair-intervention-'+String(index+1).padStart(2,'0'),kind:'PAIRWISE_PRIMITIVE',inputs,replayHash:replayHash(mutated),interactionJudgment:'PENDING_HUMAN'});
}
study.interactionEvidence=pairs.map(item=>({id:item.id,inputs:item.inputs,...Object.fromEntries(interventionArtifactAxes().map(axis=>[axis,'PENDING']))}));
for(const item of singles)item.replayHash=replayHash(intervenePrimitive(study,item.input));
for(const item of pairs){let changed=study;for(const input of item.inputs)changed=intervenePrimitive(changed,input);item.replayHash=replayHash(changed)}
validation=validateMechanismStudy(study);
if(validation.failures.length)throw new Error('REJECT:GENERATED_STUDY_INVALID_AFTER_INTERACTIONS:'+validation.failures.join('|'));
const proposalReceipt={
 schema:'vector-noodle.paired-correspondence-build.v1',
 state:'AWAITING_HUMAN_COMPONENT_COHERENCE',
 sourceSha256,
 inference:JSON.parse(inference.stdout.trim()),
 teacher:{tool:'@visioncortex/vtracer@1.0.0-alpha.4',mode:'polygon',status:'TEACHER_PROPOSAL_NOT_RUNTIME'},
 prohibitionChecks:{requestedComponentCount:spec.selection.requestedComponentCount,fractionalFallbackCuts:spec.selection.fractionalFallbackCuts,globalLongitudinalPartition:false,semanticObjectLabels:false,artificialCutFaces:false},
 spec
};
const interventionArtifact={schema:'vector-noodle.proof-carrying-interventions.v1',sourceSha256,order:['SINGLE_PRIMITIVE','SINGLE_ATTACHMENT','PAIRWISE_PRIMITIVE','STROKE_ABLATION'],humanAuthority:true,axes:['CATEGORY','INSTANCE','MECHANISM','AFFORDANCE','NOISE','SCALE','CROSS_VIEW'],singles,pairs};
const curriculum={
 schema:'vector-noodle.correspondence-first-curriculum.v1',
 state:'AWAITING_HUMAN_COMPONENT_COHERENCE',
 sourcePolicy:'MODERN_OBJECTS_ONLY_FLESHPUNK_FORBIDDEN',
 sourceImage:previous.sourceImage,
 commission:{question:'Which cross-view relations must survive for both panels to remain the same manipulable object?',pipeline:['PAIRED_EVIDENCE','PERSISTENT_REGION_CANDIDATES','CROSS_VIEW_HYPOTHESES','SHARED_LATENT_COMPONENTS','ATTACHMENT_GRAPH','CANONICAL_COMPONENT_CONTOURS','ASSEMBLED_EXPLODED_TRANSFORMS','PRIMITIVE_INTERVENTIONS','STROKE_ABLATION','HUMAN_VERDICT'],proofAxes:interventionArtifact.axes,strokeCeiling:20,strokeTarget:null,humanOwnsAcceptance:true,accessibilityOralExam:true},
 rejectedCandidate:{state:'VISUAL_REJECTED_REGRESSION',artifact:'rejected-relation-v5.json',reason:'PCA_WIDTH_SLABS_ASSERT_FALSE_TOPOLOGY'},
 diagnostics:{jointCoverage:spec.selection.jointCoverage,jointCollision:spec.selection.jointCollision,areaGapRatio:spec.selection.areaGapRatio,componentCountDiscovered:spec.selection.selectedCount,qualityAuthority:false},
 study
};
for(const [file,value] of [[correspondencePath,proposalReceipt],[interventionsPath,interventionArtifact],[studyPath,curriculum]])fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
console.log(JSON.stringify({state:curriculum.state,parts:study.parts.length,strokes:allStrokes(study).length,attachments:study.attachments.length,singles:singles.length,pairs:pairs.length,diagnostics:curriculum.diagnostics,validation}));
