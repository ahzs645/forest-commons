import { afterEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageProvider } from './i18n';
import NegotiationOffers, { NegotiationOfferEvidence } from './NegotiationOffers';
import CollaborationLab from './CollaborationLab';
import { createGame } from './simulation/engine';
import { propose, respond } from './simulation/negotiation';
import { quebec } from './scenarios/quebec';
afterEach(() => vi.unstubAllGlobals());
it('shows draft shares and prevents publishing an unbalanced draft before mutating history', () => {
  const game = createGame(quebec);
  game.negotiation.custom['1'] = -1;
  const html = renderToStaticMarkup(<NegotiationOffers game={game} onChange={() => {}}/>);
  expect(html).toContain('Current draft allocation');
  expect(html).toContain('Fix the draft before publishing');
  expect(html).toContain('Use finite, nonnegative savings');
  expect(html).toMatch(/disabled=""[^>]*>Propose current allocation/);
  expect(game.negotiation.offers).toBeUndefined();
});
it('gives draft changes and prior acceptance context without rewriting frozen offers', () => {
  const game = respond(propose(createGame(quebec)), 1, '1', true);
  game.negotiation.method = 'equal';
  const html = renderToStaticMarkup(<NegotiationOffers game={game} onChange={() => {}}/>);
  expect(html).toContain('Changes from the latest proposal');
  expect(html).toContain('Prior recorded acceptances stay with that proposal');
  expect(html).toContain('Recorded acceptances: 1 / 5');
});
it('labels incomparable cost tables instead of presenting a numeric allocation improvement', () => {
  const first = propose(createGame(quebec));
  const prior = first.negotiation.offers![0];
  first.negotiation.count = 4;
  const second = propose(first).negotiation.offers![1];
  const html = renderToStaticMarkup(<NegotiationOfferEvidence offer={second} previousOffer={prior}/>);
  expect(html).toContain('Different teaching dataset');
  expect(html).toContain('different company cost table');
  expect(html).toContain('4 companies');
});
it('puts allocation editing before optional evidence and removes repeated board/operating tools', () => {
  const game = createGame(quebec);
  const html = renderToStaticMarkup(<CollaborationLab game={game} onChange={() => {}} onOpenBoard={() => {}}/>);
  expect(html.indexOf('Savings for company 1')).toBeLessThan(html.indexOf('Allocation evidence and charts'));
  expect(html).toContain('Review on negotiation board');
  expect(html).not.toContain('From allocation to agreement');
  expect(html).not.toContain('Partner freight contract');
});
it('translates draft review and validation in French', () => {
  vi.stubGlobal('localStorage', { getItem: () => 'fr' });
  const game = createGame(quebec);
  game.negotiation.custom['1'] = -1;
  const html = renderToStaticMarkup(<LanguageProvider><NegotiationOffers game={game} onChange={() => {}}/></LanguageProvider>);
  expect(html).toContain('Examiner le brouillon actuel');
  expect(html).toContain('Corriger le brouillon avant de publier');
  expect(html).toContain('5 entreprises');
  expect(html).not.toContain('Ready to publish');
  expect(html).not.toContain('Review the current draft');
});
