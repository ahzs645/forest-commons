import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import ProcurementBudget from './ProcurementBudget';
import {LanguageProvider} from './i18n';
import {createGame} from './simulation/engine';
import {quebec} from './scenarios/quebec';
import {princeGeorge} from './scenarios/prince-george';
afterEach(()=>vi.unstubAllGlobals());
it('subtracts bids from cash and credit and floors exhausted capacity at zero',()=>{
 const game=createGame(quebec);game.cash=-100;game.region.economy.procurementCreditLimit=1000;game.plan.bids={Q21:250};
 const render=()=>renderToStaticMarkup(<ProcurementBudget game={game}/>);
 expect(render()).toContain('CAD 650');game.plan.bids.Q21=1000;expect(render()).toContain('CAD 0');
});
it('explains deferred royalties in French but keeps BC acquisition subject to available funds',()=>{
 vi.stubGlobal('localStorage',{getItem:()=> 'fr'});
 const game=createGame(quebec);game.region.economy.timberPayment='harvest-royalty';
 expect(renderToStaticMarkup(<LanguageProvider><ProcurementBudget game={game}/></LanguageProvider>)).toContain('Acquisition différée');
 const bc=createGame(princeGeorge);bc.region.economy.timberPayment='harvest-royalty';
 expect(renderToStaticMarkup(<LanguageProvider><ProcurementBudget game={bc}/></LanguageProvider>)).toContain('Disponible pour acquisition après les offres');
});
