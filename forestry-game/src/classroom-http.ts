/** A timeout stops waiting locally; it never implies a server mutation was cancelled. */
export async function classroomJson(url:string,init:RequestInit,timeoutMs=15000){
 const signal=AbortSignal.timeout(timeoutMs);
 try{
  const res=await fetch(url,{...init,signal});
  const data=await res.json();
  if(!res.ok)throw Error(data.error??'Classroom request failed');
  return data;
 }catch(error){
  if(signal.aborted)throw Error('Room request timed out. The server may have applied your action. Refresh the room before retrying.');
  throw error;
 }
}
