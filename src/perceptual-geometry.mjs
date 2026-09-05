const round=(n,d=4)=>Number(Number(n).toFixed(d));
const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y});
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
const mul=(a,k)=>({x:a.x*k,y:a.y*k});
const dot=(a,b)=>a.x*b.x+a.y*b.y;
const mag=a=>Math.hypot(a.x,a.y);
const dist=(a,b)=>mag(sub(a,b));
const norm=a=>{const m=mag(a);return m>1e-9?mul(a,1/m):{x:1,y:0}};
const lerp=(a,b,t)=>add(a,mul(sub(b,a),t));
const stablePoint=p=>({x:round(p.x,3),y:round(p.y,3)});

export function parsePathData(d){
 const tokens=(d.match(/[a-zA-Z]|[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?/g)||[]),out=[];let i=0,cmd=null,current={x:0,y:0},start=null,points=[];
 const number=()=>Number(tokens[i++]),push=p=>{current=stablePoint(p);points.push(current)},finish=()=>{if(points.length>2)out.push(points);points=[];start=null};
 while(i<tokens.length){
  if(/[a-zA-Z]/.test(tokens[i]))cmd=tokens[i++];if(!cmd)break;
  const relative=cmd===cmd.toLowerCase(),kind=cmd.toUpperCase(),base=()=>relative?current:{x:0,y:0};
  if(kind==='M'){if(points.length)finish();const b=base(),p={x:number()+b.x,y:number()+b.y};push(p);start=p;cmd=relative?'l':'L'}
  else if(kind==='L'){const b=base();push({x:number()+b.x,y:number()+b.y})}
  else if(kind==='H'){push({x:number()+(relative?current.x:0),y:current.y})}
  else if(kind==='V'){push({x:current.x,y:number()+(relative?current.y:0)})}
  else if(kind==='C'){const b=base(),p0=current,c1={x:number()+b.x,y:number()+b.y},c2={x:number()+b.x,y:number()+b.y},p3={x:number()+b.x,y:number()+b.y};for(let step=1;step<=10;step++){const t=step/10,m=1-t;push({x:m*m*m*p0.x+3*m*m*t*c1.x+3*m*t*t*c2.x+t*t*t*p3.x,y:m*m*m*p0.y+3*m*m*t*c1.y+3*m*t*t*c2.y+t*t*t*p3.y})}}
  else if(kind==='Q'){const b=base(),p0=current,c={x:number()+b.x,y:number()+b.y},p2={x:number()+b.x,y:number()+b.y};for(let step=1;step<=8;step++){const t=step/8,m=1-t;push({x:m*m*p0.x+2*m*t*c.x+t*t*p2.x,y:m*m*p0.y+2*m*t*c.y+t*t*p2.y})}}
  else if(kind==='Z'){if(start&&dist(current,start)>0.01)push(start);finish();cmd=null}
  else throw new Error('NEEDS_KERNEL_EXTENSION:SVG_COMMAND_'+kind);
 }
 if(points.length)finish();return out;
}
export function parseVTracerSvg(svg){
 const size=/width="([\d.]+)" height="([\d.]+)"/.exec(svg);if(!size)throw new Error('REJECT:SVG_SIZE_MISSING');
 const width=Number(size[1]),height=Number(size[2]),paths=[];let index=0;
 for(const match of svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)){for(const points of parsePathData(match[1]))paths.push(describePolygon(points,{pathIndex:index}));index++}
 return{width,height,paths};
}
export function polygonArea(points){let value=0;for(let i=0;i<points.length-1;i++)value+=points[i].x*points[i+1].y-points[i+1].x*points[i].y;return value/2}
export function bounds(points){const xs=points.map(p=>p.x),ys=points.map(p=>p.y);return{x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)}}
function centroid(points){const body=points.slice(0,-1),n=Math.max(1,body.length);return{x:body.reduce((s,p)=>s+p.x,0)/n,y:body.reduce((s,p)=>s+p.y,0)/n}}
export function principalFrame(points){
 const c=centroid(points),body=points.slice(0,-1);let xx=0,xy=0,yy=0;
 for(const p of body){const x=p.x-c.x,y=p.y-c.y;xx+=x*x;xy+=x*y;yy+=y*y}
 const angle=.5*Math.atan2(2*xy,xx-yy),axis={x:Math.cos(angle),y:Math.sin(angle)},normal={x:-axis.y,y:axis.x},projections=body.map(p=>dot(sub(p,c),axis)),cross=body.map(p=>dot(sub(p,c),normal));
 return{centroid:stablePoint(c),axis:stablePoint(axis),normal:stablePoint(normal),min:Math.min(...projections),max:Math.max(...projections),crossMin:Math.min(...cross),crossMax:Math.max(...cross),angle:round(angle,6)};
}
function describePolygon(points,extra={}){
 const clean=points.length&&dist(points[0],points.at(-1))>.01?[...points,points[0]]:points,bbox=bounds(clean),frame=principalFrame(clean),area=Math.abs(polygonArea(clean));
 return{...extra,points:clean.map(stablePoint),bbox:Object.fromEntries(Object.entries(bbox).map(([k,v])=>[k,round(v,3)])),area:round(area,3),solidity:round(area/Math.max(1,bbox.width*bbox.height),4),aspect:round((frame.max-frame.min)/Math.max(1,frame.crossMax-frame.crossMin),4),frame};
}
function borderShape(shape,width,height){const b=shape.bbox,touches=[b.x<=2,b.y<=2,b.x+b.width>=width-2,b.y+b.height>=height-2].filter(Boolean).length,coverage=shape.area/(width*height);return touches>=3||b.width>width*.85&&b.height>height*.85||coverage>.6}
function pointInPolygon(point,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y+1e-12)+a.x)inside=!inside}return inside}
function distanceToLine(p,a,b){const v=sub(b,a),den=dot(v,v);if(den<1e-9)return dist(p,a);const t=Math.max(0,Math.min(1,dot(sub(p,a),v)/den));return dist(p,add(a,mul(v,t)))}
export function simplify(points,tolerance=2){
 let body=points.slice(0,-1);if(body.length<4)return points;let anchor=0;for(let i=1;i<body.length;i++)if(body[i].x<body[anchor].x||body[i].x===body[anchor].x&&body[i].y<body[anchor].y)anchor=i;
 body=[...body.slice(anchor),...body.slice(0,anchor),body[anchor]];
 const recur=values=>{if(values.length<3)return values;let max=0,index=0;for(let i=1;i<values.length-1;i++){const d=distanceToLine(values[i],values[0],values.at(-1));if(d>max){max=d;index=i}}if(max>tolerance)return[...recur(values.slice(0,index+1)).slice(0,-1),...recur(values.slice(index))];return[values[0],values.at(-1)]};
 const result=recur(body);return result.length>=4?result:points;
}
export function contourPath(points){
 const body=points.slice(0,-1);if(body.length<3)return'';let d='M'+round(body[0].x,2)+' '+round(body[0].y,2);
 for(let i=0;i<body.length;i++){const p0=body[(i-1+body.length)%body.length],p1=body[i],p2=body[(i+1)%body.length],p3=body[(i+2)%body.length],c1=add(p1,mul(sub(p2,p0),1/10)),c2=sub(p2,mul(sub(p3,p1),1/10));d+=' C'+round(c1.x,2)+' '+round(c1.y,2)+' '+round(c2.x,2)+' '+round(c2.y,2)+' '+round(p2.x,2)+' '+round(p2.y,2)}return d+' Z';
}
function clipHalf(points,origin,axis,threshold,keepGreater){
 const body=points.slice(0,-1),out=[],inside=p=>(dot(sub(p,origin),axis)-threshold)*(keepGreater?1:-1)>=-1e-7;
 for(let i=0;i<body.length;i++){const a=body[i],b=body[(i+1)%body.length],ia=inside(a),ib=inside(b),da=dot(sub(a,origin),axis)-threshold,db=dot(sub(b,origin),axis)-threshold;if(ia)out.push(a);if(ia!==ib){const t=da/(da-db);out.push(lerp(a,b,t))}}
 return out.length?[...out,out[0]]:[];
}
function clipSlab(points,frame,min,max){let result=clipHalf(points,frame.centroid,frame.axis,min,true);if(result.length)result=clipHalf(result,frame.centroid,frame.axis,max,false);return result}
function widthProfile(points,frame,bins=48){
 const span=frame.max-frame.min,result=[];for(let i=0;i<bins;i++){const lo=frame.min+span*i/bins,hi=frame.min+span*(i+1)/bins,cross=points.slice(0,-1).filter(p=>{const t=dot(sub(p,frame.centroid),frame.axis);return t>=lo&&t<hi}).map(p=>dot(sub(p,frame.centroid),frame.normal));if(cross.length>=2)result.push({i,t:(lo+hi)/2,width:Math.max(...cross)-Math.min(...cross)})}return result;
}
function chooseBoundaries(profile,frame,count=3){
 const span=frame.max-frame.min,candidates=[];
 for(let i=2;i<profile.length-2;i++){const p=profile[i],left=(profile[i-1].width+profile[i-2].width)/2,right=(profile[i+1].width+profile[i+2].width)/2,edge=(p.t-frame.min)/span,score=(left+right)/2-p.width;if(edge>.1&&edge<.9&&p.width<=left&&p.width<=right)candidates.push({...p,score})}
 candidates.sort((a,b)=>b.score-a.score||a.t-b.t);const selected=[];for(const c of candidates)if(selected.every(s=>Math.abs(s.t-c.t)>span*.12)){selected.push(c);if(selected.length===count)break}
 for(const fraction of [.25,.5,.75])if(selected.length<count){const target=frame.min+span*fraction;if(selected.every(s=>Math.abs(s.t-target)>span*.1))selected.push({t:target,width:0,score:0})}
 return selected.sort((a,b)=>a.t-b.t).slice(0,count);
}
function extrema(points,frame){
 const body=points.slice(0,-1),selectors=[['AXIS_MIN',p=>dot(sub(p,frame.centroid),frame.axis),Math.min],['AXIS_MAX',p=>dot(sub(p,frame.centroid),frame.axis),Math.max],['NORMAL_MIN',p=>dot(sub(p,frame.centroid),frame.normal),Math.min],['NORMAL_MAX',p=>dot(sub(p,frame.centroid),frame.normal),Math.max]];
 return selectors.map(([type,fn,op])=>{const values=body.map(fn),target=op(...values),index=values.indexOf(target);return{type,point:stablePoint(body[index]),evidence:{sampleIndex:index}}});
}
export function discoverNeutralGeometry(svg,{view='ASSEMBLED',partCount=4}={}){
 const proposal=parseVTracerSvg(svg),candidates=proposal.paths.filter(shape=>!borderShape(shape,proposal.width,proposal.height)&&shape.area>8),outer=[...candidates].sort((a,b)=>b.area-a.area||a.pathIndex-b.pathIndex)[0];
 if(!outer)throw new Error('REJECT:NO_OBJECT_CONTOUR');
 const holes=candidates.filter(shape=>shape.pathIndex===outer.pathIndex&&shape!==outer&&pointInPolygon(shape.frame.centroid,outer.points)&&shape.area>outer.area*.008&&shape.area<outer.area*.22);
 const frame=outer.frame,profile=widthProfile(outer.points,frame),boundaries=chooseBoundaries(profile,frame,Math.max(1,partCount-1)),cuts=[frame.min,...boundaries.map(b=>b.t),frame.max],parts=[];
 for(let i=0;i<cuts.length-1;i++){const polygon=clipSlab(outer.points,frame,cuts[i],cuts[i+1]);if(polygon.length>=4&&Math.abs(polygonArea(polygon))>outer.area*.005)parts.push(describePolygon(polygon,{id:'part-'+String(parts.length+1).padStart(2,'0'),interval:[round(cuts[i],3),round(cuts[i+1],3)]}))}
 const landmarks=[];for(const item of extrema(outer.points,frame))landmarks.push({id:'landmark-'+String(landmarks.length+1).padStart(2,'0'),...item});
 for(const boundary of boundaries){const point=add(frame.centroid,mul(frame.axis,boundary.t));landmarks.push({id:'landmark-'+String(landmarks.length+1).padStart(2,'0'),type:'WIDTH_MINIMUM',point:stablePoint(point),evidence:{axisPosition:round(boundary.t,3),width:round(boundary.width,3),score:round(boundary.score,3)}})}
 const terminalHoles=holes.filter(h=>{const t=(dot(sub(h.frame.centroid,frame.centroid),frame.axis)-frame.min)/(frame.max-frame.min);return t<.28||t>.72}).sort((a,b)=>b.area-a.area).slice(0,1);
 for(const hole of terminalHoles)landmarks.push({id:'landmark-'+String(landmarks.length+1).padStart(2,'0'),type:'ENCLOSED_REGION',point:hole.frame.centroid,evidence:{area:hole.area,aspect:hole.aspect,pathIndex:hole.pathIndex}});
 const relations=[{id:'relation-01',type:'AXIS_ANGLE',members:landmarks.filter(l=>/^AXIS_/.test(l.type)).map(l=>l.id),target:frame.angle,tolerance:.035,evidence:{source:'PCA'}}];
 for(let i=0;i<parts.length;i++)relations.push({id:'relation-'+String(relations.length+1).padStart(2,'0'),type:'LENGTH_RATIO',members:[parts[i].id],target:round((parts[i].interval[1]-parts[i].interval[0])/(frame.max-frame.min),4),tolerance:.025,evidence:{interval:parts[i].interval}});
 for(let i=0;i<parts.length-1;i++)relations.push({id:'relation-'+String(relations.length+1).padStart(2,'0'),type:'JUNCTION_CONTINUITY',members:[parts[i].id,parts[i+1].id],target:0,tolerance:.012,evidence:{axisPosition:parts[i].interval[1]}});
 for(const hole of terminalHoles)relations.push({id:'relation-'+String(relations.length+1).padStart(2,'0'),type:'NEGATIVE_SPACE_ASPECT',members:[landmarks.find(l=>l.type==='ENCLOSED_REGION').id],target:hole.aspect,tolerance:.04,evidence:{areaRatio:round(hole.area/outer.area,4),partId:parts.find(part=>{const t=dot(sub(hole.frame.centroid,outer.frame.centroid),outer.frame.axis);return t>=part.interval[0]&&t<=part.interval[1]})?.id}});
 return{schema:'vector-noodle.landmark-graph.v1',view,width:proposal.width,height:proposal.height,outer:describePolygon(simplify(outer.points,2.2),{id:'contour-01'}),holes:terminalHoles.map((hole,index)=>describePolygon(simplify(hole.points,1.6),{id:'contour-'+String(index+2).padStart(2,'0')})),parts,landmarks,relations,profile:profile.map(p=>({t:round(p.t,3),width:round(p.width,3)})),sourceProposal:{pathCount:proposal.paths.length,retainedCandidates:candidates.length}};
}
function angleDelta(a,b){let d=a-b;while(d>Math.PI/2)d-=Math.PI;while(d<-Math.PI/2)d+=Math.PI;return d}
function assignmentCost(part,target){return Math.abs(Math.log(Math.max(.05,part.aspect)/Math.max(.05,target.aspect)))*2+Math.abs(Math.log(Math.max(.001,part.solidity)/Math.max(.001,target.solidity)))+.35*Math.abs(Math.log(Math.max(1,part.area)/Math.max(1,target.area)))}
function permutations(values,count,prefix=[],out=[]){if(prefix.length===count){out.push(prefix);return out}for(let i=0;i<values.length;i++)if(!prefix.includes(values[i]))permutations(values,count,[...prefix,values[i]],out);return out}
export function matchExplodedComponents(graph,svg){
 const proposal=parseVTracerSvg(svg),targets=proposal.paths.filter(shape=>!borderShape(shape,proposal.width,proposal.height)&&shape.area>18).sort((a,b)=>b.area-a.area).slice(0,Math.min(8,proposal.paths.length));
 if(targets.length<graph.parts.length)throw new Error('REJECT:EXPLODED_COMPONENTS_INSUFFICIENT');
 const candidates=permutations(targets.map((_,i)=>i),graph.parts.length);let best=null;
 for(const order of candidates){const cost=order.reduce((sum,targetIndex,partIndex)=>sum+assignmentCost(graph.parts[partIndex],targets[targetIndex]),0);if(!best||cost<best.cost)best={cost,order}}
 return graph.parts.map((part,index)=>{const target=targets[best.order[index]],source=part.frame,scale=Math.max(.55,Math.min(1.8,Math.sqrt(target.area/Math.max(1,part.area)))),rotation=angleDelta(target.frame.angle,source.angle),cos=Math.cos(rotation)*scale,sin=Math.sin(rotation)*scale,tx=target.frame.centroid.x-(cos*source.centroid.x-sin*source.centroid.y),ty=target.frame.centroid.y-(sin*source.centroid.x+cos*source.centroid.y);return{partId:part.id,targetId:'exploded-component-'+String(best.order[index]+1).padStart(2,'0'),matrix:[round(cos,5),round(sin,5),round(-sin,5),round(cos,5),round(tx,3),round(ty,3)],cost:round(assignmentCost(part,target),4),sourceEvidence:target.bbox}})
}
function evidence(){return Object.fromEntries(['ASSEMBLED','EXPLODED'].map(view=>[view,{CATEGORY:'PENDING',STRUCTURE:'PENDING',NOISE:'PENDING'}]))}
export function compileRelationCandidate(graph,matches,{sourceSha256,sourceViews,subjectId='modern-object-01',sourceId='modern-source-01:paired'}={}){
 const byPart=new Map(matches.map(m=>[m.partId,m])),parts=graph.parts.map((part,index)=>{const match=byPart.get(part.id),strokes=[{id:'stroke-'+String(index+1).padStart(2,'0'),role:'SILHOUETTE',d:contourPath(simplify(part.points,1.25)),visible:{ASSEMBLED:true,EXPLODED:true},evidence:evidence()}],hole=graph.holes.find(h=>{const t=dot(sub(h.frame.centroid,graph.outer.frame.centroid),graph.outer.frame.axis);return t>=part.interval[0]&&t<=part.interval[1]});if(hole)strokes.push({id:'stroke-'+String(graph.parts.length+1).padStart(2,'0'),role:'STRUCTURE',d:contourPath(hole.points),visible:{ASSEMBLED:true,EXPLODED:true},evidence:evidence()});return{id:part.id,sourceEvidence:{ASSEMBLED:part.bbox,EXPLODED:match.sourceEvidence},poses:{ASSEMBLED:[1,0,0,1,0,0],EXPLODED:match.matrix},strokes}});
 const attachments=parts.slice(0,-1).map((part,index)=>({id:'attachment-'+String(index+1).padStart(2,'0'),partIds:[part.id,parts[index+1].id],state:'EVIDENCED',relationId:graph.relations.find(r=>r.type==='JUNCTION_CONTINUITY'&&r.members.includes(part.id)&&r.members.includes(parts[index+1].id))?.id,sourceEvidence:{ASSEMBLED:part.sourceEvidence.ASSEMBLED,EXPLODED:part.sourceEvidence.EXPLODED}}));
 return{schema:'vector-noodle.mechanism-line-study.v1',subjectId,state:'DRAFT',source:{id:sourceId,sha256:sourceSha256,class:'MODERN_OBJECT',verification:{state:'UNVERIFIED',sha256:null},views:sourceViews},canvas:{width:graph.width,height:graph.height},derivation:{method:'RELATION_FIRST_NEUTRAL_GEOMETRY',geometryOwner:'SOURCE_DERIVED_CANONICAL_PARTS',explodedOperation:'MATCHED_PART_TRANSFORMS_ONLY',unknownPolicy:'UNKNOWN_DOES_NOT_RENDER'},landmarkGraph:graph,parts,attachments,rejectedExplodedMarks:[],review:Object.fromEntries(['ASSEMBLED','EXPLODED'].map(view=>[view,{referenceHidden:false,CATEGORY:[96,220,360].map(size=>({size,verdict:null,note:''})),STRUCTURE:[96,220,360].map(size=>({size,verdict:null,note:''}))}])),relationEvidence:graph.relations.map(relation=>({relationId:relation.id,CATEGORY:'PENDING',STRUCTURE:'PENDING'})),acceptance:null};
}
function transformAround(matrix,center,kind,amount){let [a,b,c,d,e,f]=matrix;if(kind==='POSITION')return[a,b,c,d,e+amount.x,f+amount.y];const angle=kind==='ANGLE'?amount:0,scale=kind==='SCALE'?amount:1,ca=Math.cos(angle)*scale,sa=Math.sin(angle)*scale,na=ca*a-sa*b,nb=sa*a+ca*b,nc=ca*c-sa*d,nd=sa*c+ca*d,ne=center.x-(na*center.x+nc*center.y)+e,nf=center.y-(nb*center.x+nd*center.y)+f;return[round(na,5),round(nb,5),round(nc,5),round(nd,5),round(ne,3),round(nf,3)]}
export function mutateRelation(study,{relationId,operator,direction=1}){
 const next=JSON.parse(JSON.stringify(study)),relation=next.landmarkGraph.relations.find(r=>r.id===relationId);if(!relation)throw new Error('REJECT:UNKNOWN_RELATION:'+relationId);relation.perturbation={operator,direction};if(operator==='ANGLE')relation.perturbedTarget=round(relation.target+direction*Math.PI/15,5);else if(operator==='SCALE')relation.perturbedTarget=round(relation.target*(direction>0?1.18:.82),5);else relation.perturbedTarget=null;const partId=relation.evidence?.partId||relation.members.find(id=>/^part-/.test(id))||relation.members.at(-1),part=next.parts.find(p=>p.id===partId)||next.parts[0],source=next.landmarkGraph.parts.find(p=>p.id===part.id),diag=Math.hypot(next.canvas.width,next.canvas.height);
 if(operator==='POSITION')part.poses.ASSEMBLED=transformAround(part.poses.ASSEMBLED,source.frame.centroid,'POSITION',mul(next.landmarkGraph.outer.frame.normal,diag*.08*direction));
 else if(operator==='SCALE')part.poses.ASSEMBLED=transformAround(part.poses.ASSEMBLED,source.frame.centroid,'SCALE',direction>0?1.18:.82);
 else if(operator==='ANGLE')part.poses.ASSEMBLED=transformAround(part.poses.ASSEMBLED,source.frame.centroid,'ANGLE',direction*Math.PI/15);
 else if(operator==='REMOVE'){const stroke=part.strokes.find(item=>item.role==='STRUCTURE')||part.strokes[0];stroke.visible.ASSEMBLED=false;stroke.evidence.ASSEMBLED={CATEGORY:'NOT_VISIBLE',STRUCTURE:'NOT_VISIBLE',NOISE:'NOT_VISIBLE'}}
 else if(operator==='SIMPLIFY_JUNCTION')part.poses.ASSEMBLED=transformAround(part.poses.ASSEMBLED,source.frame.centroid,'POSITION',mul(next.landmarkGraph.outer.frame.axis,diag*.05*direction));
 else if(operator==='SIMPLIFY_CONTOUR'){const stroke=part.strokes[0],b=part.sourceEvidence.ASSEMBLED;stroke.d='M'+round(b.x,2)+' '+round(b.y+b.height/2,2)+' L'+round(b.x+b.width,2)+' '+round(b.y+b.height/2,2)}
 else throw new Error('NEEDS_KERNEL_EXTENSION:RELATION_OPERATOR_'+operator);
 next.mutation={relationId,operator,direction};return next;
}
export function symmetricChamfer(a,b){const one=(x,y)=>x.reduce((sum,p)=>sum+Math.min(...y.map(q=>dist(p,q))),0)/Math.max(1,x.length);return round((one(a,b)+one(b,a))/2,4)}
