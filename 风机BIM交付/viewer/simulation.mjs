import {advanceDrivetrain,operatingPitch} from './drivetrain-dynamics.mjs';
// Deterministic teaching model. These are not OEM control parameters.
export const normalize=a=>((a%360)+360)%360;
export const angleDelta=(target,current)=>normalize(target-current+180)-180;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const approach=(a,b,limit)=>a+clamp(b-a,-limit,limit);
export function createState(){return {effectiveWind:8,airTorque:0,generatorTorque:0,lossTorque:0,brakeTorque:0,netTorque:0,electricPower:0,running:false,faultStop:false,fault:'none',normalStop:false,blade1Pitch:null,heading:270,pitch:0,targetPitch:0,rpm:0,targetRpm:0,rotor:0,highSpeedRotor:0,yawing:false,yawDelay:0,highWind:false,stormDelay:0,recoveryDelay:0,restarting:false,stopStartPitch:0,stopStartRpm:0,status:'未开始'};}
export function step(previous,wind,elapsed){
 if(!previous.running)return previous;
 const s={...previous},dt=Number.isFinite(elapsed)?clamp(elapsed,0,.1):0;
 const speed=Number.isFinite(wind.speed)?clamp(wind.speed,0,35):0;
 s.effectiveWind+=(speed-s.effectiveWind)*(1-Math.exp(-dt/3));
 const direction=Number.isFinite(wind.direction)?normalize(wind.direction):s.heading;
 // Teaching dwell and startup sequence, not OEM control parameters.
 if(s.restarting&&(speed>=22||speed<4||!Number.isFinite(wind.speed))){
  s.highWind=true;s.restarting=false;s.recoveryDelay=0;
  s.stopStartPitch=s.pitch;s.stopStartRpm=s.rpm;
 }
 if(s.highWind){
  const eligible=s.pitch>=90&&s.rpm===0&&Number.isFinite(wind.speed)&&speed>=4&&speed<22;
  s.recoveryDelay=eligible?s.recoveryDelay+dt:0;
  if(s.recoveryDelay>=3-1e-9){s.highWind=false;s.restarting=true;s.stormDelay=0;s.recoveryDelay=0;}
 }else{
  s.stormDelay=speed>=25?s.stormDelay+dt:0;
  if(s.stormDelay>=2){s.highWind=true;s.restarting=false;s.recoveryDelay=0;s.stopStartPitch=s.pitch;s.stopStartRpm=s.rpm;}
 }
 const error=angleDelta(direction,s.heading);
 if(s.yawing&&Math.abs(error)<=2){s.yawing=false;s.yawDelay=0;}
 if(!s.yawing){s.yawDelay=Math.abs(error)>8?s.yawDelay+dt:0;if(s.yawDelay>=2)s.yawing=true;}
 if(s.yawing&&!s.faultStop)s.heading=normalize(s.heading+clamp(error,-2*dt,2*dt));
 if(s.faultStop){s.yawing=false;s.yawDelay=0;s.restarting=false;}
 const stopped=s.normalStop||s.faultStop||s.highWind||speed<4;
 s.targetPitch=stopped?90:operatingPitch(speed,error,s.rpm);
 s.blade1Pitch=approach(previous.blade1Pitch??previous.pitch,s.targetPitch,(s.fault==='pitchLag'?1:8)*dt);
 s.pitch=approach(s.pitch,s.targetPitch,8*dt);
 let targetRpm=stopped?0:clamp(3+(speed-4)/8*9,3,12)*Math.max(0,Math.cos(angleDelta(direction,s.heading)*Math.PI/180));
 if(s.highWind&&!s.faultStop&&!s.normalStop){
  const progress=clamp((s.pitch-s.stopStartPitch)/Math.max(.001,90-s.stopStartPitch),0,1);
  targetRpm=s.stopStartRpm*(1-progress);
 }else if(s.restarting){
  targetRpm*=clamp((90-s.pitch)/Math.max(.001,90-s.targetPitch),0,1);
 }
 Object.assign(s,advanceDrivetrain({rpm:s.rpm,speed:s.effectiveWind,pitch:(s.blade1Pitch+2*s.pitch)/3,yawError:angleDelta(direction,s.heading),targetRpm,stopping:stopped,dt}));
 if(s.restarting&&Math.abs(s.pitch-s.targetPitch)<.01&&Math.abs(s.rpm-targetRpm)<.05)s.restarting=false;
 s.targetRpm=targetRpm;
 s.highSpeedRotor=normalize(s.highSpeedRotor+s.rpm*6*dt*112.8);
 s.rotor=normalize(s.rotor+s.rpm*6*dt);
 s.status=s.faultStop?(s.pitch>=85&&s.blade1Pitch>=85&&s.rpm<.05?'教学故障停机 · 等待手动恢复':'教学故障 · 顺桨减速中'):s.normalStop?(s.pitch>=85&&s.blade1Pitch>=85&&s.rpm<.05?'正常停机 · 待启动':'正常停机 · 顺桨减速中'):s.highWind?(s.pitch>=90&&s.rpm===0?(s.recoveryDelay>0?'恢复条件确认中':'强风已停机'):'顺桨减速中'):s.restarting?'回桨启动中':s.stormDelay>0?'强风确认中':speed<4?'等待风':s.yawing?'偏航中':s.rpm<Math.max(.5,s.targetRpm*.8)?'启动中':'运行';
 return s;
}
