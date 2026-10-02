import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageProvider } from '../i18n';
import { quebec } from '../scenarios/quebec';
import { createGame } from '../simulation/engine';
import { captureAlternative, serializeAlternatives } from '../simulation/plan-alternatives';
import { PlanComparison } from './PlanComparison';

afterEach(() => vi.unstubAllGlobals());
describe('plan comparison presentation', () => {
  it.each(['en', 'fr'])('renders stored forecast outcomes and explains scope in %s', language => {
    const game = createGame(quebec), saved = serializeAlternatives([captureAlternative(game, 'Short haul'), null]);
    vi.stubGlobal('localStorage', { getItem: (key: string) => key === 'forest-language' ? language : saved });
    const html = renderToStaticMarkup(<LanguageProvider><PlanComparison game={game} onChange={() => {}} campaignKey="lesson-1" /></LanguageProvider>);
    expect(html).toContain('Short haul');
    expect(html).toContain(game.region.currency);
    expect(html).toContain(language === 'fr' ? 'Variation de trésorerie' : 'Cash movement');
    expect(html).toContain(language === 'fr' ? 'les horaires futurs' : 'future crew schedules');
    expect(html).not.toContain('undefined');
  });
  it('disables stale alternatives and survives invalid browser storage', () => {
    const game = createGame(quebec), saved = serializeAlternatives([captureAlternative(game, 'Old cash'), null]);
    game.cash--;
    vi.stubGlobal('localStorage', { getItem: (key: string) => key === 'forest-language' ? 'en' : saved });
    const stale = renderToStaticMarkup(<LanguageProvider><PlanComparison game={game} onChange={() => {}} /></LanguageProvider>);
    expect(stale).toContain('Campaign conditions or commitments changed');
    expect(stale).toMatch(/disabled=""[^>]*>Apply A/);
    vi.stubGlobal('localStorage', { getItem: () => '{broken' });
    const damaged = renderToStaticMarkup(<LanguageProvider><PlanComparison game={game} onChange={() => {}} /></LanguageProvider>);
    expect(damaged).toContain('Browser storage could not restore or retain');
    expect(damaged).toContain('No saved orders yet');
  });
  it.each(['en', 'fr'])('keeps forecasts inspectable but blocks writes when campaign autosave is paused (%s)', language => {
    const game = createGame(quebec), saved = serializeAlternatives([captureAlternative(game, 'Still inspectable'), null]);
    vi.stubGlobal('localStorage', { getItem: (key: string) => key === 'forest-language' ? language : saved });
    const html = renderToStaticMarkup(<LanguageProvider><PlanComparison game={game} onChange={() => {}} blocked /></LanguageProvider>);
    expect(html).toContain(language === 'fr' ? 'La sauvegarde de campagne est suspendue' : 'Campaign saving is paused');
    expect(html).toContain('Still inspectable');
    expect(html).toContain(game.region.currency);
    expect(html).toMatch(language === 'fr' ? /disabled=""[^>]*>Appliquer A/ : /disabled=""[^>]*>Apply A/);
    expect(html).toMatch(language === 'fr' ? /disabled=""[^>]*>Remplacer par les ordres actuels/ : /disabled=""[^>]*>Replace with current orders/);
  });
});
