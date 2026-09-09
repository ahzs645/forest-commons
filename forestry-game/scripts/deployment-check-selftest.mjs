import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
test('standalone checks nested production assets without API and rejects wrong-base or HTML fallback assets',async()=>{
 let variant='valid';const paths=[];
 const server=createServer((req,res)=>{
  paths.push(req.url);
  if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<title>Forest Commons</title>');}
  else if(req.url==='/api/health'){res.setHeader('Content-Type','application/json');res.end('{"ok":true}');}
  else if(req.url==='/forest/'){res.setHeader('Content-Type','text/html');res.end(`<title>Forest Commons</title><script type="module" src="${variant==='wrong-base'?'/assets/app.js':'./assets/app.js'}"></script><link rel="stylesheet" href="./assets/app.css">`);}
  else if(req.url==='/forest/assets/app.js'){res.setHeader('Content-Type',variant==='fallback'?'text/html':'text/javascript');res.end(variant==='fallback'?'<title>Forest Commons</title>':'console.log("ready")');}
  else if(req.url==='/forest/assets/app.css'){res.setHeader('Content-Type','text/css');res.end('body{margin:0}');}
  else{res.statusCode=404;res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${server.address().port}/forest`;
 try{
  const run=()=>exec(process.execPath,['scripts/deployment-check.mjs','--standalone','--local',url]);
  assert.match((await run()).stdout,/PASS: local standalone/);assert(!paths.includes('/api/health'));
  assert.match((await exec(process.execPath,['scripts/deployment-check.mjs','--local',new URL(url).origin])).stdout,/local frontend and classroom API/);assert(paths.includes('/api/health'));
  variant='wrong-base';await assert.rejects(run(),/deployment base path/);
  variant='fallback';await assert.rejects(run(),/incorrect asset content type/);
  await assert.rejects(exec(process.execPath,['scripts/deployment-check.mjs','--local',url]),/classroom checks require an origin/);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
