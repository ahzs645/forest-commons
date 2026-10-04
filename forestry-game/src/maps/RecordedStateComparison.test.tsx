import {afterEach, expect, it, vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {LanguageProvider} from '../i18n';
import {quebec} from '../scenarios/quebec';
import {advance, createGame} from '../simulation/engine';
import RecordedStateComparison from './RecordedStateComparison';
import {MapLensLegend, MapLensValues} from './MapLensControls';
import {mapStandValues} from './map-lenses';
afterEach(() => vi.unstubAllGlobals());
it.each(['en','fr'])('explains end-state-only scope and exposes recorded values in %s', language => {
  vi.stubGlobal('localStorage', {getItem: () => language});
  const game = advance(advance(createGame(quebec)));
  const html = renderToStaticMarkup(<LanguageProvider><RecordedStateComparison game={game} reportIndex={-1}/></LanguageProvider>);
  expect(html).toContain(language === 'fr' ? 'Aucun état initial n’est reconstitué.' : 'An opening state is never reconstructed.');
  expect(html).toContain(language === 'fr' ? 'Variations enregistrées des volumes' : 'Recorded volume changes');
  expect(html).toContain('Δ B − A'); expect(html).not.toContain('undefined');
});
it('does not offer a fabricated opening comparison with just one captured state', () => {
  const game = advance(createGame(quebec));
  const html = renderToStaticMarkup(<RecordedStateComparison game={game}/>);
  expect(html).toContain('Two turns with recorded snapshots');expect(html).not.toContain('Show A');
});
it('accessible historical fallback labels missing values explicitly and numeric legend keeps selection separate', () => {
  const game = advance(createGame(quebec)); delete game.history[0].snapshot;
  const html = renderToStaticMarkup(<><MapLensValues rows={mapStandValues(game, game.history[0])} lens="standing" selected="Q01" onSelect={() => {}} recorded/><MapLensLegend lens="standing"/></>);
  expect(html).toContain('Not recorded');expect(html).toContain('gold outline');expect(html).toContain('aria-pressed="true"');
});
