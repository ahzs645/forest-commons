import {afterEach,expect,it,vi} from 'vitest';
import {LanguageProvider} from './i18n';
afterEach(()=>vi.unstubAllGlobals());
import {renderToStaticMarkup} from 'react-dom/server';
import ReservationDesk from './ReservationDesk';
import {CandidateExplanation} from './RollingOptimizer';
import {createGame} from './simulation/engine';
import {quebec} from './scenarios/quebec';
import {addReservation} from './simulation/reservations';
import type {RollingCandidate} from './simulation/rolling-optimizer';
it('identifies each reservation queue action by reservation and route',()=>{
 let game=createGame(quebec);
 for(const stand of ['Q01','Q02'])game=addReservation(game,{stand,mill:'M1',product:'soft-saw',volume:40,market:'ordinary'});
 const html=renderToStaticMarkup(<ReservationDesk game={game} onChange={()=>{}}/>);
 expect(html).toContain('aria-label="Earlier · reservation-1 · Q01 → M1"');
 expect(html).toContain('aria-label="Earlier · reservation-2 · Q02 → M1"');
 expect(html).toContain('aria-label="Release reservation · reservation-2 · Q02 → M1"');
});
it('identifies each expandable advisor explanation by policy',()=>{
 const candidate:RollingCandidate={id:'candidate-1',name:'Keep current queues',evidence:[],purchases:[],plan:createGame(quebec).plan,cashChange:0,delivered:0,processed:0,transferred:0,waste:0};
 const html=renderToStaticMarkup(<CandidateExplanation candidate={candidate}/>);
 expect(html).toContain('aria-label="Simulation evidence · Keep current queues"');
});

it('uses reservation release wording rather than availability in French',()=>{
 vi.stubGlobal('localStorage',{getItem:()=> 'fr'});
 const game=addReservation(createGame(quebec),{stand:'Q01',mill:'M1',product:'soft-saw',volume:40,market:'ordinary'});
 const html=renderToStaticMarkup(<LanguageProvider><ReservationDesk game={game} onChange={()=>{}}/></LanguageProvider>);
 expect(html).toContain('Libérer la réservation');
 expect(html).not.toContain('Disponibilité · reservation-1');
});

it('does not infer reservation failure from private classroom truck queues',()=>{
 const game=addReservation(createGame(quebec),{stand:'Q01',mill:'M1',product:'soft-saw',volume:40,market:'ordinary'});
 const html=renderToStaticMarkup(<ReservationDesk game={game} completePlan={false} onChange={()=>{}}/>);
 expect(html).toContain('other roles’ queues are private');
 expect(html).toContain('<td>40</td><td>Unavailable</td><td>Unavailable</td>');
 expect(html).toContain('Reserve destination');
});

it('does not silently reserve a different stand when the selected map stand is unowned',()=>{
 const html=renderToStaticMarkup(<ReservationDesk game={createGame(quebec)} standId="Q21" onChange={()=>{}}/>);
 expect(html).toContain('<button disabled="">Reserve destination</button>');
});
