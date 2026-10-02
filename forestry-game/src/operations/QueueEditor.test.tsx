import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createGame } from '../simulation/engine';
import { quebec } from '../scenarios/quebec';
import { LanguageProvider } from '../i18n';
import QueueEditor from './QueueEditor';
afterEach(() => vi.unstubAllGlobals());

describe('map queue controls', () => {
  it('provides separate tap and keyboard controls with a stop description', () => {
    const game = createGame(quebec);
    game.plan.crews.C1 = [{ stand: 'Q01', hours: 8 }, { stand: 'Q02', hours: 4 }];
    const html = renderToStaticMarkup(<LanguageProvider><QueueEditor game={game} kind="crew" resourceId="C1" selected="Q01" onSelect={() => {}} onChange={() => {}} /></LanguageProvider>);
    expect(html).toContain('Move ');
    expect(html).toContain('stop 1, Q01 earlier');
    expect(html).toContain('stop 1, Q01 later');
    expect(html).toContain('Remove ');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('Forecast results update as you edit');
    expect(html).not.toContain('draggable');
  });

  it('keeps completed campaign stops inspectable with editing disabled', () => {
    const game = createGame(quebec), truck = game.region.trucks[0].id;
    game.week = game.region.weeks + 1;
    game.plan.trucks[truck] = [{ stand: 'Q01', mill: 'M1', product: 'soft-saw', loads: 1 }];
    const html = renderToStaticMarkup(<LanguageProvider><QueueEditor game={game} kind="truck" resourceId={truck} selected="Q01" onSelect={() => {}} onChange={() => {}} /></LanguageProvider>);
    expect(html).toContain('Q01 → M1</button>');
    expect(html.match(/disabled=""/g)).toHaveLength(4);
  });

  it('localizes queue editing controls and accessible stop descriptions in French', () => {
    vi.stubGlobal('localStorage', { getItem: () => 'fr' });
    const game = createGame(quebec);
    game.plan.crews.C1 = [{ stand: 'Q01', hours: 8 }, { stand: 'Q02', hours: 4 }];
    const html = renderToStaticMarkup(<LanguageProvider><QueueEditor game={game} kind="crew" resourceId="C1" selected="Q01" onSelect={() => {}} onChange={() => {}} /></LanguageProvider>);
    expect(html).toContain('arrêt 1, Q01');
    expect(html).toContain('Avancer ');
    expect(html).toContain('Reculer ');
    expect(html).toContain('Retirer ');
    expect(html).toContain('Heures');
    expect(html).toContain('Les prévisions suivent vos modifications');
    expect(html).not.toContain('Forecast results');
    expect(html).not.toContain('Move ');
  });
});
