import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {EVIDENCE_AXES,REVIEW_SCALES,VIEWS,ablationCases,acceptanceFailures,allStrokes,markSourceVerified,promoteUserAccepted,recordScaleReview,renderMechanismSvg,replayHash,setAblationEvidence,validateMechanismStudy,visibleStrokes} from '../src/sparse-line-study.mjs';

const curriculum=JSON.parse(fs.readFileSync(new URL('../training/wonder-sparse-v1/shovel-studies.json',import.meta.url)));
const starter=curriculum.study,sourceHash=curriculum.sourceImage.sha256;
const clone=value=>structuredClone(value);
function fullyReviewed(){
 let study=markSourceVerified(starter,sourceHash);
 for(const view of VIEWS)for(const axis of ['CATEGORY','STRUCTURE'])for(const size of REVIEW_SCALES)study=recordScaleReview(study,{view,axis,size,verdict:axis==='CATEGORY'?'RECOGNIZABLE':'PRESERVED',referenceHidden:true});
 for(const view of VIEWS)for(const stroke of visibleStrokes(study,view))for(const axis of EVIDENCE_AXES)study=setAblationEvidence(study,{strokeId:stroke.id,view,axis,value:axis==='CATEGORY'?'POSITIVE':'NEUTRAL'});
 return study;
}
test('modern mechanism study is neutral, connected, sparse, and unaccepted',()=>{
 assert.equal(curriculum.schema,'vector-noodle.mechanism-line-curriculum.v1');
 assert.equal(curriculum.sourcePolicy,'MODERN_OBJECTS_ONLY_FLESHPUNK_FORBIDDEN');
 assert.equal(curriculum.commission.strokeTarget,null);
 assert.deepEqual(validateMechanismStudy(starter).failures,[]);
 assert.equal(starter.parts.length,8);assert.equal(starter.attachments.length,5);
 assert.equal(visibleStrokes(starter,'ASSEMBLED').length,15);assert.equal(visibleStrokes(starter,'EXPLODED').length,16);
 assert.equal(starter.state,'DRAFT');assert.equal(curriculum.state,'AWAITING_USER_PIXEL_VERDICT');
});
test('old disease fails: independent exploded geometry is forbidden',()=>{
 const bad=clone(starter);bad.explodedStrokes=[{id:'diagram-trope',d:'M0 0L1 1'}];
 assert.match(validateMechanismStudy(bad).failures.join(','),/INDEPENDENT_EXPLODED_GEOMETRY_FORBIDDEN/);
});
test('both views reuse identical base paths and differ only by part transforms',()=>{
 const assembled=renderMechanismSvg(starter,{view:'ASSEMBLED'}),exploded=renderMechanismSvg(starter,{view:'EXPLODED'});
 for(const stroke of allStrokes(starter)){if(stroke.visible.ASSEMBLED!==false)assert.ok(assembled.includes('d="'+stroke.d+'"'));if(stroke.visible.EXPLODED!==false)assert.ok(exploded.includes('d="'+stroke.d+'"'))}
 assert.notEqual(assembled,exploded);
});
test('neutral parts require source evidence and forbid shovel ontology labels',()=>{
 const named=clone(starter);named.parts[0].name='grip';assert.match(validateMechanismStudy(named).failures.join(','),/ONTOLOGY_LABEL_FORBIDDEN/);
 const unsupported=clone(starter);unsupported.rejectedExplodedMarks[0].state='UNSUPPORTED';assert.match(validateMechanismStudy(unsupported).failures.join(','),/UNSUPPORTED_EXPLODED_MARK/);
 const orphan=clone(starter);orphan.attachments=orphan.attachments.filter(edge=>!edge.partIds.includes('part-06'));assert.match(validateMechanismStudy(orphan).failures.join(','),/ASSEMBLED_ATTACHMENT_GRAPH_DISCONNECTED/);
});
test('modern source hash is mandatory and Fleshpunk remains forbidden',()=>{
 assert.throws(()=>markSourceVerified(starter,'0'.repeat(64)),/SOURCE_HASH_MISMATCH/);
 const poisoned=clone(starter);poisoned.source.id='fleshpunk';assert.match(validateMechanismStudy(poisoned).failures.join(','),/FLESHPUNK_SOURCE_FORBIDDEN/);
});
test('CATEGORY STRUCTURE and NOISE are independent per view',()=>{
 let study=markSourceVerified(starter,sourceHash),id=allStrokes(study)[0].id;
 study=setAblationEvidence(study,{strokeId:id,view:'ASSEMBLED',axis:'CATEGORY',value:'POSITIVE'});
 assert.equal(study.parts[0].strokes[0].evidence.ASSEMBLED.CATEGORY,'POSITIVE');
 assert.equal(study.parts[0].strokes[0].evidence.ASSEMBLED.STRUCTURE,'PENDING');
 assert.equal(study.parts[0].strokes[0].evidence.EXPLODED.CATEGORY,'PENDING');
});
test('harmful or non-load-bearing retained ink blocks acceptance',()=>{
 let harmful=fullyReviewed(),id=allStrokes(harmful)[0].id;
 harmful=setAblationEvidence(harmful,{strokeId:id,view:'EXPLODED',axis:'NOISE',value:'POSITIVE'});
 assert.match(acceptanceFailures(harmful).join(','),/HARMFUL_STROKE_RETAINED/);
 let empty=fullyReviewed();
 for(const axis of EVIDENCE_AXES)empty=setAblationEvidence(empty,{strokeId:id,view:'ASSEMBLED',axis,value:'NEUTRAL'});
 assert.match(acceptanceFailures(empty).join(','),/NON_LOAD_BEARING_STROKE/);
});
test('both category and construction reviews are required at all scales',()=>{
 let study=markSourceVerified(starter,sourceHash);
 study=recordScaleReview(study,{view:'ASSEMBLED',axis:'CATEGORY',size:96,verdict:'RECOGNIZABLE',referenceHidden:true});
 const failures=acceptanceFailures(study).join(',');
 assert.match(failures,/STRUCTURE_NOT_PRESERVED:ASSEMBLED:96/);
 assert.match(failures,/CATEGORY_NOT_RECOGNIZABLE:EXPLODED:96/);
});
test('only the user can accept a fully reviewed dual-state core',()=>{
 const study=fullyReviewed();assert.deepEqual(acceptanceFailures(study),[]);
 assert.throws(()=>promoteUserAccepted(study,{authority:'MACHINE'}),/HUMAN_AUTHORITY_REQUIRED/);
 const accepted=promoteUserAccepted(study,{authority:'USER_GESTURE'});assert.equal(accepted.state,'USER_ACCEPTED');assert.equal(accepted.acceptance.sourceSha256,sourceHash);assert.deepEqual(validateMechanismStudy(accepted).failures,[]);
 const changed=clone(accepted);changed.parts[0].poses.EXPLODED[4]+=1;assert.match(validateMechanismStudy(changed).failures.join(','),/ACCEPTANCE_REPLAY_MISMATCH/);
});
test('dual-state ablation covers every visible stroke without mutation',()=>{
 for(const view of VIEWS){const cases=ablationCases(starter,view);assert.equal(cases.length,visibleStrokes(starter,view).length);for(const item of cases){const full=renderMechanismSvg(starter,{view}),without=renderMechanismSvg(starter,{view,omitStrokeId:item.strokeId});assert.notEqual(full,without);assert.equal(allStrokes(starter).length,16)}}
});
test('SVG remains line-only and rejected diagram marks never render',()=>{
 for(const view of VIEWS){const svg=renderMechanismSvg(starter,{view});assert.doesNotMatch(svg,/<image|data:|<script|<filter|explosion-axis|fastener/i);assert.equal((svg.match(/<path/g)||[]).length,visibleStrokes(starter,view).length)}
});
test('same mechanism study has stable replay hash',()=>assert.equal(replayHash(starter),replayHash(JSON.parse(JSON.stringify(starter)))));

