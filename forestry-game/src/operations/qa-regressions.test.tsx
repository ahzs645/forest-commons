import { afterEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageProvider } from '../i18n';
import { createGame, draftPlan, advance } from '../simulation/engine';
import { quebec } from '../scenarios/quebec';
import { TurnReview } from './PlanReview';
import { FirstDeliveryGuide } from './FirstDeliveryGuide';
import DecisionDebrief from './DecisionDebrief';
import TurnOutcomeDialog from './TurnOutcome';

afterEach(() => vi.unstubAllGlobals());

it('uses retrospective instructions after a season instead of forecast and idle-turn warnings', () => {
  const game = advance(draftPlan(createGame(quebec)));
  game.week = game.region.weeks + 1;
  const html = renderToStaticMarkup(<><TurnReview game={game}/><FirstDeliveryGuide game={game} onNavigate={() => {}}/></>);
  expect(html).toContain('Season complete');
  expect(html).toContain('prepare your next campaign');
  expect(html).not.toContain('No work scheduled');
  expect(html).not.toContain('Forecast unavailable');
  expect(html).not.toContain('before planning the next turn');
});

it('renders the selected turn in the site debrief when a later report exists', () => {
  const game = advance(draftPlan(advance(draftPlan(createGame(quebec)))));
  const html = renderToStaticMarkup(<DecisionDebrief game={game} reportIndex={0}/>);
  expect(html).toContain('What happened in this turn? · 1');
  expect(html).not.toContain('What happened in this turn? · 2');
});

it('uses the correct French agreement for a completed week', () => {
  vi.stubGlobal('localStorage', { getItem: (key: string) => key === 'forest-language' ? 'fr' : null });
  const game = advance(draftPlan(createGame(quebec)));
  const html = renderToStaticMarkup(<LanguageProvider><TurnOutcomeDialog game={game} reportIndex={0}
    onClose={() => {}} onNavigate={() => {}} onReplay={() => {}}/></LanguageProvider>);
  expect(html).toContain('Semaine 1 terminée');
  expect(html).not.toContain('Semaine 1 terminé<');
});
