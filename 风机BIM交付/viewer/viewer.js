import {mountTelemetry} from './telemetry.js?v=r14';
import {mountReplay} from './replay.js?v=r13-energy';
import {mountTraining} from './training.js?v=r15-training';
import {mountWorkspace} from './workspace.js?v=r12-replay';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mountSimulation} from './simulation-panel.js?v=r12-replay';
import {mountDrivetrain} from './drivetrain.js?v=r10-tilt';
import {mountStorage} from './storage.js?v=r13-energy';
import {mountHealth} from './health.js?v=r12-replay';
import {mountTiltGuide} from './tilt-guide.js?v=r10-tilt';
let simulation=null,storage=null,health=null,tiltGuide=null,training=null,replay=null,telemetry=null;
mountWorkspace();
const $=id=>document.getElementById(id), panel=$('viewport');
let renderer;
try { renderer=new THREE.WebGLRenderer({antialias:true}); }
catch(e){$('status').textContent='浏览器无法创建 WebGL 渲染器';$('error').textContent=String(e);throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.localClippingEnabled=true;renderer.setClearColor(0x101b26);renderer.outputColorSpace=THREE.SRGBColorSpace;panel.appendChild(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.05,1500);camera.up.set(0,0,1);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxDistance=450;
controls.zoomToCursor=true;controls.screenSpacePanning=true;controls.minDistance=.25;
scene.add(new THREE.HemisphereLight(0xe1f0ff,0x42515b,2.5));
for(const [pos,intensity] of [[[-30,-40,100],3],[[20,25,100],2]]){const l=new THREE.DirectionalLight(0xffffff,intensity);l.position.set(...pos);scene.add(l);}
const grid=new THREE.GridHelper(160,32,0x34576c,0x203747);grid.rotation.x=Math.PI/2;grid.position.z=-.04;scene.add(grid);
const plane=new THREE.Plane(new THREE.Vector3(0,-1,0),0), root=new THREE.Group();root.rotation.x=Math.PI/2;scene.add(root);
const towerPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const towerShell=id=>id.startsWith('TOWER.SECTION.')||id.startsWith('TOWER.FLANGE.')||id.startsWith('TOWER.BOLTS.')||id.startsWith('TOWER.DOOR');
const records=[], byId=new Map();let mode='whole',selected=null,metadata=new Map(),isolatedIds=null;
const exterior=id=>id.startsWith('COVER.')||id==='ROTOR.SPINNER';
const tower=d=>d.System.startsWith('01 ')||d.System.startsWith('02 ')||d.System.startsWith('12 ')||d.AssetId==='ELEC.TRANSFORMER';
const offsets={'06 传动链':[0,1.7,0],'07 发电与电气':[1.7,3.2,0],'09 冷却与安全':[0,4.5,0],'11 轮毂与变桨':[-2,0,0],'10 检修设施':[0,0,2]};
function visibility(){storage?.setVisible(mode==='whole'&&!isolatedIds&&!$('system').value);const sys=$('system').value,q=$('search').value.trim().toLowerCase(),expl=+$('explode').value/100;$('explodeValue').textContent=Math.round(expl*100)+'%';
 for(const r of records){const d=r.object.userData,inView=mode==='whole'||(mode==='tower'?(d.System.startsWith('01 ')||d.System.startsWith('02 ')):!tower(d));r.object.visible=inView&&(!isolatedIds||isolatedIds.has(d.AssetId))&&($('cover').checked||!exterior(d.AssetId))&&($('equipmentCover').checked||!d.AssetId.startsWith('ELEC.HOUSING.'))&&(!sys||d.System===sys);r.object.position.copy(r.base);const off=offsets[d.System];if(off)r.object.position.addScaledVector(new THREE.Vector3(...off),expl);}
 const visible=records.filter(r=>(!sys||r.object.userData.System===sys)&&(!q||(r.object.userData.AssetId+' '+r.object.userData.NameCN).toLowerCase().includes(q)));
 $('list').replaceChildren();for(const r of visible){const d=r.object.userData,b=document.createElement('button');b.textContent=d.NameCN;const small=document.createElement('small');small.textContent=d.AssetId;b.append(small);if(selected===r)b.classList.add('active');b.onclick=()=>{select(r);if(!r.object.visible){isolatedIds=null;$('system').value=d.System;if(exterior(d.AssetId))$('cover').checked=true;if(tower(d))setMode('whole');visibility();}focus(r)};$('list').append(b);}$('count').textContent=visible.length;simulation?.refresh();
}
function view(pos,target){const damping=controls.enableDamping;controls.enableDamping=false;controls.update();camera.position.set(...pos);controls.target.set(...target);controls.update();controls.enableDamping=damping;}
function fitObjects(items,direction=new THREE.Vector3(-1,-1.2,.28),padding=1.08){
 root.updateMatrixWorld(true);
 const bounds=new THREE.Box3();for(const r of items)bounds.union(new THREE.Box3().setFromObject(r.object));
 if(bounds.isEmpty())return;
 const center=bounds.getCenter(new THREE.Vector3()),back=direction.clone().normalize(),right=new THREE.Vector3().crossVectors(camera.up,back).normalize(),up=new THREE.Vector3().crossVectors(back,right).normalize();
 const tanV=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),tanH=tanV*camera.aspect;let distance=1;
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
  const delta=new THREE.Vector3(x,y,z).sub(center),depth=delta.dot(back);
  distance=Math.max(distance,depth+Math.max(Math.abs(delta.dot(right))/tanH,Math.abs(delta.dot(up))/tanV)*padding);
 }
 controls.maxDistance=Math.max(450,distance*1.5);
 view(center.clone().addScaledVector(back,distance).toArray(),center.toArray());
}
function setMode(m){tiltGuide?.hide();isolatedIds=null;mode=m;$('nacelle').classList.toggle('active',m==='nacelle');$('whole').classList.toggle('active',m==='whole');$('towerInside').classList.toggle('active',m==='tower');$('towerNavigation').hidden=m!=='tower';grid.visible=m!=='nacelle';visibility();if(m==='whole')fitObjects(records.filter(r=>r.object.visible));else if(m==='tower')towerHeightView();else view([-12,-18,92],[2,0,80.5]);}
function towerHeightView(){const z=+$('towerHeight').value;$('towerHeightValue').textContent=z.toFixed(1)+' m';const distance=8/Math.min(1,camera.aspect);view([-distance*.30,-distance,z+distance*.22],[0,0,z]);}
function openTower(z){$('system').value='';$('search').value='';$('explode').value=0;$('cut').checked=false;$('towerCut').checked=true;if(z!==undefined)$('towerHeight').value=z;clip();setMode('tower');}
$('towerInside').onclick=()=>openTower();
$('towerOverview').onclick=()=>{openTower();fitObjects(records.filter(r=>r.object.visible&&r.object.userData.AssetId.startsWith('TOWER.')),new THREE.Vector3(-.25,-1,.08),1.07);};
$('towerHeight').oninput=towerHeightView;
$('towerBottom').onclick=()=>openTower(2.5);$('towerMiddle').onclick=()=>openTower(25.8);$('towerTop').onclick=()=>openTower(77);
function select(r){if(selected)selected.object.traverse(o=>{if(o.isMesh)o.material.emissive?.setHex(0)});selected=r;const d=r.object.userData,meta=metadata.get(d.AssetId)||{};r.object.traverse(o=>{if(o.isMesh)o.material.emissive?.setHex(0x125267)});const el=$('detail');el.replaceChildren();const h=document.createElement('h3');h.textContent=d.NameCN;el.append(h);const dl=document.createElement('dl');
 const entries=[['构件编号',d.AssetId],['IFC GUID',meta.ifc_guid||'见 ifc_mapping.json'],['所属系统',d.System],['IFC 类型',d.IfcClass],['几何依据',d.Evidence],['世界坐标包络 / 米',(meta.dimensions||[]).map(n=>n.toFixed(3)).join(' × ')+'（非加工尺寸）'],['来源',d.Source],['重建说明',d.Notes],['运行数据','未连接；风况面板为独立教学仿真']];
 for(const [title,value] of entries){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=title;dd.textContent=value;dl.append(dt,dd);}el.append(dl);$('selection').hidden=false;visibility();}
