import * as THREE from 'three';
import {HUB,TILT,tiltPoint} from './shaft-axis.js';
export function mountTiltGuide({scene,controls,camera,simulation,focus}){
 const group=new THREE.Group(),pivot=new THREE.Vector3(0,0,78.32);group.position.copy(pivot);scene.add(group);group.visible=false;
 function line(points,color){const m=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>p.clone().sub(pivot))),new THREE.LineBasicMaterial({color,depthTest:false}));m.renderOrder=10;group.add(m);}
 line([HUB,tiltPoint([7.5,0,80])],0x50e3e8);
 line([HUB,HUB.clone().add(new THREE.Vector3(11,0,0))],0xffcb69);
 const arc=[];for(let i=0;i<=24;i++){const a=-TILT*i/24;arc.push(HUB.clone().add(new THREE.Vector3(5*Math.cos(a),0,5*Math.sin(a))));}line(arc,0xffffff);
 let heading=270;
 const hide=()=>{group.visible=false;document.getElementById('tiltReadout').hidden=true;};
 document.getElementById('tiltView').onclick=()=>{heading=simulation.getState().heading;const a=THREE.MathUtils.degToRad(270-heading);focus(new THREE.Vector3(0,-1,0).applyAxisAngle(new THREE.Vector3(0,0,1),a));group.rotation.z=a;group.visible=true;document.getElementById('tiltReadout').hidden=false;};
 document.getElementById('tiltView').disabled=false;
 controls.addEventListener('start',hide);
 return {hide,group,tick(){if(!group.visible)return;const next=simulation.getState().heading,delta=THREE.MathUtils.degToRad(heading-next);camera.position.sub(pivot).applyAxisAngle(new THREE.Vector3(0,0,1),delta).add(pivot);controls.target.sub(pivot).applyAxisAngle(new THREE.Vector3(0,0,1),delta).add(pivot);heading=next;group.rotation.z=THREE.MathUtils.degToRad(270-next);camera.lookAt(controls.target);}};
}
