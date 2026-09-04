import * as THREE from 'three';

const BUILD = 'noodle-controller-v1';
const ARENA_SEED = new URLSearchParams(location.search).get('seed') || 'controller-proof';
const GRID_MIN = -40, GRID_MAX = 40, GRID_STEP = 4, BOX_COUNT = 28;
const FLOOR_SIZE = 96, SAFE_ROUTE_CLEARANCE = 6;
const SPAWN = Object.freeze([0, 0, -38]);
const PLAYER = Object.freeze({ radius: .36, height: 1.72, eye: 1.58, step: .62 });
const MOVE = Object.freeze({ groundSpeed: 9.1, airSpeed: 8.2, groundAccel: 48, airAccel: 17, friction: 11, jump: 5.9, gravity: 15.8 });

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const shell = document.getElementById('gameShell');
const moveZone = document.getElementById('moveZone');
const moveBase = document.getElementById('moveBase');
const moveKnob = document.getElementById('moveKnob');
const lookZone = document.getElementById('lookZone');
const jumpButton = document.getElementById('jumpButton');
const fullscreenButton = document.getElementById('fullscreenButton');
const controlsToggle = document.getElementById('controlsToggle');
const accessibleMovement = document.getElementById('accessibleMovement');

function hashSeed(value) {
  const text = String(value); let hash = 2166136261;
  for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}
function rngFor(seed) {
  let state = hashSeed(seed);
  return () => { let t = state += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function pointToBoxDistanceXZ(point, center, size) {
  const dx = Math.max(0, Math.abs(point[0] - center[0]) - size[0] * .5);
  const dz = Math.max(0, Math.abs(point[2] - center[2]) - size[2] * .5);
  return Math.hypot(dx, dz);
}
function generateArena(seed) {
  const rng = rngFor(seed); const boxes = []; const occupied = new Set(); let attempts = 0;
  const range = (a,b) => a + rng() * (b-a);
  while (boxes.length < BOX_COUNT && attempts++ < 4096) {
    const x = GRID_MIN + GRID_STEP * Math.floor(rng() * ((GRID_MAX-GRID_MIN)/GRID_STEP+1));
    const z = GRID_MIN + GRID_STEP * Math.floor(rng() * ((GRID_MAX-GRID_MIN)/GRID_STEP+1));
    const key = `${x},${z}`; if (occupied.has(key)) continue;
    const size = [range(1.35,3.2), range(.8,5), range(1.35,3.2)];
    const center = [x, size[1]*.5, z];
    if (pointToBoxDistanceXZ([SPAWN[0],0,SPAWN[2]], center, size) < SAFE_ROUTE_CLEARANCE) continue;
    if (pointToBoxDistanceXZ([0,0,38], center, size) < SAFE_ROUTE_CLEARANCE) continue;
    occupied.add(key);
    boxes.push({ id:`noodle-${boxes.length}`, cell:[x,z], center, size, genotype: Math.floor(rng()*16) });
  }
  if (boxes.length !== BOX_COUNT) throw new Error('arena generation exhausted');
  return Object.freeze({ seed, numericSeed:hashSeed(seed), floor:{center:[0,-.25,0],size:[FLOOR_SIZE,.5,FLOOR_SIZE]}, boxes });
}

function compileNoodleBox(box) {
  const [w,h,d] = box.size; const x=w*.5, y=h*.5, z=d*.5;
  const c = Math.min(x,y) * (.11 + ((box.genotype>>3)&1)*.025);
  const contour = [
    [-x+c,-y],[x-c,-y],[x,-y+c],[x,y-c],[x-c,y],[-x+c,y],[-x,y-c],[-x,-y+c]
  ];
  const vertices=[]; const indices=[];
  const add = p => { vertices.push(p[0],p[1],p[2]); return vertices.length/3-1; };
  const front = contour.map(([px,py])=>add([px,py,z]));
  const back = contour.map(([px,py])=>add([px,py,-z]));
  for(let i=1;i<contour.length-1;i++) indices.push(front[0],front[i],front[i+1]);
  for(let i=1;i<contour.length-1;i++) indices.push(back[0],back[i+1],back[i]);
  for(let i=0;i<contour.length;i++) { const n=(i+1)%contour.length; indices.push(front[i],back[i],back[n], front[i],back[n],front[n]); }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3)); geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingBox();
  geometry.userData.noodle = Object.freeze({ contour: contour.map(p=>Object.freeze([...p])), depth:Object.freeze([-z,z]), genotype:box.genotype, sourceSize:Object.freeze([...box.size]) });
  return geometry;
}

