import {LESSONS,recoveryChecks} from './training-guide.mjs';
import * as THREE from 'three';
import {createTraining,FAULTS} from './training-data.mjs';
export function mountTraining({simulation,health,records,scene}){
 const $=id=>document.getElementById(id),model=createTraining();
 let helper=null,highlighted=null,lastSignature='',previousEpoch=simulation.getClock().epoch,onRecord=null,checkSignature='';
 model.update(simulation.getState(),simulation.getClock());
 for(const [key,lesson] of Object.entries(LESSONS)){const option=document.createElement('option');option.value=key;option.textContent=lesson.title;$('trainingScenario').append(option);}
 function lesson(){const item=LESSONS[$('trainingScenario').value];$('trainingLesson').replaceChildren();for(const [label,text] of [['现象',item.symptom],['观察重点',item.observe],['原理边界',item.reason],['分析提示',item.review]]){const p=document.createElement('p'),b=document.createElement('strong');b.textContent=label+'：';p.append(b,document.createTextNode(text));$('trainingLesson').append(p);}}
 $('trainingScenario').onchange=()=>{lesson();render();};lesson();
 $('trainingInject').onclick=()=>{
  if(simulation.isReplaying||model.latched)return;
  if(!$('healthDemo').checked){$('healthDemo').checked=true;$('healthDemo').onchange();}
  $('healthFault').value=$('trainingScenario').value;changeFault();
 };

 function highlight(){
  if(helper){scene.remove(helper);helper.geometry.dispose();helper.material.dispose();helper=null;}
  const asset={bearingHot:'DRIVE.BEARING',gearVibration:'GEARBOX.STAGE.1',pitchLag:'ROTOR.BLADE.1',yawFault:'YAW.MOTOR.1'}[model.fault];
  highlighted=records.find(r=>r.object.userData.AssetId===asset)?.object;
  if(highlighted){helper=new THREE.BoxHelper(highlighted,0xff7070);scene.add(helper);}
 }
 function changeFault(){
  if(simulation.isReplaying)return;
  model.update(simulation.getState(),simulation.getClock());
  model.setFault($('healthFault').value);if(model.fault!=='none'){$('trainingScenario').value=model.fault;lesson();}health.model.setFault(model.fault);
  simulation.setFaultStop(model.latched);simulation.setFault(model.fault);highlight();render();onRecord?.();
 }
 $('healthFault').onchange=changeFault;
 const demoChange=$('healthDemo').onchange;
 $('healthDemo').onchange=()=>{demoChange();if(!$('healthDemo').checked){$('healthFault').value='none';changeFault();}};
 $('trainingClear').onclick=()=>{$('healthFault').value='none';changeFault();};
 $('trainingAck').onclick=()=>{if(simulation.isReplaying)return;model.acknowledge();render();onRecord?.();};
 $('trainingResume').onclick=()=>{if(simulation.isReplaying)return;if(model.resume(simulation.getState()))simulation.setFaultStop(false);render();onRecord?.();};
 $('trainingExport').onclick=()=>{
  const content={version:'R15',source:'教学仿真事件，非真实运行记录',clock:'仿真秒',retention:'最多200条；复位开启新会话',completed:model.completed,events:model.events};
  const url=URL.createObjectURL(new Blob([JSON.stringify(content,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='V90-R15-教学事件.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 function render(){
  const state=simulation.getState();
  $('trainingGuide').textContent=model.latched?(model.fault!=='none'?'② 观察三维动作及指标，完成观察后清除异常。':!model.acknowledged?'③ 确认告警；清除异常不会自动重启。':!model.canResume(state)?'④ 等待三片顺桨和停稳；如已暂停，先继续仿真。':'⑤ 条件已满足，可手动解除故障锁存。'):model.completed?'本次练习已完成，可回看事件或选择下一场景。':'① 选择场景并阅读说明，开始仿真后注入故障。';
  const status=model.latched?`${FAULTS[model.lastFault]}${model.fault==='none'?'（异常源已清除）':''} · 停机锁存 · ${model.acknowledged?'已确认':'待确认'}${!state.running?' · 已暂停，请继续仿真以完成停机':''}`:'无故障锁存 · 可注入教学异常';
  $('trainingState').textContent=status;
  $('trainingInject').disabled=model.latched||simulation.isReplaying;
  $('trainingActionHint').textContent=model.latched?'请先完成当前故障的清除、确认与手动解除，再注入下一场景。':!state.running?'仿真已暂停：可注入，但动作需点击“开始 / 继续”后才推进。':'注入将自动启用教学数据并锁存停机；当前风况保持不变。';
  const checks=recoveryChecks(model,state),nextCheckSignature=JSON.stringify(checks);
  $('trainingChecklist').hidden=!model.latched;
  if(nextCheckSignature!==checkSignature){checkSignature=nextCheckSignature;$('trainingChecklist').replaceChildren();for(const c of checks){const li=document.createElement('li');li.className=c.ok?'check-pass':'check-wait';li.textContent=(c.ok?'✓ ':'○ ')+c.label;const small=document.createElement('small');small.textContent=c.detail;li.append(small);$('trainingChecklist').append(li);}}
  $('trainingCompletion').textContent=`本会话完成 ${model.completed} 次处置练习`+(model.completed&&!model.latched?` · 最近完成：${FAULTS[model.lastFault]}。锁存已解除，是否启动仍取决于风况和正常停机状态。`:'');

  $('trainingClear').disabled=model.fault==='none';$('trainingAck').disabled=!model.latched||model.acknowledged;
  $('trainingResume').disabled=!model.canResume(state);
  $('trainingRecovery').textContent=model.latched?'恢复条件：清除异常、确认告警、转速 < 0.05 rpm、三片桨距均 ≥ 85°，然后手动恢复。':'解除故障锁存后仍由原有风况条件决定是否启动。';
  $('sessionState').textContent=`${state.running?'仿真运行中':'仿真未运行 / 已暂停'} · ${simulation.getClock().elapsed.toFixed(1)} s${model.latched?' · 教学故障停机锁存':''}`;
  $('sessionPause').textContent=state.running?'暂停仿真':'开始 / 继续';
  const events=model.events,signature=events.map(e=>e.id).join(',');
  if(signature!==lastSignature){
   lastSignature=signature;$('trainingEvents').replaceChildren();
   for(const event of events.slice().reverse()){
    const li=document.createElement('li');li.className='event-'+event.type;
    li.textContent=`${event.time.toFixed(1)} s · ${event.message} `;const button=document.createElement('button');button.textContent='回看';button.dataset.eventId=event.id;button.dataset.eventTime=event.time;li.append(button);$('trainingEvents').append(li);
   }
   $('trainingCount').textContent=`${events.length} / 200 条 · 最新在前`;
  }
 }
 $('sessionPause').onclick=()=>$('simToggle').click();
 return {model,setRecorder(fn){onRecord=fn;},tick(){
  if(simulation.isReplaying){if(helper)helper.visible=false;return;}
  const clock=simulation.getClock();model.update(simulation.getState(),clock);
  if(clock.epoch!==previousEpoch){previousEpoch=clock.epoch;lastSignature='';simulation.setFaultStop(false);highlight();}
  if(helper){helper.update();let visible=true;for(let o=highlighted;o;o=o.parent)visible=visible&&o.visible;helper.visible=visible;}
  render();
 }};
}
