import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {quebec} from '../src/scenarios/quebec';
import {princeGeorge} from '../src/scenarios/prince-george';
import {createGame,draftPlan,advance} from '../src/simulation/engine';
import {subdividedScenario} from '../src/simulation/turn-duration';
import type {Game,Plan} from '../src/simulation/types';
const file='/tmp/forest-draft-baseline.json';
const settings={commitmentAware:true,salesPolicy:'penalty-aware' as const};
type Sample={region:string;turn:number;input:Game;plan:Plan;ms:number};
if(process.argv.includes('--paired')){
 const source=fs.readFileSync(new URL('../src/simulation/engine.ts',import.meta.url),'utf8');
 const begin=source.indexOf('  // Roads, forecast and improvements stay fixed during this draft.');
 const end=source.indexOf('  for (const c of r.crews)',begin);
 if(begin<0||end<0)throw Error('Cache block not found; audit refuses to reconstruct baseline.');
 const temp=new URL('../src/simulation/engine.audit-uncached.ts',import.meta.url);
 let reconstructed=source.slice(0,begin)+'  const journey = (from: string, to: string) => route(r, from, to, w, g.improvedRoads);\n'+source.slice(end);
 const combined=process.argv.includes('--combined');
 if(combined){
  const start=reconstructed.indexOf('  const reservationProjection: Game = {'),finish=reconstructed.indexOf('  const projected:',start);
  if(start<0||finish<0)throw Error('Projection block not found; refusing reconstruction.');
  reconstructed=reconstructed.slice(0,start)+'  const reservationProjection = structuredClone(g);\n'+reconstructed.slice(finish);
 }
 fs.writeFileSync(temp,reconstructed,{flag:'wx'});
 try {
 const uncached=(await import(temp.href)).draftPlan as typeof draftPlan;
 const samples=JSON.parse(fs.readFileSync(file,'utf8')) as Sample[];
 const results=samples.map((s,index)=>{
 const measure=(fn:typeof draftPlan)=>{const start=performance.now(),game=fn(s.input,settings);return {game,ms:performance.now()-start};};
 const first=measure(index%2?draftPlan:uncached),second=measure(index%2?uncached:draftPlan);
 const before=(index%2?second:first).game,after=(index%2?first:second).game,uncachedMs=(index%2?second:first).ms,cachedMs=(index%2?first:second).ms;
 if(JSON.stringify(before.plan)!==JSON.stringify(s.plan)||JSON.stringify(after.plan)!==JSON.stringify(s.plan))throw Error('Plan parity failure');
 return {region:s.region,turn:s.turn,uncachedMs,cachedMs,speedup:uncachedMs/cachedMs};
 });fs.writeFileSync(combined?'/tmp/forest-draft-combined.json':'/tmp/forest-draft-paired.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
 } finally {fs.unlinkSync(temp);}
}else if(process.argv.includes('--compare')){
 const samples=JSON.parse(fs.readFileSync(file,'utf8')) as Sample[];
 const results=samples.map(s=>{const start=performance.now(),actual=draftPlan(s.input,settings),ms=performance.now()-start;
 if(JSON.stringify(actual.plan)!==JSON.stringify(s.plan))throw Error(`Plan mismatch ${s.region} turn ${s.turn}`);
 return {region:s.region,turn:s.turn,baselineRuntimeMs:s.ms,snapshotInputMs:ms,timingComparable:false};});
 fs.writeFileSync('/tmp/forest-draft-comparison.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}else{
 console.log('ENGINE IMPORTED: baseline process holds pre-edit module.');const samples:Sample[]=[];
 for(const source of [quebec,princeGeorge]){
  let game=createGame(subdividedScenario(source,7));
  for(const turn of [1,7,28,57]){
   while(game.week<turn)game=advance(game);
   const input=structuredClone(game),start=performance.now(),draft=draftPlan(input,settings),ms=performance.now()-start;
   samples.push({region:source.id,turn,input,plan:draft.plan,ms});console.log(`${source.id} ${turn}: ${ms.toFixed(1)} ms`);
   game=advance(draft);
  }
 }
 fs.writeFileSync(file,JSON.stringify(samples));console.log(`Saved ${samples.length} canonical draft baselines to ${file}`);
}