const arena = generateArena(ARENA_SEED);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x060809); scene.fog = new THREE.Fog(0x060809,28,82);
const camera = new THREE.PerspectiveCamera(77,1,.05,140); camera.rotation.order='YXZ';
const renderer = new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'}); renderer.setPixelRatio(Math.min(devicePixelRatio||1,2)); renderer.outputColorSpace=THREE.SRGBColorSpace;
scene.add(new THREE.HemisphereLight(0xb7faff,0x101316,1.5));
const sun = new THREE.DirectionalLight(0xffffff,1.7); sun.position.set(12,20,-8); scene.add(sun);

const floorMat = new THREE.MeshStandardMaterial({color:0x0c1114,roughness:.93,metalness:.04});
const floorGeo = new THREE.PlaneGeometry(FLOOR_SIZE,FLOOR_SIZE); floorGeo.rotateX(-Math.PI/2); const floor = new THREE.Mesh(floorGeo,floorMat); scene.add(floor);
const grid = new THREE.GridHelper(FLOOR_SIZE,FLOOR_SIZE/GRID_STEP,0x9cefff,0x23464c); grid.position.y=.012; scene.add(grid);

const palette=[0x6c7476,0x7b4e3d,0x685f48,0x4a565b];
for (const box of arena.boxes) {
  const geometry=compileNoodleBox(box);
  const material=new THREE.MeshStandardMaterial({color:palette[box.genotype%palette.length],roughness:.84,metalness:.06,flatShading:true});
  const mesh=new THREE.Mesh(geometry,material); mesh.position.set(...box.center); mesh.name=box.id; mesh.userData.box=box; scene.add(mesh);
  const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geometry,15),new THREE.LineBasicMaterial({color:0xa9f6ff,transparent:true,opacity:.28})); mesh.add(edges);
}

const exitRing = new THREE.Mesh(new THREE.RingGeometry(1.6,2.1,32),new THREE.MeshBasicMaterial({color:0xa4ffca,side:THREE.DoubleSide,transparent:true,opacity:.8})); exitRing.rotation.x=-Math.PI/2; exitRing.position.set(0,.025,38); scene.add(exitRing);

