import {it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import ProcurementStudy from './ProcurementStudy';
import {createGame} from './simulation/engine';
import {quebec} from './scenarios/quebec';
import {summarizeStudy,bidStrategies} from './simulation/procurement-study';
const fixture=vi.hoisted(()=>({result:null as unknown,call:0}));
vi.mock('react',async()=>{const actual=await vi.importActual<typeof import('react')>('react');return {...actual,useState:(initial:unknown)=>{const i=fixture.call++;return actual.useState(i===2?fixture.result:initial);}};});
it('shows unavailable estimates and disables policies with no successful trials',()=>{
 const settings={samples:2,seed:1,deliveryGoal:100,forecastReliability:.5,demandSpread:.2,riskWeight:.5};
 const results=bidStrategies.flatMap(s=>[0,1].map(sample=>({sample,strategy:s.id,cashChange:0,delivered:0,waste:0,hits:0,checks:0,acquisitions:0,problem:'Simulation failed'})));
 fixture.call=0;fixture.result={settings,fromWeek:1,results,summaries:summarizeStudy(results,settings),assumptions:[]};
 const game=createGame(quebec),stand=game.region.stands.find(s=>s.supply==='auction'&&s.auctionWeek===1)!;
 const html=renderToStaticMarkup(<ProcurementStudy game={game} standId={stand.id} onBid={()=>{}}/>);
 expect(html.match(/No successful trials; outcome estimates are unavailable\./g)).toHaveLength(4);
 expect(html.match(/<button disabled="">Bid/g)).toHaveLength(3);
});
