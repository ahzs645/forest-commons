import { afterEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageProvider } from '../i18n';
import { createGame, draftPlan, advance } from '../simulation/engine';
import { bcOperatingLesson } from '../scenarios/bc-operating-lesson';
import { quebec } from '../scenarios/quebec';
import { FirstDeliveryGuide } from './FirstDeliveryGuide';
import { LessonLauncher } from './OperationsShell';

afterEach(() => vi.unstubAllGlobals());

it('renders a compact first step in French with safe storage and no game changes', () => {
  vi.stubGlobal('localStorage', { getItem: (key: string) => key === 'forest-language' ? 'fr' : null });
  const game = createGame(bcOperatingLesson), before = JSON.stringify(game);
  const html = renderToStaticMarkup(<LanguageProvider><FirstDeliveryGuide game={game} campaignKey="french-test" onNavigate={() => {}} /></LanguageProvider>);
  expect(html).toContain('Votre première livraison');
  expect(html).toContain('Choisir un site à suivre');
  expect(html).toContain('Droits et autorisation');
  expect(html).not.toContain('Your first delivery');
  expect(html).not.toContain('Schedule production');
  expect(JSON.stringify(game)).toBe(before);
});

it('recommends the existing operating lesson with a concrete delivery goal', () => {
  const html = renderToStaticMarkup(<LessonLauncher regions={[bcOperatingLesson, quebec]} onChoose={() => {}} welcome />);
  expect(html.match(/Recommended first case/g)).toHaveLength(1);
  expect(html).toContain('Learn one complete delivery cycle');
  expect(html).toContain('review and confirm');
});

it('offers recorded-result review only after an actual delivery', () => {
  const game = advance(draftPlan(createGame(bcOperatingLesson)));
  const html = renderToStaticMarkup(<FirstDeliveryGuide game={game} campaignKey="settled-test" onNavigate={() => {}} />);
  expect(html).toContain('First delivery recorded');
  expect(html).toContain('Review recorded results');
  expect(html).not.toContain('Choose a site to follow');
});

it('keeps a compact queue guide actionable without rendering the long checklist', () => {
  const game = createGame(quebec);
  const controller = { scope: 'forest-first-delivery:compact', minimized: false, standId: 'Q03', reviewedKey: '', rehearsalOpen: false,
    chooseSite: () => {}, toggleMinimized: () => {}, rehearse: () => {} };
  const html = renderToStaticMarkup(<FirstDeliveryGuide game={game} campaignKey="compact" compact controller={controller} onNavigate={() => {}} />);
  expect(html).toContain('is-compact');
  expect(html).toContain('Q03 · Step 3/6');
  expect(html).toContain('Schedule production');
  expect(html).toContain('Expand guide');
  expect(html).not.toContain('<ol');
});

it('labels selected-site evidence as unknown when legacy shipment origins are missing', () => {
  const game = advance(draftPlan(createGame(quebec)));
  delete game.history[0].shipments;
  const controller = { scope: 'forest-first-delivery:legacy', minimized: false, standId: 'Q03', reviewedKey: '', rehearsalOpen: false,
    chooseSite: () => {}, toggleMinimized: () => {}, rehearse: () => {} };
  const html = renderToStaticMarkup(<FirstDeliveryGuide game={game} campaignKey="legacy" controller={controller} onNavigate={() => {}} />);
  expect(html).toContain('delivered across this campaign');
  expect(html).toContain('Q03');
  expect(html).toContain('Origin not fully recorded');
  expect(html).not.toContain('Learning-site delivery:<!-- --> <!-- -->0 m³');
});
