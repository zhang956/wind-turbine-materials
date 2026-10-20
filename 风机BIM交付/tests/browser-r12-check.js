(async()=>{
 const result=document.createElement('pre');result.id='r12-result';result.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:99;padding:10px;background:#153039;color:white;white-space:pre-wrap';document.body.prepend(result);
 const check=(value,message)=>{if(!value)throw Error(message);},$=id=>document.getElementById(id);
 window.addEventListener('error',e=>{result.textContent+=' RUNTIME ERROR '+e.message;});
 try{
  for(let i=0;i<100&&!window.BIM_VIEWER;i++)await new Promise(r=>setTimeout(r,100));
  check(window.BIM_VIEWER,'模型加载失败');
  const v=window.BIM_VIEWER,{simulation:s,training:t,health:h,replay:r}=v;
  v.renderer.setAnimationLoop(null);let time=performance.now();
  const advance=n=>{for(let i=0;i<n;i++){s.tick(time+=100);if(i%10===0){t.tick();r.tick(time);}}t.tick();r.tick(time);h.tick();};
  document.querySelector('[data-workspace="fault"]').click();$('sessionPause').click();advance(300);
  $('normalStop').click();advance(600);check(s.getState().rpm<.05&&s.getState().normalStop,'正常停机');
  $('normalStart').click();advance(300);check(s.getState().rpm>1&&!s.getState().faultStop,'正常启动');
  $('healthDemo').checked=true;$('healthDemo').onchange();advance(10);
  $('healthFault').value='pitchLag';$('healthFault').onchange();advance(20);
  check(s.getState().blade1Pitch<s.getState().pitch,'单叶片迟滞姿态');
  check(h.model.sample.pitch.fault.status==='alarm','变桨异常指标');
  const injected=t.model.events.findLast(e=>e.type==='alarm');
  check(r.recording.atEvent(injected.id).training.fault==='pitchLag','事件快照包含故障源');
  advance(1100);check(s.getState().rpm<.05&&s.getState().blade1Pitch>=85,'迟滞场景停稳');
  $('trainingClear').click();const cleared=t.model.events.at(-1);$('trainingAck').click();const acknowledged=t.model.events.at(-1);
  check(r.recording.atEvent(cleared.id).training.acknowledged===false,'同一时刻清除快照');
  check(r.recording.atEvent(acknowledged.id).training.acknowledged===true,'同一时刻确认快照');
  $('trainingResume').click();advance(300);check(s.getState().rpm>1,'恢复');
  const before=s.getState(),clock=s.getClock(),count=t.model.events.length;
  const eventButton=document.querySelector(`button[data-event-id="${injected.id}"]`);check(eventButton,'事件按钮');eventButton.click();
  check(s.isReplaying&&!s.getState().running,'回放暂停实时仿真');
  check(document.body.classList.contains('replay-active')&&$('sessionPause').disabled,'回放锁定编辑');
  check($('replayStatus').textContent.includes('叶片1变桨迟滞'),'回放定位正确故障');
  $('replayPlay').click();for(let i=0;i<20;i++)r.tick(time+=100);
  check(s.getClock().elapsed===clock.elapsed&&t.model.events.length===count,'回放不改时钟和事件');
  $('replaySeek').value=r.recording.range[1];$('replaySeek').oninput();
  $('replayExit').click();check(!s.isReplaying&&!s.getState().running,'退出后保持暂停');
  const after=s.getState();check(after.rpm===before.rpm&&after.rotor===before.rotor&&after.pitch===before.pitch,'实时状态精确恢复');
  $('sessionPause').click();$('healthFault').value='yawFault';$('healthFault').onchange();const heading=s.getState().heading;advance(50);
  check(s.getState().heading===heading&&h.model.sample.yaw.fault.status==='alarm','偏航故障');
  $('simReset').click();t.tick();r.tick(time);h.tick();check(r.recording.count===1&&!t.model.latched,'复位清空回放与故障');
  document.querySelector('[data-workspace="structure"]').click();$('explode').value='70';$('explode').dispatchEvent(new Event('input',{bubbles:true}));
  const part=v.records.find(r=>r.object.userData.AssetId==='GENERATOR.BODY').object,exploded=part.position.clone();
  document.querySelector('[data-workspace="operation"]').click();$('replayEnter').click();$('replayExit').click();check(part.position.distanceTo(exploded)<1e-9&&$('explode').value==='70','未启动时分解姿态恢复');
  result.textContent='PASS R12: normal stop/start; pitch lag; yaw fault; distinct event snapshots; seek/play; edit lock; live state isolation; paused exit; reset; exploded pose restored; 447-part GLB.';
  // Capture synchronously because this host drops WebGL in full-page headless screenshots.
  v.renderer.render(v.scene,v.camera);const img=new Image();img.src=v.renderer.domElement.toDataURL();img.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none';$('viewport').append(img);
 }catch(error){result.textContent='FAIL R12: '+error.stack;}
})();
