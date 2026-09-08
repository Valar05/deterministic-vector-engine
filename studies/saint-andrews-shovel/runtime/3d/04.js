  function updateStatus(extra=''){status.textContent=extra||(exploded?`${label(selected)} · ${mode} · 3D vector`:`${label(selected)} selected · drag a part to pull only that part free`)}
  function select(name){if(!pieceNodes[name])return;selected=name;if(exploded)document.getElementById('partsView')?.appendChild(pieceNodes[name]);Object.entries(lightNodes).forEach(([k,n])=>n.style.display=k===name?'inline':'none');updatePressed();syncLightTransform();updateStatus()}
  function setMode(next,announce=true){if(!['move','rotate','scale','light'].includes(next))return;mode=next;updatePressed();if(announce)updateStatus()}
  function showAssembled(){exploded=false;referenceLayout=false;gesture=null;acceptedFrame.style.visibility='visible';explodedFrame.style.visibility='hidden';assembledHits.style.visibility='visible';resetAll();lightScene.style.opacity=lightVisible?'.18':'0';syncLightTransform();updatePressed();updateStatus('Assembled · accepted shovel frozen · drag a part to pull it free');haptic(8)}
  function showExploded(){exploded=true;acceptedFrame.style.visibility='hidden';explodedFrame.style.visibility='visible';assembledHits.style.visibility='hidden';lightScene.style.opacity=lightVisible?'.18':'0';updatePressed();syncLightTransform()}
  function setReferenceLayout(){referenceLayout=true;setReferenceStates();showExploded();updateStatus('Reference layout · four independent 3D vectors');haptic(10)}
  function enterDirectPull(name){referenceLayout=false;resetAll();showExploded();select(name);setMode('move',false);updateStatus(`${label(name)} pulled free · only this part moves · Rotate 3D / Scale / Light`);haptic(11)}
  function syncLightTransform(){Object.entries(lightNodes).forEach(([k,n])=>{n.style.display=k===selected?'inline':'none';n.setAttribute('transform',exploded?planeMatrix(k,0):'')})}
  function setLight(x,y){const p=toSvg(x,y);uiLight.setAttribute('cx',clamp(p.x,-40,1064).toFixed(1));uiLight.setAttribute('cy',clamp(p.y,-40,1576).toFixed(1));lightVisible=true;lightScene.style.opacity='.20';syncLightTransform()}

  function spherePoint(name,p){
    const c=centers[name],st=state[name],r=Math.max(72,Math.min(220,radii[name]*st.s));
    let x=(p.x-(c.x+st.dx))/r,y=((c.y+st.dy)-p.y)/r;const m=x*x+y*y;
    if(m>1){const inv=1/Math.sqrt(m);return [x*inv,y*inv,0]}
    return [x,y,Math.sqrt(1-m)];
  }
  function beginPiece(name,e){
    select(name);const p=toSvg(e.clientX,e.clientY),base={dx:state[name].dx,dy:state[name].dy,q:[...state[name].q],s:state[name].s};
    gesture={kind:'piece',name,id:e.pointerId,mode,start:p,lastSphere:spherePoint(name,p),base};pieceNodes[name].classList.add('dragging');
  }
  function movePiece(e){
    if(!gesture||gesture.kind!=='piece'||gesture.id!==e.pointerId)return;
    const p=toSvg(e.clientX,e.clientY),s=state[gesture.name],b=gesture.base,dx=p.x-gesture.start.x,dy=p.y-gesture.start.y;
    if(gesture.mode==='move'){s.dx=b.dx+dx;s.dy=b.dy+dy}
    else if(gesture.mode==='rotate'){
      const current=spherePoint(gesture.name,p);s.q=mulQ(betweenQ(gesture.lastSphere,current),s.q);gesture.lastSphere=current;
    }
    else if(gesture.mode==='scale'){s.s=clamp(b.s*(1-dy*.0045),.30,3.0)}
    else if(gesture.mode==='light'){setLight(e.clientX,e.clientY);return}
    apply(gesture.name);
  }

  workspace.addEventListener('pointerdown',e=>{
    if(!e.isPrimary)return;e.preventDefault();
    const eh=e.target.closest?.('[data-piece-hit]'),ah=e.target.closest?.('[data-assembled-hit]');
    const name=exploded?eh?.dataset.pieceHit:ah?.dataset.assembledHit,p=toSvg(e.clientX,e.clientY);
    try{workspace.setPointerCapture(e.pointerId)}catch(_){}
    if(name)select(name);
    if(mode==='light'){gesture={kind:'light',id:e.pointerId,start:p,name:name||selected};setLight(e.clientX,e.clientY);return}
    if(exploded){
      // After selection, the whole workspace is a generous manipulation surface: edge-on parts remain touch-friendly.
