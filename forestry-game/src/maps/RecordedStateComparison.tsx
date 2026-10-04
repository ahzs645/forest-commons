import {useEffect, useState} from 'react';
import {useLanguage} from '../i18n';
import type {Game} from '../simulation/types';
import OperationsMap from './LazyMap';
import {mapStandValues, snapshotComparison, type MapLens} from './map-lenses';
import {MapLensSelect, MapLensValues} from './MapLensControls';
import './map-lenses.css';
import '../scroll-x.css';
/** Compare two captured end states on one map: changing the record never resets its camera. */
export default function RecordedStateComparison({game, reportIndex}: {game: Game; reportIndex?: number}) {
  const {language} = useLanguage(), fr = language === 'fr';
  const captured = game.history.flatMap((report, index) => report.snapshot ? [index] : []);
  return <section className="panel recorded-state-comparison" aria-label={fr ? 'Comparaison des états enregistrés' : 'Recorded state comparison'}>
    <h3>{fr ? 'Comparer deux fins de tour' : 'Compare two recorded end states'}</h3>
    <p>{fr ? 'Chaque état provient d’un instantané enregistré. La carte garde le même cadrage. Aucun état initial n’est reconstitué.' : 'Each state comes from a saved snapshot. The map keeps the same camera. An opening state is never reconstructed.'}</p>
    {captured.length < 2 ? <p>{game.history.length < 2
      ? (fr ? 'Exécutez au moins deux tours pour comparer l’évolution de la forêt d’un tour à l’autre.' : 'Run at least two turns to compare how the forest changed from one turn to another.')
      : (fr ? 'Cette sauvegarde contient trop peu de tours comparables. Les prochains tours exécutés pourront être comparés.' : 'This save has too few comparable turns. Turns you run from now on can be compared.')}</p>
      : <ComparisonSession key={game.region.id} game={game} captured={captured} reportIndex={reportIndex}/>}
  </section>;
}
function ComparisonSession({game, captured, reportIndex}: {game: Game; captured: number[]; reportIndex?: number}) {
  const {language} = useLanguage(), fr = language === 'fr';
  const latest = captured.includes(reportIndex ?? -1) ? reportIndex! : captured[captured.length - 1];
  const [first, setFirst] = useState(captured.find(index => index < latest) ?? captured[0]);
  const [second, setSecond] = useState(latest);
  const [active, setActive] = useState<'A' | 'B'>('B');
  const [lens, setLens] = useState<MapLens>('standing');
  const [selected, setSelected] = useState(game.region.stands[0]?.id ?? '');
  useEffect(() => {setSecond(latest);}, [reportIndex, latest]);
  const a = captured.includes(first) ? first : captured[0], b = captured.includes(second) ? second : latest;
  const index = active === 'A' ? a : b;
  const rows = snapshotComparison(game, a, b)!;
  const current = mapStandValues(game, game.history[index]);
  const selectedValues = rows.find(row => row.id === selected);
  const fmt = (n: number) => n.toLocaleString(fr ? 'fr-CA' : 'en-CA', {maximumFractionDigits: 1});
  const signed = (n: number) => `${n > 0 ? '+' : ''}${fmt(n)} m³`;
  return <>
    <div className="recorded-state-controls">{(['A','B'] as const).map(slot => <label key={slot}>{fr ? 'État' : 'State'} {slot}<select aria-label={`${fr ? 'État' : 'State'} ${slot}`} value={slot === 'A' ? a : b} onChange={event => (slot === 'A' ? setFirst : setSecond)(Number(event.target.value))}>{game.history.map((report, i) => <option key={i} value={i} disabled={!report.snapshot}>{fr ? 'Fin du tour' : 'End of turn'} {report.week}{!report.snapshot ? (fr ? ' · état non enregistré' : ' · state not recorded') : ''}</option>)}</select></label>)}</div>
    <div className="recorded-state-toggle" role="group" aria-label={fr ? 'État affiché' : 'Displayed state'}>{(['A','B'] as const).map(slot => <button key={slot} aria-pressed={active === slot} onClick={() => setActive(slot)}>{fr ? 'Afficher' : 'Show'} {slot} · {fr ? 'tour' : 'turn'} {game.history[slot === 'A' ? a : b].week}</button>)}</div>
    {a === b && <p role="status">{fr ? 'Les deux sélections affichent le même tour.' : 'Both selections refer to the same turn.'}</p>}
    <MapLensSelect value={lens} onChange={setLens}/>
    <p className="recorded-state-summary" role="status">{selectedValues ? `${selectedValues.id} · ${fr ? 'variation B − A : sur pied' : 'B − A change: standing'} ${signed(selectedValues.standingChange)} · ${fr ? 'en bord de route' : 'roadside'} ${signed(selectedValues.roadsideChange)}` : ''}</p>
    <OperationsMap game={game} replay={index} endStateOnly selected={selected} onSelect={setSelected} lens={lens} onLensChange={setLens} showLensControl={false}/>
    <details className="map-lens-details"><summary>{fr ? 'Valeurs exactes et accès sans la carte' : 'Exact values and access without the map'}</summary><MapLensValues rows={current} lens={lens} selected={selected} onSelect={setSelected} recorded/>
      <div className="table-wrap scroll-x" tabIndex={0} role="region" aria-label={fr ? 'Variations enregistrées des volumes' : 'Recorded volume changes'}><table><thead><tr><th>{fr ? 'Chantier' : 'Site'}</th><th>{fr ? 'Sur pied A' : 'Standing A'}</th><th>{fr ? 'Sur pied B' : 'Standing B'}</th><th>Δ B − A</th><th>{fr ? 'Bord de route A' : 'Roadside A'}</th><th>{fr ? 'Bord de route B' : 'Roadside B'}</th><th>Δ B − A</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><th>{row.id}</th><td>{fmt(row.standingA)} m³</td><td>{fmt(row.standingB)} m³</td><td>{signed(row.standingChange)}</td><td>{fmt(row.roadsideA)} m³</td><td>{fmt(row.roadsideB)} m³</td><td>{signed(row.roadsideChange)}</td></tr>)}</tbody></table></div>
    </details>
    <p className="muted">{fr ? 'Les volumes sont ceux enregistrés après chaque tour, pas une estimation des causes du changement. L’accès de terrain utilise la météo réelle du tour. Les routes sont grises si leur accès historique n’a pas été enregistré.' : 'Volumes are recorded after each turn; differences do not attribute causes. Terrain access uses actual weather from that turn. Roads are gray where historical road access was not recorded.'}</p>
  </>;
}
