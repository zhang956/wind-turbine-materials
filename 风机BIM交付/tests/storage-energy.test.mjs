import assert from 'node:assert/strict';
import {DEFAULT_STORAGE,createEnergy,stepEnergy,validateStorage} from '../viewer/storage-energy.mjs';
const c={...DEFAULT_STORAGE};
let s=stepEnergy(createEnergy(c),c,{mode:'charge',windMW:1,requestMW:.3,targetMW:1},3600);
assert.ok(Math.abs(s.energyMWh-1.285)<1e-10);assert.equal(s.gridMW,.7);
assert.ok(Math.abs(s.energyMWh-1+s.lossMWh-.3)<1e-10,'充电能量守恒');
let d=stepEnergy(createEnergy(c),c,{mode:'discharge',windMW:0,requestMW:.3,targetMW:1},3600);
assert.ok(Math.abs(1-d.energyMWh-.3-d.lossMWh)<1e-10,'放电守恒');
for(const mode of ['charge','discharge']){
 let a=stepEnergy(createEnergy(c),c,{mode,windMW:2,requestMW:10,targetMW:1},360000);
 assert.ok(a.soc>=10-1e-8&&a.soc<=90+1e-8);assert.ok(a.chargeMW<=.5&&a.dischargeMW<=.5);assert.ok(a.gridMW>=0);
}
assert.equal(stepEnergy(createEnergy(c),c,{mode:'charge',windMW:0,requestMW:.3},10).chargeMW,0);
assert.equal(stepEnergy(createEnergy(c),c,{mode:'auto',windMW:1.4,targetMW:1},10).chargeMW,.3999999999999999);
assert.equal(stepEnergy(createEnergy(c),c,{mode:'auto',windMW:.7,targetMW:1},10).dischargeMW,.30000000000000004);
assert.deepEqual(stepEnergy(s,c,{mode:'charge',windMW:2,requestMW:.5},0),s,'零时间冻结');
assert.throws(()=>validateStorage({...c,capacityMWh:0}));assert.throws(()=>validateStorage({...c,minSoc:80,maxSoc:20}));assert.throws(()=>validateStorage({...c,efficiency:NaN}));
assert.throws(()=>validateStorage({...c,efficiency:1e-312}),'效率须遵守界面1%下限，避免数值溢出');
console.log('PASS: storage conservation, limits, auto dispatch, no grid import, zero-time freeze, invalid config');
