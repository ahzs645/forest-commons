import {it,expect} from 'vitest';
import {translate,french} from './i18n';
import {debriefMarkdown,worksheetCSV} from './simulation/debrief';
import {createGame} from './simulation/engine';
import {quebec} from './scenarios/quebec';
it('translates controls and known server errors with honest fallback for unknown scenario text',()=>{
 expect(translate('Map','fr')).toBe('Carte');expect(translate('Map','en')).toBe('Map');
 expect(translate('Error: Room changed. Refresh before submitting your decision.','fr')).toContain('Actualisez');
 expect(translate('Custom regional stand name','fr')).toBe('Custom regional stand name');
 expect(Object.keys(french).length).toBeGreaterThan(250);
});
it('exports French human-readable reports without changing saved game identifiers or values',()=>{
 const g=createGame(quebec),before=JSON.stringify(g),report=debriefMarkdown(g,'fr');
 expect(report).toContain('Bilan d’exploitation');expect(report).toContain('Aucun tour terminé');expect(report).toContain(g.region.name);
 expect(worksheetCSV(g,'fr')).toContain('cout_independant_kSEK');expect(JSON.stringify(g)).toBe(before);
});
it('translates engine diagnostic templates while preserving authored resource names and quantities',()=>{
 expect(translate('Équipe du Nord: terrain closed at BC05 (wet).','fr')).toBe('Équipe du Nord : terrain fermé à BC05 (humide).');
 expect(translate('Truck 2: no delivery for Q01 / soft-pulp; check stock, demand and time.','fr')).toContain('Q01 / soft-pulp');
 expect(translate('Won Q08 for 1250. Available next week; refusal window lasts one week.','fr')).toContain('semaine physique');
 expect(translate('Custom unexpected narrative','fr')).toBe('Custom unexpected narrative');
});
it('translates multiple joined plan errors without rewriting unknown names',()=>{
 const text='Campaign complete. Start a new scenario to continue. Purchase, production and transport roles must mark their plans ready.';
 expect(translate(text,'fr')).toContain('rôles achats');
 expect(translate('Custom title. Unknown authored description.','fr')).toBe('Custom title. Unknown authored description.');
});
