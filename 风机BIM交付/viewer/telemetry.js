import {createTelemetry} from './telemetry-data.mjs';
import {TELEMETRY_POINTS} from './telemetry-points.mjs';
const HISTORY_KEY='v90.telemetry.history.v1';
const qualityNames={good:'有效',missing:'缺失',bad:'坏质量',uncertain:'不确定',invalid:'格式错误',future:'未来时间',out_of_order:'乱序',unit:'单位不匹配',conflict:'同时间戳数值冲突',stale:'已过期'};
export function mountTelemetry({locate}){
 const $=id=>document.getElementById(id),model=createTelemetry();
 let connected=false,generation=0,ruleGeneration=0,controller=null,timer=null,sourceKind='未接入',connection='未连接',selected=TELEMETRY_POINTS[0].key,lastStored='',notice='';
 try{model.restoreHistory(JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]'));}catch{notice='本地历史不可读取；可使用导出保存记录。';}
 for(const point of TELEMETRY_POINTS){const option=document.createElement('option');option.value=point.key;option.textContent=point.name;$('telemetryPoint').append(option);}
 function persist(){const text=JSON.stringify(model.events);if(text===lastStored)return;lastStored=text;try{localStorage.setItem(HISTORY_KEY,text);}catch{notice='浏览器存储不可用，历史仅保留在当前页面；请及时导出。';}}
 function stop(){connected=false;generation++;controller?.abort();controller=null;clearTimeout(timer);timer=null;connection='已断开；保留最后读数，过期后无健康结论';render();}
 async function poll(token,url,interval){
  if(!connected||token!==generation)return;
  if(document.hidden){timer=setTimeout(()=>poll(token,url,interval),interval);return;}
  const request=new AbortController();controller=request;const timeout=setTimeout(()=>request.abort(),5000);
  try{
   const response=await fetch(url,{cache:'no-store',signal:request.signal});if(!response.ok)throw Error('HTTP '+response.status);
   const text=await response.text();if(text.length>1048576)throw Error('响应超过1MB');const packet=JSON.parse(text);
   if(token!==generation)return;model.ingest(packet);connection='HTTP轮询成功 · '+new Date().toLocaleTimeString();
  }catch(error){if(token!==generation)return;connection='连接异常：'+(error.name==='AbortError'?'请求超时':error.message)+'；旧值不代表当前状态';}
  finally{clearTimeout(timeout);if(token===generation&&connected){render();timer=setTimeout(()=>poll(token,url,interval),interval);}}
 }
 $('telemetryConnect').onclick=()=>{
  try{
   if(location.protocol==='file:')throw Error('HTTP接入需通过服务访问页面；离线入口可导入JSON快照。');
   const raw=$('telemetryUrl').value.trim(),url=new URL(raw,location.href),seconds=Number($('telemetryInterval').value);
   if(!raw.startsWith('/')||url.origin!==location.origin||url.username||url.password||!Number.isFinite(seconds)||seconds<1||seconds>60)throw Error('请输入同源相对地址（如/api/telemetry）及1–60秒轮询间隔。');
   stop();model.beginSource();sourceKind='HTTP接入数据 · 来源需现场核实';connected=true;connection='正在连接';const token=generation;render();poll(token,url.href,seconds*1000);
  }catch(error){notice=error.message;render();}
 };
 $('telemetryDisconnect').onclick=stop;
 async function readFile(input){const file=input.files?.[0];if(!file)return null;if(file.size>1048576)throw Error('文件不能超过1MB');return JSON.parse(await file.text());}
 $('telemetryFile').onchange=async()=>{const token=++generation;controller?.abort();clearTimeout(timer);connected=false;try{const packet=await readFile($('telemetryFile'));if(!packet||token!==generation)return;createTelemetry().ingest(packet);stop();model.beginSource();model.ingest(packet);sourceKind='导入JSON快照 · 非实时连接';connection='快照已载入';notice='';render();}catch(error){notice='导入失败：'+error.message;render();}finally{$('telemetryFile').value='';}};
 $('telemetryRules').onchange=async()=>{const token=++ruleGeneration;try{const config=await readFile($('telemetryRules'));if(!config||token!==ruleGeneration)return;model.configure(config);notice='规则已应用，等待新样本；原告警保留为历史。阈值需现场确认。';render();}catch(error){if(token!==ruleGeneration)return;notice='规则未应用：'+error.message;render();}finally{if(token===ruleGeneration)$('telemetryRules').value='';}};
 $('telemetryPoint').onchange=()=>{selected=$('telemetryPoint').value;render();};
 $('telemetryLocate').onclick=()=>locate(TELEMETRY_POINTS.find(p=>p.key===selected).assetId);
 for(const id of ['telemetryFilter','telemetryFrom','telemetryTo'])$(id).onchange=render;
 $('telemetryExport').onclick=()=>{
  const blob=new Blob([JSON.stringify({schemaVersion:1,version:'R14',source:'浏览器接入告警历史；不含教学故障事件',events:model.events},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='V90-R14-接入告警历史.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 function render(){
  const rows=model.rows(),row=rows.find(p=>p.key===selected),source=model.source;
  $('telemetryConnection').textContent=`${sourceKind} · ${connection}${source?' · '+source.sourceId+' / '+source.turbineId:''}`;
  $('telemetryNotice').textContent=notice;$('telemetryDisconnect').disabled=!connected;
  $('telemetryValue').textContent=row.quality==='good'?`${row.value.toFixed(3)} ${row.unit}`:row.value!==null?`${row.value.toFixed(3)} ${row.unit}（历史值）`:'—';
  $('telemetryQuality').textContent=`质量：${qualityNames[row.quality]} · ${row.timestamp===null?'无时间戳':new Date(row.timestamp).toISOString()} · ${row.assessment==='unknown'?'无健康结论':row.assessment==='unconfigured'?'未配置判据':{normal:'未超限',warning:'关注',alarm:'报警'}[row.assessment]}${row.retainedAlarm&&row.quality!=='good'?'；先前告警未恢复':''}${row.pending?'；状态变化等待持续时间确认':''}`;
  const history=row.history,plot=$('telemetryTrend');plot.replaceChildren();
  if(history.length){const low=Math.min(...history.map(p=>p.value)),high=Math.max(...history.map(p=>p.value)),first=history[0].time,last=history.at(-1).time,span=Math.max(1,high-low);const points=history.map(p=>`${(8+(p.time-first)/Math.max(1,last-first)*244).toFixed(2)},${(75-(p.value-low)/span*60).toFixed(2)}`).join(' ');plot.innerHTML=`<svg viewBox="0 0 260 90" role="img" aria-label="接入测点趋势"><polyline points="${points}" fill="none" stroke="#75dcd2" stroke-width="2"/></svg>`;}
  $('telemetryRange').textContent=history.length?`最近${history.length}个有效样本 · ${new Date(history[0].time).toLocaleTimeString()}–${new Date(history.at(-1).time).toLocaleTimeString()}`:'无有效样本';
  const counts={};for(const p of rows)counts[p.quality]=(counts[p.quality]||0)+1;$('telemetrySummary').textContent=Object.entries(counts).map(([q,n])=>`${qualityNames[q]} ${n}`).join(' · ');
  const filter=$('telemetryFilter').value,from=$('telemetryFrom').value?Date.parse($('telemetryFrom').value):-Infinity,to=$('telemetryTo').value?Date.parse($('telemetryTo').value):Infinity;
  const events=model.events.filter(e=>(filter!=='unack'||e.type==='raised'&&!e.acknowledged)&&e.time>=from&&e.time<=to).reverse();
  $('telemetryHistory').replaceChildren();for(const e of events.slice(0,100)){const li=document.createElement('li');li.textContent=`${new Date(e.time).toLocaleString()} · ${e.sourceId}/${e.turbineId} · ${TELEMETRY_POINTS.find(p=>p.key===e.key).name} · ${e.type==='ack'?'已确认':e.type==='recovered'?'恢复':e.level==='alarm'?'报警':'关注'} `;if(e.type==='raised'){const b=document.createElement('button');b.textContent=e.acknowledged?'已确认':'确认';b.disabled=e.acknowledged;b.onclick=()=>{model.acknowledge(e.id);render();};li.append(b);}$('telemetryHistory').append(li);}
  $('telemetryHistoryCount').textContent=`筛选${events.length}条，显示最近100条；总保留${model.events.length}/500条。确认不代表故障恢复。`;persist();
 }
 render();const qualityTimer=setInterval(render,1000);
 return {model,render,stop,destroy(){stop();clearInterval(qualityTimer);}};
}
