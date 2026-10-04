import { useLanguage } from "./i18n";
import ProcurementStudy from "./ProcurementStudy";
import ProcurementCharts from "./ProcurementCharts";
import { useState } from "react";
import { weatherLabel } from "./weather-label";
import type { Game, StandDefinition, Weather } from "./simulation/types";
import { appraise, bidRisk, procurementWindows } from "./simulation/appraisal";

export default function ProcurementLab({
  game,
  standId,
  onBid,
}: {
  game: Game;
  standId: string;
  onBid: (amount: number) => void;
}) {
 const {t: tr,language}=useLanguage(); const f=(n:number)=>Math.round(n).toLocaleString(language==='fr'?'fr-CA':'en-CA');
  const stand = game.region.stands.find((s) => s.id === standId)!,
    [multiplier, setMultiplier] = useState(1),
    [exposure, setExposure] = useState(0.5),
    [weather, setWeather] = useState<Weather>("normal");
  const text = (en: string, fr: string) => language === "fr" ? fr : en;
  const owned = !!game.stands.find((s) => s.id === standId)?.owned,
    protectedLot = stand.supply === "protected";
  // A secured lot's purchase is sunk, so its appraisal shows remaining value only.
  const bid = owned ? 0 : Math.round(stand.askingPrice * multiplier),
    a = appraise(game, standId, bid);
  const conditionsSelect = <label>{" "}{tr("Risk comparison conditions")}{" "}<select
      value={weather}
      onChange={(e) => setWeather(e.target.value as Weather)}
    >
      {["frozen", "normal", "wet", "thaw"].map((w) => (
        <option key={w} value={w}>{weatherLabel(w, language)}</option>
      ))}
    </select>
  </label>;
  const marginTable = <div className="table-wrap" tabIndex={0} role="region" aria-label={tr("Conditions")}>
    <table>
      <thead>
        <tr>
          <th>{tr("Conditions")}</th>
          <th>{tr("Terrain")}</th>
          <th>{tr("Uncapped net margin")}</th>
          <th>{tr("Demand-capped net margin")}</th>
          <th>{tr("Unsold / unharvested volume")}</th>
        </tr>
      </thead>
      <tbody>
        {a.cases.map((c) => (
          <tr key={c.weather}>
            <td>{weatherLabel(c.weather, language)}</td>
            <td>{c.terrain ? tr("Open") : tr("Closed")}</td>
            <td>{f(c.unlimited)}</td>
            <td>{f(c.capped)}</td>
            <td>{f(c.unsold)} m³</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>;
  const regionCharts = <details className="procurement-deep-dive">
    <summary>{text("Region-wide appraisal charts", "Graphiques d’évaluation régionale")}</summary>
    {!protectedLot && <details>
      <summary>{tr("Assortment appraisal in")}{" "}{weatherLabel(weather, language)}{" "}{tr("conditions")}</summary>
      <div className="table-wrap" tabIndex={0} role="region" aria-label={tr("Product")}>
        <table>
          <thead>
            <tr>
              <th>{tr("Product")}</th>
              <th>{tr("Eligible")}</th>
              <th>{tr("Saleable")}</th>
              <th>{tr("Margin before purchase")}</th>
            </tr>
          </thead>
          <tbody>
            {a.cases
              .find((c) => c.weather === weather)!
              .products.map((p) => (
                <tr key={p.id}>
                  <td>{tr(p.name)}</td>
                  <td>{f(p.volume)}</td>
                  <td>{f(p.sold)}</td>
                  <td>{f(p.capped)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </details>}
    <ProcurementCharts game={game} standId={standId} />
    <h3>{tr("Forecast operating windows")}</h3>
    <p className="muted">{" "}{tr("Known closures, forecast terrain and routes to mills with demand. An auction lot is available only after its settlement week. Open access does not reserve crew, truck or demand capacity.")}{" "}</p>
    <div className="table-wrap" tabIndex={0} role="region" aria-label={tr("Forecast operating windows")}>
      <table>
        <thead>
          <tr>
            <th>{tr("Week")}</th>
            <th>{tr("Forecast")}</th>
            <th>{tr("Terrain")}</th>
            <th>{tr("Reachable destinations")}</th>
          </tr>
        </thead>
        <tbody>
          {procurementWindows(game, standId).map((w) => (
            <tr key={w.week}>
              <td>{w.week}</td>
              <td>{weatherLabel(w.weather, language)}</td>
              <td>{w.terrain ? tr("Open") : tr("Closed")}</td>
              <td>{w.destinations.join(", ") || tr("No route to demand")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <ProcurementStudy game={game} standId={standId} onBid={onBid}/>
  </details>;
  if (owned || protectedLot)
    return (
      <section className="panel">
        <h2>{tr("Lot appraisal ·")}{" "}{stand.id}</h2>
        {owned ? <>
          <p className="notice">{text("Already secured — the appraisal shows its remaining value. No bid is needed.", "Déjà acquis — l’évaluation indique sa valeur restante. Aucune mise n’est nécessaire.")}</p>
          <p>{f(a.eligible)}{" "}{tr("m³ eligible at current retention.")}</p>
          {game.region.bcTenure && <p>{tr("BC appraisal includes current stumpage")}: {game.region.currency} {f(a.stumpage)} · {tr("operator provisions")}: {game.region.currency} {f(a.obligations)}. {tr("Future resets and market changes can alter realized margins.")}{a.authorizationProblem && <> {tr("Harvest block")}: {a.authorizationProblem}.</>}</p>}
          <div className="form-row">{conditionsSelect}</div>
          {marginTable}
        </> : <p className="notice">{text("Protected — this lot cannot be bid on or harvested.", "Protégé — ce lot ne peut être ni mis aux enchères ni récolté.")}</p>}
        {regionCharts}
      </section>
    );
  return (
    <section className="panel">
      <h2>{tr("Lot appraisal ·")}{" "}{stand.id}</h2>
      <p>{" "}{tr("Compare the source guide’s margin without demand limits against remaining campaign demand. Estimates include retention, seasonal productivity, crew wages and round-trip haul costs. They exclude fixed fleet costs, relocation, storage, delivery deadlines and competition for demand; this is a screening estimate, not an optimal bid.")}{" "}</p>
      <div className="form-row">
        <label>{" "}{tr("Offer / asking-price multiplier")}{" "}<input
            type="number"
            min="0"
            max="3"
            step="0.05"
            value={multiplier}
            onChange={(e) =>
              setMultiplier(Math.max(0, Math.min(3, Number(e.target.value))))
            }
          />
        </label>
        <label>
          {tr("Downside weight")}
          <input
            type="range"
            min="0"
            max="1"
            step=".1"
            value={exposure}
            onChange={(e) => setExposure(Number(e.target.value))}
          />
        </label>
        {conditionsSelect}
      </div>
      <p>
        {game.region.currency} {f(bid)}{" "}{tr("offered ·")}{" "}{f(a.eligible)}{" "}{tr("m³ eligible at current retention.")}{" "}</p>
      {stand.priceBasis && <PriceBasisNote stand={stand} currency={game.region.currency} />}
      {game.region.bcTenure && <p>{tr("BC appraisal includes current stumpage")}: {game.region.currency} {f(a.stumpage)} · {tr("operator provisions")}: {game.region.currency} {f(a.obligations)}. {tr("Future resets and market changes can alter realized margins.")}{a.authorizationProblem && <> {tr("Harvest block")}: {a.authorizationProblem}.</>}</p>}
      {marginTable}
      <h3>{tr("Bid exposure comparison")}</h3>
      <p className="muted">{" "}{tr("101 equally weighted rival-bid scenarios over the game’s published rival range. This does not inspect the campaign seed or reveal the actual rival bid. Score = expected net margin − downside weight × worst loss.")}{" "}</p>
      <div className="table-wrap" tabIndex={0} role="region" aria-label={tr("Bid exposure comparison")}>
        <table>
          <thead>
            <tr>
              <th>{tr("Offer")}</th>
              <th>{tr("Win scenarios")}</th>
              <th>{tr("Expected net margin")}</th>
              <th>{tr("Worst net margin")}</th>
              <th>{tr("Risk score")}</th>
              <th>{tr("Expected saleable supply")}</th>
            </tr>
          </thead>
          <tbody>
            {[0.85, 1, 1.1, 1.25].map((m) => {
              const price = Math.round(stand.askingPrice * m),
                risk = bidRisk(game, standId, price, weather, exposure);
              return (
                <tr key={m}>
                  <td>{f(price)}</td>
                  <td>{risk.winPercent.toFixed(0)}%</td>
                  <td>{f(risk.mean)}</td>
                  <td>{f(risk.worst)}</td>
                  <td>{f(risk.score)}</td>
                  <td>{f(risk.supply)} m³</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted">{" "}{tr("Guaranteed supply avoids bidding uncertainty; private supply secures the lot at its asking price immediately. Compare lots using their own product mix and routes. These scenario calculations do not reproduce the thesis’s optimal bidding algorithm.")}{" "}</p>
      <button
        disabled={
          stand.supply !=="auction" ||
          stand.auctionWeek !== game.week
        }
        onClick={() => onBid(bid)}
      >{" "}{tr("Use")}{" "}{f(bid)}{" "}{tr("as this week’s sealed bid")}{" "}</button>
      {regionCharts}
    </section>
  );
}

/** Why a lot's asking price differs from the district average, largest reasons first. */
export function PriceBasisNote({ stand, currency }: { stand: StandDefinition; currency: string }) {
  const { t: tr, language } = useLanguage();
  const basis = stand.priceBasis!, locale = language === "fr" ? "fr-CA" : "en-CA";
  const num = (n: number, digits = 0) => n.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const pct = (n: number) => `${num(n * 100)}%`;
  const shown: Record<string, { label: string; value: (n: number) => string }> = {
    deciduous: { label: "Aspen and birch share", value: pct },
    "tree-size": { label: "Volume per tree", value: n => `${num(n, 2)} m³` },
    hembal: { label: "Balsam and hemlock share of conifers", value: pct },
    density: { label: "Volume per hectare", value: n => `${num(n)} m³/ha` },
    "lot-size": { label: "Lot size", value: n => `${num(n)} m³` },
    haul: { label: "Haul cycle to nearest buyer", value: n => `${num(n, 1)} h` },
  };
  const perM3 = stand.volume ? stand.askingPrice / stand.volume : 0;
  const main = basis.factors.filter(f => Math.abs(f.effect) >= 0.1).slice(0, 4);
  return <div className="price-basis">
    <h3>{tr("Why this asking price")}</h3>
    <p>{currency} {num(perM3, 2)}/m³ · {tr("district average")} {currency} {num(basis.averageM3, 2)}/m³
      {basis.capped && <> · {tr(basis.capped === "upper" ? "held at the upper limit (1.8× average)" : "held at the lower limit (0.4× average)")}</>}</p>
    {main.length ? <ul>{main.map(f => <li key={f.factor}>
      {tr(shown[f.factor].label)}: {shown[f.factor].value(f.value)} ({tr("district")} {shown[f.factor].value(f.average)}) →{" "}
      <strong className={f.effect < 0 ? "negative" : "positive"}>{f.effect > 0 ? "+" : "−"}{currency} {num(Math.abs(f.effect), 2)}/m³</strong>
    </li>)}</ul> : <p>{tr("No attribute moves this price by more than 0.10/m³.")}</p>}
    <p className="muted">{tr("Asking prices are ranked with BC's 2010 Interior bid equation; rival bids follow the asking price. Each line is how far the price would move if only that attribute were the district average, so the lines need not add up exactly.")}</p>
  </div>;
}
