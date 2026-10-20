import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,step,angleDelta} from '../viewer/simulation.mjs';
const advance=(s,wind,seconds)=>{for(let i=0;i<seconds*20;i++)s=step(s,wind,.05);return s};
test('direction wraps along shortest path',()=>{assert.equal(angleDelta(1,359),2);assert.equal(angleDelta(359,1),-2)});
test('yaw waits two seconds then converges without chatter',()=>{let s={...createState(),running:true};const w={speed:8,direction:300};s=advance(s,w,1);assert.equal(s.heading,270);s=advance(s,w,20);assert.ok(Math.abs(angleDelta(300,s.heading))<=2);assert.equal(s.yawing,false)});
test('high wind feathers and stays latched until below 22',()=>{let s={...createState(),running:true};s=advance(s,{speed:26,direction:270},20);assert.equal(s.pitch,90);assert.equal(s.rpm,0);assert.equal(s.highWind,true);s=step(s,{speed:23,direction:270},.05);assert.equal(s.highWind,true);s=advance(s,{speed:21,direction:270},3.1);assert.equal(s.highWind,false)});
test('normal wind starts rotor; low wind stops it',()=>{let s=advance({...createState(),running:true},{speed:8,direction:270},20);assert.ok(s.rpm>0);s=advance(s,{speed:0,direction:270},25);assert.equal(s.rpm,0);assert.equal(s.pitch,90)});
test('pause freezes and oversized/background steps cannot jump',()=>{const s=createState();assert.deepEqual(step(s,{speed:30,direction:0},20),s);let a=step({...s,running:true},{speed:30,direction:0},100);assert.ok(a.pitch<=.8);a=step(a,{speed:NaN,direction:Infinity},NaN);assert.ok(Number.isFinite(a.heading)&&Number.isFinite(a.pitch))});
test('wind speed changes update target and visibly respond in the next frame',()=>{
 let s={...createState(),running:true,rpm:3};
 s=step(s,{speed:12,direction:270},.1);
 assert.equal(s.targetRpm,12);assert.ok(s.rpm>3&&s.rpm<3.3,'Inertia permits acceleration, not an instant speed jump');
 s=advance(s,{speed:10,direction:270},25);const faster=s.rpm;
 s=advance(s,{speed:6,direction:270},20);assert.ok(s.rpm<faster-3);
 assert.ok(Math.abs(s.rpm-5.25)<.02);
 s=step(s,{speed:0,direction:270},.1);assert.equal(s.targetRpm,0);assert.ok(s.rpm<5.25);
});
test('brief gust is not a confirmed shutdown',()=>{
 let s={...createState(),running:true,rpm:12};s=advance(s,{speed:28,direction:270},1);
 assert.equal(s.highWind,false);assert.equal(s.status,'强风确认中');
 s=advance(s,{speed:10,direction:270},1);assert.equal(s.highWind,false);assert.equal(s.stormDelay,0);
});
test('shutdown feathers while rotor keeps turning and ignores early recovery',()=>{
 let s={...createState(),running:true,rpm:12};s=advance(s,{speed:28,direction:270},3);
 assert.equal(s.highWind,true);assert.equal(s.status,'顺桨减速中');assert.ok(s.pitch>0&&s.pitch<90);assert.ok(s.rpm>8);
 const rpm=s.rpm,angle=s.rotor;s=advance(s,{speed:10,direction:270},1);
 assert.equal(s.highWind,true);assert.ok(s.rpm<rpm&&s.rpm>0);assert.notEqual(s.rotor,angle);
 s=advance(s,{speed:28,direction:270},20);assert.equal(s.pitch,90);assert.equal(s.rpm,0);assert.equal(s.status,'强风已停机');
});
const parked=()=>({...createState(),running:true,highWind:true,pitch:90,targetPitch:90});
test('recovery requires continuous eligible wind and keeps rotor parked while waiting',()=>{
 let s=advance(parked(),{speed:8,direction:270},2);assert.equal(s.highWind,true);assert.equal(s.rpm,0);assert.equal(s.pitch,90);assert.equal(s.status,'恢复条件确认中');
 s=step(s,{speed:23,direction:270},.05);assert.equal(s.recoveryDelay,0);
 s=advance(s,{speed:8,direction:270},2);assert.equal(s.highWind,true);
 s=advance(s,{speed:8,direction:270},1.1);assert.equal(s.restarting,true);assert.ok(s.pitch>85&&s.rpm<.5);
});
test('restart accelerates with unfeathering and eventually returns to normal',()=>{
 let s=advance(parked(),{speed:8,direction:270},4);
 assert.equal(s.status,'回桨启动中');assert.ok(s.pitch>75);assert.ok(s.rpm>0&&s.rpm<1.5);
 s=advance(s,{speed:8,direction:270},30);assert.equal(s.restarting,false);assert.equal(s.status,'运行');assert.equal(s.pitch,0);assert.ok(Math.abs(s.rpm-7.5)<.01);
});
test('rebound during restart returns to feathering; invalid and low wind cannot release latch',()=>{
 let s=advance(parked(),{speed:8,direction:270},6);s=step(s,{speed:24,direction:270},.05);
 assert.equal(s.highWind,true);assert.equal(s.restarting,false);assert.equal(s.targetPitch,90);
 for(const speed of [0,3,NaN]){s=advance(parked(),{speed,direction:270},5);assert.equal(s.highWind,true);assert.equal(s.rpm,0);}
 const paused={...parked(),running:false};assert.deepEqual(step(paused,{speed:8,direction:270},10),paused);
});
test('high speed phase integrates independently across rotor wrap',()=>{
 let s={...createState(),running:true,rpm:12,rotor:359,highSpeedRotor:10};
 s=step(s,{speed:12,direction:270},.05);
 assert.ok(Math.abs(s.highSpeedRotor-56.08)<1e-7);
 assert.ok(s.rotor<4);
});
test('wind direction change and storm confirmation do not bypass gradual slowdown',()=>{
 let s={...createState(),running:true,heading:0,rpm:12};
 s=advance(s,{speed:28,direction:180},1);
 assert.equal(s.highWind,false);assert.ok(s.rpm>=10.4,'Wind misalignment must not collapse rpm before feathering');
 s=advance(s,{speed:28,direction:180},2);assert.equal(s.highWind,true);assert.ok(s.rpm>7);
});
test('above-rated steady operation balances torques through pitching, not mechanical brake',()=>{
 const run=v=>advance({...createState(),running:true},{speed:v,direction:270},120);
 const a=run(16),b=run(24);
 assert.ok(Math.abs(a.rpm-12)<.1&&Math.abs(b.rpm-12)<.1);
 assert.ok(b.pitch>a.pitch&&a.pitch>0);assert.equal(a.brakeTorque,0);assert.equal(b.brakeTorque,0);
 assert.ok(Math.abs(b.netTorque)<1000);assert.ok(b.generatorTorque>0&&b.electricPower>0);
});
