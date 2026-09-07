(()=>{
  const workspace=document.getElementById('workspace');
  const acceptedFrame=document.getElementById('acceptedFrame');
  const sourceSvg=acceptedFrame.querySelector('svg');
  const explodedFrame=document.getElementById('explodedFrame');
  const partsScene=document.getElementById('partsScene');
  const assembledHits=document.getElementById('assembledHits');
  const lightScene=document.getElementById('lightScene');
  const uiLight=document.getElementById('uiLight');
  const status=document.getElementById('status');
  const assemble=document.getElementById('assemble'),spread=document.getElementById('spread'),resetPartButton=document.getElementById('resetPart'),partsView=()=>document.getElementById('partsView');

  const SVGNS='http://www.w3.org/2000/svg';
  const centers={handle:{x:512,y:190},shaft:{x:512,y:625},socket:{x:512,y:960},blade:{x:512,y:1210}};
  const reference={handle:{dx:-190,dy:80,r:-5,s:.93},shaft:{dx:175,dy:70,r:4,s:.93},socket:{dx:-175,dy:-20,r:-4,s:.96},blade:{dx:45,dy:55,r:2,s:.94}};
  const identity=()=>({dx:0,dy:0,r:0,s:1});
  const state={handle:identity(),shaft:identity(),socket:identity(),blade:identity()};
  const hitMarkup={
    handle:'<rect class="pieceHit" data-piece-hit="handle" x="385" y="38" width="254" height="322" rx="18" fill="transparent"/>',
    shaft:'<rect class="pieceHit" data-piece-hit="shaft" x="468" y="330" width="88" height="604" rx="12" fill="transparent"/>',
    socket:'<rect class="pieceHit" data-piece-hit="socket" x="456" y="904" width="112" height="108" rx="12" fill="transparent"/>',
    blade:'<path class="pieceHit" data-piece-hit="blade" d="M348 986 L468 986 Q479 986 481 962 L481 927 L543 927 L543 962 Q545 986 556 986 L676 986 L676 1187 Q672 1293 620 1377 Q575 1421 512 1441 Q449 1421 404 1377 Q352 1293 348 1187 Z" fill="transparent"/>'
  };

  function el(name,attrs={}){
    const n=document.createElementNS(SVGNS,name);
    Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));
    return n;
  }
  function rewriteTree(root,idMap){
    const nodes=[root,...(root.querySelectorAll?.('*')||[])];
    nodes.forEach(n=>{
      if(n.nodeType!==1)return;
      const old=n.getAttribute('id'); if(old&&idMap[old]) n.setAttribute('id',idMap[old]);
      [...n.attributes].forEach(a=>{
        let v=a.value;
        Object.entries(idMap).forEach(([o,x])=>{v=v.replaceAll(`url(#${o})`,`url(#${x})`).replaceAll(`#${o}`,`#${x}`)});
        if(v!==a.value)n.setAttribute(a.name,v);
      });
    });
    return root;
  }
  function buildPieces(){
    const sourceNodes=[...sourceSvg.childNodes];
    const defs=sourceSvg.querySelector('defs');
    const idMap={}; defs.querySelectorAll('[id]').forEach(n=>idMap[n.id]=`x-${n.id}`);
    const defsClone=rewriteTree(defs.cloneNode(true),idMap);
    partsScene.appendChild(defsClone);
    const marker=t=>sourceNodes.findIndex(n=>n.nodeType===8&&n.nodeValue.includes(t));
    const h=marker('D handle'), s=marker('shaft'), so=marker('socket'), b=marker('blade');
    if(Math.min(h,s,so,b)<0) throw new Error('accepted shovel section markers missing');
    const defsIndex=sourceNodes.indexOf(defs);
    sourceNodes.slice(defsIndex+1,h).forEach(n=>partsScene.appendChild(rewriteTree(n.cloneNode(true),idMap)));
    const sections={handle:[h,s],shaft:[s,so],socket:[so,b],blade:[b,sourceNodes.length]};
    const view=el('g',{id:'partsView'}); partsScene.appendChild(view);
    Object.entries(sections).forEach(([name,[a,z]])=>{
      const g=el('g',{class:'piece','data-piece':name,id:`piece-${name}`});
      sourceNodes.slice(a,z).forEach(n=>g.appendChild(rewriteTree(n.cloneNode(true),idMap)));
      g.insertAdjacentHTML('beforeend',hitMarkup[name]);
      view.appendChild(g);
    });
  }
  buildPieces();

  const pieceNodes=Object.fromEntries([...document.querySelectorAll('#partsScene .piece')].map(n=>[n.dataset.piece,n]));
  const lightNodes=Object.fromEntries([...document.querySelectorAll('[data-light-piece]')].map(n=>[n.dataset.lightPiece,n]));
  let selected='handle',mode='move',exploded=false,referenceLayout=false,gesture=null,lightVisible=false;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const haptic=(ms=6)=>{try{navigator.vibrate?.(ms)}catch(_){}};

  function toSvg(x,y){const p=partsScene.createSVGPoint();p.x=x;p.y=y;const c=partsScene.getScreenCTM();return c?p.matrixTransform(c.inverse()):{x:512,y:768}}
  function tf(name,s=state[name]){const c=centers[name];return `translate(${s.dx} ${s.dy}) translate(${c.x} ${c.y}) rotate(${s.r}) scale(${s.s}) translate(${-c.x} ${-c.y})`}
  function apply(name){pieceNodes[name].setAttribute('transform',tf(name));syncLightTransform()}
  function applyAll(){Object.keys(state).forEach(apply)}
  function baseFor(name){return referenceLayout?{...reference[name]}:identity()}
  function resetPart(name,announce=true){Object.assign(state[name],baseFor(name));apply(name);if(announce)status.textContent=`Reset ${label(name)} · ${referenceLayout?'reference':'assembled'} alignment`;haptic(5)}
  function resetAll(){Object.keys(state).forEach(k=>Object.assign(state[k],identity()));applyAll()}
  function setReferenceStates(){Object.keys(state).forEach(k=>Object.assign(state[k],reference[k]));applyAll()}
  function label(n){return n==='handle'?'D-handle':n[0].toUpperCase()+n.slice(1)}
  function updatePressed(){
    document.querySelectorAll('[data-select]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.select===selected)));
    document.querySelectorAll('[data-transform]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.transform===mode)));
    assemble.setAttribute('aria-pressed',String(!exploded));spread.setAttribute('aria-pressed',String(exploded&&referenceLayout));
  }
  function updateStatus(extra=''){status.textContent=extra||(exploded?`${label(selected)} · ${mode} · ${referenceLayout?'reference layout':'pulled free'}`:`${label(selected)} selected · drag a part to pull only that part free`)}
  function select(name){if(!pieceNodes[name])return;selected=name;if(exploded)partsView()?.appendChild(pieceNodes[name]);Object.entries(lightNodes).forEach(([k,n])=>n.style.display=k===name?'inline':'none');updatePressed();syncLightTransform();updateStatus()}
  function setMode(next,announce=true){if(!['move','rotate','scale','light'].includes(next))return;mode=next;updatePressed();if(announce)updateStatus()}
  function showAssembled(){exploded=false;referenceLayout=false;gesture=null;acceptedFrame.style.visibility='visible';explodedFrame.style.visibility='hidden';assembledHits.style.visibility='visible';resetAll();lightScene.style.opacity=lightVisible?'.18':'0';syncLightTransform();updatePressed();updateStatus('Assembled · accepted shovel frozen · tap selects, drag pulls one part free');haptic(8)}
  function showExploded(){exploded=true;acceptedFrame.style.visibility='hidden';explodedFrame.style.visibility='visible';assembledHits.style.visibility='hidden';lightScene.style.opacity=lightVisible?'.18':'0';updatePressed();syncLightTransform()}
  function setReferenceLayout(){referenceLayout=true;setReferenceStates();showExploded();updateStatus('Reference layout · all four accepted parts separated');haptic(10)}
  function enterDirectPull(name){referenceLayout=false;resetAll();showExploded();select(name);setMode('move',false);updateStatus(`${label(name)} pulled free · only this part moves`);haptic(11)}
  function syncLightTransform(){Object.entries(lightNodes).forEach(([k,n])=>{n.style.display=k===selected?'inline':'none';n.setAttribute('transform',exploded?tf(k):'')})}
  function setLight(x,y){const p=toSvg(x,y);uiLight.setAttribute('cx',clamp(p.x,-40,1064).toFixed(1));uiLight.setAttribute('cy',clamp(p.y,-40,1576).toFixed(1));lightVisible=true;lightScene.style.opacity='.20';syncLightTransform()}
  function beginPiece(name,e){select(name);gesture={kind:'piece',name,id:e.pointerId,mode,start:toSvg(e.clientX,e.clientY),base:{...state[name]}};pieceNodes[name].classList.add('dragging')}
  function movePiece(e){if(!gesture||gesture.kind!=='piece'||gesture.id!==e.pointerId)return;const p=toSvg(e.clientX,e.clientY),s=state[gesture.name],b=gesture.base,dx=p.x-gesture.start.x,dy=p.y-gesture.start.y;if(gesture.mode==='move'){s.dx=b.dx+dx;s.dy=b.dy+dy}else if(gesture.mode==='rotate'){s.r=b.r+dx*.32}else if(gesture.mode==='scale'){s.s=clamp(b.s*(1-dy*.0045),.35,2.6)}else if(gesture.mode==='light'){setLight(e.clientX,e.clientY);return}apply(gesture.name)}

  workspace.addEventListener('pointerdown',e=>{
    if(!e.isPrimary)return;e.preventDefault();
    const eh=e.target.closest?.('[data-piece-hit]'),ah=e.target.closest?.('[data-assembled-hit]');
    const name=exploded?eh?.dataset.pieceHit:ah?.dataset.assembledHit,p=toSvg(e.clientX,e.clientY);
    try{workspace.setPointerCapture(e.pointerId)}catch(_){}
    if(name)select(name);
    if(mode==='light'){gesture={kind:'light',id:e.pointerId,start:p,name:name||selected};setLight(e.clientX,e.clientY);return}
    if(exploded&&name){beginPiece(name,e);return}
    if(!exploded&&name){gesture={kind:'armed',id:e.pointerId,name,start:p};updateStatus(`${label(name)} selected · drag to pull only this part free`);return}
    gesture=null;
  },{passive:false});
  workspace.addEventListener('pointermove',e=>{
    if(!gesture||gesture.id!==e.pointerId)return;e.preventDefault();const p=toSvg(e.clientX,e.clientY);
    if(gesture.kind==='light'){setLight(e.clientX,e.clientY);return}
    if(gesture.kind==='armed'){if(Math.hypot(p.x-gesture.start.x,p.y-gesture.start.y)>8){const name=gesture.name,start=gesture.start;enterDirectPull(name);gesture={kind:'piece',name,id:e.pointerId,mode:'move',start,base:{...state[name]}};pieceNodes[name].classList.add('dragging');movePiece(e)}return}
    movePiece(e);
  },{passive:false});
  function end(e){if(!gesture||gesture.id!==e.pointerId)return;e.preventDefault();document.querySelectorAll('.piece.dragging').forEach(n=>n.classList.remove('dragging'));gesture=null;try{workspace.releasePointerCapture(e.pointerId)}catch(_){}updateStatus()}
  workspace.addEventListener('pointerup',end,{passive:false});workspace.addEventListener('pointercancel',end,{passive:false});
  workspace.addEventListener('contextmenu',e=>e.preventDefault());workspace.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});workspace.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});

  assemble.addEventListener('click',showAssembled);spread.addEventListener('click',setReferenceLayout);
  resetPartButton.addEventListener('click',()=>exploded?resetPart(selected):updateStatus('Already assembled · shovel remains untouched'));
  document.querySelectorAll('[data-select]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.select)));
  document.querySelectorAll('[data-transform]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.transform)));

  workspace.tabIndex=0;workspace.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();showAssembled();return}if(e.code==='Space'){e.preventDefault();setReferenceLayout();return}
    if(e.key==='1'){setMode('move');return}if(e.key==='2'){setMode('rotate');return}if(e.key==='3'){setMode('scale');return}if(e.key==='4'){setMode('light');return}
    if(!exploded)return;const s=state[selected];if(e.key==='r'||e.key==='R'){e.preventDefault();resetPart(selected);return}
    if(mode==='move'){if(e.key==='ArrowLeft')s.dx-=10;else if(e.key==='ArrowRight')s.dx+=10;else if(e.key==='ArrowUp')s.dy-=10;else if(e.key==='ArrowDown')s.dy+=10;else return}
    else if(mode==='rotate'){if(e.key==='ArrowLeft')s.r-=5;else if(e.key==='ArrowRight')s.r+=5;else return}
    else if(mode==='scale'){if(e.key==='ArrowUp')s.s=clamp(s.s*1.06,.35,2.6);else if(e.key==='ArrowDown')s.s=clamp(s.s/1.06,.35,2.6);else return}else return;
    e.preventDefault();apply(selected);updateStatus();
  });

  Object.values(lightNodes).forEach(n=>n.style.display='none');select('handle');setMode('move',false);showAssembled();
  window.__SHOVEL_RUNTIME__={version:'accepted-shovel-runtime-v2',acceptedStaticSha256:'3218fe45e005fe2c2ae432b35fd25aea18e60e3ceec6adf1c855cb9c7015400b',get exploded(){return exploded},get referenceLayout(){return referenceLayout},get selected(){return selected},get mode(){return mode},getPieceState:n=>({...state[n]}),select,setMode,assemble:showAssembled,reference:setReferenceLayout,resetPart,pull:n=>{if(!pieceNodes[n])return false;enterDirectPull(n);return true}};
})();
