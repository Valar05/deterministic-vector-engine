  function matrixFor(name,z=0){
    const c=centers[name],st=state[name],{ex,ey,ez}=basis(name),s=st.s;
    const a=s*ex[0],b=s*ex[1],cc=s*ey[0],d=s*ey[1];
    const e=c.x+st.dx+s*ez[0]*z-a*c.x-cc*c.y;
    const f=c.y+st.dy+s*ez[1]*z-b*c.x-d*c.y;
    return {a,b,c:cc,d,e,f,svg:`matrix(${a.toFixed(6)} ${b.toFixed(6)} ${cc.toFixed(6)} ${d.toFixed(6)} ${e.toFixed(3)} ${f.toFixed(3)})`,ez};
  }
  function nearFaceZ(name){return basis(name).ez[2]>=0?thickness[name]/2:-thickness[name]/2}
  function apply(name){
    const root=pieceNodes[name],normalZ=basis(name).ez[2];
    root.__front.style.opacity=normalZ>=0?'1':'0';
    root.__back.style.opacity=normalZ<0?'1':'0';
    const sideVisibility=Math.abs(normalZ)>.995?'0':'1';
    root.__layers.forEach(layer=>{
      layer.node.setAttribute('transform',matrixFor(name,layer.z).svg);
      if(layer.kind==='side')layer.node.style.visibility=sideVisibility==='1'?'visible':'hidden';
    });
    const ordered=[...root.__layers].sort((x,y)=>normalZ>=0?x.z-y.z:y.z-x.z);
    ordered.forEach(l=>root.appendChild(l.node));
    root.__hit.setAttribute('transform',matrixFor(name,nearFaceZ(name)).svg);root.appendChild(root.__hit);
    syncLightTransform();
  }
  function applyAll(){Object.keys(state).forEach(apply)}
  function refState(name){const r=reference[name];return {dx:r.dx,dy:r.dy,q:axisQ([0,0,1],deg(r.rz)),s:r.s}}
  function baseFor(name){return referenceLayout?refState(name):identity()}
  function resetPart(name,announce=true){Object.assign(state[name],baseFor(name));state[name].q=[...baseFor(name).q];apply(name);if(announce)status.textContent=`Reset ${label(name)} · ${referenceLayout?'reference':'assembled'} alignment`;haptic(5)}
  function resetAll(){Object.keys(state).forEach(k=>Object.assign(state[k],identity()));applyAll()}
  function setReferenceStates(){Object.keys(state).forEach(k=>{const r=refState(k);Object.assign(state[k],r);state[k].q=[...r.q]});applyAll()}
  function label(n){return n==='handle'?'D-handle':n[0].toUpperCase()+n.slice(1)}
  function updatePressed(){
    document.querySelectorAll('[data-select]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.select===selected)));
    document.querySelectorAll('[data-transform]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.transform===mode)));
    assemble.setAttribute('aria-pressed',String(!exploded));spread.setAttribute('aria-pressed',String(exploded&&referenceLayout));
  }
  function updateStatus(extra=''){status.textContent=extra||(exploded?`${label(selected)} · ${mode} · 3D vector`:`${label(selected)} selected · drag a part to pull only that part free`)}
  function select(name){if(!pieceNodes[name])return;selected=name;if(exploded)document.getElementById('partsView')?.appendChild(pieceNodes[name]);Object.entries(lightNodes).forEach(([k,n])=>n.style.display=k===name?'inline':'none');updatePressed();syncLightTransform();updateStatus()}
  function setMode(next,announce=true){if(!['move','rotate','scale','light'].includes(next))return;mode=next;updatePressed();if(announce)updateStatus()}
  function showAssembled(){exploded=false;referenceLayout=false;gesture=null;acceptedFrame.style.visibility='visible';explodedFrame.style.visibility='hidden';assembledHits.style.visibility='visible';resetAll();lightScene.style.opacity=lightVisible?'.18':'0';syncLightTransform();updatePressed();updateStatus('Assembled · accepted shovel frozen · drag a part to pull it free');haptic(8)}
  function showExploded(){exploded=true;acceptedFrame.style.visibility='hidden';explodedFrame.style.visibility='visible';assembledHits.style.visibility='hidden';lightScene.style.opacity=lightVisible?'.18':'0';updatePressed();syncLightTransform()}
