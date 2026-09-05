export const MAX_VISIBLE_STROKES=20;
export const VIEWS=Object.freeze(['ASSEMBLED','EXPLODED']);
export const REVIEW_SCALES=Object.freeze([96,220,360]);
export const STROKE_ROLES=Object.freeze(['SILHOUETTE','STRUCTURE','CORRECTION']);
export const EVIDENCE_AXES=Object.freeze(['CATEGORY','STRUCTURE','NOISE']);
export const EVIDENCE_VALUES=Object.freeze(['PENDING','POSITIVE','NEUTRAL','NEGATIVE','NOT_VISIBLE']);
const clone=value=>JSON.parse(JSON.stringify(value));
const finite=value=>Number.isFinite(Number(value));
const neutralId=(value,prefix)=>new RegExp('^'+prefix+'-\\d{2}$').test(value||'');
export const freshEvidence=()=>Object.fromEntries(VIEWS.map(view=>[view,{CATEGORY:'PENDING',STRUCTURE:'PENDING',NOISE:'PENDING'}]));

export function stableStringify(value){
 if(Array.isArray(value))return '['+value.map(stableStringify).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+stableStringify(value[key])).join(',')+'}';
 return JSON.stringify(value);
}
export function replayHash(value){const text=stableStringify(value);let hash=0x811c9dc5;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,0x01000193)>>>0}return 'fnv1a32-'+hash.toString(16).padStart(8,'0')}
function invalidate(study){const next=clone(study);next.acceptance=null;next.state='DRAFT';return next}
export function allStrokes(study){return(study.parts||[]).flatMap(part=>(part.strokes||[]).map(stroke=>Object.assign({},stroke,{partId:part.id})))}
export function visibleStrokes(study,view){return allStrokes(study).filter(stroke=>stroke.visible?.[view]!==false)}
export function strokeById(study,id){return allStrokes(study).find(stroke=>stroke.id===id)}
export function markSourceVerified(study,sha256){if(sha256!==study?.source?.sha256)throw new Error('REJECT:SOURCE_HASH_MISMATCH');const next=invalidate(study);next.source.verification={state:'VERIFIED',sha256};return next}
export function setAblationEvidence(study,{strokeId,view,axis,value}){
 if(!VIEWS.includes(view))throw new Error('REJECT:BAD_VIEW:'+view);
 if(!EVIDENCE_AXES.includes(axis))throw new Error('REJECT:BAD_EVIDENCE_AXIS:'+axis);
 if(!EVIDENCE_VALUES.includes(value)||value==='PENDING')throw new Error('REJECT:BAD_EVIDENCE_VALUE:'+value);
 const target=strokeById(study,strokeId);if(!target)throw new Error('REJECT:UNKNOWN_STROKE:'+strokeId);if(target.visible?.[view]===false)throw new Error('REJECT:STROKE_NOT_VISIBLE:'+strokeId+':'+view);
 const next=invalidate(study);for(const part of next.parts)for(const stroke of part.strokes)if(stroke.id===strokeId)stroke.evidence[view][axis]=value;return next;
}
export function recordScaleReview(study,{view,axis,size,verdict,referenceHidden,note=''}){
 if(!VIEWS.includes(view))throw new Error('REJECT:BAD_VIEW:'+view);
 if(!['CATEGORY','STRUCTURE'].includes(axis))throw new Error('REJECT:BAD_REVIEW_AXIS:'+axis);
 if(!REVIEW_SCALES.includes(size))throw new Error('REJECT:BAD_REVIEW_SCALE:'+size);
 const permitted=axis==='CATEGORY'?['RECOGNIZABLE','WRONG','GENERIC','OVERDRAWN']:['PRESERVED','BROKEN','AMBIGUOUS','OVERDRAWN'];
 if(!permitted.includes(verdict))throw new Error('REJECT:BAD_REVIEW_VERDICT:'+verdict);
 if(referenceHidden!==true)throw new Error('REJECT:REFERENCE_MUST_BE_HIDDEN_FOR_REVIEW');
 const next=invalidate(study);next.review[view].referenceHidden=true;next.review[view][axis]=next.review[view][axis].map(item=>item.size===size?{size,verdict,note}:item);return next;
}
export function ablationCases(study,view){return visibleStrokes(study,view).map(stroke=>({view,strokeId:stroke.id,partId:stroke.partId,label:view+' WITHOUT '+stroke.id}))}
function rectValid(rect){return rect&&['x','y','width','height'].every(key=>finite(rect[key]))&&Number(rect.width)>0&&Number(rect.height)>0}
function containsForbidden(value){if(typeof value==='string')return/flesh|cultivated|organic-mutation/i.test(value);if(Array.isArray(value))return value.some(containsForbidden);if(value&&typeof value==='object')return Object.values(value).some(containsForbidden);return false}
function connected(study){
 const ids=new Set((study.parts||[]).map(part=>part.id));if(!ids.size)return false;
 const first=ids.values().next().value,seen=new Set([first]),queue=[first];
 while(queue.length){const current=queue.shift();for(const edge of study.attachments||[]){if(edge.state!=='EVIDENCED'||!edge.partIds?.includes(current))continue;for(const id of edge.partIds)if(!seen.has(id)){seen.add(id);queue.push(id)}}}
 return seen.size===ids.size;
}
export function validateMechanismStudy(study){
 const failures=[];
 if(study?.schema!=='vector-noodle.mechanism-line-study.v1')failures.push('BAD_SCHEMA');
 if(study?.source?.class!=='MODERN_OBJECT')failures.push('SOURCE_NOT_MODERN_OBJECT');
 if(containsForbidden(study))failures.push('FLESHPUNK_SOURCE_FORBIDDEN');
 if(study?.explodedStrokes||study?.studies)failures.push('INDEPENDENT_EXPLODED_GEOMETRY_FORBIDDEN');
 if(!Array.isArray(study?.parts)||study.parts.length<2)failures.push('NO_CONSTRUCTION_PARTS');
 const partIds=new Set(),strokeIds=new Set();
 for(const part of study?.parts||[]){
  if(!neutralId(part.id,'part'))failures.push('NON_NEUTRAL_PART_ID:'+part.id);
  if(partIds.has(part.id))failures.push('DUPLICATE_PART:'+part.id);partIds.add(part.id);
  if('name'in part||'semanticRole'in part)failures.push('ONTOLOGY_LABEL_FORBIDDEN:'+part.id);
  for(const view of VIEWS){if(!Array.isArray(part.poses?.[view])||part.poses[view].length!==6||part.poses[view].some(value=>!finite(value)))failures.push('BAD_POSE:'+part.id+':'+view);if(!rectValid(part.sourceEvidence?.[view]))failures.push('MISSING_SOURCE_EVIDENCE:'+part.id+':'+view)}
  if(!Array.isArray(part.strokes)||!part.strokes.length)failures.push('PART_WITHOUT_GEOMETRY:'+part.id);
  for(const stroke of part.strokes||[]){
   if(!neutralId(stroke.id,'stroke'))failures.push('NON_NEUTRAL_STROKE_ID:'+stroke.id);
   if(strokeIds.has(stroke.id))failures.push('DUPLICATE_STROKE:'+stroke.id);strokeIds.add(stroke.id);
   if(!STROKE_ROLES.includes(stroke.role))failures.push('BAD_ROLE:'+stroke.id);
   if(!stroke.d||!/^M[-.\d]/.test(stroke.d))failures.push('BAD_GEOMETRY:'+stroke.id);
   for(const view of VIEWS){for(const axis of EVIDENCE_AXES)if(!EVIDENCE_VALUES.includes(stroke.evidence?.[view]?.[axis]))failures.push('BAD_EVIDENCE:'+stroke.id+':'+view+':'+axis);if(stroke.visible?.[view]===false&&EVIDENCE_AXES.some(axis=>stroke.evidence?.[view]?.[axis]!=='NOT_VISIBLE'))failures.push('HIDDEN_STROKE_EVIDENCE_INVALID:'+stroke.id+':'+view)}
  }
 }
 for(const view of VIEWS)if(visibleStrokes(study,view).length>MAX_VISIBLE_STROKES)failures.push('STROKE_CEILING_EXCEEDED:'+view);
 const attachmentIds=new Set();
 for(const edge of study?.attachments||[]){
  if(!neutralId(edge.id,'attachment'))failures.push('NON_NEUTRAL_ATTACHMENT_ID:'+edge.id);
  if(attachmentIds.has(edge.id))failures.push('DUPLICATE_ATTACHMENT:'+edge.id);attachmentIds.add(edge.id);
  if(!['EVIDENCED','UNKNOWN'].includes(edge.state))failures.push('BAD_ATTACHMENT_STATE:'+edge.id);
  if(!Array.isArray(edge.partIds)||edge.partIds.length<2||edge.partIds.some(id=>!partIds.has(id)))failures.push('BAD_ATTACHMENT_MEMBERS:'+edge.id);
  for(const view of VIEWS)if(!rectValid(edge.sourceEvidence?.[view]))failures.push('MISSING_ATTACHMENT_EVIDENCE:'+edge.id+':'+view);
 }
 if(!connected(study))failures.push('ASSEMBLED_ATTACHMENT_GRAPH_DISCONNECTED');
 for(const mark of study?.rejectedExplodedMarks||[])if(mark.state!=='QUARANTINED_NEGATIVE_EXAMPLE')failures.push('UNSUPPORTED_EXPLODED_MARK:'+mark.id);
 for(const view of VIEWS){const review=study?.review?.[view];if(!review)failures.push('MISSING_REVIEW:'+view);else for(const axis of ['CATEGORY','STRUCTURE'])if(!Array.isArray(review[axis])||REVIEW_SCALES.some(size=>!review[axis].some(item=>item.size===size&&'verdict'in item)))failures.push('BAD_REVIEW_SCALES:'+view+':'+axis)}
 if(study?.state==='USER_ACCEPTED'&&study?.acceptance?.replayHash!==acceptanceHash(study))failures.push('ACCEPTANCE_REPLAY_MISMATCH');
 return{state:failures.length?'DENY':'AWAITING_USER_PIXEL_VERDICT',failures,replayHash:replayHash(study)};
}
function retainedFailures(study){
 const failures=[];
 for(const stroke of allStrokes(study))for(const view of VIEWS){if(stroke.visible?.[view]===false)continue;const e=stroke.evidence[view];for(const axis of EVIDENCE_AXES)if(e[axis]==='PENDING')failures.push('EVIDENCE_PENDING:'+stroke.id+':'+view+':'+axis);if(e.CATEGORY==='NEGATIVE'||e.STRUCTURE==='NEGATIVE'||e.NOISE==='POSITIVE')failures.push('HARMFUL_STROKE_RETAINED:'+stroke.id+':'+view);if(e.CATEGORY==='NEUTRAL'&&e.STRUCTURE==='NEUTRAL'&&e.NOISE!=='NEGATIVE')failures.push('NON_LOAD_BEARING_STROKE:'+stroke.id+':'+view)}
 return failures;
}
export function acceptanceFailures(study){
 const failures=[...validateMechanismStudy(study).failures],verification=study?.source?.verification;
 if(verification?.state!=='VERIFIED')failures.push('SOURCE_UNVERIFIED');if(verification?.sha256!==study?.source?.sha256)failures.push('SOURCE_HASH_MISMATCH');
 for(const edge of study?.attachments||[])if(edge.state!=='EVIDENCED')failures.push('ATTACHMENT_UNKNOWN:'+edge.id);
 for(const view of VIEWS){const review=study.review?.[view];if(review?.referenceHidden!==true)failures.push('REFERENCE_VISIBLE:'+view);for(const size of REVIEW_SCALES){if(review?.CATEGORY?.find(item=>item.size===size)?.verdict!=='RECOGNIZABLE')failures.push('CATEGORY_NOT_RECOGNIZABLE:'+view+':'+size);if(review?.STRUCTURE?.find(item=>item.size===size)?.verdict!=='PRESERVED')failures.push('STRUCTURE_NOT_PRESERVED:'+view+':'+size)}}
 failures.push(...retainedFailures(study));return[...new Set(failures)];
}
export function acceptanceHash(study){const candidate=clone(study);delete candidate.acceptance;delete candidate.state;return replayHash(candidate)}
export function promoteUserAccepted(study,{authority}){if(authority!=='USER_GESTURE')throw new Error('REJECT:HUMAN_AUTHORITY_REQUIRED');const failures=acceptanceFailures(study);if(failures.length)throw new Error('REJECT:ACCEPTANCE_BLOCKED:'+failures.join('|'));const next=clone(study);next.state='USER_ACCEPTED';next.acceptance={verdict:'USER_ACCEPTED',authority:'USER_GESTURE',sourceSha256:next.source.sha256,replayHash:acceptanceHash(next)};return next}
const escapeText=value=>String(value).replace(/[&<>"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
function widthFor(role){return role==='SILHOUETTE'?2.8:role==='STRUCTURE'?1.9:1.3}
export function renderMechanismSvg(study,{view='ASSEMBLED',omitStrokeId=null,title,showMap=false}={}){
 const validation=validateMechanismStudy(study);if(validation.failures.length)throw new Error('REJECT:INVALID_STUDY:'+validation.failures.join('|'));if(!VIEWS.includes(view))throw new Error('REJECT:BAD_VIEW:'+view);
 const groups=study.parts.map(part=>{const matrix=part.poses[view].join(' '),paths=part.strokes.filter(stroke=>stroke.visible?.[view]!==false&&stroke.id!==omitStrokeId).map(stroke=>'<path id="'+stroke.id+'" data-stroke="'+stroke.id+'" data-part="'+part.id+'" data-role="'+stroke.role+'" d="'+stroke.d+'" fill="none" stroke="#171512" stroke-width="'+widthFor(stroke.role)+'" stroke-linecap="round" stroke-linejoin="round"/>').join(''),box=part.sourceEvidence[view],map=showMap?'<rect x="'+box.x+'" y="'+box.y+'" width="'+box.width+'" height="'+box.height+'" fill="none" stroke="#c94b3b" stroke-width="1.2" stroke-dasharray="4 3"/><text x="'+(box.x+3)+'" y="'+(box.y+12)+'" fill="#9c2f23" font-family="monospace" font-size="10">'+part.id+'</text>':'';return'<g data-part="'+part.id+'" transform="matrix('+matrix+')">'+paths+'</g>'+map}).join('');
 return'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+study.canvas.width+' '+study.canvas.height+'" role="img" aria-label="'+escapeText(title||study.subjectId+' '+view)+'"><rect width="100%" height="100%" fill="#fffdf7"/>'+groups+'</svg>';
}
