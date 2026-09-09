import {expect,it} from 'vitest';
import {createServer} from 'node:http';
import type {AddressInfo} from 'node:net';
import {classroomJson} from './classroom-http';
it('bounds stalled headers and bodies without retrying an uncertain mutation',async()=>{
 const counts:Record<string,number>={};
 const server=createServer((req,res)=>{
  const path=req.url!;counts[path]=(counts[path]??0)+1;
  if(path==='/headers')return;
  if(path==='/body'){res.writeHead(200,{'Content-Type':'application/json'});res.write('{');return;}
  if(path==='/conflict'){res.writeHead(409,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Room changed'}));return;}
  res.end(JSON.stringify({ok:true}));
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
 try{
  for(const path of ['/headers','/body']){
   await expect(classroomJson(base+path,{method:'POST',body:'{}'},100)).rejects.toThrow('The server may have applied your action. Refresh the room before retrying.');
   expect(counts[path]).toBe(1);
  }
  await expect(classroomJson(base+'/conflict',{})).rejects.toThrow('Room changed');
  await expect(classroomJson(base+'/ok',{})).resolves.toEqual({ok:true});
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
