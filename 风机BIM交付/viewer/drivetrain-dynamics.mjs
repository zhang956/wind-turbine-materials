// Illustrative low-speed-shaft-equivalent dynamics. NOT a V90 aerodynamic model.
export const PARAMETERS=Object.freeze({radius:45,airDensity:1.225,inertia:4e6,ratedPower:2e6,maxGeneratorTorque:2.8e6,efficiency:.94,parkingTorque:2e5});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function aeroTorque(speed,omega,pitch,yawError){
 const v=clamp(speed,0,35)*Math.max(0,Math.cos(yawError*Math.PI/180));
 if(v===0||pitch>=90)return 0;
 const lambda=omega*PARAMETERS.radius/v;
 const cq=.005+.075*Math.exp(-(((lambda-6)/4)**2));
 const feather=(Math.exp(-clamp(pitch,0,90)/18)-Math.exp(-5))/(1-Math.exp(-5));
 return .5*PARAMETERS.airDensity*Math.PI*PARAMETERS.radius**3*v*v*cq*feather;
}
export function operatingPitch(speed,yawError,rpm){
 const reference=12*Math.PI/30;
 const torque=aeroTorque(speed,reference,0,yawError);
 const ratedTorque=PARAMETERS.ratedPower/reference;
 const feedforward=torque>ratedTorque?18*Math.log(torque/ratedTorque):0;
 return clamp(feedforward+Math.max(0,rpm-12)*4,0,65);
}
export function advanceDrivetrain({rpm,speed,pitch,yawError,targetRpm,stopping,dt}){
 const omega=Math.max(0,rpm)*Math.PI/30,J=PARAMETERS.inertia;
 const air=aeroTorque(speed,omega,pitch,yawError);
 const friction=omega>0?5000+12000*omega:0;
 const target=targetRpm*Math.PI/30;
 // Estimated aerodynamic feedforward + speed feedback. Nonnegative generator load only.
 const desired=stopping?air+J*Math.max(0,omega-target)/2:air-friction+J*(omega-target)/.8;
 const cap=Math.min(PARAMETERS.maxGeneratorTorque,PARAMETERS.ratedPower/Math.max(omega,.3));
 const decelerationLimit=air-friction+J*(1.5*Math.PI/30);
 const command=clamp(desired,0,Math.max(0,Math.min(cap,decelerationLimit)));
 // Limit resisting torques to avoid reverse rotation within the integration step.
 let available=dt>0?air+J*omega/dt:Infinity;
 const loss=Math.min(friction,available);available-=loss;
 const brake=stopping&&pitch>=85&&rpm<.5?Math.min(PARAMETERS.parkingTorque,available):0;available-=brake;
 const generator=Math.min(command,available);
 const net=air-generator-loss-brake;
 const nextOmega=dt>0?Math.max(0,omega+net/J*dt):omega;
 return {rpm:nextOmega*30/Math.PI,airTorque:air,generatorTorque:generator,lossTorque:loss,brakeTorque:brake,netTorque:net,electricPower:generator*nextOmega*PARAMETERS.efficiency};
}
