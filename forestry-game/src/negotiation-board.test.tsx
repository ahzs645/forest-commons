import { afterEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageProvider } from './i18n';
import NegotiationOffers, { NegotiationOfferEvidence } from './NegotiationOffers';
import StewardshipCharts from './StewardshipCharts';
import { createGame } from './simulation/engine';
import { propose, respond } from './simulation/negotiation';
import { startStewardship, stewardshipYear } from './simulation/stewardship';
import { quebec } from './scenarios/quebec';

afterEach(() => vi.unstubAllGlobals());

it('keeps rejected company identity and motives unknown while preserving recorded acceptances', () => {
  let game = propose(createGame(quebec));
  game = respond(game, 1, '1', true);
  game = respond(game, 1, '2', false);
  const before = structuredClone(game);
  const html = renderToStaticMarkup(<NegotiationOfferEvidence offer={game.negotiation.offers![0]}/>);
  expect(html).toContain('This record does not identify who rejected the offer or why.');
  expect(html).toContain('✓ Accepted');
  expect(html).toContain('No acceptance recorded');
  expect(html).not.toContain('<button');
  expect(game).toEqual(before);
});

it('makes superseded and agreed proposals inspectable without reopening old offers', () => {
  let game = propose(createGame(quebec));
  game = respond(game, 1, '1', true);
  game = propose(game);
  for (let i = 1; i <= game.negotiation.count; i++) game = respond(game, 2, String(i), true);
  const html = renderToStaticMarkup(<NegotiationOffers game={game} onChange={() => {}}/>);
  expect(html).toContain('Replaced by a later proposal');
  expect(html).toContain('All companies accepted');
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain('Change from previous offer (kSEK)');
  expect(html).not.toContain('<legend>Company responses</legend>');
});

it('translates the new history controls and evidence in French', () => {
  vi.stubGlobal('localStorage', { getItem: () => 'fr' });
  const game = propose(createGame(quebec));
  const annual = stewardshipYear(game.region, startStewardship(game), {});
  const html = renderToStaticMarkup(<LanguageProvider><NegotiationOffers game={game} onChange={() => {}}/><StewardshipCharts state={annual} region={game.region}/></LanguageProvider>);
  expect(html).toContain('Tableau de négociation');
  expect(html).toContain('En attente de réponse');
  expect(html).toContain('Explorateur des années enregistrées');
  expect(html).toContain('Budget de clôture');
  expect(html).toContain('Toutes les parcelles se reposent');
  expect(html).not.toContain('Recorded year explorer');
  expect(html).not.toContain('Company responses');
});
