import {useLanguage} from './i18n';
import type {Game} from './simulation/types';
import {marketSnapshot} from './simulation/bc-market';

/** Public market information only: never inspect future authored event records here. */
export default function BCMarketDesk({game}:{game:Game}) {
 const {t:tr}=useLanguage();
 if(!game.region.bcMarket)return null;
 const current=marketSnapshot(game);
 const percent=(index:number)=>`${(index*100).toFixed(0)}`;
 const history=game.history.flatMap(h=>h.market?[{turn:h.week,market:h.market}]:[]);
 return <section className="panel" aria-label={tr("BC market and stumpage timing")}>
  <h3>{tr('BC market and stumpage timing')}</h3>
  <p>{tr('Fuel prices affect crew and haul costs, which change bidder margins. Lumber prices and mill demand affect timber value. Auction evidence informs the teaching stumpage reset after a lag. Oil does not mechanically create timber supply.')}</p>
  <div className="table-wrap" tabIndex={0} role="region" aria-label={tr("Public market indices · opening baseline = 100")}><table><caption>{tr('Public market indices · opening baseline = 100')}</caption><thead><tr><th>{tr('Fuel / oil proxy')}</th><th>{tr('Lumber')}</th><th>{tr('Mill demand')}</th><th>{tr('Auction bid signal')}</th><th>{tr('Adjustable stumpage')}</th></tr></thead><tbody><tr><td>{percent(current.fuel)}</td><td>{percent(current.lumber)}</td><td>{percent(current.demand)}</td><td>{percent(current.bidIndex)}</td><td>{percent(current.stumpageMultiplier)}</td></tr></tbody></table></div>
  <p>{tr('Physical week')}: {current.physicalWeek} · {tr('Last reset')}: {current.lastResetWeek} · {tr('Evidence week used')}: {current.rateSignalWeek} · {tr('Next scheduled reset')}: {current.nextResetWeek}</p>
  <p>{tr('Adjustable Crown rates can change at scheduled resets. BCTS rates marked fixed at award lock when the sale is won; unsold lots show the current prospective rate. Check each lot’s tenure desk for the rate that applies.')}</p>
  {!!current.events.length&&<ul>{current.events.map((event,i)=><li key={i}>{event}</li>)}</ul>}
  <details><summary>{tr('Observed market history')}</summary><p>{tr('Completed operating turns only. Future event details are not shown.')}</p><div className="table-wrap" tabIndex={0} role="region" aria-label={tr("Observed market history")}><table><thead><tr><th>{tr('Turn')}</th><th>{tr('Physical week')}</th><th>{tr('Fuel')}</th><th>{tr('Lumber')}</th><th>{tr('Demand')}</th><th>{tr('Bid signal')}</th><th>{tr('Stumpage index')}</th></tr></thead><tbody>{history.map(({turn,market:m})=><tr key={turn}><td>{turn}</td><td>{m.physicalWeek}</td><td>{percent(m.fuel)}</td><td>{percent(m.lumber)}</td><td>{percent(m.demand)}</td><td>{percent(m.bidIndex)}</td><td>{percent(m.stumpageMultiplier)}</td></tr>)}</tbody></table></div>{!history.length&&<p>{tr('Advance an operating turn to build the market record.')}</p>}</details>
  <details><summary>{tr('Market assumptions and source context')}</summary><p>{game.region.bcMarket.note}</p><p><a href="https://www2.gov.bc.ca/gov/content/industry/forestry/competitive-forest-industry/timber-pricing/interior-timber-pricing" target="_blank" rel="noreferrer">{tr('BC Interior timber pricing')}</a></p></details>
  <p className="muted">{tr('Illustrative scenario indices and simplified pricing timing, not live oil prices or an official BC stumpage appraisal. Actual BC pricing uses the applicable appraisal rules and tenure terms. Connected operating seasons replay the authored market window; fixed award rates carry forward. This is not a continuous multiyear forecast.')}</p>
 </section>;
}
