import * as THREE from 'three';
import {tiltPoint,TILT} from './shaft-axis.js';
export function mountDrivetrain({scene,root,records,focus}){
 const $=id=>document.getElementById(id),materials=[];
 root.updateWorldMatrix(true,true);
 for(const {object:o} of records){
  const id=o.userData.AssetId;
  const shell=/^GEARBOX\.(STAGE\.|HIGH$|FLANGE\.|BOLTS\.)/.test(id);
  const shaft=id==='DRIVE.SHAFT'||id==='DRIVE.HIGH.SHAFT';
  if(shell||shaft)o.traverse(mesh=>{if(mesh.isMesh)materials.push({mesh,kind:shell?'gearOpacity':'shaftOpacity',opacity:mesh.material.opacity,transparent:mesh.material.transparent,depthWrite:mesh.material.depthWrite})});
  if(shaft){
   const low=id==='DRIVE.SHAFT';
   const marker=new THREE.Mesh(new THREE.BoxGeometry(low?1.2:.7,.035,.035),new THREE.MeshStandardMaterial({color:0xffdf42,emissive:0x554400}));
   marker.name='轴表面旋转标记（观察辅助）';marker.position.copy(tiltPoint([low?-.6:3.95,low?.325:.105,low?80:80.22]));marker.rotation.y=TILT;
   scene.add(marker);o.attach(marker);
  }
 }
 function update(){for(const a of materials){const value=Number($(a.kind).value)/100;const m=a.mesh.material;m.opacity=a.opacity*value;m.transparent=value<1||a.transparent;m.depthWrite=value<1?false:a.depthWrite;m.needsUpdate=true;}for(const id of ['gearOpacity','shaftOpacity'])$(id+'Value').textContent=$(id).value+'%';}
 for(const id of ['gearOpacity','shaftOpacity'])$(id).oninput=update;
 $('driveClose').onclick=()=>{$('gearOpacity').value=22;$('shaftOpacity').value=45;update();focus();};
 $('driveOpaque').onclick=()=>{$('gearOpacity').value=100;$('shaftOpacity').value=100;update();};
 $('driveControls').disabled=false;update();
 return {update};
}
