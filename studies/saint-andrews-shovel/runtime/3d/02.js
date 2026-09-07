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
