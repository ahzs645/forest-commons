import {rollingOptimize} from './simulation/rolling-optimizer';
self.onmessage=async e=>{try{const result=await rollingOptimize(e.data.game,e.data.horizon,(done,total)=>self.postMessage({kind:'progress',done,total}),e.data.acquisitionIds??[]);self.postMessage({kind:'result',result});}catch(error){self.postMessage({kind:'error',message:error instanceof Error?error.message:String(error)});}};
