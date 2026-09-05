import { createHash } from "node:crypto";

const INTENT_SCHEMA = "vector-noodle.intent.v1";
const PACKAGE_SCHEMA = "vector-noodle.package.v1";
const JOB_SCHEMA = "vector-noodle.training-job.v1";

const WORDS = Object.freeze({
  styles: { fleshpunk: ["fleshpunk", "organic", "visceral"], brutalist: ["brutalist", "industrial", "machined"], lineart: ["lineart", "line", "ink", "outline"] },
  views: { assembled: ["assembled", "assembly"], exploded: ["exploded", "breakdown", "disassembled"], orthographic: ["orthographic", "blueprint", "schematic"] },
  motions: { rotate: ["rotate", "rotating", "turn", "orbit"], pulse: ["pulse", "pulsing", "throb"], lunge: ["lunge", "lunging"], open: ["open", "opening"], close: ["close", "closing"], crawl: ["crawl", "crawling", "walk"] },
  components: { pipe: ["pipe", "pipes", "conduit", "conduits"], valve: ["valve", "valves", "wheel"], tendon: ["tendon", "tendons", "sinew"], connective_tissue: ["connective", "tissue", "membrane", "fascia"], frame: ["frame", "chassis", "box", "cube", "platform", "gate"], leg: ["leg", "legs", "limb", "limbs"], jaw: ["jaw", "jaws", "mandible"], coil: ["coil", "coils", "spring"], hinge: ["hinge", "hinges", "joint"], bellows: ["bellows"], branch: ["branch", "branches", "fork"] }
});
const TARGETS = Object.freeze([
  ["pressure_valve_gate", ["pressure valve gate", "valve gate"]], ["tendon_hound", ["tendon hound", "sinew hound"]],
  ["pipe_crawler", ["pipe crawler", "conduit crawler"]], ["peristaltic_lift", ["peristaltic lift"]],
  ["tendon_bridge_winch", ["tendon bridge winch"]], ["severable_pressure_conduit", ["severable pressure conduit"]],
  ["graft_sentry", ["graft sentry"]], ["sluice_mother", ["sluice mother"]], ["brutalist_box", ["brutalist box", "brutalist cube", "box", "cube"]]
]);
const FILLER = new Set(["a","an","and","as","at","by","for","from","in","into","of","on","only","the","to","with","made","make","show","draw","using","connected","through","around","mounted","clean","vector","svg","interactive","looking","look","like","diagram","machine","creature","mechanical","structural","fairly","very","full"]);

function normalize(text) { return String(text ?? "").normalize("NFKC").toLowerCase().replace(/[^a-z0-9_-]+/g, " ").trim().replace(/\s+/g, " "); }
function phrase(text, value) { return (` ${text} `).includes(` ${value} `); }
function terms(text, vocabulary) { return Object.entries(vocabulary).filter(([, aliases]) => aliases.some((alias) => phrase(text, alias))).map(([key]) => key); }
function sorted(value) { if (Array.isArray(value)) return value.map(sorted); if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sorted(value[key])])); return value; }
export function canonicalJson(value) { return JSON.stringify(sorted(value)); }
export function sha256(value) { return createHash("sha256").update(String(value)).digest("hex"); }
function frozen(value) { if (!value || typeof value !== "object" || Object.isFrozen(value)) return value; Object.freeze(value); Object.values(value).forEach(frozen); return value; }
function title(id) { return id.split("_").map((word) => word[0].toUpperCase() + word.slice(1)).join(" "); }

export function parseNoodlePrompt(rawPrompt) {
  const raw = String(rawPrompt ?? "");
  if (!raw.trim()) return frozen({ schema: INTENT_SCHEMA, state: "NEEDS_CLARIFICATION", reason: "EMPTY_PROMPT" });
  if (raw.length > 512) return frozen({ schema: INTENT_SCHEMA, state: "REJECT", reason: "PROMPT_TOO_LONG", limit: 512 });
  const text = normalize(raw), matches = TARGETS.filter(([, aliases]) => aliases.some((alias) => phrase(text, alias)));
  if (matches.length > 1) return frozen({ schema: INTENT_SCHEMA, state: "NEEDS_CLARIFICATION", reason: "MULTIPLE_TARGETS", targets: matches.map(([id]) => id), normalized: text });
  const styles=terms(text,WORDS.styles), views=terms(text,WORDS.views), motions=terms(text,WORDS.motions), components=terms(text,WORDS.components);
  const known = new Set(Object.values(WORDS).flatMap((group) => Object.values(group).flatMap((aliases) => aliases.flatMap((alias) => alias.split(" ")))));
  TARGETS.forEach(([, aliases]) => aliases.forEach((alias) => alias.split(" ").forEach((word) => known.add(word))));
  const unsupportedTerms=text.split(" ").filter((word)=>word&&!/^\d+$/.test(word)&&!FILLER.has(word)&&!known.has(word));
  let targetId=matches[0]?.[0]??null; if(!targetId&&components.length>=2)targetId=`custom_${components.join("_")}`;
  if(!targetId)return frozen({schema:INTENT_SCHEMA,state:"NEEDS_CLARIFICATION",reason:"TARGET_NOT_RESOLVED",normalized:text,unsupportedTerms});
  const intent={schema:INTENT_SCHEMA,state:"PARSED",prompt:raw.trim(),normalized:text,targetId,targetLabel:title(targetId),kind:["tendon_hound","pipe_crawler","graft_sentry","sluice_mother"].includes(targetId)?"creature":"machine",styles:styles.length?styles:["lineart"],view:views[0]??"assembled",motion:motions[0]??"rotate",components,unsupportedTerms};
  intent.intentHash=sha256(canonicalJson(intent)); return frozen(intent);
}

