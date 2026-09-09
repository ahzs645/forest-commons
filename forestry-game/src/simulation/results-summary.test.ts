import {describe,it,expect} from 'vitest';
import {createGame,advance} from './engine';
import {quebec} from '../scenarios/quebec';
import {resultsSummary} from './results-summary';
import {debriefMarkdown} from './debrief';
describe('results explanations and availability',()=>{
 it('distinguishes an unrun campaign from zero output and exports that state',()=>{
  const g=createGame(quebec);expect(resultsSummary(g)).toBeNull();expect(debriefMarkdown(g)).toContain('No completed weeks yet');
 });
 it('does not invent service or emissions intensity when there is no denominator',()=>{
  const g=advance(createGame(quebec));const result=resultsSummary(g)!;
  expect(result.weeks).toBe(1);expect(result.delivered).toBe(0);expect(result.servicePercent).toBeNull();expect(result.emissionsPerDelivered).toBeNull();expect(debriefMarkdown(g)).toContain('Not evaluated');
 });
 it('weights target checks across weeks and uses completed cash rather than current purchases',()=>{
  const g=advance(advance(createGame(quebec)));
  g.history[0].targetChecks=1;g.history[0].targetHits=1;g.history[1].targetChecks=3;g.history[1].targetHits=1;
  g.history[0].delivered={saw:100};g.history[1].delivered={saw:300};g.history[0].emissions=100;g.history[1].emissions=700;
  g.history[1].cash=123;g.cash=99;
  expect(resultsSummary(g)).toMatchObject({servicePercent:50,emissionsPerDelivered:2,closingCash:123});
  expect(debriefMarkdown(g)).toContain('not the percentage of demand volume delivered');
 });
});

it('exports readable daily duration and turn-based empty-state wording',()=>{
 const g=createGame({...quebec,turnDurationWeeks:1/7,weeks:84});
 const english=debriefMarkdown(g),french=debriefMarkdown(g,'fr');
 expect(english).toContain('0.143 physical weeks per turn');
 expect(english).toContain('No completed turns yet');
 expect(french).toContain('0,143 semaine physique par tour');
 expect(english+french).not.toContain('0.142857');
});