const input={forward:0,back:0,left:0,right:0,moveX:0,moveY:0,lookX:0,lookY:0,jumpQueued:false};
const player={x:SPAWN[0],feetY:SPAWN[1],z:SPAWN[2],vx:0,vy:0,vz:0,yaw:0,pitch:0,grounded:true};
const keys=new Set();
const keyMap={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
window.addEventListener('keydown',e=>{ if(keyMap[e.code]){keys.add(keyMap[e.code]);e.preventDefault();} if(e.code==='Space'){input.jumpQueued=true;e.preventDefault();} });
window.addEventListener('keyup',e=>{if(keyMap[e.code])keys.delete(keyMap[e.code]);});
canvas.addEventListener('click',()=>{ if(matchMedia('(pointer:fine)').matches) canvas.requestPointerLock?.(); });
document.addEventListener('mousemove',e=>{ if(document.pointerLockElement===canvas){ input.lookX+=e.movementX; input.lookY+=e.movementY; } });

let movePointer=null, moveOrigin=[0,0];
function clearMoveStick(){movePointer=null;input.moveX=0;input.moveY=0;moveBase.style.display='none';moveKnob.style.transform='translate(0,0)';}
moveZone.addEventListener('pointerdown',e=>{if(movePointer!==null)return;movePointer=e.pointerId;moveZone.setPointerCapture(e.pointerId);moveOrigin=[e.clientX,e.clientY];moveBase.style.left=`${e.clientX}px`;moveBase.style.top=`${e.clientY}px`;moveBase.style.display='block';});
moveZone.addEventListener('pointermove',e=>{if(e.pointerId!==movePointer)return;const dx=e.clientX-moveOrigin[0],dy=e.clientY-moveOrigin[1],r=54,len=Math.hypot(dx,dy)||1,s=Math.min(1,r/len);const x=dx*s,y=dy*s;moveKnob.style.transform=`translate(${x}px,${y}px)`;input.moveX=x/r;input.moveY=-y/r;});
for(const type of ['pointerup','pointercancel','lostpointercapture'])moveZone.addEventListener(type,e=>{if(e.pointerId===movePointer)clearMoveStick();});
let lookPointer=null,lookLast=[0,0];
lookZone.addEventListener('pointerdown',e=>{if(lookPointer!==null)return;lookPointer=e.pointerId;lookZone.setPointerCapture(e.pointerId);lookLast=[e.clientX,e.clientY];});
lookZone.addEventListener('pointermove',e=>{if(e.pointerId!==lookPointer)return;input.lookX+=e.clientX-lookLast[0];input.lookY+=e.clientY-lookLast[1];lookLast=[e.clientX,e.clientY];});
for(const type of ['pointerup','pointercancel','lostpointercapture'])lookZone.addEventListener(type,e=>{if(e.pointerId===lookPointer)lookPointer=null;});
for(const type of ['pointerdown','keydown']) jumpButton.addEventListener(type,e=>{input.jumpQueued=true;e.preventDefault();});

const discrete=new Set();
for(const button of accessibleMovement.querySelectorAll('[data-move]')){
  const dir=button.dataset.move;
  button.addEventListener('pointerdown',e=>{button.setPointerCapture(e.pointerId);discrete.add(dir);button.classList.add('pressed');e.preventDefault();});
  const off=()=>{discrete.delete(dir);button.classList.remove('pressed');}; button.addEventListener('pointerup',off);button.addEventListener('pointercancel',off);button.addEventListener('lostpointercapture',off);
  button.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='Enter'){discrete.add(dir);button.classList.add('pressed');e.preventDefault();}});button.addEventListener('keyup',off);button.addEventListener('blur',off);
}
controlsToggle.addEventListener('click',()=>{const open=!accessibleMovement.classList.contains('open');accessibleMovement.classList.toggle('open',open);controlsToggle.setAttribute('aria-expanded',String(open));});

async function toggleFullscreen(){try{if(!document.fullscreenElement)await shell.requestFullscreen?.({navigationUI:'hide'});else await document.exitFullscreen?.();}catch{} syncFullscreen();}
function syncFullscreen(){const full=!!document.fullscreenElement;fullscreenButton.textContent=full?'EXIT':'FULL';fullscreenButton.setAttribute('aria-label',full?'Exit fullscreen':'Enter fullscreen');resize();}
fullscreenButton.addEventListener('click',toggleFullscreen);document.addEventListener('fullscreenchange',syncFullscreen);

function resetInput(){keys.clear();discrete.clear();clearMoveStick();lookPointer=null;input.lookX=input.lookY=0;input.jumpQueued=false;}
window.addEventListener('blur',resetInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)resetInput();});

