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
  function appendSection(target,nodes,a,z,idMap){
    nodes.slice(a,z).forEach(n=>target.appendChild(rewriteTree(n.cloneNode(true),idMap)));
  }
  function profileSample(name,x,side){
    const p=profiles[name],cx=(p.minX+p.maxX)/2,half=(p.maxX-p.minX)/2;
    const t=clamp((x-cx)/half,-1,1),a=Math.abs(t),inside=Math.max(0,1-t*t);
    let z,dz;
    if(p.curve==='blade'){
      // Shallow forged dish plus a stronger central keel: broad curvature, not a paper slab.
      const broad=Math.pow(Math.max(0,1-a),1.55);
      const ridge=Math.pow(Math.max(0,1-a*4.2),2.1);
      z=p.depth*(.62*broad+.38*ridge);
      const eps=.001;
      const sample=u=>{
        const aa=Math.abs(clamp(u,-1,1));
        return p.depth*(.62*Math.pow(Math.max(0,1-aa),1.55)+.38*Math.pow(Math.max(0,1-aa*4.2),2.1));
      };
      dz=(sample(t+eps)-sample(t-eps))/(2*eps*half);
    }else{
      z=p.depth*Math.sqrt(inside);
      dz=inside>1e-5?(-p.depth*t/(half*Math.sqrt(inside))):0;
      dz=clamp(dz,-2.8,2.8);
    }
    return {z:side*z,dz:side*dz,t};
  }
  function buildPieces(){
    const sourceNodes=[...sourceSvg.childNodes];
    const defs=sourceSvg.querySelector('defs');
    const idMap={};defs.querySelectorAll('[id]').forEach(n=>idMap[n.id]=`x-${n.id}`);
    const runtimeDefs=rewriteTree(defs.cloneNode(true),idMap);partsScene.appendChild(runtimeDefs);
    const marker=t=>sourceNodes.findIndex(n=>n.nodeType===8&&n.nodeValue.includes(t));
    const h=marker('D handle'),s=marker('shaft'),so=marker('socket'),b=marker('blade');
    if(Math.min(h,s,so,b)<0)throw new Error('accepted shovel section markers missing');
    const defsIndex=sourceNodes.indexOf(defs);
    sourceNodes.slice(defsIndex+1,h).forEach(n=>partsScene.appendChild(rewriteTree(n.cloneNode(true),idMap)));
    const sections={handle:[h,s],shaft:[s,so],socket:[so,b],blade:[b,sourceNodes.length]};
    const view=el('g',{id:'partsView'});partsScene.appendChild(view);
    Object.entries(sections).forEach(([name,section])=>{
      const root=el('g',{class:'piece','data-piece':name,id:`piece-${name}`});
      const art=el('g',{id:`contour-art-${name}`,'aria-hidden':'true'});appendSection(art,sourceNodes,section[0],section[1],idMap);runtimeDefs.appendChild(art);
      const p=profiles[name],w=(p.maxX-p.minX)/p.strips,surfaces=[];
      for(let i=0;i<p.strips;i++){
        const x0=p.minX+i*w,x1=p.minX+(i+1)*w,xc=(x0+x1)/2;
        const clip=el('clipPath',{id:`contour-clip-${name}-${i}`,clipPathUnits:'userSpaceOnUse'});
        clip.appendChild(el('rect',{x:(x0-.08).toFixed(3),y:p.minY,width:(w+.16).toFixed(3),height:p.maxY-p.minY}));runtimeDefs.appendChild(clip);
        for(const side of [1,-1]){
          const sample=profileSample(name,xc,side),use=el('use',{
            href:`#contour-art-${name}`,
            'clip-path':`url(#contour-clip-${name}-${i})`,
            'data-surface-side':side>0?'front':'back',
            'data-strip':i
          });
          // Same material/albedo on both sides. Lighting is orientation-derived at runtime.
          surfaces.push({node:use,x:xc,z:sample.z,dz:sample.dz,side,index:i});root.appendChild(use);
        }
      }
      const hit=el('g',{'data-layer-kind':'hit'});hit.insertAdjacentHTML('beforeend',hitMarkup[name]);
      root.__surfaces=surfaces;root.__hit=hit;view.appendChild(root);
    });
  }
  buildPieces();

