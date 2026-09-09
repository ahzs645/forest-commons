import { RoomStore } from '../../forestry-game/server/rooms';
import { allocate } from '../../forestry-game/src/coalition';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const directory=mkdtempSync(join(tmpdir(),'forest-classroom-play-'));
let store=new RoomStore(directory);
const room=store.create(), tokens:Record<string,string>={instructor:room.token};
const log:any[]=[];
const view=(role='instructor')=>store.view(room.id,tokens[role]);
function act(role:string,action:string,payload:any={}) {const result=store.mutate(room.id,tokens[role],view(role).revision,action,payload); log.push({role,action,week:result.game.week,revision:result.revision}); return result;}
function reject(label:string,run:()=>unknown){let message='';try{run()}catch(e){message=(e as Error).message;}assert.ok(message,label);log.push({check:label,rejected:message});}
for(const role of ['purchase','production','transport','company1','company2','company3','company4','company5'])tokens[role]=act('instructor','invite',{role}).credential!;
reject('Instructor cannot advance without readiness',()=>act('instructor','advance'));
reject('Production cannot alter private bids',()=>act('production','plan',{bids:{Q21:1}}));
reject('Company cannot advance clock',()=>act('company1','advance'));
const stale=view('purchase').revision;act('production','ready',{ready:false});reject('Stale revision rejected',()=>store.mutate(room.id,tokens.purchase,stale,'ready',{ready:true}));
const negative=allocate(['1','2','3','4','5'],'volume',5);log.push({volumeSavings:negative});assert.ok(Object.values(negative).some(v=>v<0));
reject('Negative volume allocation cannot become agreement',()=>act('instructor','proposal',{count:5,groups:[1,1,1,1,1],phase:'open',method:'volume',custom:{}}));
act('instructor','proposal',{count:5,groups:[1,1,1,1,1],phase:'open',method:'epm',custom:{}});
const offer=view('company1').game.negotiation.offers!.at(-1)!;
for(let i=1;i<=5;i++)act('company'+i,'respond',{id:offer.id,accept:true});
assert.equal(view().game.negotiation.offers!.at(-1)!.status,'agreed');
for(let week=1;week<=4;week++){
 const pg=view('purchase').game;
 assert.equal(pg.seed,0);
 for(const w of Object.values(pg.region.weather))for(const z of pg.region.zones)assert.deepEqual(w.actual[z.id],w.forecast[z.id]);
 // Purchase uses only its visible lot schedule, published asking price and cash.
 const lot=pg.region.stands.find(s=>s.supply==='auction'&&s.auctionWeek===week&&!pg.stands.find(v=>v.id===s.id)!.owned);
 if(lot&&lot.askingPrice<pg.cash/4)act('purchase','plan',{bids:{[lot.id]:Math.round(lot.askingPrice)}});
 assert.deepEqual(view('transport').game.plan.bids,{});
 act('production','draft');
 assert.ok(Object.values(view('transport').game.plan.crews).every(q=>q.length===0));
 act('transport','draft');
 assert.ok(Object.values(view('production').game.plan.trucks).every(q=>q.length===0));
 for(const role of ['purchase','production','transport'])act(role,'ready',{ready:true});
 act('instructor','advance');
 const report=view().game.history.at(-1)!;
 log.push({outcome:week,harvested:report.harvested,delivered:report.delivered,cash:view().game.cash,messages:report.messages});
 assert.ok(Object.keys(view('company1').game.history.at(-1)!.plan.bids).length===0);
 const before=view('transport');store=new RoomStore(directory);assert.deepEqual(view('transport'),before);log.push({check:'Reconnect persisted role state',week});
}
const previous=tokens.company5;tokens.company5=act('instructor','invite',{role:'company5'}).credential!;reject('Replaced role credential rejected',()=>store.view(room.id,previous));
const final=view();
writeFileSync(new URL('./classroom-round-results.json',import.meta.url),JSON.stringify({kind:'Programmatic role playthrough via RoomStore; no browser interaction',week:final.game.week,cash:final.game.cash,history:final.game.history.map(h=>({week:h.week,harvested:h.harvested,delivered:h.delivered})),log},null,2));
console.log(JSON.stringify({week:final.game.week,cash:final.game.cash,history:final.game.history.map(h=>({week:h.week,harvested:h.harvested,delivered:h.delivered})),checks:log.filter(l=>l.check),volumeSavings:negative},null,2));
