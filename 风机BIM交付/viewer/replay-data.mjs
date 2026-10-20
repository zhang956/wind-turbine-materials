// Session-local immutable snapshots. No writes to live simulation on seek.
const copy=value=>structuredClone(value);
export function createRecording(){
 let frames=[],epoch=null,last=-Infinity;
 return {
  get frames(){return copy(frames);},
  get count(){return frames.length;},
  get range(){return frames.length?[frames[0].time,frames.at(-1).time]:null;},
  record(frame,nextEpoch,force=false){
   if(epoch!==nextEpoch){epoch=nextEpoch;frames=[];last=-Infinity;}
   if(!Number.isFinite(frame.time)||frame.time<last)return;
   if(!force&&frame.time-last<1-1e-8)return;
   if(frames.at(-1)?.time===frame.time&&frames.at(-1)?.eventId===frame.eventId)frames.pop();
   frames.push(copy(frame));last=frame.time;
   while(frames.length>1200||frames[0].time<frame.time-600)frames.shift();
  },
  atEvent(id){const frame=frames.findLast(f=>f.eventId===id);return frame?copy(frame):null;},
  atTime(time){
   if(!frames.length||!Number.isFinite(time)||time<frames[0].time-1e-7||time>frames.at(-1).time+1e-7)return null;
   let index=frames.findLastIndex(f=>f.time<=time+1e-7);return copy(frames[index]);
  }
 };
}
