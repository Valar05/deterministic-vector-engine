const form=document.querySelector('#renderForm');
const input=document.querySelector('#promptInput');
const output=document.querySelector('#vector-output');
const status=document.querySelector('#resolvedStatus');
const gallery=document.querySelector('#trainingGallery');
const decisions=document.querySelector('#decisionControls');
let activeJob=null;

async function api(path,body){const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();if(!response.ok&&data.state!=='REJECT')throw new Error(data.reason||`HTTP ${response.status}`);return data;}
function safeSvg(markup){const doc=new DOMParser().parseFromString(markup,'image/svg+xml'),svg=doc.documentElement;if(svg.localName!=='svg'||doc.querySelector('parsererror,script,foreignObject'))throw new Error('UNSAFE_SVG');for(const element of svg.querySelectorAll('*'))for(const attr of [...element.attributes])if(attr.name.startsWith('on')||/^(href|src)$/i.test(attr.name))throw new Error('UNSAFE_SVG');return document.importNode(svg,true);}
function mount(markup){output.replaceChildren(safeSvg(markup));installInteraction(output.querySelector('svg'));}
function installInteraction(svg){
 svg.setAttribute('tabindex','0');
 const ink=svg.querySelector('g'),depthNodes=[...svg.querySelectorAll('[data-depth]')];depthNodes.forEach((node)=>node.dataset.baseTransform=node.getAttribute('transform')||'');
 let yaw=-12,pitch=8,drag=false,lastX=0,lastY=0,raf=0;
 const draw=()=>{raf=0;const yr=yaw*Math.PI/180,pr=pitch*Math.PI/180,a=Math.cos(yr),b=Math.sin(pr)*.28,c=-Math.sin(yr)*.22,d=Math.cos(pr);ink.setAttribute('transform',`translate(400 300) matrix(${a} ${b} ${c} ${d} 0 0) translate(-400 -300)`);for(const node of depthNodes){const z=Number(node.dataset.depth)||0,base=node.dataset.baseTransform;node.setAttribute('transform',`${base} translate(${(Math.sin(yr)*z*2.2).toFixed(2)} ${(-Math.sin(pr)*z*2.2).toFixed(2)})`.trim());}};
 const schedule=()=>{if(!raf)raf=requestAnimationFrame(draw);};
 svg.addEventListener('pointerdown',(event)=>{drag=true;lastX=event.clientX;lastY=event.clientY;svg.setPointerCapture(event.pointerId);output.dataset.dragging='true';});
 svg.addEventListener('pointermove',(event)=>{if(!drag)return;yaw=(yaw+(event.clientX-lastX)*.7)%360;pitch=Math.max(-82,Math.min(82,pitch-(event.clientY-lastY)*.7));lastX=event.clientX;lastY=event.clientY;schedule();});
 const end=()=>{drag=false;delete output.dataset.dragging;};svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);
 svg.addEventListener('dblclick',()=>{yaw=-12;pitch=8;schedule();});
 svg.addEventListener('keydown',(event)=>{const moves={ArrowLeft:[-6,0],ArrowRight:[6,0],ArrowUp:[0,6],ArrowDown:[0,-6]};if(event.key==='Home'){yaw=-12;pitch=8;}else if(moves[event.key]){yaw+=moves[event.key][0];pitch=Math.max(-82,Math.min(82,pitch+moves[event.key][1]));}else return;event.preventDefault();schedule();});
 schedule();
}
function showStages(job){gallery.replaceChildren();for(const stage of job.stages||[]){const button=document.createElement('button');button.type='button';button.className='stage';button.dataset.stage=stage.name;const thumb=safeSvg(stage.svg);thumb.removeAttribute('tabindex');const label=document.createElement('span');label.textContent=stage.name.replaceAll('-',' ');button.append(thumb,label);button.addEventListener('click',()=>mount(stage.svg));gallery.append(button);}decisions.hidden=false;}
function show(result){activeJob=null;gallery.replaceChildren();decisions.hidden=true;if(result.state==='COMPILED'){status.textContent=`COMPILED // ${result.capabilityId} // ${result.svgHash.slice(0,12)}`;mount(result.svg);return;}if(result.state==='AWAITING_USER'){activeJob=result;status.textContent=`TRAINED // ${result.objective.winner} // AWAITING YOUR VERDICT`;showStages(result);mount(result.stages.at(-1).svg);return;}status.textContent=`${result.state} // ${result.reason||'explicit stop'}`;}
async function forge(){status.textContent='COMPILING SYMBOLS';try{show(await api('/api/noodle/compile',{prompt:input.value}));}catch(error){status.textContent=`REJECT // ${error.message}`;}}
form.addEventListener('submit',(event)=>{event.preventDefault();forge();});
document.querySelector('#acceptButton').addEventListener('click',async()=>{if(!activeJob)return;show(await api(`/api/noodle/jobs/${activeJob.jobId}/accept`,{candidateHash:activeJob.candidateHash}));await forge();});
document.querySelector('#rejectButton').addEventListener('click',async()=>{if(!activeJob)return;const result=await api(`/api/noodle/jobs/${activeJob.jobId}/reject`,{candidateHash:activeJob.candidateHash});status.textContent=`${result.state} // NEGATIVE EXAMPLE PRESERVED`;decisions.hidden=true;});
forge();
