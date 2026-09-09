import MillProcessingDesk from "./MillProcessingDesk";
import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createGame} from './simulation/engine';
import {quebec} from './scenarios/quebec';
const state=vi.hoisted(()=>({values:[] as unknown[]}));
vi.mock('react',async()=>{const actual=await vi.importActual<typeof import('react')>('react');return {...actual,useState:(initial:unknown)=>state.values.length?[state.values.shift(),()=>{}]:actual.useState(initial)};});
import ReservationDesk from './ReservationDesk';
import PreSeasonDesk from './PreSeasonDesk';
import MapRolePanel from './MapRolePanel';
afterEach(()=>{state.values=[];});
it('recovers old reservation selectors to existing owned sites and destinations',()=>{
 state.values=['OLD-STAND','OLD-PRODUCT','OLD-MILL'];
 const game=createGame(quebec);
 const html=renderToStaticMarkup(<ReservationDesk game={game} onChange={()=>{}}/>);
 expect(html).toContain('value="M1" selected=""');
 expect(html).not.toContain('OLD-');
 expect(html).toContain('<button>Reserve destination</button>');
});
it('recovers a stale staging node rather than requesting an invalid route',()=>{
 state.values=['crew',0,'OLD-NODE',''];
 const game=createGame(quebec);game.region.mobilization!.allowedNodes=['t1'];
 const html=renderToStaticMarkup(<PreSeasonDesk game={game} onChange={()=>{}}/>);
 expect(html).toContain('value="t1" selected=""');
 expect(html).not.toContain('OLD-NODE');
});

it('recovers map haul fleet and destination after a region replacement',()=>{
 state.values=['OLD-TRUCK','OLD-MILL',1,''];
 const game=createGame(quebec);
 const html=renderToStaticMarkup(<MapRolePanel game={game} role="transport" setRole={()=>{}} product="soft-saw" setProduct={()=>{}} zone="" setZone={()=>{}} selected="Q01" select={()=>{}} onChange={()=>{}} onInspect={()=>{}} accessibleOnly={false} setAccessibleOnly={()=>{}}/>);
 expect(html).toContain('value="T1" selected=""');expect(html).toContain('value="M1" selected=""');
 expect(html).toContain('<button>Append haul</button>');
});

it('recovers a processing facility added after an empty or obsolete selection',()=>{
 state.values=['OLD-TRUCK','OLD-STAND',1,'','OLD-MILL'];
 const region=structuredClone(quebec);
 region.mills[0].processing={inputs:['soft-saw'],capacityM3:70,costM3:1,outputs:[{id:'chips',name:'Chips',yield:.5,price:10,weeklyDemand:35}]};
 const html=renderToStaticMarkup(<MillProcessingDesk game={createGame(region)} onChange={()=>{}}/>);
 expect(html).not.toContain('OLD-');
 expect(html).toContain('value="M1" selected=""');
 expect(html).toContain('Queue Softwood sawlogs intake');
 expect(html).toContain('tabindex="0" role="region"');
});
