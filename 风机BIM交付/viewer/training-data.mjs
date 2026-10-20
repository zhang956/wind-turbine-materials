import {recoveryChecks} from './training-guide.mjs';
// Training interlock only. Never an OEM protection controller.
export const FAULTS={none:'无异常',bearingHot:'主轴承温升异常',gearVibration:'齿轮箱振动异常',pitchLag:'叶片1变桨迟滞',yawFault:'偏航驱动异常'};
export function createTraining(){
 let lastFault='none',completed=0,fault='none',latched=false,acknowledged=false,events=[],elapsed=0,epoch=null,lastStatus=null,sequence=0;
 function record(type,message){events.push({id:++sequence,time:elapsed,type,message});if(events.length>200)events.shift();}
 return {
  get lastFault(){return lastFault;},get completed(){return completed;},get fault(){return fault;},get latched(){return latched;},get acknowledged(){return acknowledged;},get events(){return events.map(e=>({...e}));},
  setFault(value){
   if(!Object.hasOwn(FAULTS,value)||value===fault)return;
   fault=value;
   if(value==='none')record('clear','异常源已清除；停机锁存保留');
   else{lastFault=value;latched=true;acknowledged=false;record('alarm',FAULTS[value]+'；锁存教学停机');}
  },
  acknowledge(){if(!latched||acknowledged)return;acknowledged=true;record('ack','告警已确认；确认不解除停机');},
  canResume(state){return latched&&recoveryChecks(this,state).every(c=>c.ok);},
  resume(state){if(!this.canResume(state))return false;latched=false;completed++;record('resume','手动解除故障锁存；继续按风况判断运行条件');return true;},
  update(state,clock){
   if(epoch!==clock.epoch){lastFault='none';completed=0;fault='none';latched=false;acknowledged=false;events=[];sequence=0;lastStatus=null;epoch=clock.epoch;elapsed=clock.elapsed;record('reset','新训练会话；所有记录均为教学演示');}
   elapsed=clock.elapsed;
   const status=state.running?state.status:'未运行 / 已暂停';
   if(lastStatus!==null&&lastStatus!==status)record('state',status);
   lastStatus=status;
  }
 };
}
