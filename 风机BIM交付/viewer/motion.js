import * as THREE from 'three';
import {tiltPoint,tiltDirection,SHAFT_AXIS} from './shaft-axis.js';
const radians=THREE.MathUtils.degToRad;
const around=(point,axis,angle)=>new THREE.Matrix4().makeTranslation(...point).multiply(new THREE.Matrix4().makeRotationAxis(axis,angle)).multiply(new THREE.Matrix4().makeTranslation(...point.map(n=>-n)));
export function createMotion(root,records){
 root.updateWorldMatrix(true,true);
 const parts=records.map(r=>({r,world:r.object.matrixWorld.clone(),local:r.object.matrix.clone()}));
 const z=new THREE.Vector3(0,0,1),x=SHAFT_AXIS;
 function apply(state){
  const yaw=around([0,0,78.32],z,radians(270-state.heading));
  const rotor=around([-3.5,0,80],x,radians(state.rotor));
  for(const {r,world} of parts){
   const o=r.object,id=o.userData.AssetId,sys=o.userData.System;
   const fixed=sys.startsWith('01 ')||sys.startsWith('02 ')||['YAW.GEAR','YAW.BEARING','YAW.BOLTS'].includes(id);
   const m=new THREE.Matrix4();
   if(!fixed)m.multiply(yaw);
   const rotating=id.startsWith('ROTOR.')||id.startsWith('PITCH.')||id==='DRIVE.SHAFT'||id.startsWith('DRIVE.ROTOR.');
   if(rotating)m.multiply(rotor);
   if(id==='DRIVE.HIGH.SHAFT'||id==='DRIVE.BRAKE.DISC'||id.startsWith('DRIVE.COUPLING.'))m.multiply(around(tiltPoint([0,0,80.22]).toArray(),x,radians(state.highSpeedRotor||0)));
   if(id==='DRIVE.SHAFT.MARKER')m.multiply(rotor);
   const match=id.match(/^ROTOR\.BLADE\.(\d)$/);
   if(match){const a=(Number(match[1])-1)*2*Math.PI/3;const radial=[0,-Math.sin(a),Math.cos(a)],axis=tiltDirection(radial);m.multiply(around(tiltPoint([-3.5,radial[1],80+radial[2]]).toArray(),axis,radians(Number(match[1])===1?(state.blade1Pitch??state.pitch):state.pitch)));}
   o.parent.updateWorldMatrix(true,false);
   m.multiply(world).premultiply(o.parent.matrixWorld.clone().invert());
   m.decompose(o.position,o.quaternion,o.scale);o.updateMatrix();
  }
  root.updateWorldMatrix(true,true);
 }
 function reset(){for(const {r,local} of parts){local.decompose(r.object.position,r.object.quaternion,r.object.scale);r.object.updateMatrix();}root.updateWorldMatrix(true,true);}
 return {apply,reset};
}
