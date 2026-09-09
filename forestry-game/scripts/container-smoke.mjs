// Build the two :local-check images before running. Uses only temporary local resources.
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
const id=`forest-check-${randomBytes(5).toString('hex')}`, backend=`${id}-api`,web=`${id}-web`,volume=`${id}-rooms`;
const admin=randomBytes(32).toString('hex');
function docker(...args){return execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:60000}).trim();}
function startBackend(){docker('run','-d','--name',backend,'--network',id,'--network-alias','classroom','-e',`FOREST_ADMIN_TOKEN=${admin}`,'-v',`${volume}:/data`,'forest-commons-classroom:local-check');}
async function ready(base){for(let i=0;i<40;i++){try{const response=await fetch(`${base}/api/health`);if(response.ok&&(await response.json()).ok===true)return;}catch{}await new Promise(r=>setTimeout(r,250));}throw Error('Container API did not become ready.');}
try{
 docker('network','create',id);docker('volume','create',volume);startBackend();
 docker('run','-d','--name',web,'--network',id,'-p','127.0.0.1::80','-e','FOREST_DOMAIN=:80','forest-commons-web:local-check');
 const address=docker('port',web,'80/tcp');assert.match(address,/^127\.0\.0\.1:\d+$/);const base=`http://${address}`;
 await ready(base);
 const page=await fetch(base);assert.equal(page.status,200);assert.match(await page.text(),/Forest Commons/);assert.equal(page.headers.get('referrer-policy'),'no-referrer');
 const request=(path,method='GET',token,body)=>fetch(base+path,{method,headers:{...(token?{Authorization:`Bearer ${token}`}:{ }),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 assert.equal((await request('/api/rooms','POST',undefined,{})).status,403);
 const made=await request('/api/rooms','POST',admin,{});assert.equal(made.status,201);const owner=await made.json();
 const endpoint=`/api/rooms/${owner.id}`;
 assert.equal((await request(endpoint)).status,401);
 const initial=await request(endpoint,'GET',owner.token);assert.equal(initial.status,200);const before=await initial.json();assert.equal(before.role,'instructor');
 docker('rm','-f',backend);startBackend();await ready(base);
 const restored=await request(endpoint,'GET',owner.token);assert.equal(restored.status,200);const after=await restored.json();assert.equal(after.revision,before.revision);assert.equal(after.game.week,before.game.week);
 const cross=await fetch(base+'/api/rooms',{method:'POST',headers:{Origin:'https://unrelated.invalid',Authorization:`Bearer ${admin}`,'Content-Type':'application/json'},body:'{}'});assert.equal(cross.status,403);
 console.log('PASS: container frontend, API proxy, response headers, controlled creation, role authentication, origin rejection, and room persistence after container replacement.');
} finally {
 for(const name of [web,backend])try{docker('rm','-f',name);}catch{}
 try{docker('volume','rm',volume);}catch{}
 try{docker('network','rm',id);}catch{}
}
