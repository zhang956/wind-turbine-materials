import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from '../viewer/vendor/loaders/GLTFLoader.js';
import {createMotion} from '../viewer/motion.js';
import {tiltPoint} from '../viewer/shaft-axis.js';
import {createState} from '../viewer/simulation.mjs';
const raw=fs.readFileSync('风机BIM交付/models/V90_reconstruction.glb');
const gltf=await new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'');
const scene=new THREE.Scene(),root=new THREE.Group();root.rotation.x=Math.PI/2;scene.add(root);root.add(gltf.scene);
const records=[];gltf.scene.traverse(object=>{if(object.userData.AssetId)records.push({object})});root.updateWorldMatrix(true,true);
const byId=new Map(records.map(r=>[r.object.userData.AssetId,r.object]));
const baseline=new Map(records.map(r=>[r.object.userData.AssetId,r.object.matrixWorld.clone()]));
const motion=createMotion(root,records);
const equal=(a,b)=>assert.ok(a.elements.every((n,i)=>Math.abs(n-b.elements[i])<1e-7));
motion.apply({...createState(),heading:0});
for(const id of ['SITE.FOUNDATION','TOWER.SECTION.1','YAW.GEAR'])equal(byId.get(id).matrixWorld,baseline.get(id));
const sensor=byId.get('SENSOR.WIND');const before=new THREE.Vector3().setFromMatrixPosition(baseline.get('SENSOR.WIND'));const expected=before.clone().applyAxisAngle(new THREE.Vector3(0,0,1),-Math.PI/2);assert.ok(sensor.getWorldPosition(new THREE.Vector3()).distanceTo(expected)<1e-7);
for(let i=1;i<=3;i++){
 const blade=byId.get('ROTOR.BLADE.'+i),a=(i-1)*2*Math.PI/3;
 const pivot=tiltPoint([-3.5,-Math.sin(a),80+Math.cos(a)]);
 const local=pivot.clone().applyMatrix4(baseline.get('ROTOR.BLADE.'+i).clone().invert());
 motion.apply({...createState(),pitch:70});assert.ok(local.clone().applyMatrix4(blade.matrixWorld).distanceTo(pivot)<1e-7);
}
for(let i=0;i<100;i++){motion.apply({...createState(),pitch:i%90,heading:i*3.6,rotor:i*7});motion.reset();}
for(const r of records)equal(r.object.matrixWorld,baseline.get(r.object.userData.AssetId));
assert.equal(records.length,447);
console.log('PASS: actual 447-part GLB; fixed tower, correct yaw, all three pitch pivots, 100 resets without drift');
// DOM adapter integration: real panel callbacks and real Three.js objects, without WebGL.
const {mountSimulation}=await import('../viewer/simulation-panel.js');
const elements=new Map();
const element=id=>{if(!elements.has(id))elements.set(id,{value:'0',disabled:false,textContent:'',dataset:{}});return elements.get(id)};
const scenarios=['low','normal','shift','storm'].map(name=>({dataset:{windScenario:name}}));
globalThis.document={hidden:false,getElementById:element,querySelectorAll:()=>scenarios};
let panel,observed='';
panel=mountSimulation({scene,root,records,visibility(){panel?.refresh()},observe(kind){observed=kind}});
assert.equal(element('simControls').disabled,false);
element('simToggle').onclick();assert.equal(element('explode').disabled,true);
scenarios[3].onclick();panel.tick(0);for(let i=1;i<=240;i++)panel.tick(i*100);
assert.equal(panel.getState().pitch,90);assert.equal(panel.getState().highWind,true);
element('simToggle').onclick();const frozen=panel.getState();panel.tick(60000);assert.deepEqual(panel.getState(),frozen);
element('simPitchView').onclick();assert.equal(observed,'pitch');
element('simDirectionNumber').value='999';element('simDirectionNumber').oninput();assert.equal(panel.getWind().direction,360);
element('simReset').onclick();assert.equal(element('explode').disabled,false);assert.deepEqual(panel.getState(),createState());
for(const r of records)equal(r.object.matrixWorld,baseline.get(r.object.userData.AssetId));
console.log('PASS: panel start, strong wind, pause, numeric bounds, observation callback and reset');
// Regression: changing wind on an idle/reset page must start visible rotation.
element('simSpeedNumber').value='10';element('simSpeedNumber').oninput();
assert.equal(panel.getState().running,true,'Changing wind while idle must start simulation');
assert.equal(observed,'whole','Auto-start must reveal the blades');
const bladeBefore=byId.get('ROTOR.BLADE.1').matrixWorld.clone();
panel.tick(0);for(let i=1;i<=40;i++)panel.tick(i*100);
assert.ok(panel.getState().rotor>0,'Wind input must advance rotor angle');
assert.ok(byId.get('ROTOR.BLADE.1').matrixWorld.elements.some((n,i)=>Math.abs(n-bladeBefore.elements[i])>1e-5),'Actual GLB blade transform must move');
element('simToggle').onclick();const paused=panel.getState();
element('simSpeedNumber').value='14';element('simSpeedNumber').oninput();panel.tick(5000);
assert.deepEqual(panel.getState(),paused,'Explicit pause must survive input edits');
panel.reset();scenarios[1].onclick();assert.equal(panel.getState().running,true,'Scenario must also start idle simulation');
console.log('PASS: idle wind input starts actual blade motion; explicit pause preserved; scenarios auto-start');

