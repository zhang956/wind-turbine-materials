(async()=>{
 const result=document.createElement('pre');result.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:99;padding:12px;background:#153039;color:white;white-space:pre-wrap';document.body.append(result);
 const check=(v,s)=>{if(!v)throw Error(s)},$=id=>document.getElementById(id);
 try{
  for(let i=0;i<100&&!window.BIM_VIEWER;i++)await new Promise(r=>setTimeout(r,100));
  const v=window.BIM_VIEWER;check(v,'model loaded');v.renderer.setAnimationLoop(null);
  const {simulation:s,training:t,health:h,replay:r,storage:b}=v;let time=performance.now();
  const advance=n=>{for(let i=0;i<n;i++){s.tick(time+=100);b.tick();t.tick();r.tick(time);}h.tick();};
  document.querySelector('[data-workspace="fault"]').click();
  check($('trainingScenario').options.length===4,'four lessons');
  for(const key of ['bearingHot','gearVibration','pitchLag','yawFault']){
   $('trainingScenario').value=key;$('trainingScenario').onchange();check(t.model.fault==='none','preview does not inject');
   if(!s.getState().running)$('sessionPause').click();advance(50);
   $('trainingInject').click();check(t.model.fault===key&&t.model.latched,'injected '+key);check($('healthDemo').checked,'demo enabled');check($('trainingInject').disabled,'no overlapping inject');
   check($('trainingChecklist').children.length===5,'five checks');check(!$('trainingChecklist').hidden,'checks shown');
   $('trainingAck').click();check($('trainingResume').disabled,'active fault prevents resume');
   $('trainingClear').click();check(t.model.latched,'clear retains latch');
   for(let i=0;i<300&&!t.model.canResume(s.getState());i++)advance(10);
   check(t.model.canResume(s.getState()),'stopped and feathered '+key);$('trainingResume').click();check(!t.model.latched,'manual resume '+key);
  }
  check(t.model.completed===4,'four completed');check($('trainingCompletion').textContent.includes('4'),'completion UI');
  $('replayEnter').click();check(s.isReplaying,'replay');check(getComputedStyle($('trainingScenario').closest('.workspace-group')).display==='none','live guide hidden in replay');
  const before=t.model.events.length;$('trainingInject').onclick();check(t.model.events.length===before,'replay blocks inject');$('replayExit').click();advance(1);
  $('simReset').click();advance(1);check(t.model.completed===0&&t.model.lastFault==='none','reset clears progress');
  $('healthDemo').checked=true;$('healthDemo').onchange();$('healthFault').value='pitchLag';$('healthFault').onchange();check($('trainingScenario').value==='pitchLag','legacy selection sync');
  check($('trainingState').textContent.includes('暂停'),'paused hint');
  document.querySelector('main > aside').scrollTop=0;
  v.renderer.render(v.scene,v.camera);const img=document.createElement('img');img.src=v.renderer.domElement.toDataURL();img.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';$('viewport').append(img);
  result.textContent='PASS R15: four scenarios / preview / inject / clear+ack / 5 recovery checks / manual resume / completion / replay isolation / reset / legacy selector';
 }catch(e){result.textContent='FAIL R15: '+e.stack;}
})();