function xml(value) { return String(value).replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[c])); }
function n(value) { if(!Number.isFinite(value))throw new Error("NON_FINITE_COORDINATE"); return Math.round(value*1000)/1000; }
function offsets(program,view) { const names=[...new Set(program.map((op)=>op.component??"body"))].sort(), result=new Map(); names.forEach((name,index)=>{if(view!=="exploded")result.set(name,[0,0]);else{const angle=Math.PI*2*index/Math.max(1,names.length)-Math.PI/2;result.set(name,[Math.cos(angle)*34,Math.sin(angle)*26]);}});return result; }
function element(op,[dx,dy]) {
  const common=`data-depth="${n(op.depth??0)}" data-part="${xml(op.component??"body")}" vector-effect="non-scaling-stroke"`;
  if(op.op==="line")return `<line ${common} x1="${n(op.x1+dx)}" y1="${n(op.y1+dy)}" x2="${n(op.x2+dx)}" y2="${n(op.y2+dy)}"/>`;
  if(op.op==="rect")return `<rect ${common} x="${n(op.x+dx)}" y="${n(op.y+dy)}" width="${n(op.w)}" height="${n(op.h)}" rx="${n(op.rx??0)}"/>`;
  if(op.op==="ellipse")return `<ellipse ${common} cx="${n(op.cx+dx)}" cy="${n(op.cy+dy)}" rx="${n(op.rx)}" ry="${n(op.ry)}"/>`;
  if(op.op==="polygon")return `<polygon ${common} points="${op.points.map(([x,y])=>`${n(x+dx)},${n(y+dy)}`).join(" ")}"/>`;
  if(op.op==="path")return `<path ${common} d="${xml(op.d)}" transform="translate(${n(dx)} ${n(dy)})"/>`;
  throw new Error(`NEEDS_KERNEL_EXTENSION:${op.op}`);
}
export function renderVectorProgram(program,meta={}) {
  if(!Array.isArray(program)||!program.length)throw new Error("EMPTY_VECTOR_PROGRAM");
  const allowed=new Set(["line","rect","ellipse","polygon","path"]); program.forEach((op)=>{if(!allowed.has(op.op))throw new Error(`NEEDS_KERNEL_EXTENSION:${op.op}`);});
  const shift=offsets(program,meta.view??"assembled"), body=program.map((op)=>element(op,shift.get(op.component??"body"))).join(""), id=meta.id??"noodle-artifact";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-labelledby="${xml(id)}-title" data-noodle-id="${xml(id)}" data-motion="${xml(meta.motion??"rotate")}"><title id="${xml(id)}-title">${xml(meta.title??"Vector Noodle artifact")}</title><rect width="800" height="600" fill="#f4efe3" stroke="none"/><g fill="none" stroke="#17140f" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
}
export function compileNoodleIntent(intent,registry) {
  if(intent.state!=="PARSED")return intent;
  const capability=registry.capabilities.find((cap)=>cap.active!==false&&(cap.id===intent.targetId||cap.aliases?.includes(intent.targetId)));
  if(!capability)return frozen({schema:PACKAGE_SCHEMA,state:"NEEDS_TRAINING",reason:"CAPABILITY_ABSENT",intent,gapHash:sha256(canonicalJson({targetId:intent.targetId,components:intent.components,unsupportedTerms:intent.unsupportedTerms}))});
  const badView=!capability.views.includes(intent.view), badMotion=!capability.motions.includes(intent.motion);
  if(badView||badMotion||intent.unsupportedTerms.length)return frozen({schema:PACKAGE_SCHEMA,state:"NEEDS_TRAINING",reason:"CAPABILITY_VARIANT_ABSENT",intent,capabilityId:capability.id,missing:{view:badView?intent.view:null,motion:badMotion?intent.motion:null,terms:intent.unsupportedTerms},gapHash:sha256(canonicalJson({capabilityId:capability.id,view:intent.view,motion:intent.motion,terms:intent.unsupportedTerms}))});
  const vectorProgram=sorted(capability.program), programHash=sha256(canonicalJson(vectorProgram)), svg=renderVectorProgram(vectorProgram,{id:capability.id,title:capability.title,view:intent.view,motion:intent.motion});
  return frozen({schema:PACKAGE_SCHEMA,state:"COMPILED",intent,capabilityId:capability.id,provenance:capability.provenance,programHash,svgHash:sha256(svg),vectorProgram,svg});
}
export function compileNoodlePrompt(prompt,registry){return compileNoodleIntent(parseNoodlePrompt(prompt),registry);}

