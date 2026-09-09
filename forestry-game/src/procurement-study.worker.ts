import {runProcurementStudy} from './simulation/procurement-study';
self.onmessage=async event=>{try{const result=await runProcurementStudy(event.data.game,event.data.settings,(completed,total)=>self.postMessage({kind:'progress',completed,total}));self.postMessage({kind:'result',result});}catch(e){self.postMessage({kind:'error',message:e instanceof Error?e.message:String(e)});}};
