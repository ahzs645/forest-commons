import { afterEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageProvider } from '../i18n';
import { MODEL_TERMS, ModelTermHelp, ModelGlossary, ResourceLocation } from './ModelGlossary';
import { createGame } from '../simulation/engine';
import { quebec } from '../scenarios/quebec';

afterEach(() => vi.unstubAllGlobals());

it('uses bilingual disclosures and model-specific definitions without changing the game', () => {
  const game = createGame(quebec), before = JSON.stringify(game);
  vi.stubGlobal('localStorage', { getItem: (key: string) => key === 'forest-language' ? 'fr' : null });
  const html = renderToStaticMarkup(<LanguageProvider><ModelTermHelp term="bucking"/><ModelGlossary/><ResourceLocation game={game} nodeId="junction"/></LanguageProvider>);
  expect(html).toContain('<details');
  expect(html).toContain('Récupération au tronçonnage');
  expect(html).toContain('Glossaire du modèle');
  expect(html).toContain('Chercher un terme');
  expect(html).toContain('Nœud routier');
  expect(html).not.toContain('Search model terms');
  expect(JSON.stringify(game)).toBe(before);
});

it('names real scenario features but never invents a depot for an anonymous road node', () => {
  const game = createGame(quebec);
  const site = game.region.stands[0];
  expect(renderToStaticMarkup(<ResourceLocation game={game} nodeId={site.node}/>)).toContain(site.name);
  expect(renderToStaticMarkup(<ResourceLocation game={game} nodeId="junction"/>)).toContain('Road node junction');
  expect(MODEL_TERMS.depot.definition.en).toContain('not a time');
  expect(MODEL_TERMS.bucking.definition.en).toContain('cannot upgrade pulp into sawlogs');
  expect(MODEL_TERMS.loads.definition.en).toContain('does not guarantee');
});
