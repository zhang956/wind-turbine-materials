import assert from 'node:assert/strict';
import {createState,step} from '../viewer/simulation.mjs';
let s={...createState(),running:true,rpm:10,pitch:0,faultStop:true};
const wind={speed:8,direction:270};
for(let i=0;i<3000;i++)s=step(s,wind,.1);
assert.ok(s.rpm<.05,'故障锁存必须使风轮停机');
assert.equal(s.pitch,90,'故障停机顺桨');
const {createTraining}=await import('../viewer/training-data.mjs');
const t=createTraining();
t.update(s,{elapsed:0,epoch:0});
t.setFault('bearingHot');assert.equal(t.latched,true);
assert.equal(t.resume(s),false,'故障未清除禁止恢复');
t.acknowledge();assert.equal(t.resume(s),false);
t.setFault('none');assert.equal(t.latched,true,'清除不自动恢复');
assert.equal(t.resume({...s,rpm:5}),false,'未停稳禁止恢复');
assert.equal(t.resume(s),true);assert.equal(t.latched,false);
t.setFault('gearVibration');assert.equal(t.acknowledged,false,'新故障需要重新确认');
t.setFault('none');assert.equal(t.resume(s),false,'未确认禁止恢复');
t.acknowledge();assert.equal(t.resume(s),true);
const n=t.events.length;t.update(s,{elapsed:0,epoch:0});t.update(s,{elapsed:0,epoch:0});assert.equal(t.events.length,n,'暂停不重复添加');
for(let i=0;i<250;i++){t.setFault('bearingHot');t.setFault('none');}
assert.equal(t.events.length,200);
t.update(createState(),{elapsed:0,epoch:1});assert.equal(t.latched,false);assert.equal(t.fault,'none');assert.equal(t.events.length,1);
const yawStopped=step({...createState(),running:true,faultStop:true,yawing:true,heading:270},{speed:8,direction:0},.1);
assert.equal(yawStopped.heading,270,'故障锁存应立即停止偏航');
const paused={...s,running:false};assert.deepEqual(step(paused,wind,.1),paused);
const recovered=step({...s,faultStop:false},wind,.1);assert.ok(recovered.pitch<90,'解除锁存后正常风况允许回桨');

console.log('PASS: fault stop, clear/ack/manual recovery, stationary gate, immediate yaw stop, pause, bounded events, reset');
