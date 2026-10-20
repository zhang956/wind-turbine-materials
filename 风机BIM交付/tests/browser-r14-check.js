(async()=>{
 const result=document.createElement('pre');result.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:99;padding:12px;background:#153039;color:white';document.body.append(result);
 const check=(v,s)=>{if(!v)throw Error(s)},$=id=>document.getElementById(id);
 try{
  for(let i=0;i<100&&!window.BIM_VIEWER;i++)await new Promise(r=>setTimeout(r,100));
  const v=window.BIM_VIEWER;check(v,'model');v.renderer.setAnimationLoop(null);
  document.querySelector('[data-workspace="monitor"]').click();check(!$('telemetryConnect').closest('.workspace-group').hidden,'panel visible');
  check($('telemetryQuality').textContent.includes('无健康结论'),'initial unknown');
  const now=Date.now(),key='main_bearing_temperature';
  const packet={schemaVersion:1,sourceId:'BROWSER TEST ONLY',turbineId:'TEST',points:[{key,value:95,unit:'degC',quality:'good',timestamp:now}]};
  const files=new DataTransfer();files.items.add(new File([JSON.stringify(packet)],'test.json',{type:'application/json'}));$('telemetryFile').files=files.files;await $('telemetryFile').onchange();
  check($('telemetryConnection').textContent.includes('非实时'),'snapshot label');check($('telemetryQuality').textContent.includes('未配置判据'),'no default rule');
  const ruleInput=$('telemetryRules');let finishOld;
  const oldFile={size:20,text:()=>new Promise(resolve=>{finishOld=resolve})};
  const rule=staleMs=>JSON.stringify({schemaVersion:1,staleMs,rules:{}});
  Object.defineProperty(ruleInput,'files',{configurable:true,value:[oldFile]});const oldRead=ruleInput.onchange();
  Object.defineProperty(ruleInput,'files',{configurable:true,value:[{size:20,text:async()=>rule(2000)}]});await ruleInput.onchange();finishOld(rule(1000));await oldRead;
  check(v.telemetry.model.staleMs===2000,'newest rule wins');delete ruleInput.files;
  const m=v.telemetry.model;m.configure({schemaVersion:1,staleMs:15000,rules:{[key]:{warning:70,alarm:90,holdMs:0,hysteresis:5}}});m.ingest(packet,now);v.telemetry.render();check($('telemetryQuality').textContent.includes('报警'),'alarm');
  $('telemetryHistory').querySelector('button').click();check(m.events.some(e=>e.type==='ack'),'ack');
  m.ingest({...packet,points:[{...packet.points[0],timestamp:now+1,value:50,quality:'bad'}]},now+1);v.telemetry.render();check($('telemetryQuality').textContent.includes('无健康结论'),'bad unknown');check(m.events.every(e=>e.type!=='recovered'),'bad no recovery');
  $('telemetryLocate').click();$('lowQuality').click();check(v.renderer.getPixelRatio()===1,'quality');
  v.renderer.render(v.scene,v.camera);const img=document.createElement('img');img.src=v.renderer.domElement.toDataURL();img.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';$('viewport').append(img);
  result.textContent='PASS R14: model447 / panel / JSON import / no default thresholds / alarm / acknowledge / bad quality / locate / low quality';
 }catch(e){result.textContent='FAIL R14: '+e.stack;}
})();
