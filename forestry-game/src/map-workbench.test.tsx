import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import MapRolePanel from './MapRolePanel';
import {equipmentStatus} from './OperationalSymbols';
import {createGame} from './simulation/engine';
import {quebec} from './scenarios/quebec';
describe('map workbench',()=>{
 it('shows only forecast categories without changing game state',()=>{const g=createGame(quebec);for(const w of Object.values(g.region.weather))for(const z of g.region.zones){w.forecast[z.id].fill('frozen');w.actual[z.id].fill('thaw');}const before=JSON.stringify(g);const html=renderToStaticMarkup(<MapRolePanel game={g} role="transport" setRole={()=>{}} product="" setProduct={()=>{}} zone="" setZone={()=>{}} selected={g.region.stands[0].id} select={()=>{}} onChange={()=>{}} onInspect={()=>{}} accessibleOnly={false} setAccessibleOnly={()=>{}}/>);expect(html).toContain('data-weather="frozen"');expect(html).not.toContain('data-weather="thaw"');expect(html).toContain('Forecast delivery');expect(JSON.stringify(g)).toBe(before);});
 it('distinguishes disruption, planned transfer and idle resources without hidden events',()=>{const g=createGame(quebec),t=g.region.trucks[0].id;expect(equipmentStatus(g,'truck',t)).toBe('Idle');g.plan.facilityTransfers=[{truck:t,link:'test',loads:1}];expect(equipmentStatus(g,'truck',t)).toBe('Scheduled');g.region.disruptions=[{id:'x',kind:'truck',target:t,title:'Test',description:'',week:1,endWeek:3,revealWeek:2,repairCost:0,repairWeeks:1}];expect(equipmentStatus(g,'truck',t)).toBe('Scheduled');g.week=2;expect(equipmentStatus(g,'truck',t)).toBe('Unavailable');g.week=g.region.weeks+1;expect(equipmentStatus(g,'truck',t)).toBe('Season complete');});
});

it('marks trucks scheduled when their only order is a reciprocal delivery', async()=>{
 const {equipmentStatus}=await import('./OperationalSymbols');
 const {createGame}=await import('./simulation/engine');
 const {quebec}=await import('./scenarios/quebec');
 const g=createGame(quebec),a=g.region.trucks[0].id,b=g.region.trucks[1].id;
 g.plan.reciprocal=[{pair:'teaching-pair',truckA:a,truckB:b,loads:1}];
 expect(equipmentStatus(g,'truck',a)).toBe('Scheduled');
 expect(equipmentStatus(g,'truck',b)).toBe('Scheduled');
});

it('allows roadside hauling over open roads when harvesting terrain is closed',async()=>{
 const {advance}=await import('./simulation/engine');
 const {canAccess,weatherAt}=await import('./simulation/routing');
 const g=createGame(quebec),stand=g.region.stands[0],truck=g.region.trucks[0],mill=g.region.mills[0];
 stand.terrain=4;
 for(const scenario of Object.values(g.region.weather))for(const zone of g.region.zones){scenario.forecast[zone.id].fill('thaw');scenario.actual[zone.id].fill('thaw');}
 g.region.roads.edges.forEach(edge=>edge.bearing=1);
 g.stands.find(s=>s.id===stand.id)!.stock=[{product:'soft-saw',volume:100,week:1,quality:1}];
 expect(canAccess(stand.terrain,weatherAt(g,true)[stand.zone])).toBe(false);
 const html=renderToStaticMarkup(<MapRolePanel game={g} role="transport" setRole={()=>{}} product="soft-saw" setProduct={()=>{}} zone="" setZone={()=>{}} selected={stand.id} select={()=>{}} onChange={()=>{}} onInspect={()=>{}} accessibleOnly={false} setAccessibleOnly={()=>{}}/>);
 expect(html).toContain('Forecast road connection available.');
 expect(html).toContain('<button>Append haul</button>');
 g.plan.trucks[truck.id]=[{stand:stand.id,mill:mill.id,product:'soft-saw',loads:1}];
 const settled=advance(g);
 expect(settled.history[0].delivered['soft-saw']).toBeGreaterThan(0);
});

it('shows both reciprocal truck legs in their map queues with cross destinations',()=>{
 const g=createGame(quebec),[a,b]=g.region.trucks;
 g.region.reciprocalPairs=[{id:'map-pair',name:'Shared routes',standA:'Q01',standB:'Q02',millA:'M1',millB:'M2',product:'soft-saw',limitM3:500,ownReserveM3:0,opens:1,deadline:3}];
 g.plan.reciprocal=[{pair:'map-pair',truckA:a.id,truckB:b.id,loads:2}];
 const html=renderToStaticMarkup(<MapRolePanel game={g} role="transport" setRole={()=>{}} product="" setProduct={()=>{}} zone="" setZone={()=>{}} selected="Q01" select={()=>{}} onChange={()=>{}} onInspect={()=>{}} accessibleOnly={false} setAccessibleOnly={()=>{}}/>);
 const entries=html.match(/<p class="workbench-reciprocal-order">.*?<\/p>/g)??[];
 expect(entries).toHaveLength(2);
 expect(entries[0]).toContain('Q01 → M2');
 expect(entries[1]).toContain('Q02 → M1');
 for(const entry of entries){expect(entry).toContain('Reciprocal delivery');expect(entry).toContain('Shared routes');expect(entry).toContain('2 loads');}
});

it('keeps an alternative bucking source in the product-filtered site table',()=>{
 const game=createGame(quebec),stand=game.region.stands[0];
 stand.mix={'soft-saw':1};game.stands[0].stock=[];
 game.region.buckingProfiles={pulp:{name:'Pulp option',productivity:1,cost:1,recovery:{'soft-saw':{'soft-pulp':1}}}};
 const html=renderToStaticMarkup(<MapRolePanel game={game} role="production" setRole={()=>{}} product="soft-pulp" setProduct={()=>{}} zone="" setZone={()=>{}} selected={stand.id} select={()=>{}} onChange={()=>{}} onInspect={()=>{}} accessibleOnly={false} setAccessibleOnly={()=>{}}/>);
 expect(html).toContain(`${stand.id} · ${stand.name}</button>`);
 expect(html).not.toContain('is outside these filters.');
});

it('shows recorded campaign totals instead of reset period balances after the season',async()=>{
 const {advance}=await import('./simulation/engine');let game=createGame(quebec);
 for(let turn=0;turn<game.region.weeks;turn++)game=advance(game);
 const html=renderToStaticMarkup(<MapRolePanel game={game} role="purchase" setRole={()=>{}} product="soft-saw" setProduct={()=>{}} zone="" setZone={()=>{}} selected={game.region.stands[0].id} select={()=>{}} onChange={()=>{}} onInspect={()=>{}} accessibleOnly={false} setAccessibleOnly={()=>{}}/>);
 expect(html).toContain('Completed campaign totals');
 expect(html).toContain('no further dispatch');
 expect(html).not.toContain('Remaining commitment');
 expect(html).not.toContain('Received this period');
 expect(html).not.toContain('Forecast constraints');
});
