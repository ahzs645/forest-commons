import { RoomStore } from '../../forestry-game/server/rooms';
import { mkdtempSync,writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const dir=mkdtempSync(join(tmpdir(),'forest-staged-'));let store=new RoomStore(join(dir,'live'));const owner=store.create();
const act=(token:string,action:string,payload:unknown={})=>store.mutate(owner.id,token,store.view(owner.id,token).revision,action,payload);
const tokens=Array.from({length:5},(_,i)=>act(owner.token,'invite',{role:`company${i+1}`}).credential!);
for(const token of tokens){const v=store.view(owner.id,token).disclosure!;const own=Object.values(v.economics)[0];assert.equal(Object.keys(v.economics).length,1);act(token,'disclosure-estimate',{savings:5*(own.standalone-own.pooled)});}
act(owner.token,'disclosure-phase',{phase:'sharing'});
for(const token of tokens.slice(0,3))act(token,'disclosure-share',{consent:true});
for(const token of tokens){const visible=Object.values(store.view(owner.id,token).disclosure!.economics);act(token,'disclosure-estimate',{savings:visible.reduce((n,c)=>n+c.standalone-c.pooled,0)/visible.length*5});}
const econ=store.view(owner.id,owner.token).disclosure!.economics,total=Object.values(econ).reduce((n,c)=>n+c.standalone-c.pooled,0);
const shares=Object.fromEntries(Object.keys(econ).map(c=>[c,total/5]));
act(owner.token,'disclosure-propose',{shares});act(tokens[0],'disclosure-respond',{id:1,accept:false});
assert.equal(store.view(owner.id,tokens[0]).disclosure!.offers![0].status,'rejected');
act(owner.token,'disclosure-propose',{shares});for(const token of tokens)act(token,'disclosure-respond',{id:2,accept:true});
act(owner.token,'disclosure-phase',{phase:'debrief'});
const student=store.view(owner.id,tokens[0]).disclosure!;assert.equal(student.offers!.at(-1)!.status,'agreed');assert.equal(student.economics['5'],undefined);
execFileSync('./node_modules/.bin/tsx',['scripts/room-backup.ts','backup',join(dir,'live'),join(dir,'backup')]);
execFileSync('./node_modules/.bin/tsx',['scripts/room-backup.ts','restore',join(dir,'backup'),join(dir,'restored')]);
store=new RoomStore(join(dir,'restored'));assert.deepEqual(store.view(owner.id,tokens[0]).disclosure,student);
const recovered=store.recover(owner.id,owner.recoveryToken);assert.equal(store.view(owner.id,recovered.token).role,'instructor');assert.throws(()=>store.recover(owner.id,owner.recoveryToken));
writeFileSync(new URL('./classroom-disclosure-results.json',import.meta.url),JSON.stringify({kind:'Programmatic staged negotiation through isolated RoomStore',shared:student.shared,estimates:student.estimates,offers:student.offers,totalRealizedSavings:total,checks:['Private visibility','Authenticated explicit consent','Before/after estimates','Rejected offer','Unanimous agreement','Unshared economics remain private in debrief','Backup+restore roundtrip','Rotating recovery credential']},null,2));console.log('Staged playthrough, backup/restore and instructor recovery passed; generated exercise savings '+total);
