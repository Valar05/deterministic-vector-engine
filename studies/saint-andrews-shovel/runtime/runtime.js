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
  const assemble=document.getElementById('assemble');
  const spread=document.getElementById('spread');
  const resetPartButton=document.getElementById('resetPart');
  const SVGNS='http://www.w3.org/2000/svg';

  // Proven Vector Noodle / beveled-box quaternion mechanics, now per shovel part.
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const vlen=v=>Math.hypot(v[0],v[1],v[2]);
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const cross=(a,b)=>[
    a[1]*b[2]-a[2]*b[1],
    a[2]*b[0]-a[0]*b[2],
    a[0]*b[1]-a[1]*b[0]
  ];
  function normV(v){const n=vlen(v);return n>1e-9?v.map(x=>x/n):[0,0,0]}
  function normQ(q){const n=Math.hypot(...q);return n>1e-9?q.map(x=>x/n):[1,0,0,0]}
  function mulQ(a,b){return normQ([
    a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],
    a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],
    a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],
    a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]
  ])}
  function axisQ(axis,angle){const n=normV(axis),h=angle*.5,s=Math.sin(h);return normQ([Math.cos(h),n[0]*s,n[1]*s,n[2]*s])}
  function betweenQ(from,to){
    const a=normV(from),b=normV(to),p=clamp(dot(a,b),-1,1);
    if(p>.999999)return [1,0,0,0];
    if(p<-.999999){const fallback=Math.abs(a[0])<.8?[1,0,0]:[0,1,0];return axisQ(cross(a,fallback),Math.PI)}
    const ax=cross(a,b);return normQ([1+p,ax[0],ax[1],ax[2]])
  }
  function rotateV(point,q){
    const v=[q[1],q[2],q[3]],uv=cross(v,point),uuv=cross(v,uv);
    return [
      point[0]+2*(q[0]*uv[0]+uuv[0]),
      point[1]+2*(q[0]*uv[1]+uuv[1]),
      point[2]+2*(q[0]*uv[2]+uuv[2])
    ];
  }
  const deg=d=>d*Math.PI/180;

  const centers={handle:{x:512,y:190},shaft:{x:512,y:625},socket:{x:512,y:960},blade:{x:512,y:1210}};
  const radii={handle:155,shaft:145,socket:85,blade:205};
  const thickness={handle:28,shaft:18,socket:32,blade:24};
  const reference={
    handle:{dx:-190,dy:80,rz:-5,s:.93},
    shaft:{dx:175,dy:70,rz:4,s:.93},
    socket:{dx:-175,dy:-20,rz:-4,s:.96},
    blade:{dx:45,dy:55,rz:2,s:.94}
  };
  const identity=()=>({dx:0,dy:0,q:[1,0,0,0],s:1});
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
      const old=n.getAttribute('id');if(old&&idMap[old])n.setAttribute('id',idMap[old]);
      [...n.attributes].forEach(a=>{
        let v=a.value;
        Object.entries(idMap).forEach(([o,x])=>{v=v.replaceAll(`url(#${o})`,`url(#${x})`).replaceAll(`#${o}`,`#${x}`)});
        if(v!==a.value)n.setAttribute(a.name,v);
      });
    });
    return root;
  }
  function appendSection(target,nodes,a,z,idMap){
    nodes.slice(a,z).forEach(n=>target.appendChild(rewriteTree(n.cloneNode(true),idMap)));
  }
  function makeVisualLayer(name,section,nodes,idMap,z,kind){
    const g=el('g',{'data-layer-kind':kind,'data-layer-z':z,'aria-hidden':'true'});
    appendSection(g,nodes,section[0],section[1],idMap);
    if(kind==='side'){
      g.style.filter='brightness(.33) saturate(.72)';
      g.style.opacity='.96';
    }else if(kind==='back'){
      g.style.filter='brightness(.42) saturate(.64)';
    }
    return g;
  }
  function buildPieces(){
    const sourceNodes=[...sourceSvg.childNodes];
    const defs=sourceSvg.querySelector('defs');
    const idMap={};defs.querySelectorAll('[id]').forEach(n=>idMap[n.id]=`x-${n.id}`);
    partsScene.appendChild(rewriteTree(defs.cloneNode(true),idMap));
    const marker=t=>sourceNodes.findIndex(n=>n.nodeType===8&&n.nodeValue.includes(t));
    const h=marker('D handle'),s=marker('shaft'),so=marker('socket'),b=marker('blade');
    if(Math.min(h,s,so,b)<0)throw new Error('accepted shovel section markers missing');
    const defsIndex=sourceNodes.indexOf(defs);
    sourceNodes.slice(defsIndex+1,h).forEach(n=>partsScene.appendChild(rewriteTree(n.cloneNode(true),idMap)));
    const sections={handle:[h,s],shaft:[s,so],socket:[so,b],blade:[b,sourceNodes.length]};
    const view=el('g',{id:'partsView'});partsScene.appendChild(view);
    Object.entries(sections).forEach(([name,section])=>{
      const root=el('g',{class:'piece','data-piece':name,id:`piece-${name}`});
      const half=thickness[name]/2;
      const layers=[];
      const back=makeVisualLayer(name,section,sourceNodes,idMap,-half,'back');layers.push({node:back,z:-half,kind:'back'});
      const slices=7;
      for(let i=1;i<=slices;i++){
        const z=-half+(i/(slices+1))*thickness[name];
        const side=makeVisualLayer(name,section,sourceNodes,idMap,z,'side');layers.push({node:side,z,kind:'side'});
      }
      const front=makeVisualLayer(name,section,sourceNodes,idMap,half,'front');layers.push({node:front,z:half,kind:'front'});
      const hit=el('g',{'data-layer-kind':'hit'});hit.insertAdjacentHTML('beforeend',hitMarkup[name]);
      root.__layers=layers;root.__hit=hit;root.__front=front;root.__back=back;
      layers.forEach(l=>root.appendChild(l.node));root.appendChild(hit);view.appendChild(root);
    });
  }
  buildPieces();

  const pieceNodes=Object.fromEntries([...document.querySelectorAll('#partsScene .piece')].map(n=>[n.dataset.piece,n]));
  const lightNodes=Object.fromEntries([...document.querySelectorAll('[data-light-piece]')].map(n=>[n.dataset.lightPiece,n]));
  let selected='handle',mode='move',exploded=false,referenceLayout=false,gesture=null,lightVisible=false;
  const haptic=(ms=6)=>{try{navigator.vibrate?.(ms)}catch(_){}};

  function toSvg(x,y){const p=partsScene.createSVGPoint();p.x=x;p.y=y;const c=partsScene.getScreenCTM();return c?p.matrixTransform(c.inverse()):{x:512,y:768}}
  function basis(name){const q=state[name].q;return {ex:rotateV([1,0,0],q),ey:rotateV([0,1,0],q),ez:rotateV([0,0,1],q)}}
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
  function setReferenceLayout(){referenceLayout=true;setReferenceStates();showExploded();updateStatus('Reference layout · four independent 3D vectors');haptic(10)}
  function enterDirectPull(name){referenceLayout=false;resetAll();showExploded();select(name);setMode('move',false);updateStatus(`${label(name)} pulled free · only this part moves · Rotate 3D / Scale / Light`);haptic(11)}
  function syncLightTransform(){Object.entries(lightNodes).forEach(([k,n])=>{n.style.display=k===selected?'inline':'none';n.setAttribute('transform',exploded?matrixFor(k,nearFaceZ(k)).svg:'')})}
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
      // Rotate/Scale can use the whole workspace after selection: edge-on parts remain easy to manipulate.
      if(name||mode==='rotate'||mode==='scale'){beginPiece(name||selected,e);return}
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
    version:'accepted-shovel-runtime-v3-3d',
    acceptedStaticSha256:'3218fe45e005fe2c2ae432b35fd25aea18e60e3ceec6adf1c855cb9c7015400b',
    mechanism:'vector-noodle-beveled-box-quaternion-extrusion',
    get exploded(){return exploded},get referenceLayout(){return referenceLayout},get selected(){return selected},get mode(){return mode},
    getPieceState:n=>({...state[n],q:[...state[n].q]}),select,setMode,assemble:showAssembled,reference:setReferenceLayout,resetPart,
    pull:n=>{if(!pieceNodes[n])return false;enterDirectPull(n);return true},
    rotate:(n,axis,angle)=>{if(!pieceNodes[n])return false;state[n].q=mulQ(axisQ(axis,angle),state[n].q);apply(n);return true}
  };
})();
