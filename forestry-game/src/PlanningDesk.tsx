import { useLanguage } from "./i18n";
import DeliverabilityDesk from './DeliverabilityDesk';
import DispatchBenchmark from "./DispatchBenchmark";
import { useMemo } from "react";
import type { Game } from "./simulation/types";
import {
  forecastOutcome,
  learningProgress,
  seasonBalance,
  supplyBalance,
} from "./simulation/planning";
import { sum } from "./simulation/engine";

export function LearningObjectives({ game }: { game: Game }) {
 const {t: tr,language}=useLanguage(); const fmt=(n:number)=>Math.round(n).toLocaleString(language==='fr'?'fr-CA':'en-CA');
  const objectives = learningProgress(game);
  if (!objectives.length) return null;
  return (
    <section className="panel">
      <span className="eyebrow">{tr("YOUR SEASON CHALLENGES")}</span>
      <h2>{tr("Balance service, value and stewardship.")}</h2>
      <div className="resource-grid">
        {objectives.map((o) => (
          <article className="resource-card" key={o.id}>
            <div className="section-heading">
              <h3>{tr(o.title)}</h3>
              <span>
                {o.value === null
                  ? tr("Awaiting results")
                  : o.final
                    ? o.met
                      ? tr("✓ Achieved")
                      : tr("Not achieved")
                    : o.met
                      ? tr("On track")
                      : tr("In progress")}
              </span>
            </div>
            <p className="muted">{tr(o.description)}</p>
            <strong>
              {o.value === null ? "—" : fmt(o.value)} {tr(o.unit)}
            </strong>
            <small>
              {" "}{" "}{tr("· goal")}{" "}{o.direction === "at-least" ? "≥" : "≤"} {fmt(o.target)}{" "}
              {tr(o.unit)}
            </small>
          </article>
        ))}
      </div>
      <p className="muted">
        {tr("Objectives are assessed at season end. Early low waste or high service can change as the season develops. These goals are authored teaching thresholds, not industry benchmarks.")}
      </p>
    </section>
  );
}
export default function PlanningDesk({
  game,
  onNavigate,
  onChange,
}: {
  game: Game;
  onNavigate: (page: string) => void;
  onChange?: (game: Game) => void;
}) {
 const {t: tr,language}=useLanguage(); const fmt=(n:number)=>Math.round(n).toLocaleString(language==='fr'?'fr-CA':'en-CA');
  const preview = useMemo(() => forecastOutcome(game), [game]),
    balance = useMemo(() => supplyBalance(game), [game]),
    season = useMemo(() => seasonBalance(game), [game]),
    report = preview.report,
    r = game.region;
  return (
    <>
      <section className="panel">
        <span className="eyebrow">{tr("BEFORE YOU COMMIT")}</span>
        <h2>{tr("What does your current plan imply?")}</h2>
        <p>
          {tr("The forecast rehearsal runs your current crew and truck orders without advancing the saved game. It assumes forecast weather happens exactly as shown. Auction awards and bid payments are excluded; successful bids cannot supply this week’s operations.")}
        </p>
        {report ? (
          <>
            <div className="metric-grid">
              <article>
                <small>{tr("Expected production")}</small>
                <strong>{fmt(sum(report.harvested))} m³</strong>
              </article>
              <article>
                <small>{tr("Expected deliveries")}</small>
                <strong>{fmt(sum(report.delivered))} m³</strong>
              </article>
              <article>
                <small>{tr("Remaining-week cash movement")}</small>
                <strong>
                  {r.currency} {fmt(report.cash - game.cash)}
                </strong>
              </article>
              <article>
                <small>{tr("Expected inventory waste")}</small>
                <strong>{fmt(report.waste)} m³</strong>
              </article>
            </div>
            <p className="muted">
              {tr("Includes scheduled operating, holding and any period-end charges. Prior purchases are already reflected in current cash. This is a scenario rehearsal, not a guarantee or optimizer.")}
            </p>
            {report.messages.length > 0 && (
              <details open>
                <summary>{" "}{tr("Dispatch constraints and consequences (")}{" "}{report.messages.length})
                </summary>
                {report.messages.slice(0, 30).map((m, i) => (
                  <p key={i}>{tr(m)}</p>
                ))}
                {report.messages.length > 30 && (
                  <p>
                    {report.messages.length - 30}{" "}{tr("further notes will be visible in the operating report.")}{" "}</p>
                )}
              </details>
            )}
          </>
        ) : (
          <div className="notice">
            {preview.problems.map((p) => (
              <p key={p}>{tr(p)}</p>
            ))}
          </div>
        )}
        <div className="button-row">
          <button onClick={() => onNavigate("Production")}>
            {tr("Adjust crew queues")}
          </button>
          <button onClick={() => onNavigate("Transport")}>
            {tr("Adjust dispatch")}
          </button>
          <button onClick={() => onNavigate("Commitments")}>
            {tr("Review commitments")}
          </button>
        </div>
      </section>
      <DeliverabilityDesk game={game}/>
      <section className="panel">
        <h2>{tr("Where is the supply gap?")}</h2>
        <p className="muted">
          {tr("Standing potential is secured volume above your retention floor on forecast-accessible terrain. It is not weekly production: crew capacity, thinning choices, road closures and haul capacity may reduce what can reach a mill.")}
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{tr("Assortment")}</th>
                <th>{tr("Remaining commitment")}</th>
                <th>{tr("Roadside now")}</th>
                <th>{tr("Accessible standing potential")}</th>
                <th>{tr("Minimum supply gap")}</th>
                <th>{tr("Remaining market demand")}</th>
              </tr>
            </thead>
            <tbody>
              {balance.map((b) => (
                <tr key={b.product.id}>
                  <td>{tr(b.product.name)}</td>
                  <td>{fmt(b.target)} m³</td>
                  <td>{fmt(b.roadside)} m³</td>
                  <td>{fmt(b.standing)} m³</td>
                  <td className={b.gap > 0 ? "negative" : "positive"}>
                    {fmt(b.gap)} m³
                  </td>
                  <td>{fmt(b.demand)} m³</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted">
          {tr("An aggregate surplus can still miss individual mills. Deliveries must match each mill’s assortment, demand and route access.")}
        </p>
        <button onClick={() => onNavigate("Forest & timber")}>
          {tr("Inspect procurement options →")}
        </button>
      </section>
      <section className="panel">
        <h2>{tr("Season outlook by product")}</h2>
        <p className="muted">
          {tr("What buyers still want for the rest of the season, against the wood you already hold: roadside stock plus secured stands above your retention floor. Access, crew and truck capacity and spoilage are not counted.")}
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{tr("Assortment")}</th>
                <th>{tr("Buyers still want")}</th>
                <th>{tr("Roadside now")}</th>
                <th>{tr("Secured standing")}</th>
                <th>{tr("Shortfall or surplus")}</th>
                <th>{tr("Still offered to buy")}</th>
              </tr>
            </thead>
            <tbody>
              {season.map((b) => (
                <tr key={b.product.id}>
                  <td>{tr(b.product.name)}</td>
                  <td>{fmt(b.demand)} m³</td>
                  <td>{fmt(b.roadside)} m³</td>
                  <td>{fmt(b.secured)} m³</td>
                  <td className={b.balance < 0 ? "negative" : "positive"}>
                    {b.balance < 0 ? `${fmt(-b.balance)} m³ ${tr("short")}` : `${fmt(b.balance)} m³ ${tr("surplus")}`}
                  </td>
                  <td>{fmt(b.available)} m³</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted">
          {tr("A shortfall cannot be closed by planning alone: buy stands that grow that product, or expect to miss those targets. A surplus is wood buyers will not take this season; if harvested it stays at roadside, where sawlogs become pulp and pulp becomes waste.")}
        </p>
      </section>
      {onChange && <DispatchBenchmark game={game} onChange={onChange} />}
      <LearningObjectives game={game} />
      <section className="panel">
        <h2>{tr("Choose a harvest strategy")}</h2>
        <div className="resource-grid">
          {Object.entries(r.treatments ?? {}).map(([id, t]) => (
            <article className="resource-card" key={id}>
              <h3>{tr(t.name)}</h3>
              <p>
                {tr("Retain at least")}{" "}
                {fmt(Math.max(t.retention, game.plan.retention) * 100)}{tr("% of initial standing volume.")}
              </p>
              <p className="muted">{" "}{tr("Productivity ×")}{t.productivity}{" "}{tr("· direct harvest cost ×")}{t.cost}{" "}{tr("· disturbance factor ×")}{t.disturbance}
              </p>
            </article>
          ))}
        </div>
        <p className="muted">
          {tr("Select treatment on each crew stop. Thinning has a cumulative stand-level cap, so several crews or weeks cannot repeatedly remove the same thinning allowance. A later final-harvest order can use the remaining volume down to its own retention floor. There is no regrowth within this twelve-week teaching horizon.")}
        </p>
      </section>
    </>
  );
}
