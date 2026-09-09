import {solveNetwork,validateNetworkCase} from './simulation/network-dispatch';
self.onmessage=event=>{
 try {
  const {game,network}=event.data;
  validateNetworkCase(game,network);
  const independent=solveNetwork(game,network,'independent');
  self.postMessage({kind:'progress',message:'Independent schedules complete. Solving the shared fleet…'});
  const pooled=solveNetwork(game,network,'pooled');
  self.postMessage({kind:'result',independent,pooled});
 }catch(error){self.postMessage({kind:'error',message:error instanceof Error?error.message:String(error)});}
};
