import {mutateRelation} from '../src/perceptual-geometry.mjs';
import {EVIDENCE_AXES,MAX_VISIBLE_STROKES,REVIEW_SCALES,VIEWS,acceptanceFailures,allStrokes,markSourceVerified,promoteUserAccepted,recordScaleReview,renderMechanismSvg,setAblationEvidence,setRelationEvidence,validateMechanismStudy,visibleStrokes} from '../src/sparse-line-study.mjs';

const $=selector=>document.querySelector(selector),clone=value=>JSON.parse(JSON.stringify(value));
const curriculum=await fetch('../training/wonder-sparse-v1/shovel-studies.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error('study '+response.status);return response.json()});
const mutationSet=await fetch('../training/wonder-sparse-v1/relation-mutations.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error('mutations '+response.status);return response.json()});
const starter=curriculum.study,storageKey='empty-glass-relations-v5:'+curriculum.sourceImage.sha256;
let study=restore(),view='ASSEMBLED',referenceVisible=true,mapVisible=true,activeScale=96,relationIndex=-1,ablationIndex=-1,sourceHref=null,sourceObjectUrl=null,verifiedSourceSha=null;
function restore(){try{const saved=JSON.parse(localStorage.getItem(storageKey));if(validateMechanismStudy(saved).failures.length===0)return saved}catch{}return clone(starter)}
function persist(){localStorage.setItem(storageKey,JSON.stringify(study))}
function sourceVerified(){return study.source.verification?.state==='VERIFIED'&&study.source.verification.sha256===study.source.sha256&&verifiedSourceSha===study.source.sha256}
function activeRelation(){return relationIndex>=0?mutationSet.variants[relationIndex]:null}
function displayStudy(){const spec=activeRelation();return spec?mutateRelation(study,spec):study}
function relationPending(){return study.relationEvidence.some(item=>item.CATEGORY==='PENDING'||item.STRUCTURE==='PENDING')}
function currentStrokes(){return visibleStrokes(study,view)}
function omittedId(){return ablationIndex>=0?currentStrokes()[ablationIndex]?.id:null}
function parseSvg(svg){return new DOMParser().parseFromString(svg,'image/svg+xml').documentElement}
function drawMain(){
 const crop=study.source.views[view],drawing=$('#drawing'),reference=$('#reference'),ink=$('#ink');
 drawing.setAttribute('viewBox','0 0 '+study.canvas.width+' '+study.canvas.height);
 if(sourceHref)reference.setAttribute('href',sourceHref);else reference.removeAttribute('href');
 reference.setAttribute('x',-crop.x);reference.setAttribute('y',-crop.y);reference.setAttribute('width',curriculum.sourceImage.width);reference.setAttribute('height',curriculum.sourceImage.height);
 reference.classList.toggle('hidden',!referenceVisible);
 const rendered=parseSvg(renderMechanismSvg(displayStudy(),{view,omitStrokeId:omittedId(),showMap:mapVisible}));
 ink.replaceChildren(...[...rendered.children].slice(1).map(node=>document.importNode(node,true)));
}
function drawPreviews(){
 const host=$('#scale-previews');host.replaceChildren();
 for(const size of REVIEW_SCALES){const card=document.createElement('button');card.className='preview-card'+(activeScale===size?' active':'');card.style.setProperty('--review-size',size+'px');card.dataset.scale=size;const category=study.review[view].CATEGORY.find(item=>item.size===size).verdict||'CATEGORY ?';const structure=study.review[view].STRUCTURE.find(item=>item.size===size).verdict||'STRUCTURE ?';card.innerHTML='<span>'+size+' px · '+category+' · '+structure+'</span>';card.append(parseSvg(renderMechanismSvg(displayStudy(),{view,omitStrokeId:omittedId()})));card.addEventListener('click',()=>{activeScale=size;render()});host.append(card)}
}
function drawLedger(){
 const host=$('#part-ledger');host.replaceChildren();
 const title=document.createElement('strong');title.textContent='Source-derived correspondence · '+study.parts.length+' neutral parts · '+study.attachments.length+' evidenced attachments';host.append(title);
 const parts=document.createElement('div');parts.className='part-chips';
 for(const part of study.parts){const chip=document.createElement('span');chip.textContent=part.id+' · '+part.strokes.length+' stroke'+(part.strokes.length===1?'':'s');parts.append(chip)}host.append(parts);
 const graph=document.createElement('ol');for(const relation of study.landmarkGraph.relations){const evidence=study.relationEvidence.find(item=>item.relationId===relation.id);const item=document.createElement('li');item.textContent=relation.id+' · '+relation.type+' · C '+evidence.CATEGORY+' · S '+evidence.STRUCTURE;graph.append(item)}host.append(graph);
}
function blockers(){const result=acceptanceFailures(study);if(referenceVisible)result.push('CURRENT_REFERENCE_VISIBLE');if(relationIndex>=0)result.push('RELATION_VARIANT_ACTIVE');if(ablationIndex>=0)result.push('ABLATION_ACTIVE');return[...new Set(result)]}
function render(){
 const strokes=currentStrokes();if(ablationIndex>=strokes.length)ablationIndex=strokes.length-1;
 drawMain();drawPreviews();drawLedger();
 const relation=activeRelation();$('#relation-name').textContent=relation?relation.relationId+' · '+relation.relationType+' · '+relation.operator+' '+relation.direction:'Unperturbed relation graph';$('#relation-note').textContent=relation?'Judge whether this relation distortion changes CATEGORY or STRUCTURE.':'Relations must be judged before stroke deletion.';for(const button of document.querySelectorAll('[data-relation-axis]')){const evidence=relation&&study.relationEvidence.find(item=>item.relationId===relation.relationId);button.disabled=!relation||referenceVisible||!sourceVerified();button.classList.toggle('active',Boolean(evidence&&evidence[button.dataset.relationAxis]===button.dataset.value))}
 $('#assembled').classList.toggle('active',view==='ASSEMBLED');$('#exploded').classList.toggle('active',view==='EXPLODED');
 $('#reference-toggle').textContent=referenceVisible?'Hide reference':'Show reference';$('#map-toggle').textContent=mapVisible?'Hide correspondence':'Show correspondence';$('#map-toggle').classList.toggle('active',mapVisible);
 $('#budget').textContent=strokes.length+' / '+MAX_VISIBLE_STROKES+' visible strokes';$('#active-scale').textContent='Reviewing '+view.toLowerCase()+' at '+activeScale+' px';
 const current=ablationIndex>=0?strokes[ablationIndex]:null;
 $('#ablation-name').textContent=current?'WITHOUT '+current.id+' · '+current.partId:'Full '+view.toLowerCase()+' drawing';
 $('#ablation-note').textContent=current?'Judge deletion on all three axes. This decision affects only '+view.toLowerCase()+'.':'Remove one stroke, then judge CATEGORY, STRUCTURE, and NOISE separately.';
 for(const button of document.querySelectorAll('[data-axis]')){button.disabled=!current||referenceVisible||!sourceVerified()||relationPending()||Boolean(activeRelation());button.classList.toggle('active',Boolean(current&&current.evidence[view][button.dataset.axis]===button.dataset.value))}
 for(const button of document.querySelectorAll('[data-review-axis]')){const axis=button.dataset.reviewAxis,item=study.review[view][axis].find(entry=>entry.size===activeScale);button.disabled=referenceVisible||!sourceVerified()||Boolean(current)||Boolean(activeRelation());button.classList.toggle('active',item.verdict===button.dataset.verdict)}
 $('#review-lock').textContent=!sourceVerified()?'Verify the sealed modern source before judgment.':referenceVisible?'Hide the reference before recording judgment.':activeRelation()?'Return to the unperturbed graph for scale judgment.':current?'Return to the full drawing for scale judgment.':'Judge both category and construction at '+activeScale+' px.';
 const pending=allStrokes(study).flatMap(stroke=>VIEWS.flatMap(target=>EVIDENCE_AXES.filter(axis=>stroke.evidence[target][axis]==='PENDING'))).length,validation=validateMechanismStudy(study);
 $('#state').textContent=study.state+' · '+pending+' evidence judgments pending · '+validation.replayHash;
 const failures=blockers(),accept=$('#accept-study');accept.disabled=failures.length>0||study.state==='USER_ACCEPTED';
 $('#acceptance-blockers').textContent=study.state==='USER_ACCEPTED'?'USER_ACCEPTED · hash-bound paired study':failures.length?'Locked · '+failures.slice(0,5).join(' · ')+(failures.length>5?' · +'+(failures.length-5)+' more':''):'All gates are ready for your explicit acceptance.';
 persist();
}
function switchView(next){if(next===view)return;view=next;referenceVisible=true;activeScale=96;relationIndex=-1;ablationIndex=-1;render()}
async function sha256Hex(bytes){const digest=await crypto.subtle.digest('SHA-256',bytes);return[...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('')}
async function acceptSourceBytes(bytes,label,type){
 const digest=await sha256Hex(bytes);if(digest!==curriculum.sourceImage.sha256)throw new Error('REJECT:SOURCE_HASH_MISMATCH:'+digest);
 if(sourceObjectUrl)URL.revokeObjectURL(sourceObjectUrl);sourceObjectUrl=URL.createObjectURL(new Blob([bytes],{type:type||'image/png'}));sourceHref=sourceObjectUrl;verifiedSourceSha=digest;
 if(study.source.verification?.state!=='VERIFIED')study=markSourceVerified(study,digest);
 $('#source-status').textContent='Verified modern source · '+label;render();
}
async function loadBundledSource(){try{const response=await fetch(curriculum.sourceImage.localHref,{cache:'no-store'});if(!response.ok)throw new Error('HTTP '+response.status);await acceptSourceBytes(await response.arrayBuffer(),'sealed local cache',response.headers.get('content-type'))}catch(error){$('#source-status').textContent='Source unavailable · '+error.message;render()}}
function download(name,type,text){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}

$('#relation-next').addEventListener('click',()=>{relationIndex=(relationIndex+1)%mutationSet.variants.length;ablationIndex=-1;render()});$('#relation-prev').addEventListener('click',()=>{relationIndex=relationIndex<=0?mutationSet.variants.length-1:relationIndex-1;ablationIndex=-1;render()});$('#relation-clear').addEventListener('click',()=>{relationIndex=-1;render()});for(const button of document.querySelectorAll('[data-relation-axis]'))button.addEventListener('click',()=>{const relation=activeRelation();if(!relation||referenceVisible||!sourceVerified())return;study=setRelationEvidence(study,{relationId:relation.relationId,axis:button.dataset.relationAxis,value:button.dataset.value});render()});
$('#assembled').addEventListener('click',()=>switchView('ASSEMBLED'));$('#exploded').addEventListener('click',()=>switchView('EXPLODED'));
$('#reference-toggle').addEventListener('click',()=>{referenceVisible=!referenceVisible;render()});$('#map-toggle').addEventListener('click',()=>{mapVisible=!mapVisible;render()});
$('#source-file').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{await acceptSourceBytes(await file.arrayBuffer(),file.name,file.type)}catch(error){$('#source-status').textContent=error.message;render()}});
$('#ablation-next').addEventListener('click',()=>{if(relationPending())return;relationIndex=-1;const count=currentStrokes().length;ablationIndex=count?(ablationIndex+1)%count:-1;render()});
$('#ablation-prev').addEventListener('click',()=>{if(relationPending())return;relationIndex=-1;const count=currentStrokes().length;ablationIndex=count?(ablationIndex<=0?count-1:ablationIndex-1):-1;render()});
$('#ablation-clear').addEventListener('click',()=>{ablationIndex=-1;render()});
for(const button of document.querySelectorAll('[data-axis]'))button.addEventListener('click',()=>{const current=currentStrokes()[ablationIndex];if(!current||referenceVisible||!sourceVerified())return;study=setAblationEvidence(study,{strokeId:current.id,view,axis:button.dataset.axis,value:button.dataset.value});render()});
for(const button of document.querySelectorAll('[data-review-axis]'))button.addEventListener('click',()=>{try{study=recordScaleReview(study,{view,axis:button.dataset.reviewAxis,size:activeScale,verdict:button.dataset.verdict,referenceHidden:!referenceVisible,note:$('#review-note').value.trim()});render()}catch(error){$('#state').textContent=error.message}});
$('#accept-study').addEventListener('click',async()=>{try{study=promoteUserAccepted(study,{authority:'USER_GESTURE'});persist();render();const response=await fetch('../api/wonder/save-study',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(study)}),result=await response.json();if(!response.ok)throw new Error('SAVE_REJECTED:'+result.reason);$('#state').textContent='USER_ACCEPTED · durable receipt '+result.receipt}catch(error){$('#state').textContent=error.message}});
$('#export-svg').addEventListener('click',()=>download('shovel-'+view.toLowerCase()+'-mechanism.svg','image/svg+xml',renderMechanismSvg(study,{view})));
$('#export-json').addEventListener('click',()=>download('shovel-mechanism.study.json','application/json',JSON.stringify(study,null,2)));
$('#reset').addEventListener('click',()=>{if(!confirm('Reset all paired evidence to the source-derived starter?'))return;study=clone(starter);if(verifiedSourceSha)study=markSourceVerified(study,verifiedSourceSha);view='ASSEMBLED';referenceVisible=true;mapVisible=true;activeScale=96;relationIndex=-1;ablationIndex=-1;render()});
render();await loadBundledSource();
