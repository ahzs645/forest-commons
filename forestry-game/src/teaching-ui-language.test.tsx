import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {LanguageProvider,translate} from './i18n';
import {createGame,advance} from './simulation/engine';
import {quebec} from './scenarios/quebec';
import {startStewardship} from './simulation/stewardship';
import {illustrativeCalendar} from './simulation/season-calendar';
import StewardshipLab from './StewardshipLab';
import SeasonBuilder from './SeasonBuilder';
import DisclosureDesk from './DisclosureDesk';
import Debrief from './Debrief';
import TeamComparison from './TeamComparison';
import CollaborationLab from './CollaborationLab';
import StewardshipCharts from './StewardshipCharts';
import CoalitionCharts from './CoalitionCharts';
import NegotiationOffers from './NegotiationOffers';
import PartnerComparison from './PartnerComparison';
import {stewardshipYear} from './simulation/stewardship';
import {propose,respond} from './simulation/negotiation';
import {resultsExplanation} from './simulation/results-summary';
import {lessons} from './simulation/classroom-learning';
import type {ReactNode} from 'react';
afterEach(()=>vi.unstubAllGlobals());
function french(child:ReactNode){vi.stubGlobal('localStorage',{getItem:(key:string)=>key==='forest-language'?'fr':null});return renderToStaticMarkup(<LanguageProvider>{child}</LanguageProvider>);}
it('renders source negotiation and comparison explanations in French',()=>{
 const g=createGame(quebec);const collab=french(<CollaborationLab game={g} onChange={()=>{}}/>);
 expect(collab).toContain('Laboratoire de collaboration');expect(collab).toContain('Chaque entreprise appartient');expect(collab).not.toContain('Negotiate a complete partition');
 const teams=french(<TeamComparison game={g}/>);expect(teams).toContain('Les lignes décrivent');expect(teams).toContain('Engagements respectés');expect(teams).not.toContain('Rows report');
});
it('renders annual parameters and operational season opening in French without changing annual state',()=>{
 const g=createGame(quebec);g.stewardship=startStewardship(g);g.region.seasonCalendar=illustrativeCalendar(g.region);const before=JSON.stringify(g);
 const annual=french(<StewardshipLab game={g} onChange={()=>{}}/>);expect(annual).toContain('Aménagement forestier annuel');expect(annual).toContain(translate('Final harvest','fr'));expect(annual).toContain('Naturelle');expect(annual).not.toContain('Sparse stands wait');
 const season=french(<SeasonBuilder game={g} onChange={()=>{}}/>);expect(season).toContain('Saisons opérationnelles annuelles connectées');expect(season).toContain('année de gestion');expect(season).not.toContain('current operating forest');expect(JSON.stringify(g)).toBe(before);
});
it('renders private disclosure consent, estimates and proposal status in French',()=>{
 const html=french(<DisclosureDesk value={{phase:'sharing',economics:{'1':{standalone:100,pooled:80}},shared:[],estimates:{'1':{before:50}},offers:[{id:1,shares:{'1':20},accepted:[],status:'proposed'}]}} role="company1" act={async()=>{}}/>);
 expect(html).toContain('partage');expect(html).toContain('J’accepte de partager');expect(html).toContain('proposée');expect(html).toContain('Enregistrer l’estimation après partage');expect(html).not.toContain('Not submitted');
});
it('renders empty and completed debrief plus lesson prose in French',()=>{
 const g=createGame(quebec);expect(french(<Debrief game={g} onNavigate={()=>{}}/>)).toContain('Préparez les ordres');
 const done=advance(g),html=french(<Debrief game={done} onNavigate={()=>{}}/>);expect(html).toContain('semaines écoulées');expect(html).toContain('Acquérir le bois adapté');expect(html).not.toContain('No deliveries yet');
 for(const lesson of lessons){expect(translate(lesson.title,'fr')).not.toBe(lesson.title);expect(translate(lesson.body,'fr')).not.toBe(lesson.body);}
 expect(resultsExplanation(done,'fr')[1]).toContain('±10 %');expect(resultsExplanation(done)[1]).toContain('±10%');
});

it('renders chart descriptions, offer acceptance and partner comparison in French',()=>{
 let g=createGame(quebec);g=propose(g);g=respond(g,g.negotiation.offers!.at(-1)!.id,'1',true);
 const offers=french(<NegotiationOffers game={g} onChange={()=>{}}/>);expect(offers).toContain('Économies proposées');expect(offers).toContain('✓ Acceptée');expect(offers).not.toContain('No acceptance recorded');
 const partner=french(<PartnerComparison game={g}/>);expect(partner).toContain('Prochain chargement propre');expect(partner).toContain('Aucun devis avantageux');
 const annual=stewardshipYear(g.region,startStewardship(g),{});const charts=french(<StewardshipCharts state={annual} region={g.region}/>);expect(charts).toContain('Calendrier de gestion');expect(charts).toContain('Toutes les parcelles se reposent');expect(charts).not.toContain('Growth and removals');
 const coalition=french(<CoalitionCharts count={4} groups={[1,1,1,1]} shares={{'1':1,'2':1,'3':1,'4':1}}/>);expect(coalition).toContain('Partenariats et répartition');expect(coalition).not.toContain('Lines show shared');
});
