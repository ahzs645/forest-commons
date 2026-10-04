import { useState } from 'react';
import { scaleBand } from 'd3';
import TimeSeries from './charts/TimeSeries';
import AnnualActionMap from './AnnualActionMap';
import type { StewardshipState } from './simulation/stewardship';
import type { RegionDefinition } from './simulation/types';
import { stewardshipTimeline } from './stewardship-timeline';
import { useInteractiveTeachingLanguage } from './teaching-interactive-language';
import './teaching-interactive.css';

const colors = { rest: '#dbe9df', thin: '#dc9b39', final: '#be563f', plant: '#277b59' };
export default function StewardshipCharts({ state, region }: { state: StewardshipState; region: RegionDefinition }) {
  const { t: tr, language } = useInteractiveTeachingLanguage();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const history = state.history;
  const timeline = stewardshipTimeline(state, region);
  const selected = timeline.find(record => record.year === selectedYear) ?? timeline.at(-1);
  if (!selected) return <p>{tr('Advance a year to see volume, habitat and treatment history.')}</p>;
  const index = timeline.findIndex(record => record.year === selected.year);
  const chooseIndex = (value: number) => setSelectedYear(value === timeline.length - 1 ? null : timeline[value].year);
  const number = (value: number) => Math.round(value).toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA');
  const percent = (value: number | null) => value === null ? tr('Unavailable') : `${(value * 100).toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { maximumFractionDigits: 1 })}%`;
  const managed = state.stands.filter(stand => stand.managed);
  const calendarWidth = Math.max(500, 100 + history.length * 28), calendarHeight = 35 + managed.length * 25;
  const cx = scaleBand<number>().domain(history.map(record => record.year)).range([85, calendarWidth - 10]).padding(.12);
  return <div>
    <section className="stewardship-explorer" aria-label={tr('Recorded year explorer')}>
      <h3>{tr('Recorded year explorer')}</h3>
      <div className="stewardship-controls">
        <button disabled={index === 0} onClick={() => chooseIndex(index - 1)}>{tr('Previous recorded year')}</button>
        <label>{tr('Recorded management year')}<select value={index} onChange={event => chooseIndex(Number(event.target.value))}>{timeline.map((record, i) => <option key={record.year} value={i}>{tr('Year')} {record.year}</option>)}</select></label>
        <button disabled={index === timeline.length - 1} onClick={() => chooseIndex(index + 1)}>{tr('Next recorded year')}</button>
        <label>{tr('Year')} {selected.year}<input type="range" min={0} max={timeline.length - 1} step={1} value={index} disabled={timeline.length === 1} aria-label={tr('Recorded management year')} aria-valuetext={`${tr('Year')} ${selected.year}`} onChange={event => chooseIndex(Number(event.target.value))}/></label>
        <button disabled={index === timeline.length - 1} onClick={() => setSelectedYear(null)}>{tr('Latest recorded year')}</button>
      </div>
      <div aria-live="polite" aria-atomic="true">
        <h4>{tr('Year-end observations')} · {tr('Year')} {selected.year}</h4>
        <dl className="teaching-metrics">
          <div><dt>{tr('Harvest')}</dt><dd>{number(selected.harvest)} m³</dd></div>
          <div><dt>{tr('Growth')}</dt><dd>{number(selected.growth)} m³</dd></div>
          <div><dt>{tr('Planted stands')}</dt><dd>{selected.plantedStands.length}</dd></div>
          <div><dt>{tr('Standing forest')}</dt><dd>{number(selected.standing)} m³</dd></div>
          <div><dt>{tr('Landscape habitat')}</dt><dd>{percent(selected.landscapeHabitat)}</dd></div>
          <div><dt>{tr('Managed habitat')}</dt><dd>{percent(selected.managedHabitat)}</dd></div>
          <div><dt>{tr('Closing budget')}</dt><dd>{selected.closingCash === null ? tr('Unavailable') : `${region.currency} ${number(selected.closingCash)}`}</dd></div>
          <div><dt>{tr('Cash movement')}</dt><dd>{region.currency} {number(selected.cashChange)}</dd></div>
        </dl>
        <h4>{tr('Recorded treatments')}</h4>
        {selected.treatments.length ? <ul className="stewardship-actions">{selected.treatments.map(([id, action]) => <li key={id}><strong>{id}</strong>: {tr(action)}</li>)}</ul> : <p>{tr('All stands rest')}</p>}
        {selected.connectedSeason && <p className="notice">{tr('This year includes a connected operating season. Treatment labels describe recorded management actions, not individual deliveries.')}</p>}
      </div>
      <p className="muted">{tr('Year-end budget sums the opening budget and recorded cash movements through the selected year.')}</p>
      <p className="muted">{selected.standSnapshots
        ? (language === 'fr' ? 'Les observations par parcelle du modèle ont été enregistrées pour cette année.' : 'Model observations by stand were recorded for this year.')
        : (language === 'fr' ? 'Cet ancien dossier conserve les totaux et traitements. Les valeurs historiques par parcelle restent indisponibles.' : 'This older record keeps totals and treatments. Historical stand values remain unavailable.')}</p>
      <details><summary>{language === 'fr' ? 'Comparer les cartes annuelles' : 'Compare yearly maps'}</summary><AnnualActionMap state={state} region={region} year={selected.year}/></details>
    </section>
    <details><summary>{tr('Annual changes')} · {tr('Management calendar')}</summary>
      <h3>{tr('Annual changes')}</h3><p>{tr('Growth and removals include all stands.')}</p>
      <TimeSeries title={tr('Annual growth and harvest')} unit="m³" xLabel={tr('Year')} series={[{ name: tr('Growth'), color: '#277b59', values: history.map(record => ({ x: record.year, y: record.growth })) }, { name: tr('Harvest'), color: '#c28523', values: history.map(record => ({ x: record.year, y: record.harvest })) }]}/>
      <h3>{tr('Habitat recovery and treatment effects')}</h3><p>{tr('Landscape versus secured management area. Indices are teaching assumptions, not measured habitat quality. Older saved years without managed-area observations remain blank.')}</p>
      <TimeSeries title={tr('Habitat history')} unit="%" maxY={100} xLabel={tr('Year')} series={[{ name: tr('Landscape'), color: '#277b59', values: history.map(record => ({ x: record.year, y: record.habitat * 100 })) }, { name: tr('Managed area'), color: '#7954a1', values: history.map(record => ({ x: record.year, y: record.managedHabitat == null ? null : record.managedHabitat * 100 })) }]}/>
      <h3>{tr('Management calendar')}</h3>
      <p>{Object.entries(colors).map(([action, color]) => <span key={action} style={{ marginRight: 16 }}><span aria-hidden="true" style={{ display: 'inline-block', width: 12, height: 12, background: color, marginRight: 4 }}/>{tr(action)}</span>)}</p>
      <div style={{ overflowX: 'auto' }} tabIndex={0} role="region" aria-label={tr('Scrollable annual treatment calendar')}>
        <svg role="group" aria-label={tr('Annual actions by managed stand')} width={calendarWidth} height={calendarHeight}>
          {history.map((record, i) => <g key={record.year} role="button" tabIndex={0} className="stewardship-calendar-control" aria-label={`${tr('Year')} ${record.year}`} aria-pressed={record.year === selected.year} onClick={() => chooseIndex(i)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); chooseIndex(i); } }}>
            <rect x={cx(record.year)! - 2} y={0} width={cx.bandwidth() + 4} height={calendarHeight} fill={record.year === selected.year ? '#e2efe3' : 'transparent'} rx={3}/>
            <text x={cx(record.year)! + cx.bandwidth() / 2} y={16} textAnchor="middle" fontSize={11}>{record.year}</text>
            {managed.map((stand, j) => { const action = record.actions[stand.id] ?? 'rest'; return <rect key={stand.id} x={cx(record.year)} y={24 + j * 25} width={cx.bandwidth()} height={20} rx={3} fill={colors[action]}><title>{`${stand.id} · ${tr('Year')} ${record.year}: ${tr(action)}`}</title></rect>; })}
          </g>)}
          {managed.map((stand, i) => <text key={stand.id} x={75} y={39 + i * 25} textAnchor="end" fontSize={12}>{stand.id}</text>)}
        </svg>
      </div>
      <details><summary>{tr('Accessible action history')}</summary>{history.map(record => <p key={record.year}>{tr('Year')} {record.year}: {Object.entries(record.actions).filter(([, action]) => action !== 'rest').map(([id, action]) => `${id}: ${tr(action)}`).join('; ') || tr('All stands rest')}.</p>)}</details>
      <p>{region.name}{tr(': management membership is fixed when the annual exercise begins.')}</p>
    </details>
  </div>;
}
