// Teaching signals, never SCADA or OEM protection limits.
export const GROUPS=[
 {id:'bearing',name:'主轴承',asset:'DRIVE.BEARING'},
 {id:'gearbox',name:'齿轮箱',asset:'GEARBOX.STAGE.1'},
 {id:'generator',name:'发电机',asset:'GENERATOR.BODY'},
 {id:'pitch',name:'变桨系统',asset:'PITCH.BEARING.1'},
 {id:'yaw',name:'偏航系统',asset:'YAW.MOTOR.1'}
];
const delta=(a,b)=>((a-b+540)%360)-180;
function metric(name,value,unit,kind='模拟测量',limits=null){
 const status=limits?(value>=limits[1]?'alarm':value>=limits[0]?'warning':'ok'):'info';
 const reason=limits?`教学上限：关注 ≥ ${limits[0]}，报警 ≥ ${limits[1]} ${unit}；非原厂判据`:'未配置健康判据，仅展示参数';
 return {name,value,unit,kind,status,reason};
}
function sample(state,wind,time,fault){
 const load=Math.max(0,Math.min(1,state.electricPower/2e6)),spin=Math.max(0,Math.min(1,state.rpm/12)),wave=Math.sin(time*.25)*.08*spin;
 const temperature=(name,v)=>metric(name,v,'°C','模拟测量',[75,90]);
 const vibration=v=>metric('振动速度有效值',v,'mm/s','模拟测量',[4,7]);
 return {
 bearing:{temperature:temperature('轴承温度',fault==='bearingHot'?96:28+24*load),vibration:vibration(.2+1.5*spin+wave),rpm:metric('低速轴转速',state.rpm,'rpm','仿真状态')},
 gearbox:{temperature:temperature('轴承温度',32+32*load),oilTemperature:temperature('润滑油温',28+26*load),vibration:vibration(fault==='gearVibration'?9:.3+2*spin+wave),oilPressure:metric('润滑油压',spin*3,'bar')},
 generator:{temperature:temperature('绕组温度',30+40*load),bearingTemperature:temperature('轴承温度',28+28*load),vibration:vibration(.2+1.8*spin+wave),current:metric('电流示例',load*1400,'A')},
 pitch:{fault:metric('变桨迟滞场景',fault==='pitchLag'?1:0,'0正常 / 1注入','教学故障标志',[1,1]),blade1:metric('叶片1桨距',state.blade1Pitch??state.pitch,'°','仿真状态'),blade2:metric('叶片2桨距',state.pitch,'°','仿真状态'),blade3:metric('叶片3桨距',state.pitch,'°','仿真状态'),error:metric('目标与实际桨距差',state.targetPitch-state.pitch,'°','计算指标'),pressure:metric('液压压力示例',160+Math.min(20,Math.abs(state.targetPitch-state.pitch)),'bar')},
 yaw:{fault:metric('偏航驱动异常场景',fault==='yawFault'?1:0,'0正常 / 1注入','教学故障标志',[1,1]),heading:metric('机舱朝向',state.heading,'°','仿真状态'),error:metric('对风偏差',delta(wind.direction,state.heading),'°','计算指标'),current:metric('单驱动电流示例',state.yawing?12:0,'A'),brake:metric('驱动制动释放示例',state.yawing?1:0,'1释放 / 0抱闸','仿真推定')}
 };
}
export function createHealth(){
 let demo=false,fault='none',data=null,history=[],epoch=null,last=-Infinity,sampledFault=null;
 return {
  get sample(){return data;},get history(){return history;},get fault(){return fault;},get demo(){return demo;},get pending(){return demo&&sampledFault!==fault;},
  setDemo(value){demo=Boolean(value);data=null;history=[];last=-Infinity;sampledFault=null;},
  setFault(value){fault=['bearingHot','gearVibration','pitchLag','yawFault'].includes(value)?value:'none';},
  update(state,wind,clock){
   if(epoch!==null&&epoch!==clock.epoch){data=null;history=[];last=-Infinity;fault='none';}epoch=clock.epoch;
   if(!demo||!Number.isFinite(clock.elapsed)||clock.elapsed-last<1)return false;
   sampledFault=fault;last=clock.elapsed;data=sample(state,wind,last,fault);history.push({time:last,data});if(history.length>60)history.shift();return true;
  }
 };
}
