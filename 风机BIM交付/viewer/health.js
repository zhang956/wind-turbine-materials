import * as THREE from 'three';
import {GROUPS,createHealth} from './health-data.mjs?v=r12-replay';
const colors={unknown:'#98a8b5',info:'#75c8dd',ok:'#70d9bc',warning:'#ffcd6b',alarm:'#ff8c8c'};
export function mountHealth({records,viewport,camera,simulation,locate}){
 const $=id=>document.getElementById(id),model=createHealth(),markers=[];
 let selected='bearing',metricKey='',dirty=true;
 for(const g of GROUPS){
  const option=document.createElement('option');option.value=g.id;option.textContent=g.name;$('healthGroup').append(option);
  const r=records.find(r=>r.object.userData.AssetId===g.asset);if(!r)throw Error('监测部件不存在：'+g.asset);
  const button=document.createElement('button');button.className='health-marker';button.textContent='● '+g.name;button.title='定位'+g.name+'监测点（示意）';button.onclick=()=>choose(g.id,true);const leader=document.createElement('div');leader.className='health-leader';viewport.append(leader,button);markers.push({g,r,button,leader});
 }
 function choose(id,focus){selected=id;$('healthGroup').value=id;metricKey='';dirty=true;if(focus)locate(GROUPS.find(g=>g.id===id).asset);render();}
 $('healthGroup').onchange=()=>choose($('healthGroup').value,true);
 $('healthFocus').onclick=()=>locate(GROUPS.find(g=>g.id===selected).asset);
 $('healthDemo').onchange=()=>{model.setDemo($('healthDemo').checked);$('healthFault').disabled=!model.demo;dirty=true;};
 $('healthFault').onchange=()=>{model.setFault($('healthFault').value);$('healthSource').textContent='场景已选择，随下一次仿真采样生效；暂停时请先继续风况仿真。';};
 $('healthMetric').onchange=()=>{metricKey=$('healthMetric').value;dirty=true;render();};
 function status(group){if(!group)return 'unknown';const entries=Object.values(group);return entries.some(m=>m.status==='alarm')?'alarm':entries.some(m=>m.status==='warning')?'warning':entries.some(m=>m.status==='ok')?'ok':'info';}
 function render(){
  $('healthPending').hidden=!model.pending;
  if(!dirty)return;dirty=false;
  const values=model.sample?.[selected],groupStatus=status(values);
  $('healthState').textContent={unknown:'未接入 · 无健康结论',info:'演示参数 · 未配置健康判据',ok:'演示：未触发教学上限',warning:'演示关注 · 达到教学上限',alarm:'演示报警 · 达到教学上限'}[groupStatus];$('healthState').style.color=colors[groupStatus];
  $('healthSource').textContent=model.demo?`演示数据 · 仿真时刻 ${model.history.at(-1)?.time.toFixed(1)??'0.0'} s · ${simulation.getState().running?'随仿真更新':'未运行或已暂停'}；非实际传感器读数`:'未连接SCADA/CMS。启用演示后才显示示例数值。';
  const list=$('healthValues');list.replaceChildren();
  if(!values){list.textContent='暂无监测数据';$('healthMetric').replaceChildren();$('healthTrend').replaceChildren();$('healthRange').textContent='等待演示数据';return;}
  if(!values[metricKey])metricKey=Object.keys(values)[0];
  const selector=$('healthMetric');selector.replaceChildren();
  for(const [key,m] of Object.entries(values)){
   const option=document.createElement('option');option.value=key;option.textContent=m.name+' / '+m.unit;selector.append(option);
   const row=document.createElement('div');row.className='health-value';
   const title=document.createElement('span');title.textContent=m.name;
   const value=document.createElement('strong');value.textContent=m.value.toFixed(2)+' '+m.unit;value.style.color=colors[m.status];
   const note=document.createElement('small');note.textContent=m.kind+' · '+m.reason;row.append(title,value,note);list.append(row);
  }
  selector.value=metricKey;
  const points=model.history.map(s=>({time:s.time,value:s.data[selected][metricKey].value}));
  const min=Math.min(...points.map(p=>p.value)),max=Math.max(...points.map(p=>p.value)),span=Math.max(1,max-min),first=points[0].time,last=points.at(-1).time;
  const coords=points.map(p=>`${(10+(p.time-first)/Math.max(1,last-first)*240).toFixed(2)},${(75-(p.value-min)/span*60).toFixed(2)}`).join(' ');
  // Only generated numeric coordinates are interpolated; labels use textContent.
  $('healthTrend').innerHTML=`<svg viewBox="0 0 260 90" role="img" aria-label="所选参数最近采样趋势"><path d="M10 10 V80 H250" fill="none" stroke="#496173"/><polyline points="${coords}" fill="none" stroke="#75dcd2" stroke-width="2"/><circle cx="${coords.split(' ').at(-1).split(',')[0]}" cy="${coords.split(' ').at(-1).split(',')[1]}" r="3" fill="#75dcd2"/></svg>`;
  $('healthRange').textContent=`${first.toFixed(1)}–${last.toFixed(1)} 仿真秒 · ${min.toFixed(2)}–${max.toFixed(2)} ${values[metricKey].unit} · ${points.length} 点`;
 }
 $('healthControls').disabled=false;
 let previousRunning=null;
 return {model,markers,tick(){
  if(simulation.isReplaying){for(const {button,leader} of markers){button.hidden=true;leader.hidden=true;}dirty=true;return;}
  const state=simulation.getState(),clock=simulation.getClock();
  if(model.update(state,simulation.getWind(),clock))dirty=true;
  if(previousRunning!==state.running){previousRunning=state.running;dirty=true;}
  if($('healthFault').value!==model.fault)$('healthFault').value=model.fault;
  render();
  camera.updateMatrixWorld();
  const placed=[];
  for(const {g,r,button,leader} of markers){
   let visible=$('healthMarkers').checked;for(let o=r.object;o;o=o.parent)visible=visible&&o.visible;
   const p=new THREE.Box3().setFromObject(r.object).getCenter(new THREE.Vector3()).project(camera);
   visible=visible&&p.z>=-1&&p.z<=1&&Math.abs(p.x)<1&&Math.abs(p.y)<1;button.hidden=!visible;leader.hidden=!visible;
   if(visible){
    const x=(p.x+1)/2*viewport.clientWidth,y=(1-p.y)/2*viewport.clientHeight;
    const bx=Math.max(55,Math.min(viewport.clientWidth-55,x+55));let by=Math.max(18,Math.min(viewport.clientHeight-18,y-25));
    const collides=()=>placed.some(p=>Math.abs(p.x-bx)<110&&Math.abs(p.y-by)<28);
    while(collides()&&by<viewport.clientHeight-46)by+=28;
    if(collides()){by=18;while(collides()&&by<viewport.clientHeight-46)by+=28;}
    placed.push({x:bx,y:by});button.style.left=bx+'px';button.style.top=by+'px';button.style.borderColor=colors[status(model.sample?.[g.id])];
    leader.style.left=x+'px';leader.style.top=y+'px';leader.style.width=Math.hypot(bx-x,by-y)+'px';leader.style.transform=`rotate(${Math.atan2(by-y,bx-x)}rad)`;
   }
  }
 }};
}