// Output shaft rotates, the gearbox casing and stationary brake caliper do not.
motion.reset();motion.apply({...createState(),highSpeedRotor:90});
for(const id of ['GEARBOX.STAGE.1','DRIVE.BRAKE.CALIPER'])equal(byId.get(id).matrixWorld,baseline.get(id));
assert.ok(byId.get('DRIVE.HIGH.SHAFT').matrixWorld.elements.some((n,i)=>Math.abs(n-baseline.get('DRIVE.HIGH.SHAFT').elements[i])>1e-5));
motion.reset();
const {mountDrivetrain}=await import('../viewer/drivetrain.js');
element('gearOpacity').value='100';element('shaftOpacity').value='100';
mountDrivetrain({scene,root,records,focus(){}});
element('driveClose').onclick();
assert.equal(byId.get('GEARBOX.STAGE.1').material.opacity,.22);
assert.equal(byId.get('DRIVE.SHAFT').material.opacity,.45);
assert.equal(byId.get('GEARBOX.INTERNAL.SUN').material.opacity,1);
element('driveOpaque').onclick();assert.equal(byId.get('GEARBOX.STAGE.1').material.opacity,1);assert.equal(byId.get('GEARBOX.STAGE.1').material.depthWrite,true);
panel.reset();element('simTimeScale').value='.01';scenarios[1].onclick();panel.tick(0);panel.tick(100);
assert.ok(panel.getState().rotor<.01,'Slow motion must scale simulated time');
console.log('PASS: output shaft, stationary casing/caliper, independent transparency restoration and global slow motion');
panel.reset();element('simDirectionNumber').value='110';element('simDirectionNumber').oninput();
for(const name of ['storm','normal','low']){scenarios.find(b=>b.dataset.windScenario===name).onclick();assert.equal(panel.getWind().direction,110,'Speed preset must preserve user wind direction');}
console.log('PASS: speed presets preserve chosen wind direction');
// Monitoring uses the exact simulation clock, including pause, slow motion and reset.
panel.reset();const epochBefore=panel.getClock().epoch;scenarios[1].onclick();panel.tick(0);panel.tick(100);
assert.ok(Math.abs(panel.getClock().elapsed-.001)<1e-9);
element('simToggle').onclick();const stoppedClock=panel.getClock();panel.tick(200);assert.deepEqual(panel.getClock(),stoppedClock);
panel.reset();assert.equal(panel.getClock().elapsed,0);assert.equal(panel.getClock().epoch,epochBefore+1);
// Real GLB anchors and DOM adapter for health panel, without WebGL.
const {mountHealth}=await import('../viewer/health.js');
function dom(){return {value:'',checked:false,style:{},children:[],textContent:'',append(...items){this.children.push(...items)},replaceChildren(...items){this.children=items}};}
const healthElements=new Map();globalThis.document={getElementById(id){if(!healthElements.has(id))healthElements.set(id,dom());return healthElements.get(id)},createElement:dom};
const hEl=id=>document.getElementById(id);hEl('healthMarkers').checked=true;
const viewport={clientWidth:1000,clientHeight:800,append(){}};
const camera=new THREE.PerspectiveCamera(60,1.25,.1,1000);camera.up.set(0,0,1);camera.position.set(-20,-30,90);camera.lookAt(0,0,80);
let target=null;const health=mountHealth({records,viewport,camera,simulation:panel,locate(asset){target=asset}});
health.tick();assert.equal(health.markers.length,5);assert.ok(hEl('healthState').textContent.includes('未接入'));
health.markers[1].button.onclick();assert.equal(target,'GEARBOX.STAGE.1');
hEl('healthDemo').checked=true;hEl('healthDemo').onchange();health.tick();assert.ok(hEl('healthValues').children.length>=4);assert.ok(hEl('healthTrend').innerHTML.includes('<svg'));
const marker=health.markers[0],left=marker.button.style.left;
motion.apply({...createState(),heading:180});health.tick();assert.notEqual(marker.button.style.left,left,'World anchor follows yaw');
marker.r.object.visible=false;health.tick();assert.equal(marker.button.hidden,true);marker.r.object.visible=true;
hEl('healthDemo').checked=false;hEl('healthDemo').onchange();health.tick();assert.ok(hEl('healthState').textContent.includes('未接入'));assert.equal(health.model.history.length,0);
console.log('PASS: health clock, 5 actual GLB anchors, selection, metrics/trend, yaw following, hidden components and unknown state');
// Shaft centerline must stay fixed under rotor spin after introducing tilt.
motion.reset();
const shaft=byId.get('DRIVE.SHAFT');
const centerWorld=tiltPoint([-.55,0,80]),centerLocal=centerWorld.clone().applyMatrix4(shaft.matrixWorld.clone().invert());
motion.apply({...createState(),rotor:123});assert.ok(centerLocal.clone().applyMatrix4(shaft.matrixWorld).distanceTo(centerWorld)<1e-6);
motion.reset();
const {mountTiltGuide}=await import('../viewer/tilt-guide.js');
let sideDirection=null;const listeners={},guideControls={target:new THREE.Vector3(0,0,80),addEventListener(name,fn){listeners[name]=fn}};
const guide=mountTiltGuide({scene,controls:guideControls,camera,simulation:panel,focus(direction){sideDirection=direction}});
hEl('tiltView').onclick();assert.equal(guide.group.visible,true);assert.ok(Math.abs(sideDirection.z)<1e-9);
assert.ok(hEl('tiltReadout').hidden===false);listeners.start();assert.equal(guide.group.visible,false);
console.log('PASS: tilted shaft spins without centerline wobble; side-view guides show and exit on orbit');
// R12 replay must use recorded wind and leave the live clock/state unchanged.
const liveBefore=panel.getState(),clockBefore=panel.getClock();
panel.showReplay({state:{...createState(),heading:0,pitch:20},wind:{speed:8,direction:0}});
assert.equal(hEl('simError').textContent,'0.0°','Replay wind must not come from the live controls');
panel.tick(999999);assert.deepEqual(panel.getClock(),clockBefore);
panel.exitReplay();assert.deepEqual(panel.getState(),{...liveBefore,running:false});
console.log('PASS: replay uses historical wind and preserves live state/clock');

// R12: one blade can lag without changing the other two pitch angles.
motion.reset();motion.apply({...createState(),pitch:30,blade1Pitch:0});
equal(byId.get('ROTOR.BLADE.1').matrixWorld,baseline.get('ROTOR.BLADE.1'));
assert.ok(byId.get('ROTOR.BLADE.2').matrixWorld.elements.some((n,i)=>Math.abs(n-baseline.get('ROTOR.BLADE.2').elements[i])>1e-5));
motion.reset();console.log('PASS: independent blade-1 pitch on the actual GLB');
