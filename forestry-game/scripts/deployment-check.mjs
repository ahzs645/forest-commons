// Read-only verification of an already running deployment. Never prints credentials.
// Usage: node scripts/deployment-check.mjs https://forest.example.org
// Local development: node scripts/deployment-check.mjs --local http://127.0.0.1:5173
import assert from 'node:assert/strict';
const args=process.argv.slice(2),local=args.includes('--local'),standalone=args.includes('--standalone');
const targets=args.filter(arg=>!['--local','--standalone'].includes(arg));
if(targets.length!==1||args.some(arg=>arg.startsWith('--')&&!['--local','--standalone'].includes(arg)))throw Error('Provide one deployment URL, optionally --local and/or --standalone.');
const origin=new URL(targets[0]);
assert(!origin.username&&!origin.password&&!origin.search&&!origin.hash&&(standalone||origin.pathname==='/'), 'Use a URL without credentials, query or fragment; classroom checks require an origin.');
if(standalone&&!origin.pathname.endsWith('/'))origin.pathname+='/';
const loopback=['localhost','127.0.0.1','[::1]'].includes(origin.hostname);
assert(local?loopback&&['http:','https:'].includes(origin.protocol):!loopback&&origin.protocol==='https:', 'Public checks require HTTPS; --local permits loopback only.');
async function read(url){
 const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(15000)});
 assert.equal(response.status,200,`${url.pathname}: expected HTTP 200, received ${response.status}`);
 return response;
}
const page=await read(origin);
const html=await page.text();
assert.match(html,/Forest Commons/, 'Frontend title missing.');
if(standalone){
 const assets=[...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)\s*=\s*["']([^"']+)["'][^>]*>/gi)].map(m=>new URL(m[1],origin)).filter(url=>/\.(?:js|css)$/.test(url.pathname));
 assert(assets.some(url=>url.pathname.endsWith('.js')),'No built JavaScript entry found. Check the production build.');
 for(const url of new Map(assets.map(url=>[url.href,url])).values()){
  assert(url.origin===origin.origin&&url.pathname.startsWith(origin.pathname),'Built assets must resolve under the deployment base path.');
  const asset=await read(url),type=asset.headers.get('content-type')??'';
  assert(url.pathname.endsWith('.css')?/text\/css/i.test(type):/(?:javascript|ecmascript)/i.test(type),`${url.pathname}: incorrect asset content type (possible HTML fallback).`);
  assert((await asset.text()).trim().length>0,`${url.pathname}: empty built asset.`);
 }
 console.log(`PASS: ${local?'local':'HTTPS'} standalone frontend and ${assets.length} referenced built assets under ${origin.pathname}. Classroom API and custom server headers are not required. Browser gameplay and lazy-loaded assets require separate acceptance.`);
}else{
const health=await read(new URL('/api/health',origin));
assert.equal((await health.json()).ok,true,'Classroom API health failed.');
if(!local){
 assert.equal(page.headers.get('referrer-policy'),'no-referrer','Missing invitation referrer protection.');
 assert.equal(page.headers.get('x-content-type-options'),'nosniff','Missing content type protection.');
 const insecure=new URL(origin);insecure.protocol='http:';insecure.port='';
 const redirect=await fetch(insecure,{redirect:'manual',signal:AbortSignal.timeout(15000)});
 assert([301,302,307,308].includes(redirect.status),'HTTP must redirect to HTTPS.');
 const target=new URL(redirect.headers.get('location')??'',insecure);
 assert.equal(target.origin,origin.origin,'HTTP redirect must use the same secure origin.');
}
console.log(local?'PASS: local frontend and classroom API. Public DNS, TLS and redirects are not checked.':'PASS: HTTPS frontend, certificate verification, API health, response headers and HTTP redirect.');

}