const BUILDERS=Object.freeze({
 frame:(x,y,c)=>[{op:"rect",x:x-80,y:y-55,w:160,h:110,rx:8,depth:-1,component:c},{op:"polygon",points:[[x-80,y-55],[x-50,y-78],[x+110,y-78],[x+80,y-55]],depth:1,component:c},{op:"line",x1:x+80,y1:y-55,x2:x+110,y2:y-78,depth:2,component:c},{op:"line",x1:x+80,y1:y+55,x2:x+110,y2:y+30,depth:2,component:c},{op:"line",x1:x+110,y1:y-78,x2:x+110,y2:y+30,depth:2,component:c}],
 pipe:(x,y,c)=>[{op:"path",d:`M ${x-95} ${y} C ${x-45} ${y-35} ${x+45} ${y+35} ${x+95} ${y}`,depth:2,component:c},{op:"path",d:`M ${x-95} ${y+15} C ${x-45} ${y-20} ${x+45} ${y+50} ${x+95} ${y+15}`,depth:1,component:c},{op:"line",x1:x-95,y1:y,x2:x-95,y2:y+15,depth:1,component:c},{op:"line",x1:x+95,y1:y,x2:x+95,y2:y+15,depth:1,component:c}],
 valve:(x,y,c)=>[{op:"ellipse",cx:x,cy:y,rx:54,ry:54,depth:4,component:c},{op:"ellipse",cx:x,cy:y,rx:17,ry:17,depth:5,component:c},...[0,45,90,135].map((angle)=>{const r=angle*Math.PI/180;return{op:"line",x1:x-Math.cos(r)*50,y1:y-Math.sin(r)*50,x2:x+Math.cos(r)*50,y2:y+Math.sin(r)*50,depth:5,component:c};})],
 tendon:(x,y,c)=>[{op:"path",d:`M ${x-105} ${y} C ${x-55} ${y-65} ${x+45} ${y+65} ${x+105} ${y}`,depth:5,component:c},{op:"path",d:`M ${x-105} ${y+18} C ${x-45} ${y-40} ${x+55} ${y+78} ${x+105} ${y+18}`,depth:4,component:c},{op:"path",d:`M ${x-82} ${y+4} C ${x-35} ${y-12} ${x+25} ${y+42} ${x+80} ${y+12}`,depth:6,component:c}],
 connective_tissue:(x,y,c)=>[{op:"path",d:`M ${x-90} ${y-34} C ${x-35} ${y-65} ${x+35} ${y-65} ${x+90} ${y-34} C ${x+45} ${y+4} ${x-45} ${y+4} ${x-90} ${y-34} Z`,depth:3,component:c},{op:"path",d:`M ${x-72} ${y-30} C ${x-25} ${y-44} ${x+25} ${y-44} ${x+72} ${y-30}`,depth:4,component:c}],
 leg:(x,y,c)=>[{op:"path",d:`M ${x-35} ${y-70} L ${x} ${y-8} L ${x-28} ${y+72} L ${x+20} ${y+72}`,depth:4,component:c},{op:"ellipse",cx:x,cy:y-8,rx:13,ry:13,depth:5,component:c}],
 jaw:(x,y,c)=>[{op:"path",d:`M ${x-65} ${y-28} L ${x} ${y+32} L ${x+65} ${y-28}`,depth:5,component:c},{op:"line",x1:x-42,y1:y-12,x2:x-30,y2:y+10,depth:6,component:c},{op:"line",x1:x+42,y1:y-12,x2:x+30,y2:y+10,depth:6,component:c}]
});
function positions(layout,count){if(layout==="bilateral")return Array.from({length:count},(_,i)=>[260+(i%2)*280,210+Math.floor(i/2)*150]);if(layout==="radial")return Array.from({length:count},(_,i)=>{const a=Math.PI*2*i/count;return[400+Math.cos(a)*190,300+Math.sin(a)*150];});return Array.from({length:count},(_,i)=>[180+i*(440/Math.max(1,count-1)),300+(i%2?45:-45)]);}
function build(intent,layout){const components=intent.components.length?intent.components:["frame","pipe"],points=positions(layout,components.length),program=[];components.forEach((name,index)=>{const make=BUILDERS[name];if(!make)return;program.push(...make(points[index][0],points[index][1],`${name}-${index+1}`));if(index)program.push({op:"line",x1:points[index-1][0],y1:points[index-1][1],x2:points[index][0],y2:points[index][1],depth:0,component:`connector-${index}`});});const score=components.length*100+program.length*2+(layout==="bilateral"&&intent.kind==="creature"?30:0)+(layout==="axial"&&intent.kind==="machine"?30:0);return{layout,program,score};}
export function createTrainingJob(gap){
 if(gap.state!=="NEEDS_TRAINING")throw new Error("TRAINING_REQUIRES_GAP");const intent=gap.intent,missingComponents=[...new Set([...intent.components.filter((name)=>!BUILDERS[name]),...intent.unsupportedTerms])];
 if(missingComponents.length)return frozen({schema:JOB_SCHEMA,state:"NEEDS_KERNEL_EVOLUTION",jobId:`job-${gap.gapHash.slice(0,16)}`,gapHash:gap.gapHash,intent,missingComponents});
 const candidates=["axial","radial","bilateral"].map((layout)=>build(intent,layout));candidates.sort((a,b)=>b.score-a.score||canonicalJson(a).localeCompare(canonicalJson(b)));const winner=candidates[0];
 const candidate={id:intent.targetId,title:intent.targetLabel,kind:intent.kind,active:false,aliases:[intent.targetId],components:intent.components,views:["assembled","exploded","orthographic"],motions:["rotate","pulse","lunge","open","close","crawl"],provenance:{type:"deterministic-symbolic-training",gapHash:gap.gapHash,layout:winner.layout},program:winner.program},candidateHash=sha256(canonicalJson(candidate));
 const specs=[["trace",winner.program.slice(0,Math.max(1,Math.ceil(winner.program.length*.4)))],["recreation",winner.program],["mutation-axial",build(intent,"axial").program],["mutation-radial",build(intent,"radial").program],["mutation-bilateral",build(intent,"bilateral").program],["exploded-canary",winner.program]];
 const stages=specs.map(([name,program])=>({name,svg:renderVectorProgram(program,{id:`${intent.targetId}-${name}`,title:`${intent.targetLabel} ${name}`,view:name==="exploded-canary"?"exploded":intent.view,motion:intent.motion})}));
 return frozen({schema:JOB_SCHEMA,state:"AWAITING_USER",jobId:`job-${gap.gapHash.slice(0,16)}`,gapHash:gap.gapHash,intent,objective:{winner:winner.layout,score:winner.score,alternatives:candidates.map(({layout,score})=>({layout,score}))},candidateHash,candidate,stages});
}
export function evolveKernel(job){
 if(job.state!=="NEEDS_KERNEL_EVOLUTION")return job;const derivable={coil:"pipe",hinge:"valve",bellows:"connective_tissue",branch:"tendon"},resolutions=job.missingComponents.map((name)=>derivable[name]?{name,derivedFrom:derivable[name]}:null);
 if(resolutions.some((item)=>item===null))return frozen({...job,state:"NEEDS_REFERENCE",reason:"NO_SYMBOLIC_VISUAL_EVIDENCE",boundedAttempts:96,imageGenerationNecessary:true});
 const map=Object.fromEntries(resolutions.map((item)=>[item.name,item.derivedFrom])), evolvedIntent={...job.intent,components:job.intent.components.map((name)=>map[name]??name),unsupportedTerms:[]};
 const trained=createTrainingJob({state:"NEEDS_TRAINING",intent:evolvedIntent,gapHash:job.gapHash}), candidate={...trained.candidate,id:job.intent.targetId,title:job.intent.targetLabel,aliases:[job.intent.targetId],components:job.intent.components,provenance:{...trained.candidate.provenance,type:"deterministic-typed-kernel-evolution",resolutions}};
 const candidateHash=sha256(canonicalJson(candidate));return frozen({...trained,intent:job.intent,candidate,candidateHash,kernelEvolution:{state:"SYNTHESIZED",resolutions,boundedAttempts:96,arbitraryCode:false}});
}
export const NOODLE_CONTRACT=frozen({schema:INTENT_SCHEMA,states:["PARSED","COMPILED","NEEDS_CLARIFICATION","NEEDS_TRAINING","NEEDS_KERNEL_EVOLUTION","KERNEL_CANDIDATE","NEEDS_REFERENCE","AWAITING_USER","ACTIVE","REJECTED","REJECT"],opcodes:["line","rect","ellipse","polygon","path"],terminalAdapter:"svg",modelFree:true});
