import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {LanguageProvider} from './i18n';
import SettledReservationResults from './SettledReservationResults';
import {advance,createGame} from './simulation/engine';
import {quebec} from './scenarios/quebec';
afterEach(()=>vi.unstubAllGlobals());
function fixture(){const report=advance(createGame(quebec)).history[0];report.plan.reservations=[{id:'reservation-1',stand:'Q01',mill:'M1',product:'soft-saw',volume:40,market:'ordinary'}];return report;}
it('renders known partial fulfillment and unmet volume in both languages',()=>{
 const report=fixture();report.reservationFulfillment={'reservation-1':15};
 for(const language of ['en','fr']){
  vi.stubGlobal('localStorage',{getItem:()=>language});
  const html=renderToStaticMarkup(<LanguageProvider><SettledReservationResults report={report} region={quebec}/></LanguageProvider>);
  expect(html).toContain('tabindex="0" role="region"');expect(html).toContain('Q01 → M1');
  expect(html).toContain('<td>40</td><td>15</td><td>25</td>');
  expect(html).toContain(language==='fr'?'Réalisation constatée':'Actual fulfilled');
 }
});
it('treats an explicit empty fulfillment record as zero for a requested reservation',()=>{
 const report=fixture();report.reservationFulfillment={};
 const html=renderToStaticMarkup(<SettledReservationResults report={report} region={quebec}/>);
 expect(html).toContain('<td>40</td><td>0</td><td>40</td>');
});
it('keeps legacy actual and unmet unknown and hides empty reservation sets',()=>{
 const report=fixture();delete report.reservationFulfillment;
 expect(renderToStaticMarkup(<SettledReservationResults report={report} region={quebec}/>)).toContain('<td>40</td><td>Not recorded</td><td>Not recorded</td>');
 report.plan.reservations=[];expect(renderToStaticMarkup(<SettledReservationResults report={report} region={quebec}/>)).toBe('');
});
