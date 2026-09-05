export const MAX_STROKES = 20;
export const STROKE_ROLES = Object.freeze(['SILHOUETTE','IDENTITY_ANCHOR','CORRECTION']);
export const REVIEW_VERDICTS = Object.freeze(['RECOGNIZABLE','WRONG','GENERIC','OVERDRAWN']);
export const ABLATION_VERDICTS = Object.freeze(['PENDING','ESSENTIAL','REMOVABLE']);
export const MACHINE_VERDICTS = Object.freeze(['DENY','AWAITING_USER_PIXEL_VERDICT']);

const round=n=>Math.round(n*1000)/1000;
const pt=v=>({x:round(Number(v.x)),y:round(Number(v.y))});
const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y});
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
const mul=(a,n)=>({x:a.x*n,y:a.y*n});
const dot=(a,b)=>a.x*b.x+a.y*b.y;
const mag=a=>Math.hypot(a.x,a.y);
const norm=a=>{const m=mag(a);return m>1e-9?mul(a,1/m):{x:0,y:0}};
const dist=(a,b)=>mag(sub(a,b));
const neg=a=>({x:-a.x,y:-a.y});
const clone=v=>JSON.parse(JSON.stringify(v));

export function stableStringify(value){
  if(Array.isArray(value))return `[${value.map(stableStringify).join(',')}]`;
  if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function replayHash(value){
  const text=stableStringify(value);let hash=0x811c9dc5;
  for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,0x01000193)>>>0}
  return `fnv1a32-${hash.toString(16).padStart(8,'0')}`;
}
function bezierPoint(c,t){const m=1-t,b0=m*m*m,b1=3*t*m*m,b2=3*t*t*m,b3=t*t*t;return{x:c[0].x*b0+c[1].x*b1+c[2].x*b2+c[3].x*b3,y:c[0].y*b0+c[1].y*b1+c[2].y*b2+c[3].y*b3}}
function chordParameters(points){const u=[0];for(let i=1;i<points.length;i++)u.push(u[i-1]+dist(points[i],points[i-1]));const total=u.at(-1);return total>1e-9?u.map(v=>v/total):u.map((_,i)=>i/Math.max(1,u.length-1))}
function generateBezier(points,u,left,right){
  const first=points[0],last=points.at(-1);let c00=0,c01=0,c11=0,x0=0,x1=0;
  for(let i=0;i<points.length;i++){
    const t=u[i],m=1-t,b0=m*m*m,b1=3*t*m*m,b2=3*t*t*m,b3=t*t*t,a0=mul(left,b1),a1=mul(right,b2),base=add(mul(first,b0+b1),mul(last,b2+b3)),res=sub(points[i],base);
    c00+=dot(a0,a0);c01+=dot(a0,a1);c11+=dot(a1,a1);x0+=dot(a0,res);x1+=dot(a1,res);
  }
  const determinant=c00*c11-c01*c01;let al=determinant===0?0:(x0*c11-x1*c01)/determinant,ar=determinant===0?0:(c00*x1-c01*x0)/determinant;
  const length=dist(first,last),minimum=length*1e-3;if(al<minimum||ar<minimum)al=ar=length/3;
  return [first,add(first,mul(left,al)),add(last,mul(right,ar)),last].map(pt);
}
function maximumError(points,curve,u){let split=Math.floor(points.length/2),error=0;for(let i=1;i<points.length-1;i++){const d=sub(bezierPoint(curve,u[i]),points[i]),e=dot(d,d);if(e>=error){error=e;split=i}}return{error,split}}
function fitRecursive(points,left,right,toleranceSquared,out,depth=0){
  if(points.length===2){const length=dist(points[0],points[1])/3;out.push([points[0],add(points[0],mul(left,length)),add(points[1],mul(right,length)),points[1]].map(pt));return}
  const u=chordParameters(points),curve=generateBezier(points,u,left,right),measured=maximumError(points,curve,u);
  if(measured.error<=toleranceSquared||depth>=18){out.push(curve);return}
  const split=Math.max(1,Math.min(points.length-2,measured.split));let center=norm(sub(points[split-1],points[split+1]));if(mag(center)<1e-9)center=norm(sub(points[split],points[split+1]));
  fitRecursive(points.slice(0,split+1),left,center,toleranceSquared,out,depth+1);fitRecursive(points.slice(split),neg(center),right,toleranceSquared,out,depth+1);
}
export function fitStroke(rawPoints,tolerance=1.5){
  const points=(rawPoints??[]).map(pt).filter((v,i,a)=>i===0||dist(v,a[i-1])>=0.75);if(points.length<2)throw new Error('REJECT:STROKE_REQUIRES_TWO_POINTS');
  const curves=[];fitRecursive(points,norm(sub(points[1],points[0])),norm(sub(points.at(-2),points.at(-1))),Number(tolerance)**2,curves);return curves;
}
export function curvesToPath(curves){if(!curves?.length)return '';const s=curves[0][0];return `M${s.x} ${s.y}`+curves.map(c=>` C${c[1].x} ${c[1].y} ${c[2].x} ${c[2].y} ${c[3].x} ${c[3].y}`).join('')}
export function createStudy({subjectId,sourceId,sourceSha256,view,width,height,sourceCrop}){return{schema:'vector-noodle.sparse-line-study.v1',subjectId,source:{id:sourceId,sha256:sourceSha256,class:'MODERN_OBJECT',crop:sourceCrop},view,canvas:{width,height},strokes:[],negativeSpaces:[],review:{verdict:null,referenceHidden:false,scales:[96,220,360],note:''},state:'DRAFT'}}
export function addStroke(study,{id,rawPoints,d,role,note='',tolerance=1.5}){
  if(!STROKE_ROLES.includes(role))throw new Error(`REJECT:UNKNOWN_STROKE_ROLE:${role}`);if(study.strokes.length>=MAX_STROKES)throw new Error('REJECT:STROKE_BUDGET_EXCEEDED');if(study.strokes.some(s=>s.id===id))throw new Error(`REJECT:DUPLICATE_STROKE:${id}`);
  const curves=d?undefined:fitStroke(rawPoints,tolerance),stroke={id,role,note,d:d||curvesToPath(curves),ablationImportance:'PENDING'};return{...clone(study),strokes:[...clone(study.strokes),stroke],state:'DRAFT'};
}
export function removeStroke(study,id){return{...clone(study),strokes:study.strokes.filter(s=>s.id!==id),state:'DRAFT'}}
export function setAblationVerdict(study,id,verdict){if(!['ESSENTIAL','REMOVABLE'].includes(verdict))throw new Error(`REJECT:BAD_ABLATION_VERDICT:${verdict}`);if(!study.strokes.some(s=>s.id===id))throw new Error(`REJECT:UNKNOWN_STROKE:${id}`);return{...clone(study),strokes:study.strokes.map(s=>s.id===id?{...s,ablationImportance:verdict}:s)}}
export function recordUserReview(study,{verdict,referenceHidden,note=''}){if(!REVIEW_VERDICTS.includes(verdict))throw new Error(`REJECT:BAD_REVIEW_VERDICT:${verdict}`);if(referenceHidden!==true)throw new Error('REJECT:REFERENCE_MUST_BE_HIDDEN_FOR_REVIEW');return{...clone(study),review:{...clone(study.review),verdict,referenceHidden:true,note},state:verdict==='RECOGNIZABLE'?'USER_REVIEW_RECORDED':'USER_REJECTED'}}
export function ablationCases(study){return study.strokes.map(stroke=>({id:stroke.id,label:`WITHOUT ${stroke.id}`,study:clone(study),omitStrokeId:stroke.id}))}
function containsForbidden(value){if(typeof value==='string')return/flesh|cultivated|organic-mutation/i.test(value);if(Array.isArray(value))return value.some(containsForbidden);if(value&&typeof value==='object')return Object.values(value).some(containsForbidden);return false}
export function validateSparseStudy(study){
  const failures=[];if(study?.schema!=='vector-noodle.sparse-line-study.v1')failures.push('BAD_SCHEMA');if(study?.source?.class!=='MODERN_OBJECT')failures.push('SOURCE_NOT_MODERN_OBJECT');if(containsForbidden(study?.source))failures.push('FLESHPUNK_SOURCE_FORBIDDEN');if(!Array.isArray(study?.strokes)||study.strokes.length<1)failures.push('NO_STROKES');if((study?.strokes?.length??0)>MAX_STROKES)failures.push('STROKE_BUDGET_EXCEEDED');
  const ids=new Set();for(const stroke of study?.strokes??[]){if(ids.has(stroke.id))failures.push(`DUPLICATE_STROKE:${stroke.id}`);ids.add(stroke.id);if(!STROKE_ROLES.includes(stroke.role))failures.push(`BAD_ROLE:${stroke.id}`);if(!stroke.d||!/^M[-.\d]/.test(stroke.d))failures.push(`BAD_GEOMETRY:${stroke.id}`);if(!ABLATION_VERDICTS.includes(stroke.ablationImportance))failures.push(`BAD_ABLATION:${stroke.id}`)}
  for(const space of study?.negativeSpaces??[])if(!space.strokeIds?.length||space.strokeIds.some(id=>!ids.has(id)))failures.push(`BAD_NEGATIVE_SPACE:${space.id}`);
  return{state:failures.length?'DENY':'AWAITING_USER_PIXEL_VERDICT',failures,replayHash:replayHash(study)};
}
export function renderSparseSvg(study,{omitStrokeId=null,title=`${study.subjectId} ${study.view}`}={}){
  const validation=validateSparseStudy(study);if(validation.failures.length)throw new Error(`REJECT:INVALID_STUDY:${validation.failures.join('|')}`);
  const paths=study.strokes.filter(s=>s.id!==omitStrokeId).map(s=>{const width=s.role==='SILHOUETTE'?2.8:s.role==='IDENTITY_ANCHOR'?1.9:1.3;return `<path id="${s.id}" data-role="${s.role}" d="${s.d}" fill="none" stroke="#171512" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`}).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${study.canvas.width} ${study.canvas.height}" role="img" aria-label="${title}">${paths}</svg>`;
}
