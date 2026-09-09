import { useLanguage } from "./i18n";
import { operatingRegion } from "./simulation/disruptions";
import { useMemo, useState } from "react";
import type { Game } from "./simulation/types";
import {
  siteCandidates,
  queueCandidate,
  rollingForecast,
  productionEfficiency,
} from "./simulation/harvest-planning";
import { sum } from "./simulation/engine";
const f = (n: number) => Math.round(n).toLocaleString("en-CA");
export default function HarvestPlanning({
  game,
  onChange,
  onInspect,
}: {
  game: Game;
  onChange: (g: Game) => void;
  onInspect: (id: string) => void;
}) {
 const {t: tr}=useLanguage();
 const weekly=(game.region.turnDurationWeeks??1)===1;
  const r = game.region,
    [crew, setCrew] = useState(r.crews[0].id),
    [product, setProduct] = useState(r.products[0].id),
    [mill, setMill] = useState(""),
    [minShare, setMinShare] = useState(0),
    [minRate, setMinRate] = useState(0),
    [minVolume, setMinVolume] = useState(0),
    [openOnly, setOpenOnly] = useState(true),
    [horizon, setHorizon] = useState<2 | 4>(2),
    [error, setError] = useState(""),
    [lookahead, setLookahead] = useState<ReturnType<
      typeof rollingForecast
    > | null>(null),
    [source, setSource] = useState<Game | null>(null);
  const candidates = useMemo(
    () =>
      siteCandidates(game, crew, product, mill, horizon).filter(
        (s) =>
          s.owned &&
          s.share > 0 &&
          s.eligible >= minVolume &&
          s.eligible > 0 &&
          s.share * 100 >= minShare &&
          s.rate >= minRate &&
          s.millCompatible &&
          (!openOnly || s.windows[0]?.open),
      ),
    [
      game,
      crew,
      product,
      mill,
      horizon,
      minVolume,
      minShare,
      minRate,
      openOnly,
    ],
  );
  const metrics = productionEfficiency(game),
    hours =
      operatingRegion(game).crews.find((c) => c.id === crew)!.hours -
      (game.plan.crews[crew] ?? []).reduce((n, o) => n + o.hours, 0);
  return (
    <section className="panel">
      <h2>{tr("Find the next suitable harvest site")}</h2>
      <p>
        {tr("From the Harvest Arena planning lessons: match production pace,\n        assortment mix and bearing capacity, then check how far the crew must\n        move. Reserve accessible sites for difficult weather.")}
      </p>
      <div className="form-row">
        <label>
          {tr("Planning crew")}
          <select value={crew} onChange={(e) => setCrew(e.target.value)}>
            {r.crews.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {tr("Required assortment")}
          <select value={product} onChange={(e) => setProduct(e.target.value)}>
            {r.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {tr("Destination filter")}
          <select value={mill} onChange={(e) => setMill(e.target.value)}>
            <option value="">{tr("Any destination")}</option>
            {r.mills.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {tr("Minimum assortment %")}
          <input
            type="number"
            min="0"
            max="100"
            value={minShare}
            onChange={(e) =>
              setMinShare(Math.max(0, Math.min(100, Number(e.target.value))))
            }
          />
        </label>
        <label>
          {tr("Minimum production m³/h")}
          <input
            type="number"
            min="0"
            value={minRate}
            onChange={(e) => setMinRate(Math.max(0, Number(e.target.value)))}
          />
        </label>
        <label>
          {tr("Minimum eligible m³")}
          <input
            type="number"
            min="0"
            value={minVolume}
            onChange={(e) => setMinVolume(Math.max(0, Number(e.target.value)))}
          />
        </label>
        <label>
          {tr("Planning horizon")}
          <select
            value={horizon}
            onChange={(e) => {
              setHorizon(Number(e.target.value) as 2 | 4);
              setLookahead(null);
            }}
          >
            <option value={2}>{tr(weekly?"2 weeks · changing conditions":"2 turns · changing conditions")}</option>
            <option value={4}>{tr(weekly?"4 weeks · stable conditions":"4 turns · stable conditions")}</option>
          </select>
        </label>
      </div>
      <label className="check-label">
        <input
          type="checkbox"
          checked={openOnly}
          onChange={(e) => setOpenOnly(e.target.checked)}
        />{" "}
        {tr(weekly?"Only terrain and crew access open this week":"Only terrain and crew access open this turn")}
      </label>
      <p>
        {candidates.length} {tr("suitable secured sites ·")} {f(hours)} {tr("unassigned crew hours. Rates use final harvest and current forecast conditions; travel is measured from the crew’s current location, before its queued stops.")}
      </p>
      {error && <p role="alert">{tr(error)}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{tr("Site")}</th>
              <th>{tr("Eligible m³")}</th>
              <th>{tr("Assortment")}</th>
              <th>m³/h</th>
              <th>{tr("Relocation km / h")}</th>
              <th>{tr("Loaded km to mill")}</th>
              <th>{tr("Forecast crew access")}</th>
              <th>{tr("Action")}</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((s) => (
              <tr key={s.stand.id}>
                <td>
                  <button onClick={() => onInspect(s.stand.id)}>
                    {s.stand.id} · {s.stand.name}
                  </button>
                </td>
                <td>{f(s.eligible)}</td>
                <td>{f(s.share * 100)}%</td>
                <td>{s.rate.toFixed(1)}</td>
                <td>
                  {s.relocationKm === null
                    ? tr("No route")
                    : `${s.relocationKm.toFixed(1)} / ${s.relocationHours!.toFixed(1)}`}
                </td>
                <td>
                  {mill ? (s.haulKm?.toFixed(1) ?? tr("Closed")) : tr("Choose mill")}
                </td>
                <td>
                  {s.windows
                    .map(
                      (w) =>
                        `${tr(weekly?"Week":"Turn")} ${w.week}: ${tr(w.open ? "Open" : "Closed")} (${tr(w.weather)})`,
                    )
                    .join(" · ")}
                </td>
                <td>
                  <button
                    disabled={hours <= 0 || game.week > r.weeks}
                    onClick={() => {
                      try {
                        onChange(queueCandidate(game, crew, s.stand.id));
                        setError("");
                      } catch (e) {
                        setError(String(e));
                      }
                    }}
                  >
                    {tr("Append to crew queue")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">
        {tr("Access windows use the published forecast and already revealed\n        disruptions. They do not reserve capacity or guarantee future weather.\n        Appending assigns remaining crew hours; edit treatment and stop order\n        below.")}
      </p>
      <h3>{tr("Rehearse")} {horizon} {tr(weekly?"weeks":"turns")} {tr("before committing")}</h3>
      <p>
        {tr("Repeat current queues on a copied campaign. Completed stops drop out; no\n        new supply is purchased and all auction bids are excluded. At a new\n        month, the normal full-demand commitment defaults apply. Future\n        unrevealed events are excluded.")}
      </p>
      <button
        disabled={game.week > r.weeks}
        onClick={() => {
          setLookahead(rollingForecast(game, horizon));
          setSource(game);
        }}
      >
        {tr("Run rolling forecast")}
      </button>
      {lookahead && (
        <>
          {source !== game && (
            <p className="notice">
              {tr("Plan changed since this rehearsal. Run it again before comparing.")}
            </p>
          )}
          {lookahead.problem && <p>{tr(lookahead.problem)}</p>}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{tr((game.region.turnDurationWeeks??1)===1?"Week":"Turn")}</th>
                  <th>{tr("Harvest")}</th>
                  <th>{tr("Delivery")}</th>
                  <th>{tr("Waste")}</th>
                  <th>{tr("Closing cash")}</th>
                </tr>
              </thead>
              <tbody>
                {lookahead.reports.map((h) => (
                  <tr key={h.week}>
                    <td>{h.week}</td>
                    <td>{f(sum(h.harvested))}</td>
                    <td>{f(sum(h.delivered))}</td>
                    <td>{f(h.waste)}</td>
                    <td>
                      {r.currency} {f(h.cash)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <details>
        <summary>{tr(weekly?"Production efficiency by week":"Production efficiency by turn")}</summary>
        <p>
          {tr("Utilization includes relocation time; relocation per 1,000 m³ exposes\n          the cost of fragmented site selection. The disturbance index is an\n          authored teaching metric.")}
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{tr((game.region.turnDurationWeeks??1)===1?"Week":"Turn")}</th>
                <th>{tr("Production")}</th>
                <th>{tr("Relocation km")}</th>
                <th>km / 1,000 m³</th>
                <th>{tr("Capacity used")}</th>
                <th>{tr("Disturbance / 1,000 m³")}</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.week}>
                  <td>{m.week}</td>
                  <td>{f(m.produced)}</td>
                  <td>{m.relocation.toFixed(1)}</td>
                  <td>{m.kmPerThousand?.toFixed(1) ?? "—"}</td>
                  <td>
                    {m.utilization === null
                      ? "—"
                      : `${m.utilization.toFixed(1)}%`}
                  </td>
                  <td>{m.disturbancePerThousand?.toFixed(1) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
