import fs from 'node:fs';
import path from 'node:path';
import {VIEWS,acceptanceFailures,allStrokes,renderMechanismSvg,validateMechanismStudy,visibleStrokes} from '../src/sparse-line-study.mjs';

const root=path.resolve(new URL('..',import.meta.url).pathname),out=path.join(root,'evidence/wonder-sparse');
const curriculum=JSON.parse(fs.readFileSync(path.join(root,'training/wonder-sparse-v1/shovel-studies.json'),'utf8')),study=curriculum.study;
fs.mkdirSync(out,{recursive:true});
const inner=svg=>svg.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
for(const view of VIEWS)fs.writeFileSync(path.join(out,'shovel-'+view.toLowerCase()+'-mechanism-v3.svg'),renderMechanismSvg(study,{view})+'\n');

let x=30;const cards=[];
for(const view of VIEWS)for(const [size,label] of [[96,'THUMBNAIL'],[220,'NORMAL'],[360,'ENLARGED']]){
 cards.push('<g transform="translate('+x+' 120)"><text class="small" y="-14">'+view+' · '+label+'</text><svg width="'+size+'" height="'+size+'" viewBox="0 0 397 397">'+inner(renderMechanismSvg(study,{view}))+'</svg></g>');x+=size+28;
}
const scale='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+(x+10)+' 530"><style>.bg{fill:#171512}.title{font:900 30px system-ui;fill:#fffdf7}.small{font:800 11px system-ui;fill:#e5b55a;letter-spacing:1px}.note{font:14px system-ui;fill:#aaa298}</style><rect width="100%" height="100%" class="bg"/><text x="30" y="45" class="title">CATEGORY + MECHANISM · THREE SCALE GATE</text><text x="30" y="76" class="note">Same base paths · part transforms only · AWAITING USER PIXEL VERDICT</text>'+cards.join('')+'</svg>';
fs.writeFileSync(path.join(out,'shovel-mechanism-review-v3.svg'),scale+'\n');

const mapCards=VIEWS.map((view,index)=>'<g transform="translate('+(30+index*435)+' 104)"><text class="small" y="-16">'+view+' · SOURCE CORRESPONDENCE REGIONS</text><svg width="397" height="397" viewBox="0 0 397 397">'+inner(renderMechanismSvg(study,{view,showMap:true}))+'</svg></g>').join('');
const map='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 540"><style>.bg{fill:#171512}.title{font:900 30px system-ui;fill:#fffdf7}.small{font:800 11px system-ui;fill:#e5b55a;letter-spacing:1px}.note{font:14px system-ui;fill:#aaa298}</style><rect width="100%" height="100%" class="bg"/><text x="30" y="45" class="title">NEUTRAL PART CORRESPONDENCE</text><text x="30" y="73" class="note">No semantic part labels · red boxes bind every transform to source evidence</text>'+mapCards+'</svg>';
fs.writeFileSync(path.join(out,'shovel-correspondence-v3.svg'),map+'\n');

const cases=VIEWS.flatMap(view=>visibleStrokes(study,view).map(stroke=>({view,stroke}))),columns=5,cardW=214,cardH=240,rows=Math.ceil(cases.length/columns);
const ablationCards=cases.map(({view,stroke},index)=>{const x=22+(index%columns)*cardW,y=100+Math.floor(index/columns)*cardH;return'<g transform="translate('+x+' '+y+')"><text class="label" y="-24">'+view+' · WITHOUT</text><text class="name" y="-8">'+stroke.id+' · '+stroke.partId+'</text><svg width="190" height="190" viewBox="0 0 397 397">'+inner(renderMechanismSvg(study,{view,omitStrokeId:stroke.id}))+'</svg></g>'}).join('');
const ablation='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+(40+columns*cardW)+' '+(125+rows*cardH)+'"><style>.bg{fill:#171512}.title{font:900 28px system-ui;fill:#fffdf7}.label{font:800 9px system-ui;fill:#e5b55a;letter-spacing:1px}.name{font:11px monospace;fill:#fffdf7}</style><rect width="100%" height="100%" class="bg"/><text x="22" y="43" class="title">DUAL-STATE ABLATION · CATEGORY / STRUCTURE / NOISE</text><text x="22" y="70" class="name">Every card removes one shared base stroke. Human evidence remains pending.</text>'+ablationCards+'</svg>';
fs.writeFileSync(path.join(out,'shovel-mechanism-ablation-v3.svg'),ablation+'\n');

const gate={schema:'vector-noodle.visual-gate.v3',buildMarker:'empty-glass-mechanism-v4',state:'AWAITING_USER_PIXEL_VERDICT',expected:'The same source-evidenced part geometry preserves category and construction when separated.',actual:'Fresh transform-only assembled, exploded, correspondence, three-scale, and dual-state ablation artifacts generated. Human CATEGORY STRUCTURE and NOISE judgments remain pending.',acceptance:false,sourceSha256:study.source.sha256,guardrail:validateMechanismStudy(study),acceptanceBlockerCount:acceptanceFailures(study).length,visibleStrokeCounts:Object.fromEntries(VIEWS.map(view=>[view,visibleStrokes(study,view).length])),partCount:study.parts.length,attachmentCount:study.attachments.length,rejectedExplodedGeometrySha256:study.rejectedExplodedMarks[0].sha256};
fs.writeFileSync(path.join(out,'visual-gate-v3.json'),JSON.stringify(gate,null,2)+'\n');
fs.writeFileSync(path.join(out,'REJECTION_MECHANISM_V2.json'),JSON.stringify({schema:'vector-noodle.rejected-visual.v1',state:'USER_REJECTED_MECHANISM_PRESERVATION',reason:'EXPLODED_TROPE_WITHOUT_ATTACHMENT_TRUTH',sha256:study.rejectedExplodedMarks[0].sha256,forbiddenReuse:['independent exploded paths','unmapped rectangular marks','explosion-axis marks'],replacementGate:'visual-gate-v3.json'},null,2)+'\n');
console.log(JSON.stringify({state:'RENDERED_AWAITING_USER',outputs:7,parts:study.parts.length,strokes:allStrokes(study).length,attachments:study.attachments.length,validation:validateMechanismStudy(study)}));