test('fresh visual evidence is hash-bound and remains unaccepted',()=>{
 const provenance=JSON.parse(fs.readFileSync(new URL('../training/wonder-sparse-v1/PROVENANCE.json',import.meta.url)));
 assert.equal(provenance.transcription.reviewBuildMarker,'empty-glass-mechanism-v4');assert.equal(provenance.transcription.artisticState,'AWAITING_USER_PIXEL_VERDICT');
 for(const artifact of provenance.artifacts){const bytes=fs.readFileSync(new URL('../'+artifact.path,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),artifact.sha256);assert.equal(artifact.accepted,false)}
});
test('browser exposes correspondence and three independent ablation axes',()=>{
 const html=fs.readFileSync(new URL('../wonder/index.html',import.meta.url),'utf8'),script=fs.readFileSync(new URL('../wonder/studio.mjs',import.meta.url),'utf8');
 for(const marker of ['empty-glass-mechanism-v4','map-toggle','data-axis="CATEGORY"','data-axis="STRUCTURE"','data-axis="NOISE"','accept-study'])assert.match(html,new RegExp(marker));
 for(const behavior of ['renderMechanismSvg','setAblationEvidence','recordScaleReview','promoteUserAccepted','crypto.subtle'])assert.match(script,new RegExp(behavior));
});
