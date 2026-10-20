(async()=>{
 const result=document.createElement('pre');result.id='r13-result';result.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:99;padding:10px;background:#153039;color:white;white-space:pre-wrap';document.body.prepend(result);
 const check=(value,message)=>{if(!value)throw Error(message);},$=id=>document.getElementById(id);
 window.addEventListener('error',e=>{result.textContent+=' RUNTIME ERROR '+e.message;});
 try{
  for(let i=0;i<100&&!window.BIM_VIEWER;i++)await new Promise(r=>setTimeout(r,100));
  check(window.BIM_VIEWER,'模型加载失败');
  const v=window.BIM_VIEWER,{simulation:s,training:t,health:h,replay:r,storage:b}=v;v.renderer.setAnimationLoop(null);let time=performance.now();
  const advance=n=>{for(let i=0;i<n;i++){s.tick(time+=100);b.tick();if(i%10===0){t.tick();r.tick(time);}}t.tick();r.tick(time);h.tick();};
  const mode=value=>{$('storageMode').value=value;$('storageMode').onchange();};
  document.querySelector('[data-workspace="operation"]').click();$('simSpeedNumber').value='16';$('simSpeedNumber').oninput();advance(400);
  mode('auto');advance(100);check(b.getSnapshot().energy.chargeMW>0,'大风自动充电');
  const e=b.getSnapshot().energy;check(Math.abs(e.windMW+e.dischargeMW-e.chargeMW-e.gridMW)<1e-9,'交流功率平衡');
  $('sessionPause').click();const paused=b.getSnapshot();advance(50);check(JSON.stringify(b.getSnapshot())===JSON.stringify(paused),'暂停不改变储能');$('sessionPause').click();
  advance(1);$('simTimeScale').value='0.1';const beforeSlow=b.getSnapshot(),clock=s.getClock();advance(10);check(Math.abs(s.getClock().elapsed-clock.elapsed-.1)<1e-8,'慢放时钟');check(Math.abs(b.getSnapshot().energy.energyMWh-beforeSlow.energy.energyMWh-.5*.95*.1/3600)<1e-8,'慢放能量');$('simTimeScale').value='1';
  b.setVisible(false);const beforeHidden=b.getSnapshot().energy.energyMWh;advance(20);check(b.getSnapshot().energy.energyMWh>beforeHidden,'隐藏仍计算');b.setVisible(true);
  $('simSpeedNumber').value='2';$('simSpeedNumber').oninput();advance(600);check(b.getSnapshot().energy.dischargeMW>0,'低风自动放电');
  const recorded=r.recording.frames.find(f=>f.storage?.energy.chargeMW>0);check(recorded,'储能已录制');
  const live=b.getSnapshot();$('replayEnter').click();$('replaySeek').value=recorded.time;$('replaySeek').oninput();check($('replayValues').textContent.includes('储能SOC'),'回放显示历史储能');
  check(parseFloat($('storageSoc').textContent)===Number(recorded.storage.energy.soc.toFixed(3)),'历史SOC正确');advance(30);check(JSON.stringify(b.getSnapshot())===JSON.stringify(live),'回放不积分');$('replayExit').click();check(JSON.stringify(b.getSnapshot())===JSON.stringify(live),'退出恢复实时电量');
  $('storageCapacity').value='.01';$('storageInitial').value='89.9';$('storageApply').click();$('simSpeedNumber').value='16';$('simSpeedNumber').oninput();$('sessionPause').click();advance(400);mode('charge');advance(100);
  check(Math.abs(b.getSnapshot().energy.soc-90)<1e-8&&b.getSnapshot().energy.chargeMW<1e-9,'SOC上限停止');check(b.arrows.every(a=>!a.visible),'无功率不显示箭头');
  $('storageInitial').value='10.1';$('storageApply').click();mode('discharge');advance(100);check(Math.abs(b.getSnapshot().energy.soc-10)<1e-8&&b.getSnapshot().energy.dischargeMW<1e-9,'SOC下限停止');
  const valid=b.getSnapshot();$('storageEfficiency').value='0';$('storageApply').click();check(JSON.stringify(b.getSnapshot())===JSON.stringify(valid)&&$('storageError').textContent.includes('参数无效'),'非法配置不生效');
  $('storageEfficiency').value='95';$('storageCapacity').value='2';$('storageInitial').value='50';$('storageApply').click();mode('charge');advance(20);$('simReset').click();b.tick();t.tick();r.tick(time);check(b.getSnapshot().energy.soc===50&&b.getSnapshot().mode==='idle'&&b.getSnapshot().energy.chargedMWh===0,'仿真复位同步储能');
  $('simSpeedNumber').value='16';$('simSpeedNumber').oninput();advance(400);mode('auto');advance(30);$('storageFocus').click();$('storageMode').scrollIntoView({block:'start'});
  result.textContent='PASS R13: auto charge/discharge; AC balance; pause/slow clock; hidden integration; replay isolation/history; SOC limits; arrow gating; invalid config; synchronized reset.';
  v.renderer.render(v.scene,v.camera);const img=new Image();img.src=v.renderer.domElement.toDataURL();img.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none';$('viewport').append(img);
 }catch(error){result.textContent='FAIL R13: '+error.stack;}
})();
