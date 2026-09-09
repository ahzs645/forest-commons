import BidCompositionDesk from "./BidCompositionDesk";
import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {LanguageProvider} from './i18n';
import BidCompositionRecord from './BidCompositionRecord';
import {createGame} from './simulation/engine';
import {quebec} from './scenarios/quebec';
afterEach(()=>vi.unstubAllGlobals());
it('shows frozen contributions and distinguishes a manual replacement in both languages',()=>{
 const game=createGame(quebec),plan=game.plan;plan.bids.Q21=1200;plan.bidComposition={Q21:{bid:1200,contributions:{'soft-saw':1000,'soft-pulp':200}}};
 for(const language of ['en','fr']){
  vi.stubGlobal('localStorage',{getItem:()=>language});
  const render=()=>renderToStaticMarkup(<LanguageProvider><BidCompositionRecord region={game.region} plan={plan} standId="Q21"/></LanguageProvider>);
  plan.bids.Q21=1200;expect(render()).toContain(language==='fr'?'Correspond à l’offre soumise':'Matched submitted bid');
  plan.bids.Q21=900;expect(render()).toContain(language==='fr'?'ne justifient donc pas la mise finale':'do not describe the final bid');
 }
});
it('renders nothing when the completed plan has no disclosed composition',()=>{
 const game=createGame(quebec);game.plan.bids={};
 expect(renderToStaticMarkup(<BidCompositionRecord region={game.region} plan={game.plan} standId="Q21"/>)).toBe('');
});

it('localizes product names in the French contribution editor',()=>{
 vi.stubGlobal('localStorage',{getItem:()=> 'fr'});
 const html=renderToStaticMarkup(<LanguageProvider><BidCompositionDesk game={createGame(quebec)} standId="Q21" onChange={()=>{}}/></LanguageProvider>);
 expect(html).toContain('Billes de sciage résineuses');
 expect(html).not.toContain('Softwood sawlogs');
});