function resize(){const vv=visualViewport;const w=Math.max(1,Math.floor(vv?.width||innerWidth)),h=Math.max(1,Math.floor(vv?.height||innerHeight));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
addEventListener('resize',resize);visualViewport?.addEventListener('resize',resize);resize();

function verticalOverlap(box,feetY){const top=feetY+PLAYER.height,bottom=feetY;const bMin=box.center[1]-box.size[1]*.5,bMax=box.center[1]+box.size[1]*.5;return top>bMin+.02&&bottom<bMax-.02;}
function overlapsXZ(box,x,z,r=PLAYER.radius){return Math.abs(x-box.center[0]) < box.size[0]*.5+r && Math.abs(z-box.center[2]) < box.size[2]*.5+r;}
function supportTopAt(x,z,maxTop=Infinity){let top=0;for(const b of arena.boxes){const bTop=b.center[1]+b.size[1]*.5;if(bTop>maxTop+.08)continue;if(Math.abs(x-b.center[0])<=b.size[0]*.5-PLAYER.radius*.35&&Math.abs(z-b.center[2])<=b.size[2]*.5-PLAYER.radius*.35&&bTop>top)top=bTop;}return top;}
function blocked(x,z,feetY){for(const b of arena.boxes){if(overlapsXZ(b,x,z)&&verticalOverlap(b,feetY))return b;}return null;}
function moveHorizontal(dx,dz){
  const tryAxis=(axis,delta)=>{if(!delta)return;const nx=axis==='x'?player.x+delta:player.x,nz=axis==='z'?player.z+delta:player.z+0;const tx=axis==='z'?player.x:nx,tz=axis==='z'?player.z+delta:nz;const hit=blocked(tx,tz,player.feetY);if(!hit){player.x=tx;player.z=tz;return;}const top=hit.center[1]+hit.size[1]*.5;const rise=top-player.feetY;if(player.grounded&&rise>0&&rise<=PLAYER.step){player.feetY=top;player.x=tx;player.z=tz;}};
  tryAxis('x',dx);tryAxis('z',dz);
  const bound=FLOOR_SIZE*.5-PLAYER.radius;player.x=Math.max(-bound,Math.min(bound,player.x));player.z=Math.max(-bound,Math.min(bound,player.z));
}
function approach(current,target,maxDelta){return current<target?Math.min(target,current+maxDelta):Math.max(target,current-maxDelta);}
function updatePlayer(dt){
  const forward=(keys.has('forward')||discrete.has('forward')?1:0)-(keys.has('back')||discrete.has('back')?1:0)+input.moveY;
  const strafe=(keys.has('right')||discrete.has('right')?1:0)-(keys.has('left')||discrete.has('left')?1:0)+input.moveX;
  const len=Math.hypot(forward,strafe),scale=len>1?1/len:1;const f=forward*scale,s=strafe*scale;
  player.yaw-=input.lookX*.00265;player.pitch-=input.lookY*.0023;player.pitch=Math.max(-1.48,Math.min(1.48,player.pitch));input.lookX=input.lookY=0;
  const sy=Math.sin(player.yaw),cy=Math.cos(player.yaw);const wishX=(s*cy-f*sy),wishZ=(-s*sy-f*cy);const speed=player.grounded?MOVE.groundSpeed:MOVE.airSpeed;
  if(player.grounded&&len<.02){const damp=Math.max(0,1-MOVE.friction*dt);player.vx*=damp;player.vz*=damp;}
  const accel=(player.grounded?MOVE.groundAccel:MOVE.airAccel)*dt;player.vx=approach(player.vx,wishX*speed,accel);player.vz=approach(player.vz,wishZ*speed,accel);
  if(input.jumpQueued&&player.grounded){player.vy=MOVE.jump;player.grounded=false;}input.jumpQueued=false;
  const oldFeet=player.feetY;if(!player.grounded)player.vy-=MOVE.gravity*dt;moveHorizontal(player.vx*dt,player.vz*dt);player.feetY+=player.vy*dt;
  const support=supportTopAt(player.x,player.z,Math.max(oldFeet,player.feetY)+.15);
  if(player.vy<=0&&player.feetY<=support+.06&&oldFeet>=support-.18){player.feetY=support;player.vy=0;player.grounded=true;}else if(player.grounded&&Math.abs(player.feetY-support)>.08){player.grounded=false;}
  if(player.feetY<0){player.feetY=0;player.vy=0;player.grounded=true;}
  camera.position.set(player.x,player.feetY+PLAYER.eye,player.z);camera.rotation.y=player.yaw;camera.rotation.x=player.pitch;
}

const clock=new THREE.Clock();let frames=0,lastHud=0;
function frame(){requestAnimationFrame(frame);const dt=Math.min(.033,clock.getDelta());updatePlayer(dt);renderer.render(scene,camera);frames++;const now=performance.now();if(now-lastHud>600){status.textContent=`${arena.seed} · ${arena.boxes.length} noodle boxes · ${player.grounded?'grounded':'air'}`;lastHud=now;}}
status.textContent=`ready · seed ${arena.seed}`;window.__noodleController={build:BUILD,arena,player,grid,compileNoodleBox,hashSeed};frame();
