// Teaching explanations, not OEM diagnoses or field maintenance procedures.
export const LESSONS={
 bearingHot:{title:'主轴承温升异常',symptom:'演示温度升高；主轴承标红，触发教学停机锁存。',observe:'观察主轴承温度趋势、转速下降与三片叶片顺桨。清除异常后温度恢复不代表锁存已解除。',reason:'温升可能关联润滑、载荷或测量异常；单一温度值不能定位根因。',review:'对比负荷和环境温度，核对温度测点与历史趋势，再结合润滑及振动资料判断。'},
 gearVibration:{title:'齿轮箱振动异常',symptom:'演示振动值升高；齿轮箱标红，触发教学停机锁存。',observe:'比较振动、油温和转速；模型不模拟齿轮破损、振动频谱或机械晃动。',reason:'振动可能关联齿轮、轴承、对中或传感器安装；总值超限并不等于齿轮损坏。',review:'核对测点方向与单位，结合转速、负荷、频谱及历史基线开展分析。'},
 pitchLag:{title:'叶片1变桨迟滞',symptom:'叶片1响应慢于叶片2、3；教学停机过程中三片顺桨进度不同。',observe:'重点对比叶片1与叶片2、3桨距；叶片1未达到85°时，即使转速为零也不能解除锁存。',reason:'示例通过降低变桨响应速度表现迟滞，不模拟电机、液压、驱动器的具体故障。',review:'对比变桨指令与反馈，核对三片响应时间、供能状态及相关报警记录。'},
 yawFault:{title:'偏航驱动异常',symptom:'机舱朝向冻结；偏航驱动标红，同时触发教学停机锁存。',observe:'在运行演示中设置有风向偏差的工况，再注入，观察机舱朝向不再跟随。',reason:'示例只冻结偏航动作；风向传感器、制动器与驱动故障可能表现相似。',review:'先核对风向与机舱朝向信号，再对照偏航指令、制动和驱动状态记录。'}
};
const value=(n,unit)=>Number.isFinite(n)?n.toFixed(2)+unit:'无有效值';
export function recoveryChecks(model,state){
 const blade=state.blade1Pitch??state.pitch;
 return [
  {label:'异常源已清除',ok:model.fault==='none',detail:model.fault==='none'?'已清除':'仍有异常'},
  {label:'告警已确认',ok:model.acknowledged,detail:model.acknowledged?'已确认':'待确认'},
  {label:'风轮已停稳',ok:Number.isFinite(state.rpm)&&state.rpm>=0&&state.rpm<.05,detail:value(state.rpm,' rpm')+' / 要求 0 ≤ 转速 < 0.05'},
  {label:'叶片1已顺桨',ok:Number.isFinite(blade)&&blade>=85,detail:value(blade,'°')+' / 要求 ≥ 85°'},
  {label:'叶片2、3已顺桨',ok:Number.isFinite(state.pitch)&&state.pitch>=85,detail:value(state.pitch,'°')+' / 要求 ≥ 85°'}
 ];
}