function focus(r){if(r.object.userData.AssetId.startsWith('ELEC.')&&!r.object.userData.AssetId.startsWith('ELEC.HOUSING.')){$('equipmentCover').checked=false;visibility();}if(r.object.userData.System.startsWith('02 ')){$('towerCut').checked=true;clip();}fitObjects([r],new THREE.Vector3(-1,-1.5,.8),1.2);}
$('nacelleClose').onclick=()=>{$('system').value='';$('cover').checked=false;if(mode==='tower')setMode('whole');visibility();fitObjects(records.filter(r=>r.object.visible&&!tower(r.object.userData)),new THREE.Vector3(-1,-1.5,.8),1.15);};
$('baseClose').onclick=()=>{$('system').value='';if(mode!=='whole')setMode('whole');visibility();fitObjects(records.filter(r=>r.object.userData.AssetId.startsWith('SITE.')),new THREE.Vector3(-1,-1.5,.8),1.3);};
$('selection').onclick=()=>{if(!selected)return;const d=selected.object.userData;$('system').value='';if(exterior(d.AssetId))$('cover').checked=true;if(tower(d)&&mode!=='whole')setMode('whole');visibility();focus(selected)};$('nacelle').onclick=()=>setMode('nacelle');$('whole').onclick=()=>setMode('whole');$('side').onclick=()=>mode==='tower'?towerHeightView():view(mode==='whole'?[0,-240,65]:[2,-26,80.5],mode==='whole'?[0,0,65]:[2,0,80.5]);
$('reset').onclick=()=>{storage?.reset();simulation?.reset();$('search').value='';$('system').value='';$('explode').value=0;$('cover').checked=false;$('cut').checked=false;$('towerCut').checked=false;$('equipmentCover').checked=false;clip();setMode('whole')};
for(const id of ['cover','equipmentCover','system','search','explode'])$(id).addEventListener('input',visibility);
function clip(){for(const r of records)r.object.traverse(o=>{if(o.isMesh){const planes=$('cut').checked?[plane]:[];if($('towerCut').checked&&towerShell(r.object.userData.AssetId))planes.push(towerPlane);o.material.clippingPlanes=planes;o.material.needsUpdate=true;}})}$('cut').onchange=clip;$('towerCut').onchange=clip;
function equipmentView(prefix){$('system').value='';$('search').value='';$('explode').value=0;$('cover').checked=false;$('equipmentCover').checked=false;$('cut').checked=false;clip();setMode('nacelle');const items=records.filter(r=>r.object.userData.AssetId.startsWith(prefix)||(prefix==='ELEC.TRANSFORMER.'&&r.object.userData.AssetId==='ELEC.HOUSING.TRANSFORMER'));isolatedIds=new Set(items.map(r=>r.object.userData.AssetId));visibility();fitObjects(items.filter(r=>r.object.visible),new THREE.Vector3(-1,-1.5,.75),1.2);}
$('yawClose').onclick=()=>equipmentView('YAW.');
$('windClose').onclick=()=>equipmentView('SENSOR.');
$('windYaw').onclick=()=>equipmentView('YAW.');
$('converterClose').onclick=()=>{equipmentView('ELEC.');const items=records.filter(r=>/^ELEC\.(CONVERTER|DCLINK|FILTER|PROTECTION|CABINET\.2|HOUSING\.CONVERTER)/.test(r.object.userData.AssetId));isolatedIds=new Set(items.map(r=>r.object.userData.AssetId));visibility();fitObjects(items.filter(r=>r.object.visible),new THREE.Vector3(-.2,-1,.4),1.25);};
$('transformerClose').onclick=()=>equipmentView('ELEC.TRANSFORMER.');
$('switchgearClose').onclick=()=>{openTower(1.7);const r=byId.get('ELEC.MV.SWITCHGEAR');if(r){select(r);focus(r);}};
for(const button of document.querySelectorAll('[data-asset]'))button.onclick=()=>{const r=byId.get(button.dataset.asset);if(!r)return;$('system').value='';$('search').value='';$('explode').value=0;$('cut').checked=false;clip();if(r.object.userData.System.startsWith('02 '))openTower(1.7);else setMode('nacelle');select(r);focus(r);};
const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();let down;
function pick(e){const b=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);ray.setFromCamera(mouse,camera);const hits=ray.intersectObject(root,true);for(const hit of hits){let n=hit.object,visible=true,record;while(n){if(!n.visible)visible=false;if(n.userData.AssetId)record=byId.get(n.userData.AssetId);n=n.parent;}const planes=hit.object.material?.clippingPlanes||[];if(visible&&record&&planes.every(p=>p.distanceToPoint(hit.point)>=0))return record;}return null;}
renderer.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const record=pick(e);if(record)select(record);});
renderer.domElement.addEventListener('dblclick',e=>{const record=pick(e);if(record){select(record);focus(record);}});
function resize(){renderer.setSize(panel.clientWidth,panel.clientHeight);camera.aspect=panel.clientWidth/panel.clientHeight;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(panel);
try{
 const embedded=window.BIM_EMBEDDED;
 const model=embedded?new GLTFLoader().parseAsync(Uint8Array.from(atob(embedded.glb),c=>c.charCodeAt(0)).buffer,''):new GLTFLoader().loadAsync('../models/V90_reconstruction.glb?v=R10-tilt');
 const [gltf,meta]=await Promise.all([model,embedded?embedded.metadata:fetch('../data/components.json?v=R10-tilt').then(r=>{if(!r.ok)throw Error('构件数据加载失败');return r.json()})]);
 metadata=new Map(meta.components.map(c=>[c.id,c]));root.add(gltf.scene);gltf.scene.traverse(o=>{if(o.userData.AssetId){const r={object:o,base:o.position.clone()};records.push(r);byId.set(o.userData.AssetId,r);}if(o.isMesh){o.material=o.material.clone();o.material.side=THREE.DoubleSide;}});
 mountDrivetrain({scene,root,records,focus(){
 $('system').value='';$('search').value='';$('explode').value=0;$('cut').checked=false;clip();setMode('nacelle');
 const items=records.filter(r=>r.object.userData.System.startsWith('06 '));isolatedIds=new Set(items.map(r=>r.object.userData.AssetId));visibility();fitObjects(items,new THREE.Vector3(-.25,-1,.65),1.25);
 }});
 simulation=mountSimulation({scene,root,records,visibility,observe(kind){
 $('system').value='';$('search').value='';$('cut').checked=false;$('cover').checked=false;clip();setMode(kind==='yaw'?'nacelle':'whole');
 if(kind==='whole')return;
 const items=records.filter(r=>kind==='yaw'?!tower(r.object.userData):/^(ROTOR\.|PITCH\.)/.test(r.object.userData.AssetId));
 isolatedIds=new Set(items.map(r=>r.object.userData.AssetId));visibility();
 fitObjects(items.filter(r=>r.object.visible&&(kind==='yaw'||r.object.userData.AssetId.startsWith('PITCH.'))),new THREE.Vector3(-1,-1,.65),kind==='yaw'?1.25:1.8);
 }});
 tiltGuide=mountTiltGuide({scene,controls,camera,simulation,focus(direction){$('system').value='';$('search').value='';$('cut').checked=false;$('explode').value=0;clip();setMode('nacelle');const items=records.filter(r=>/^(DRIVE\.|GEARBOX\.|GENERATOR\.|ROTOR.HUB)/.test(r.object.userData.AssetId));isolatedIds=new Set(items.map(r=>r.object.userData.AssetId));visibility();fitObjects(items,direction,1.35);}});
 storage=mountStorage({scene,simulation,focus(group){$('system').value='';$('search').value='';setMode('whole');fitObjects([{object:group}],new THREE.Vector3(-.3,-1,.6),1.25);}});
 telemetry=mountTelemetry({locate(asset){const r=byId.get(asset);if(r){$('cut').checked=false;clip();setMode('nacelle');select(r);focus(r);}}});
 health=mountHealth({records,viewport:panel,camera,simulation,locate(asset){$('system').value='';$('search').value='';$('cut').checked=false;$('cover').checked=false;clip();setMode('nacelle');const r=byId.get(asset);if(r){select(r);focus(r);}}});
 training=mountTraining({simulation,health,records,scene});
 replay=mountReplay({simulation,training,storage});
 for(const sys of [...new Set(records.map(r=>r.object.userData.System))].sort()){const o=document.createElement('option');o.value=sys;o.textContent=sys;$('system').append(o);}resize();setMode('whole');$('status').textContent=`${records.length} 个构件 · 点击部件查看来源与重建精度`;window.BIM_VIEWER={scene,root,records,renderer,camera,controls,simulation,storage,health,tiltGuide,training,replay,telemetry};
}catch(e){$('status').textContent='模型加载失败';$('error').textContent=(window.BIM_EMBEDDED?'内嵌模型解析失败，请使用支持 WebGL 的现代浏览器。\n':'请通过本地 HTTP 服务打开本页面。\n')+String(e);}
$('lowQuality').onchange=()=>{renderer.setPixelRatio($('lowQuality').checked?1:Math.min(devicePixelRatio,2));resize();};
renderer.setAnimationLoop(time=>{simulation?.tick(time);storage?.tick();training?.tick();replay?.tick(time);controls.update();tiltGuide?.tick();health?.tick();if(!document.hidden)renderer.render(scene,camera)});
