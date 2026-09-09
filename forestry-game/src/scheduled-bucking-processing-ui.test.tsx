import {it,expect,vi,afterEach} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import CrewTimeline from './CrewTimeline';
import MillProcessingDesk from './MillProcessingDesk';
import {LanguageProvider} from './i18n';
import {quebec} from './scenarios/quebec';
import {createGame,advance} from './simulation/engine';
import {scheduleCrew} from './simulation/scheduling';
import {parseGame} from './simulation/validation';
import {serializeGame} from './simulation/save-format';
import {subdividedScenario} from './simulation/turn-duration';
afterEach(()=>vi.unstubAllGlobals());
it('future recovery choice survives reload, activates and is recorded by actual production',()=>{
 const r=structuredClone(quebec),stand=r.stands.find(s=>s.supply==='guaranteed')!,crew=r.crews[0],profile=Object.keys(r.buckingProfiles??{}).find(id=>id!=='standard')!;
 stand.terrain=1;crew.node=stand.node;let game=createGame(r);
 game=scheduleCrew(game,2,crew.id,[{stand:stand.id,hours:1,treatment:'final',bucking:profile}]);
 game=parseGame(serializeGame(game));game=advance(game);
 expect(game.plan.crews[crew.id][0].bucking).toBe(profile);game=advance(game);
 expect(game.history[1].production?.find(p=>p.crew===crew.id)?.bucking).toBe(profile);
 expect(game.history[1].production?.find(p=>p.crew===crew.id)?.products).not.toEqual({});
 expect(parseGame(serializeGame(game)).history[1].plan.crews[crew.id][0].bucking).toBe(profile);
});
it('future queue UI exposes recovery choices and identifies a saved nonstandard recovery',()=>{
 const game=createGame(quebec),crew=game.region.crews[0],profile=Object.keys(game.region.buckingProfiles??{}).find(id=>id!=='standard')!,stand=game.region.stands.find(s=>s.supply==='guaranteed')!;
 const scheduled=scheduleCrew(game,2,crew.id,[{stand:stand.id,hours:1,bucking:profile}]);
 const html=renderToStaticMarkup(<CrewTimeline game={scheduled} onChange={()=>{}}/>);
 expect(html).toContain('Bucking recovery');expect(html).toContain(`value="${profile}"`);
 expect(html.split(game.region.buckingProfiles![profile].name).length).toBeGreaterThan(2);
});
it('processing rate labels follow physical week versus subdivided turn in English and French',()=>{
 for(const divisions of [1,2,4,7] as const)for(const language of ['en','fr']){
  vi.stubGlobal('localStorage',{getItem:(k:string)=>k==='forest-language'?language:null,setItem:()=>{}});
  const source=structuredClone(quebec);source.mills[0].processing={inputs:[source.products[0].id],capacityM3:70,costM3:1,outputs:[{id:'chips',name:'Chips',yield:.5,price:10,weeklyDemand:35}]};
  const game=createGame(divisions===1?source:subdividedScenario(source,divisions));
  const html=renderToStaticMarkup(<LanguageProvider><MillProcessingDesk game={game} onChange={()=>{}}/></LanguageProvider>);
  expect(game.region.mills[0].processing!.capacityM3).toBe(70/divisions);
  if(divisions===1)expect(html).toContain(language==='en'?'Weekly demand':'Demande hebdomadaire');
  else {expect(html).toContain(language==='en'?'Turn demand':'Demande du tour');expect(html).not.toContain('m³/week');expect(html).not.toContain('Weekly demand');}
 }
});
