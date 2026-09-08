  const pieceNodes=Object.fromEntries([...document.querySelectorAll('#partsScene .piece')].map(n=>[n.dataset.piece,n]));
  const lightNodes=Object.fromEntries([...document.querySelectorAll('[data-light-piece]')].map(n=>[n.dataset.lightPiece,n]));
  let selected='handle',mode='move',exploded=false,referenceLayout=false,gesture=null,lightVisible=false;
  const haptic=(ms=6)=>{try{navigator.vibrate?.(ms)}catch(_){}};

  function toSvg(x,y){const p=partsScene.createSVGPoint();p.x=x;p.y=y;const c=partsScene.getScreenCTM();return c?p.matrixTransform(c.inverse()):{x:512,y:768}}
  function basis(name){const q=state[name].q;return {ex:rotateV([1,0,0],q),ey:rotateV([0,1,0],q),ez:rotateV([0,0,1],q)}}
  function planeMatrix(name,z=0){
    const c=centers[name],st=state[name],{ex,ey,ez}=basis(name),sc=st.s;
    const a=sc*ex[0],b=sc*ex[1],cc=sc*ey[0],d=sc*ey[1];
    const e=c.x+st.dx+sc*ez[0]*z-a*c.x-cc*c.y;
    const f=c.y+st.dy+sc*ez[1]*z-b*c.x-d*c.y;
    return `matrix(${a.toFixed(6)} ${b.toFixed(6)} ${cc.toFixed(6)} ${d.toFixed(6)} ${e.toFixed(3)} ${f.toFixed(3)})`;
  }
  function stripTransform(name,surface){
    const c=centers[name],st=state[name],sc=st.s,q=st.q;
    const u=surface.x-c.x,z=surface.z;
    const tangent=rotateV([1,0,surface.dz],q),ey=rotateV([0,1,0],q),center=rotateV([u,0,z],q);
    const a=sc*tangent[0],b=sc*tangent[1],cc=sc*ey[0],d=sc*ey[1];
    const e=c.x+st.dx+sc*center[0]-a*surface.x-cc*c.y;
    const f=c.y+st.dy+sc*center[1]-b*surface.x-d*c.y;
    return `matrix(${a.toFixed(6)} ${b.toFixed(6)} ${cc.toFixed(6)} ${d.toFixed(6)} ${e.toFixed(3)} ${f.toFixed(3)})`;
  }
  function surfaceNormal(name,surface){
    const local=surface.side>0?normV([-surface.dz,0,1]):normV([surface.dz,0,-1]);
    return rotateV(local,state[name].q);
  }
  function surfaceDepth(name,surface){
    const c=centers[name],u=surface.x-c.x;return rotateV([u,0,surface.z],state[name].q)[2];
  }
  function apply(name){
    const root=pieceNodes[name],visible=[];
    root.__surfaces.forEach(surface=>{
      const normal=surfaceNormal(name,surface),facing=normal[2];
      if(facing<=.008){surface.node.style.visibility='hidden';return}
      surface.node.style.visibility='visible';surface.node.setAttribute('transform',stripTransform(name,surface));
      // Camera-relative soft light: front and back share the same albedo and receive equal treatment.
      const brightness=(.70+.30*clamp(facing,0,1)).toFixed(3);
      surface.node.style.filter=`brightness(${brightness})`;
      visible.push({surface,depth:surfaceDepth(name,surface)});
    });
    visible.sort((a,b)=>a.depth-b.depth).forEach(x=>root.appendChild(x.surface.node));
    root.__hit.setAttribute('transform',planeMatrix(name,0));root.appendChild(root.__hit);
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
