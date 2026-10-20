import {createRecording} from './replay-data.mjs';
import {FAULTS} from './training-data.mjs';
export function mountReplay({simulation,training,storage}){
 const $=id=>document.getElementById(id),recording=createRecording();
 let playing=false,position=0,lastTime=null,lastEvent=null,epoch=null,displayed=null;
 function capture(force=false){
  if(simulation.isReplaying)return;
  storage?.tick();
  const clock=simulation.getClock(),model=training.model;
  if(epoch!==clock.epoch){epoch=clock.epoch;lastEvent=null;}
  const id=model.events.at(-1)?.id,changed=id!==lastEvent;
  recording.record({time:clock.elapsed,state:simulation.getState(),wind:simulation.getWind(),storage:storage?.getSnapshot(),eventId:changed?id:null,training:{fault:model.fault,latched:model.latched,acknowledged:model.acknowledged}},clock.epoch,force||changed);
  lastEvent=id;
 }
 training.setRecorder(()=>capture(true));
 storage?.setRecorder(()=>capture(true));
 function lock(value){
  document.body.classList.toggle('replay-active',value);
  for(const group of document.querySelectorAll('.workspace-group'))group.inert=value&&!group.contains($('replaySeek'));
  for(const button of document.querySelectorAll('[data-workspace]'))button.disabled=value;
  $('sessionPause').disabled=value;
 }
 function show(frame){if(!frame)return;displayed=frame;position=frame.time;simulation.showReplay(frame);if(frame.storage)storage?.showReplay(frame.storage);lock(true);render();$('replaySeek').closest('.workspace-group').scrollIntoView({block:'start'});}
 function exit(){playing=false;lastTime=null;displayed=null;simulation.exitReplay();storage?.exitReplay();lock(false);render();}
 $('replayEnter').onclick=()=>{capture(true);const range=recording.range;if(range)show(recording.atTime(range[0]));};
 $('replayExit').onclick=exit;
 $('replayPlay').onclick=()=>{if(!simulation.isReplaying)return;playing=!playing;lastTime=null;render();};
 $('replaySeek').oninput=()=>{if(!simulation.isReplaying)return;playing=false;const time=Number($('replaySeek').value);show(recording.atTime(time));};
 $('trainingEvents').addEventListener('click',event=>{
  const button=event.target.closest('button[data-event-id]');if(!button||simulation.isReplaying)return;
  capture(true);const frame=recording.atEvent(Number(button.dataset.eventId));
  if(frame)show(frame);else $('replayStatus').textContent='该事件快照已超出保留范围，无法回放。';
 });
 function render(){
  const range=recording.range,replaying=simulation.isReplaying;
  $('replayEnter').disabled=!range||replaying;$('replayExit').disabled=!replaying;$('replayPlay').disabled=!replaying;$('replaySeek').disabled=!replaying;
  $('replayPlay').textContent=playing?'暂停回放':'播放回放';
  if(range){$('replaySeek').min=range[0];$('replaySeek').max=range[1];$('replaySeek').value=replaying?position:range[1];}
  $('replayRange').textContent=range?`${range[0].toFixed(1)}–${range[1].toFixed(1)} 仿真秒 · ${recording.count} 帧`:'尚无快照';
  if(replaying&&displayed){
   const {state:s,wind,training:t}=displayed;
   $('replayStatus').textContent=`回放 ${displayed.time.toFixed(1)} s · ${s.status} · ${FAULTS[t.fault]} · ${t.latched?'故障锁存':'未锁存'} · ${t.acknowledged?'已确认':'未确认'}`;
   $('replayValues').textContent=`风速 ${wind.speed.toFixed(1)} m/s；转速 ${s.rpm.toFixed(2)} rpm；叶片1 ${(s.blade1Pitch??s.pitch).toFixed(1)}°，叶片2/3 ${s.pitch.toFixed(1)}°；朝向 ${s.heading.toFixed(1)}°；教学功率 ${(s.electricPower/1e6).toFixed(3)} MW。`;
   if(displayed.storage){const e=displayed.storage.energy;$('replayValues').textContent+=` 储能SOC ${e.soc.toFixed(3)}%，电量 ${e.energyMWh.toFixed(6)} MWh，充电 ${e.chargeMW.toFixed(4)} MW，放电 ${e.dischargeMW.toFixed(4)} MW，送网 ${e.gridMW.toFixed(4)} MW。`;}
   $('sessionState').textContent=`历史回放 · ${displayed.time.toFixed(1)} s · 当前仿真已暂停`;
  }else{$('replayStatus').textContent='记录当前会话，进入回放将暂停仿真；退出后保持暂停。';$('replayValues').textContent='';}
 }
 capture(true);render();
 return {recording,capture,exit,tick(time){
  if(simulation.isReplaying){
   if(playing){const dt=lastTime===null||document.hidden?0:Math.min(.25,Math.max(0,(time-lastTime)/1000));const end=recording.range[1];position=Math.min(end,position+dt);displayed=recording.atTime(position);simulation.showReplay(displayed);if(displayed.storage)storage?.showReplay(displayed.storage);if(position>=end)playing=false;}
   lastTime=time;render();
  }else{lastTime=null;capture();render();}
 }};
}
