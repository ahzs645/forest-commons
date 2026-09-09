import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {LanguageProvider,translate} from './i18n';
import TenureDesk from './TenureDesk';
import {createGame} from './simulation/engine';
import {princeGeorge} from './scenarios/prince-george';
afterEach(()=>vi.unstubAllGlobals());
it('localizes authorization controls, application status and monetary rates',()=>{
 vi.stubGlobal('localStorage',{getItem:()=> 'fr'});
 const game=createGame(princeGeorge);
 const html=renderToStaticMarkup(<LanguageProvider><TenureDesk game={game} standId="BC09"/></LanguageProvider>);
 expect(html).toContain('Demander ou renouveler l’autorisation de récolte');
 expect(html).toContain('demande d’autorisation requise');
 expect(html).not.toContain('authorization application required');
 expect(html).toMatch(/CAD [0-9   ]+,\d{2}/);
 expect(translate('authorization pending until turn 3','fr')).toBe('autorisation en attente jusqu’au tour 3');
 expect(translate('Application is already pending.','fr')).toBe('Une demande est déjà en cours.');
});
