import assert from 'node:assert/strict';
import {createHealth,GROUPS} from '../viewer/health-data.mjs';
const h=createHealth(),s={rpm:12,electricPower:1.8e6,pitch:5,targetPitch:5,heading:270,yawing:false},w={direction:270};
assert.equal(GROUPS.length,5);
h.update(s,w,{elapsed:1,epoch:0});assert.equal(h.sample,null);assert.equal(h.history.length,0);
h.setDemo(true);h.update(s,w,{elapsed:1,epoch:0});assert.equal(h.sample.bearing.rpm.value,12);
assert.equal(h.sample.bearing.temperature.kind,'模拟测量');assert.equal(h.sample.pitch.error.kind,'计算指标');
h.update(s,w,{elapsed:1,epoch:0});assert.equal(h.history.length,1,'Paused clock does not append');
h.setFault('bearingHot');h.update(s,w,{elapsed:2,epoch:0});assert.equal(h.sample.bearing.temperature.status,'alarm');assert.ok(h.sample.bearing.temperature.reason.includes('教学'));assert.equal(h.sample.gearbox.vibration.status,'ok');
h.setFault('gearVibration');h.update(s,w,{elapsed:3,epoch:0});assert.equal(h.sample.gearbox.vibration.status,'alarm');assert.equal(h.sample.bearing.temperature.status,'ok');
for(let i=4;i<100;i++)h.update(s,w,{elapsed:i,epoch:0});assert.equal(h.history.length,60);
h.update(s,w,{elapsed:0,epoch:1});assert.equal(h.history.length,1);assert.equal(h.fault,'none');assert.equal(h.history[0].time,0);
h.setDemo(false);assert.equal(h.sample,null);assert.equal(h.history.length,0);
console.log('PASS: five groups, unknown data, simulated sources, fault isolation, paused clock, bounded trends and reset');

const pending=createHealth();pending.setDemo(true);assert.equal(pending.pending,true);pending.update(s,w,{elapsed:0,epoch:0});assert.equal(pending.pending,false);pending.setFault('bearingHot');assert.equal(pending.pending,true);pending.update(s,w,{elapsed:0,epoch:0});assert.equal(pending.pending,true);pending.update(s,w,{elapsed:1,epoch:0});assert.equal(pending.pending,false);
