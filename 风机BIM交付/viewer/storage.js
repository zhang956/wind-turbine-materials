import {DEFAULT_STORAGE,createEnergy,stepEnergy,validateStorage} from './storage-energy.mjs';
import * as THREE from 'three';

// Optional web-only equipment. All geometry and placement are illustrative.
export function buildStorage(){
 const group=new THREE.Group();group.name='配套储能扩展示意';
 function box(name,size,pos,color){
  const m=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshStandardMaterial({color,roughness:.7}));
  m.name=name;m.position.set(...pos);group.add(m);return m;
 }
 box('储能设备基座',[23,7,.25],[23,-12,.125],0x465768);
 const shell=box('电池舱',[6,3,2.8],[30,-12,1.7],0xcad9de);
 for(let i=0;i<8;i++){
  const x=27.65+(i%4)*1.55,y=-12.8+Math.floor(i/4)*1.6;
  box('电池簇 '+(i+1),[1.05,.7,2.15],[x,y,1.55],0x244f5a);
  for(let j=0;j<6;j++)box('电池模块示意',[.9,.73,.23],[x,y,.6+j*.32],0x4aa59d);
 }
 for(let i=0;i<2;i++){
  box('舱门',[1.25,.04,2.35],[28.35+i*1.4,-13.52,1.6],0xa0b4c0);
  box('舱门把手',[.06,.1,.4],[28.8+i*1.4,-13.58,1.6],0x263b47);
 }
 box('温控设备',[.85,.35,1.35],[32,-13.65,1.5],0x8199a8);
 box('储能PCS',[2,2,2.5],[23,-12,1.5],0x218c9d);
 for(let i=0;i<7;i++)box('PCS散热格栅',[1.55,.04,.06],[23,-13.03,.8+i*.18],0x183748);
 box('PCS面板',[.6,.06,.35],[23,-13.04,2.3],0x73d8e5);
 box('储能变压器',[3,2.6,2.5],[17,-12,1.5],0xd6aa63);
 for(let i=0;i<9;i++)box('变压器散热片',[.12,.3,1.6],[15.8+i*.3,-13.4,1.3],0x9f763e);
 const interfaceBox=box('交流集电接口',[.8,1.1,1.5],[10,-12,.75],0x657d90);
 interfaceBox.userData.notes='交流接入点示意，非新增实际开关站';
 const points=[[10.5,-12,.8],[15.4,-12,.8],[18.6,-12,.8],[21.9,-12,.8],[24.1,-12,.8],[26.9,-12,.8]];
 const arrows=[],segments=[];
 for(let i=0;i<points.length;i+=2){
  const a=new THREE.Vector3(...points[i]),b=new THREE.Vector3(...points[i+1]),dir=b.clone().sub(a).normalize();
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([a,b]),new THREE.LineBasicMaterial({color:0x7195a8}));group.add(line);
  const arrow=new THREE.ArrowHelper(dir,a.clone().lerp(b,.25),1.4,0x53e3c1,.4,.23);group.add(arrow);arrows.push(arrow);segments.push({a,b,dir});
 }
 group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([[0,-3,.35],[0,-12,.35],[10,-12,.35]].map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color:0xc7a866})));
 let mode='idle',phase=0;
 function update(){arrows.forEach((a,i)=>{const s=segments[i],charge=mode==='charge';a.visible=mode!=='idle';a.setDirection(s.dir.clone().multiplyScalar(charge?1:-1));a.setColor(charge?0x53e3c1:0xffc86c);a.position.copy(s.a).lerp(s.b,charge?.1+phase*.45:.9-phase*.45);});}
 function setMode(value){mode=['charge','discharge'].includes(value)?value:'idle';phase=0;update();}
 function tick(dt){if(mode==='idle')return;phase=(phase+Math.max(0,Math.min(dt,.1))*.6)%1;update();}
 function transparent(on){shell.material.opacity=on?.18:1;shell.material.transparent=on;shell.material.depthWrite=!on;}
 setMode('idle');return {group,arrows,setMode,tick,transparent};
}
function addLabel(group,text,x,y,z){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 ctx.fillStyle='rgba(16,27,38,.9)';ctx.fillRect(0,0,512,96);ctx.fillStyle='#e1f3fc';ctx.font='bold 34px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,60);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));sprite.position.set(x,y,z);sprite.scale.set(6,1.125,1);group.add(sprite);
}
export function mountStorage({scene,focus,simulation={getClock:()=>({elapsed:0,epoch:0}),getState:()=>({electricPower:0}),isReplaying:false}}){
 const $=id=>document.getElementById(id),model=buildStorage();scene.add(model.group);
 if(document.createElement)for(const [text,x,z] of [['交流集电接口',10,2.7],['储能变压器',17,4],['储能 PCS',23,4],['电池舱 · 教学配置',30,4.6]])addLabel(model.group,text,x,-12,z);
 let config={...DEFAULT_STORAGE},energy=createEnergy(config),mode='idle',requestMW=.3,targetMW=1,last=simulation.getClock(),onRecord=null,arrowMode='idle';
 const fields={storageCapacity:'capacityMWh',storageRated:'maxMW',storageMin:'minSoc',storageMax:'maxSoc',storageInitial:'initialSoc'};
 function snapshot(){return structuredClone({config,energy,mode,requestMW,targetMW});}
 function setArrows(value){if(value!==arrowMode){arrowMode=value;model.setMode(value);}}
 function render(value=snapshot(),historical=false){
  const e=value.energy;
  $('storageStatus').textContent=`${historical?'历史快照':'教学仿真'} · 请求${{idle:'待机',charge:'充电',discharge:'放电',auto:'自动平滑'}[value.mode]} · ${e.status}`;
  for(const [id,key,digits,unit] of [['storageSoc','soc',3,'%'],['storageEnergy','energyMWh',6,'MWh'],['storageWind','windMW',4,'MW'],['storageCharge','chargeMW',4,'MW'],['storageDischarge','dischargeMW',4,'MW'],['storageGrid','gridMW',4,'MW'],['storageLoss','lossMW',5,'MW'],['storageCharged','chargedMWh',6,'MWh'],['storageDischarged','dischargedMWh',6,'MWh'],['storageLossTotal','lossMWh',6,'MWh']])$(id).textContent=e[key].toFixed(digits)+' '+unit;
  setArrows(e.chargeMW>1e-9?'charge':e.dischargeMW>1e-9?'discharge':'idle');
 }
 function syncInputs(){for(const [id,key] of Object.entries(fields))$(id).value=config[key];$('storageEfficiency').value=config.efficiency*100;$('storageRequest').value=requestMW;$('storageTarget').value=targetMW;$('storageMode').value=mode;}
 function read(id){if(!$(id).value.trim())throw Error('请填写所有参数。');const n=Number($(id).value);if(!Number.isFinite(n))throw Error('参数必须为有限数值。');return n;}
 $('storageApply').onclick=()=>{
  if(simulation.isReplaying)return;
  try{const next={};for(const [id,key] of Object.entries(fields))next[key]=read(id);next.efficiency=read('storageEfficiency')/100;config=validateStorage(next);reset();$('storageError').textContent='已应用参数并重置储能；历史回放保留原配置。';onRecord?.();}catch(error){$('storageError').textContent=error.message;}
 };
 $('storageMode').onchange=()=>{if(simulation.isReplaying)return;const next=$('storageMode').value;mode=['idle','charge','discharge','auto'].includes(next)?next:'idle';render();onRecord?.();};
 for(const id of ['storageRequest','storageTarget'])$(id).onchange=()=>{
  if(simulation.isReplaying)return;
  try{const n=read(id);if(n<0||n>20)throw Error('功率设置范围为0–20 MW。');if(id==='storageRequest')requestMW=n;else targetMW=n;$('storageError').textContent='';onRecord?.();}catch(error){$('storageError').textContent=error.message;syncInputs();}
 };
 $('storageFocus').onclick=()=>focus(model.group);
 $('storageTransparent').onchange=()=>model.transparent($('storageTransparent').checked);
 $('storageControls').disabled=false;
 function reset(){energy=createEnergy(config);mode='idle';last=simulation.getClock();$('storageTransparent').checked=false;model.transparent(false);syncInputs();render();}
 reset();
 return {group:model.group,arrows:model.arrows,getSnapshot:snapshot,setRecorder(fn){onRecord=fn;},showReplay(frame){render(frame,true);},exitReplay(){render();},setVisible(value){model.group.visible=value;},reset,tick(){
  if(simulation.isReplaying)return;
  const clock=simulation.getClock();if(clock.epoch!==last.epoch){reset();return;}
  const dt=Math.max(0,clock.elapsed-last.elapsed);last=clock;
  energy=stepEnergy(energy,config,{mode,requestMW,targetMW,windMW:simulation.getState().electricPower/1e6},dt);
  render();if(model.group.visible&&dt>0)model.tick(dt);
 }};
}
