// Educational AC-side dispatch; energy is MWh and time is simulated seconds.
export const DEFAULT_STORAGE=Object.freeze({capacityMWh:2,maxMW:.5,minSoc:10,maxSoc:90,initialSoc:50,efficiency:.95});
export function validateStorage(c){
 if(!Object.keys(DEFAULT_STORAGE).every(key=>Number.isFinite(c[key]))||c.capacityMWh<.01||c.capacityMWh>100||c.maxMW<=0||c.maxMW>20||c.minSoc<0||c.maxSoc>100||c.minSoc>=c.maxSoc||c.initialSoc<c.minSoc||c.initialSoc>c.maxSoc||c.efficiency<.01||c.efficiency>1)throw Error('参数无效：容量0.01–100 MWh，功率0–20 MW（不含0），0≤SOC下限<上限≤100，初始SOC在限值内，效率1–100%。');
 return {...c};
}
export function createEnergy(config=DEFAULT_STORAGE){const c=validateStorage(config);return {energyMWh:c.capacityMWh*c.initialSoc/100,soc:c.initialSoc,chargeMW:0,dischargeMW:0,gridMW:0,windMW:0,lossMW:0,chargedMWh:0,dischargedMWh:0,lossMWh:0,status:'待机'};}
export function stepEnergy(previous,c,input,dt){
 if(!Number.isFinite(dt)||dt<=0)return previous;
 const h=dt/3600,wind=Math.max(0,Number.isFinite(input.windMW)?input.windMW:0),requested=Math.max(0,Number.isFinite(input.requestMW)?input.requestMW:0),target=Math.max(0,Number.isFinite(input.targetMW)?input.targetMW:0);
 let charge=input.mode==='charge'?requested:input.mode==='auto'?Math.max(0,wind-target):0;
 let discharge=input.mode==='discharge'?requested:input.mode==='auto'?Math.max(0,target-wind):0;
 const min=c.capacityMWh*c.minSoc/100,max=c.capacityMWh*c.maxSoc/100;
 charge=Math.min(charge,c.maxMW,wind,Math.max(0,max-previous.energyMWh)/(c.efficiency*h));
 discharge=Math.min(discharge,c.maxMW,Math.max(0,previous.energyMWh-min)*c.efficiency/h);
 const energy=Math.max(min,Math.min(max,previous.energyMWh+(charge*c.efficiency-discharge/c.efficiency)*h));
 const loss=charge*(1-c.efficiency)+discharge*(1/c.efficiency-1);
 const status=charge>1e-9?'充电':discharge>1e-9?'放电':input.mode==='idle'?'待机':previous.energyMWh>=max-1e-10&&(input.mode==='charge'||wind>target)?'SOC上限 · 停止充电':previous.energyMWh<=min+1e-10&&(input.mode==='discharge'||wind<target)?'SOC下限 · 停止放电':input.mode==='charge'&&wind===0?'无风机功率 · 不从电网购电':'目标已满足 / 无功率需求';
 return {energyMWh:energy,soc:energy/c.capacityMWh*100,windMW:wind,chargeMW:charge,dischargeMW:discharge,gridMW:wind-charge+discharge,lossMW:loss,chargedMWh:previous.chargedMWh+charge*h,dischargedMWh:previous.dischargedMWh+discharge*h,lossMWh:previous.lossMWh+loss*h,status};
}
