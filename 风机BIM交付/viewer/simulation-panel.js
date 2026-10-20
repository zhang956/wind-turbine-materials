import * as THREE from 'three';
import {createState,step,angleDelta} from './simulation.mjs?v=r12-replay';
import {createMotion} from './motion.js?v=r12-replay';
export function mountSimulation({scene,root,records,visibility,observe}){
 const $=id=>document.getElementById(id),motion=createMotion(root,records);
 let state=createState(),active=false,last=null,elapsed=0,epoch=0,replayFrame=null;
 const wind={speed:8,direction:270};
 const arrow=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(-15,0,86),12,0x52e1ec,2,1);arrow.visible=false;scene.add(arrow);
 const inputs=[['simSpeed','simSpeedNumber','speed',35],['simDirection','simDirectionNumber','direction',360]];
 function updateWind(){state=step(state,wind,0);for(const [range,number,key] of inputs){$(range).value=wind[key];$(number).value=wind[key];}const a=wind.direction*Math.PI/180;const from=new THREE.Vector3(Math.sin(a),Math.cos(a),0);arrow.position.copy(from.clone().multiplyScalar(17).add(new THREE.Vector3(0,0,86)));arrow.setDirection(from.negate());render();}
 for(const [range,number,key,max] of inputs){for(const id of [range,number])$(id).oninput=()=>{if(replayFrame)return;if($(id).value.trim()==='')return;const n=Number($(id).value);if(!Number.isFinite(n))return;wind[key]=Math.max(0,Math.min(max,n));startIfIdle();updateWind();};$(number).onchange=updateWind;}
 function activate(){
  $('explode').value=0;$('explode').disabled=true;visibility();active=true;arrow.visible=true;observe('whole');
 }
 function startIfIdle(){
  if(active)return;
  activate();state={...state,running:true,status:'启动中'};last=null;
 }
 function render(display=state,displayWind=wind){
  const state=display;
  for(const [id,key] of [['torqueAir','airTorque'],['torqueGenerator','generatorTorque'],['torqueLoss','lossTorque'],['torqueBrake','brakeTorque'],['torqueNet','netTorque']])$(id).textContent=(state[key]/1000).toFixed(1)+' kN·m';
  $('torquePower').textContent=(state.electricPower/1e6).toFixed(3)+' MW';
  $('torqueWind').textContent=state.effectiveWind.toFixed(1)+' m/s';
  $('torqueBalance').textContent=!active?'未开始':!state.running?'已暂停':Math.abs(state.netTorque)<5000?'转矩接近平衡':state.netTorque>0?'净转矩为正 · 加速':'净转矩为负 · 减速';
  $('simToggle').textContent=state.running?'暂停':active?'继续':'开始';
  $('simStatus').textContent=state.running?(state.status==='恢复条件确认中'?`${state.status} ${state.recoveryDelay.toFixed(1)} / 3.0 s`:state.status):active?'已暂停 · 点击继续恢复运动':'调节风况即可启动';
  $('simHeading').textContent=state.heading.toFixed(1)+'°';$('simError').textContent=angleDelta(displayWind.direction,state.heading).toFixed(1)+'°';
  $('simPitch').textContent=`叶片1 ${(state.blade1Pitch??state.pitch).toFixed(1)}° / 叶片2、3 ${state.pitch.toFixed(1)}° / 目标 ${state.targetPitch.toFixed(1)}°`;$('driveLowRpm').textContent=state.rpm.toFixed(2)+' rpm';$('driveHighRpm').textContent=(state.rpm*112.8).toFixed(2)+' rpm';$('simRpm').textContent=state.rpm.toFixed(1)+' / '+state.targetRpm.toFixed(1)+' rpm';
 }
 function reset(){if(replayFrame)return;elapsed=0;epoch++;state=createState();active=false;last=null;wind.speed=8;wind.direction=270;arrow.visible=false;motion.reset();$('explode').disabled=false;visibility();updateWind();}
 $('simReset').onclick=reset;
 $('simToggle').onclick=()=>{
  if(replayFrame)return;
  if(!active)activate();
  state={...state,running:!state.running};last=null;render();
 };
 for(const button of document.querySelectorAll('[data-wind-scenario]'))button.onclick=()=>{if(replayFrame)return;const name=button.dataset.windScenario;wind.speed={low:2,normal:8,shift:10,storm:28}[name];if(name==='shift')wind.direction=0;startIfIdle();updateWind();};
 $('normalStop').onclick=()=>{if(replayFrame)return;startIfIdle();state={...state,normalStop:true};render();};
 $('normalStart').onclick=()=>{if(replayFrame)return;startIfIdle();state={...state,normalStop:false};render();};
 $('simWholeView').onclick=()=>observe('whole');
 $('simYawView').onclick=()=>observe('yaw');$('simPitchView').onclick=()=>observe('pitch');
 $('simControls').disabled=false;updateWind();
 return {
  reset,
  setFaultStop(value){if(replayFrame)return;state={...state,faultStop:Boolean(value)};render();},
  setFault(value){if(!replayFrame)state={...state,fault:value};},
  get isReplaying(){return replayFrame!==null;},
  showReplay(frame){state={...state,running:false};last=null;replayFrame=structuredClone(frame);motion.apply(replayFrame.state);render(replayFrame.state,replayFrame.wind);arrow.visible=false;},
  exitReplay(){replayFrame=null;last=null;if(active)motion.apply(state);else{motion.reset();visibility();}arrow.visible=active;render();},
  refresh(){if(replayFrame)motion.apply(replayFrame.state);else if(active)motion.apply(state);},
  tick(time){if(replayFrame)return;const dt=last===null?0:Math.max(0,(time-last)/1000);last=time;if(active){const stepDt=document.hidden?0:Math.min(dt,.1)*([1,.1,.01].includes(Number($('simTimeScale').value))?Number($('simTimeScale').value):1);if(state.running)elapsed+=stepDt;state=step(state,wind,stepDt);motion.apply(state);render();}},
  getClock:()=>({elapsed,epoch}),getState:()=>({...state}),getWind:()=>({...wind})
 };
}
