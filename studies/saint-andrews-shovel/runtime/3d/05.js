      if(name||mode==='move'||mode==='rotate'||mode==='scale'){beginPiece(name||selected,e);return}
    }
    if(!exploded&&name){gesture={kind:'armed',id:e.pointerId,name,start:p};updateStatus(`${label(name)} selected · drag to pull only this part free`);return}
    gesture=null;
  },{passive:false});
  workspace.addEventListener('pointermove',e=>{
    if(!gesture||gesture.id!==e.pointerId)return;e.preventDefault();const p=toSvg(e.clientX,e.clientY);
    if(gesture.kind==='light'){setLight(e.clientX,e.clientY);return}
    if(gesture.kind==='armed'){
      if(Math.hypot(p.x-gesture.start.x,p.y-gesture.start.y)>8){const name=gesture.name,start=gesture.start;enterDirectPull(name);gesture={kind:'piece',name,id:e.pointerId,mode:'move',start,lastSphere:spherePoint(name,start),base:{dx:0,dy:0,q:[1,0,0,0],s:1}};pieceNodes[name].classList.add('dragging');movePiece(e)}
      return;
    }
    movePiece(e);
  },{passive:false});
  function end(e){if(!gesture||gesture.id!==e.pointerId)return;e.preventDefault();document.querySelectorAll('.piece.dragging').forEach(n=>n.classList.remove('dragging'));gesture=null;try{workspace.releasePointerCapture(e.pointerId)}catch(_){}updateStatus()}
  workspace.addEventListener('pointerup',end,{passive:false});workspace.addEventListener('pointercancel',end,{passive:false});
  workspace.addEventListener('contextmenu',e=>e.preventDefault());workspace.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});workspace.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});

  assemble.addEventListener('click',showAssembled);spread.addEventListener('click',setReferenceLayout);
  resetPartButton.addEventListener('click',()=>exploded?resetPart(selected):updateStatus('Already assembled · shovel remains untouched'));
  document.querySelectorAll('[data-select]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.select)));
  document.querySelectorAll('[data-transform]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.transform)));

  function rotateSelected(axis,angle){state[selected].q=mulQ(axisQ(axis,angle),state[selected].q);apply(selected)}
  workspace.tabIndex=0;workspace.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();showAssembled();return}if(e.code==='Space'){e.preventDefault();setReferenceLayout();return}
    if(e.key==='1'){setMode('move');return}if(e.key==='2'){setMode('rotate');return}if(e.key==='3'){setMode('scale');return}if(e.key==='4'){setMode('light');return}
    if(!exploded)return;const s=state[selected];if(e.key==='r'||e.key==='R'){e.preventDefault();resetPart(selected);return}
    if(mode==='move'){if(e.key==='ArrowLeft')s.dx-=10;else if(e.key==='ArrowRight')s.dx+=10;else if(e.key==='ArrowUp')s.dy-=10;else if(e.key==='ArrowDown')s.dy+=10;else return;apply(selected)}
    else if(mode==='rotate'){
      if(e.key==='ArrowLeft')rotateSelected([0,1,0],-.12);else if(e.key==='ArrowRight')rotateSelected([0,1,0],.12);else if(e.key==='ArrowUp')rotateSelected([1,0,0],-.12);else if(e.key==='ArrowDown')rotateSelected([1,0,0],.12);else if(e.key==='q'||e.key==='Q')rotateSelected([0,0,1],-.12);else if(e.key==='e'||e.key==='E')rotateSelected([0,0,1],.12);else return;
    }else if(mode==='scale'){if(e.key==='ArrowUp')s.s=clamp(s.s*1.06,.30,3);else if(e.key==='ArrowDown')s.s=clamp(s.s/1.06,.30,3);else return;apply(selected)}else return;
    e.preventDefault();updateStatus();
  });

  Object.values(lightNodes).forEach(n=>n.style.display='none');select('handle');setMode('move',false);showAssembled();
  window.__SHOVEL_RUNTIME__={
    version:'accepted-shovel-runtime-v4-contour-3d',
    acceptedStaticSha256:'3218fe45e005fe2c2ae432b35fd25aea18e60e3ceec6adf1c855cb9c7015400b',
    mechanism:'vector-noodle-quaternion-curved-strip-surfaces',
    get exploded(){return exploded},get referenceLayout(){return referenceLayout},get selected(){return selected},get mode(){return mode},
    getPieceState:n=>({...state[n],q:[...state[n].q]}),select,setMode,assemble:showAssembled,reference:setReferenceLayout,resetPart,
    pull:n=>{if(!pieceNodes[n])return false;enterDirectPull(n);return true},
    rotate:(n,axis,angle)=>{if(!pieceNodes[n])return false;state[n].q=mulQ(axisQ(axis,angle),state[n].q);apply(n);return true}
  };
})();