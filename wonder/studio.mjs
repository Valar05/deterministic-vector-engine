import {MAX_STROKES,addStroke,removeStroke,setAblationVerdict,recordUserReview,renderSparseSvg,validateSparseStudy} from '../src/sparse-line-study.mjs';

const NS='http://www.w3.org/2000/svg';
const $=selector=>document.querySelector(selector);
const clone=value=>JSON.parse(JSON.stringify(value));
const curriculum=await fetch('../training/wonder-sparse-v1/shovel-studies.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error(`study ${response.status}`);return response.json()});
const starters=new Map(curriculum.studies.map(study=>[study.view,study]));
let view='ASSEMBLED',study,referenceVisible=true,role='SILHOUETTE',selectedId=null,ablationIndex=-1,drawing=false,rawPoints=[],history=[],future=[],sourceHref=curriculum.sourceImage.localHref,sourceObjectUrl=null;

function storageKey(){return `empty-glass-shovel-v1:${view}`}
function restore(){
  const saved=localStorage.getItem(storageKey());
  if(saved){try{const candidate=JSON.parse(saved);if(validateSparseStudy(candidate).failures.length===0)return candidate}catch{localStorage.removeItem(storageKey())}}
  return clone(starters.get(view));
}
function persist(){localStorage.setItem(storageKey(),JSON.stringify(study))}
function checkpoint(){history.push(clone(study));if(history.length>50)history.shift();future=[]}
function widthFor(stroke){return stroke.role==='SILHOUETTE'?2.8:stroke.role==='IDENTITY_ANCHOR'?1.9:1.3}
function displayStrokes(){return study.strokes.filter((_,index)=>index!==ablationIndex)}
function element(name,attributes={}){const node=document.createElementNS(NS,name);for(const [key,value] of Object.entries(attributes))node.setAttribute(key,value);return node}
function drawMain(){
  const svg=$('#drawing'),crop=study.source.crop,reference=$('#reference');svg.setAttribute('viewBox',`0 0 ${study.canvas.width} ${study.canvas.height}`);
  reference.setAttribute('href',sourceHref);reference.setAttribute('x',-crop.x);reference.setAttribute('y',-crop.y);reference.setAttribute('width',curriculum.sourceImage.width);reference.setAttribute('height',curriculum.sourceImage.height);reference.classList.toggle('hidden',!referenceVisible);
  const ink=$('#ink');ink.replaceChildren();for(const stroke of displayStrokes()){
    const path=element('path',{d:stroke.d,'data-role':stroke.role,'data-stroke':stroke.id});path.style.strokeWidth=widthFor(stroke);if(stroke.id===selectedId)path.classList.add('selected');ink.append(path);
  }
}
function drawPreviews(){
  const host=$('#scale-previews');host.replaceChildren();for(const [label,className] of [['thumbnail',''],['normal','normal'],['enlarged','large']]){
    const card=document.createElement('div');card.className=`preview-card ${className}`;const span=document.createElement('span');span.textContent=label;const shell=document.createElement('div');shell.innerHTML=renderSparseSvg(study,{omitStrokeId:ablationIndex>=0?study.strokes[ablationIndex]?.id:null,title:`Shovel ${view} ${label}`});card.append(span,shell.firstElementChild);host.append(card);
  }
}
function roleCopy(){return role==='SILHOUETTE'?['Pass 1 · silhouette','Outer mass first. No detail can rescue a generic silhouette.']:role==='IDENTITY_ANCHOR'?['Pass 2 · identity anchors','Add only the contours that make this shovel unmistakable.']:['Pass 3 · correction','Add ink only to repair a concrete hidden-reference misread.']}
function render(){
  if(ablationIndex>=study.strokes.length)ablationIndex=study.strokes.length-1;
  drawMain();drawPreviews();const [label,instruction]=roleCopy();$('#pass-label').textContent=label;$('#instruction').textContent=instruction;$('#budget').textContent=`${study.strokes.length} / ${MAX_STROKES} strokes`;
  $('#reference-toggle').textContent=referenceVisible?'Hide reference':'Show reference';$('#review-lock').hidden=!referenceVisible;for(const button of document.querySelectorAll('[data-verdict]'))button.disabled=referenceVisible;
  document.querySelectorAll('[data-role]').forEach(button=>button.classList.toggle('active',button.dataset.role===role));$('#assembled').classList.toggle('active',view==='ASSEMBLED');$('#exploded').classList.toggle('active',view==='EXPLODED');
  const current=ablationIndex>=0?study.strokes[ablationIndex]:null;$('#ablation-name').textContent=current?`WITHOUT ${current.id}`:'Start ablation';$('#ablation-note').textContent=current?`${current.ablationImportance} · ${current.note}`:'Each step removes exactly one stroke.';
  const validation=validateSparseStudy(study),reviewed=study.strokes.filter(stroke=>stroke.ablationImportance!=='PENDING').length;$('#state').textContent=`${validation.state} · ${reviewed}/${study.strokes.length} ablations reviewed · ${validation.replayHash}`;persist();
}
function switchView(next){if(next===view)return;view=next;study=restore();referenceVisible=true;selectedId=null;ablationIndex=-1;history=[];future=[];render()}
function svgPoint(event){const svg=$('#drawing'),point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;return point.matrixTransform(svg.getScreenCTM().inverse())}
function preview(){ $('#preview').setAttribute('points',rawPoints.map(point=>`${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')) }
function nextStrokeId(){let n=1;const ids=new Set(study.strokes.map(stroke=>stroke.id));while(ids.has(`user-${String(n).padStart(2,'0')}`))n++;return `user-${String(n).padStart(2,'0')}`}

$('#drawing').addEventListener('pointerdown',event=>{
  const existing=event.target.dataset?.stroke;if(existing){selectedId=existing;render();return}
  if(study.strokes.length>=MAX_STROKES){$('#state').textContent='REJECT:STROKE_BUDGET_EXCEEDED';return}
  drawing=true;rawPoints=[svgPoint(event)];$('#drawing').setPointerCapture(event.pointerId);preview();event.preventDefault();
});
$('#drawing').addEventListener('pointermove',event=>{if(!drawing)return;const next=svgPoint(event),last=rawPoints.at(-1);if(Math.hypot(next.x-last.x,next.y-last.y)>=1.2){rawPoints.push(next);preview()}event.preventDefault()});
function finishStroke(event){
  if(!drawing)return;drawing=false;$('#preview').setAttribute('points','');if(rawPoints.length<2)return;
  checkpoint();try{study=addStroke(study,{id:nextStrokeId(),rawPoints,role,note:$('#stroke-note').value.trim(),tolerance:1.5});selectedId=study.strokes.at(-1).id;$('#stroke-note').value=''}catch(error){study=history.pop();$('#state').textContent=error.message}render();event?.preventDefault();
}
$('#drawing').addEventListener('pointerup',finishStroke);$('#drawing').addEventListener('pointercancel',finishStroke);
$('#assembled').addEventListener('click',()=>switchView('ASSEMBLED'));$('#exploded').addEventListener('click',()=>switchView('EXPLODED'));
document.querySelectorAll('[data-role]').forEach(button=>button.addEventListener('click',()=>{role=button.dataset.role;render()}));
$('#reference-toggle').addEventListener('click',()=>{referenceVisible=!referenceVisible;study.review.referenceHidden=!referenceVisible;render()});
$('#source-file').addEventListener('change',event=>{const file=event.target.files[0];if(!file)return;if(sourceObjectUrl)URL.revokeObjectURL(sourceObjectUrl);sourceObjectUrl=URL.createObjectURL(file);sourceHref=sourceObjectUrl;$('#source-status').textContent=`Local source · ${file.name}`;render()});
$('#reference').addEventListener('load',()=>{$('#source-status').textContent='Verified local modern source'});$('#reference').addEventListener('error',()=>{$('#source-status').textContent='Local source missing · choose the modern contact sheet'});
$('#ink').addEventListener('click',event=>{if(event.target.dataset.stroke){selectedId=event.target.dataset.stroke;render()}});
$('#delete-selected').addEventListener('click',()=>{if(!selectedId)return;checkpoint();study=removeStroke(study,selectedId);selectedId=null;ablationIndex=-1;render()});
$('#prune').addEventListener('click',()=>{const removable=study.strokes.filter(stroke=>stroke.ablationImportance==='REMOVABLE');if(!removable.length)return;checkpoint();for(const stroke of removable)study=removeStroke(study,stroke.id);selectedId=null;ablationIndex=-1;render()});
$('#undo').addEventListener('click',()=>{if(!history.length)return;future.push(clone(study));study=history.pop();render()});$('#redo').addEventListener('click',()=>{if(!future.length)return;history.push(clone(study));study=future.pop();render()});
$('#ablation-next').addEventListener('click',()=>{ablationIndex=study.strokes.length?(ablationIndex+1)%study.strokes.length:-1;selectedId=null;render()});
$('#ablation-prev').addEventListener('click',()=>{ablationIndex=study.strokes.length?(ablationIndex<=0?study.strokes.length-1:ablationIndex-1):-1;selectedId=null;render()});
function markAblation(verdict){if(ablationIndex<0)return;checkpoint();study=setAblationVerdict(study,study.strokes[ablationIndex].id,verdict);render()}
$('#essential').addEventListener('click',()=>markAblation('ESSENTIAL'));$('#removable').addEventListener('click',()=>markAblation('REMOVABLE'));
document.querySelectorAll('[data-verdict]').forEach(button=>button.addEventListener('click',()=>{try{checkpoint();study=recordUserReview(study,{verdict:button.dataset.verdict,referenceHidden:!referenceVisible,note:$('#review-note').value.trim()});render()}catch(error){study=history.pop();$('#state').textContent=error.message}}));
function download(name,type,text){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$('#export-svg').addEventListener('click',()=>download(`shovel-${view.toLowerCase()}.svg`,'image/svg+xml',renderSparseSvg(study)));$('#export-json').addEventListener('click',()=>download(`shovel-${view.toLowerCase()}.study.json`,'application/json',JSON.stringify({...study,replayHash:validateSparseStudy(study).replayHash},null,2)));
$('#reset').addEventListener('click',()=>{if(!confirm(`Reset ${view.toLowerCase()} to the authored starter?`))return;checkpoint();study=clone(starters.get(view));selectedId=null;ablationIndex=-1;render()});

study=restore();render();
