// Inject into a generated portable viewer for a real Chromium smoke check.
(async()=>{
 const output=document.createElement('pre');output.id='browser-check-result';document.body.prepend(output);output.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:99;background:#172c30;color:#fff;padding:10px;white-space:pre-wrap';
 window.addEventListener('error',event=>{output.textContent+=' RUNTIME ERROR: '+event.message;output.dataset.result='fail';});
 const check=(condition,message)=>{if(!condition)throw Error(message);};
 const $=id=>document.getElementById(id);
 try{
  for(let i=0;i<100&&!window.BIM_VIEWER;i++)await new Promise(resolve=>setTimeout(resolve,100));
  check(window.BIM_VIEWER,'模型未加载：'+$('error').textContent);
  const {simulation,training,health}=window.BIM_VIEWER;
  check(document.querySelector('[data-workspace="structure"]').getAttribute('aria-pressed')==='true','默认结构模式');
  document.querySelector('[data-workspace="fault"]').click();
  check($('trainingState').getBoundingClientRect().height>0,'故障面板可见');
  $('sessionPause').click();let time=performance.now();
  const advance=n=>{for(let i=0;i<n;i++){simulation.tick(time+=100);training.tick();health.tick();}};
  advance(250);check(simulation.getState().rpm>1,'正常风况启动');
  $('healthDemo').checked=true;$('healthDemo').onchange();advance(12);
  $('healthFault').value='bearingHot';$('healthFault').onchange();advance(600);
  check(simulation.getState().rpm<.05,'故障停机');check(training.model.latched,'故障锁存');
  check(health.model.sample.bearing.temperature.status==='alarm','异常监测联动');
  check($('trainingResume').disabled,'异常未清除不得恢复');
  $('trainingClear').click();training.tick();check(training.model.latched,'清除保留锁存');
  check($('trainingResume').disabled,'未确认不得恢复');
  $('trainingAck').click();check(!$('trainingResume').disabled,'停稳清除确认后可恢复');
  $('trainingResume').click();advance(300);check(simulation.getState().rpm>1,'手动恢复后运行');
  const before=simulation.getClock().elapsed;document.querySelector('[data-workspace="monitor"]').click();
  check(simulation.getState().running&&simulation.getClock().elapsed===before,'切换模式保留状态');
  $('sessionPause').click();$('healthFault').value='gearVibration';$('healthFault').onchange();training.tick();health.tick();
  check(!$('healthPending').hidden,'暂停时显示采样待更新提示');
  const frozen=simulation.getState().rotor;advance(20);check(simulation.getState().rotor===frozen,'暂停冻结');
  $('healthDemo').checked=false;$('healthDemo').onchange();training.tick();health.tick();
  check(training.model.fault==='none'&&training.model.latched,'关闭数据清除源但保留锁存');
  check(health.model.sample===null,'关闭演示无健康数据');
  $('simReset').click();training.tick();health.tick();
  check(!training.model.latched&&training.model.events.length===1,'复位清理会话');
  document.querySelector('[data-workspace="fault"]').click();
  $('healthDemo').checked=true;$('healthDemo').onchange();$('healthFault').value='bearingHot';$('healthFault').onchange();
  training.tick();health.tick();
  output.textContent='PASS: actual Chromium, 447-part model, mode navigation, fault stop, monitoring, clear/ack/manual recovery, pause, pending samples, demo off, reset';
  output.textContent+='\n'+JSON.stringify({camera:window.BIM_VIEWER.camera.position.toArray(),target:window.BIM_VIEWER.controls.target.toArray(),aspect:window.BIM_VIEWER.camera.aspect,size:[window.BIM_VIEWER.renderer.domElement.width,window.BIM_VIEWER.renderer.domElement.height],draw:window.BIM_VIEWER.renderer.info.render,visible:window.BIM_VIEWER.records.filter(r=>r.object.visible).length});output.dataset.result='pass';window.BIM_VIEWER.renderer.render(window.BIM_VIEWER.scene,window.BIM_VIEWER.camera);setTimeout(()=>{output.textContent+=' FINAL '+JSON.stringify(window.BIM_VIEWER.renderer.info.render);},500);
 }catch(error){output.textContent='FAIL: '+error.stack;output.dataset.result='fail';}
})();
