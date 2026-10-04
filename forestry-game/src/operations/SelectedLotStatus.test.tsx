import { afterEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageProvider } from '../i18n';
import { createGame } from '../simulation/engine';
import { bcOperatingLesson } from '../scenarios/bc-operating-lesson';
import SelectedLotStatus from './SelectedLotStatus';
import StandReadiness from './StandReadiness';
import { bcInventorySourceNote } from '../simulation/lot-evidence';

afterEach(() => vi.unstubAllGlobals());
it('makes the selected permit issue visible with a lot-specific actionable button', () => {
  const html = renderToStaticMarkup(<LanguageProvider><SelectedLotStatus game={createGame(bcOperatingLesson)} standId="BC09" onReviewPermits={() => {}} /></LanguageProvider>);
  expect(html).toContain('Application required');
  expect(html).toContain('Secured in this case');
  expect(html).toContain('Open operating window');
  expect(html).toContain('Review this lot’s permits');
  expect(html).toContain('Site-road permission does not establish a complete route');
});

it('renders statuses and inventory provenance in French without calling sourced attributes authored', () => {
  vi.stubGlobal('localStorage', { getItem: (key: string) => key === 'forest-language' ? 'fr' : null });
  const game = createGame(bcOperatingLesson);
  const html = renderToStaticMarkup(<LanguageProvider><SelectedLotStatus game={game} standId="BC09" onReviewPermits={() => {}} /><StandReadiness game={game} standId="BC09" /></LanguageProvider>);
  expect(html).toContain('Demande requise');
  expect(html).toContain('Examiner les permis de ce lot');
  expect(html).toContain('Âge projeté de l’inventaire');
  expect(html).toContain('Composition en essences de l’inventaire');
  expect(html).not.toContain('Âge pédagogique');
  expect(html).not.toContain('Composition en essences pédagogique');
});

it('shows unknown source age without upgrading an older authored campaign to current inventory', () => {
  const game = createGame(bcOperatingLesson);
  game.region.stands.find(s => s.id === 'BC01')!.sourceNote = bcInventorySourceNote({ featureId: '123', ageYears: null }, '2024-01-01');
  let html = renderToStaticMarkup(<StandReadiness game={game} standId="BC01" />);
  expect(html).toContain('Unknown in source');
  expect(html).toContain('2024-01-01');
  game.region.stands.find(s => s.id === 'BC01')!.sourceNote = 'Polygon outline sourced; these lesson attributes were authored.';
  html = renderToStaticMarkup(<StandReadiness game={game} standId="BC01" />);
  expect(html).toContain('Authored age');
  expect(html).toContain('Authored species composition');
  expect(html).not.toContain('2026-09-08');
});
