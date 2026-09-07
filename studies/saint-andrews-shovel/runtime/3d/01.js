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
