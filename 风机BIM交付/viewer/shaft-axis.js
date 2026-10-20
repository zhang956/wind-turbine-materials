import * as THREE from 'three';
export const TILT=THREE.MathUtils.degToRad(6);
export const HUB=new THREE.Vector3(-3.5,0,80);
const rotation=new THREE.Matrix4().makeRotationY(TILT);
export const tiltPoint=p=>new THREE.Vector3(...p).sub(HUB).applyMatrix4(rotation).add(HUB);
export const tiltDirection=p=>new THREE.Vector3(...p).transformDirection(rotation);
export const SHAFT_AXIS=tiltDirection([1,0,0]);
