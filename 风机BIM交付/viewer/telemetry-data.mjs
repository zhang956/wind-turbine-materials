import {TELEMETRY_POINTS} from './telemetry-points.mjs';
const copy=value=>structuredClone(value),keys=new Set(TELEMETRY_POINTS.map(p=>p.key));
export function createTelemetry(){
 let source=null,states=new Map(),rules={},staleMs=15000,events=[],serial=0;
 function log(type,key,level,time){events.push({id:++serial,type,key,level,time,sourceId:source?.sourceId,turbineId:source?.turbineId,acknowledged:false});if(events.length>500)events.shift();}
 function stateFor(key){if(!states.has(key))states.set(key,{quality:'missing',timestamp:null,value:null,unit:'',watermark:-Infinity,signature:null,level:'unconfigured',pending:null,history:[]});return states.get(key);}
 return {
  get events(){return copy(events);},get source(){return copy(source);},get staleMs(){return staleMs;},
  beginSource(){source=null;states=new Map();},
  configure(config){
   if(config?.schemaVersion!==1||!Number.isFinite(config.staleMs)||config.staleMs<1000||config.staleMs>3600000||!config.rules||typeof config.rules!=='object'||Array.isArray(config.rules))throw Error('规则格式错误：schemaVersion=1，staleMs范围1000–3600000毫秒。');
   for(const [key,r] of Object.entries(config.rules))if(!keys.has(key)||!r||![r.warning,r.alarm,r.holdMs,r.hysteresis].every(Number.isFinite)||r.warning>=r.alarm||r.holdMs<0||r.holdMs>3600000||r.hysteresis<0)throw Error('测点或阈值无效：warning < alarm，holdMs 0–3600000，hysteresis ≥ 0。');
   rules=copy(config.rules);staleMs=config.staleMs;states=new Map();
  },
  ingest(packet,now=Date.now()){
   if(packet?.schemaVersion!==1||typeof packet.sourceId!=='string'||!packet.sourceId.trim()||packet.sourceId.length>128||typeof packet.turbineId!=='string'||!packet.turbineId.trim()||packet.turbineId.length>128||!Array.isArray(packet.points)||packet.points.length>1000)throw Error('数据契约错误：需要schemaVersion、sourceId、turbineId和points。');
   const seen=new Set();for(const p of packet.points){if(!p||!keys.has(p.key)||seen.has(p.key))throw Error('含未知或重复测点：'+p?.key);seen.add(p.key);}
   if(source&&(source.sourceId!==packet.sourceId||source.turbineId!==packet.turbineId))throw Error('来源或机组变化，请断开并重新连接。');
   source={sourceId:packet.sourceId,turbineId:packet.turbineId};
   for(const def of TELEMETRY_POINTS)if(!seen.has(def.key)){const s=stateFor(def.key);s.quality='missing';s.value=null;s.pending=null;}
   for(const p of packet.points){
    const def=TELEMETRY_POINTS.find(d=>d.key===p.key),s=stateFor(p.key);
    const ts=typeof p.timestamp==='number'?p.timestamp:typeof p.timestamp==='string'&&/(Z|[+-]\d\d:\d\d)$/.test(p.timestamp)?Date.parse(p.timestamp):NaN;
    let quality=(!Number.isFinite(ts)||Math.abs(ts)>8640000000000000)?'invalid':ts>now+5000?'future':ts<s.watermark?'out_of_order':p.unit!==def.unit?'unit':typeof p.value!=='number'||!Number.isFinite(p.value)?'invalid':p.quality==='good'?'good':p.quality==='bad'||p.quality==='uncertain'?p.quality:'invalid';
    const signature=JSON.stringify([p.value,p.unit,p.quality]);
    if(quality==='good'&&ts===s.watermark){if(signature===s.signature){s.quality='good';s.timestamp=ts;s.value=p.value;s.unit=p.unit;continue;}quality='conflict';}
    const previousTime=s.timestamp;
    if(Number.isFinite(ts)&&ts<=now+5000&&ts>=s.watermark){s.watermark=ts;s.signature=signature;}
    s.timestamp=Number.isFinite(ts)&&Math.abs(ts)<=8640000000000000?ts:null;s.quality=quality;s.value=quality==='good'?p.value:null;s.unit=p.unit;
    if(quality!=='good'||now-ts>staleMs){s.pending=null;continue;}
    s.history.push({time:ts,value:p.value});if(s.history.length>300)s.history.shift();
    const rule=rules[p.key];if(!rule){s.level='unconfigured';continue;}
    let desired=p.value>=rule.alarm?'alarm':p.value>=rule.warning?'warning':'normal';
    if(s.level==='alarm'&&p.value>=rule.alarm-rule.hysteresis)desired='alarm';
    else if(s.level==='warning'&&p.value>=rule.warning-rule.hysteresis&&desired==='normal')desired='warning';
    if(s.level==='unconfigured')s.level='normal';
    if(desired===s.level){s.pending=null;continue;}
    if(!s.pending||s.pending.level!==desired||previousTime===null||ts-previousTime>staleMs)s.pending={level:desired,since:ts};
    if(ts-s.pending.since>=rule.holdMs){s.level=desired;s.pending=null;log(desired==='normal'?'recovered':'raised',p.key,desired,ts);}
   }
  },
  rows(now=Date.now()){return TELEMETRY_POINTS.map(p=>{const s=stateFor(p.key),quality=s.quality==='good'&&now-s.timestamp>staleMs?'stale':s.quality;return {...p,value:s.value,timestamp:s.timestamp,quality,assessment:quality==='good'?s.level:'unknown',retainedAlarm:['warning','alarm'].includes(s.level)?s.level:null,pending:copy(s.pending),history:copy(s.history)};});},
  acknowledge(id,now=Date.now()){const e=events.find(e=>e.id===id);if(!e||e.type!=='raised'||e.acknowledged)return;e.acknowledged=true;events.push({id:++serial,type:'ack',key:e.key,level:e.level,time:now,sourceId:e.sourceId,turbineId:e.turbineId,acknowledged:true});if(events.length>500)events.shift();},
  restoreHistory(items){if(!Array.isArray(items))return;events=items.filter(e=>e&&Number.isSafeInteger(e.id)&&e.id>0&&keys.has(e.key)&&['raised','recovered','ack'].includes(e.type)&&['normal','warning','alarm'].includes(e.level)&&Number.isFinite(e.time)&&typeof e.sourceId==='string'&&typeof e.turbineId==='string').slice(-500).map(e=>({...e,acknowledged:e.acknowledged===true}));serial=Math.max(0,...events.map(e=>e.id));}
 };
}
