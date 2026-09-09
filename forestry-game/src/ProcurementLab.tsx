import { useLanguage } from "./i18n";
import ProcurementStudy from "./ProcurementStudy";
import ProcurementCharts from "./ProcurementCharts";
import { useState } from "react";
import type { Game, Weather } from "./simulation/types";
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
  const bid = Math.round(stand.askingPrice * multiplier),
    a = appraise(game, standId, bid);
  return (
    <> <section className="panel">
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
        <label>{" "}{tr("Risk comparison conditions")}{" "}<select
            value={weather}
            onChange={(e) => setWeather(e.target.value as Weather)}
          >
            {["frozen", "normal", "wet", "thaw"].map((w) => (
              <option key={w} value={w}>{tr(w)}</option>
            ))}
          </select>
        </label>
      </div>
      <p>
        {game.region.currency} {f(bid)}{" "}{tr("offered ·")}{" "}{f(a.eligible)}{" "}{tr("m³ eligible at current retention.")}{" "}</p>
      {game.region.bcTenure && <p>{tr("BC appraisal includes current stumpage")}: {game.region.currency} {f(a.stumpage)} · {tr("operator provisions")}: {game.region.currency} {f(a.obligations)}. {tr("Future resets and market changes can alter realized margins.")}{a.authorizationProblem && <> {tr("Harvest block")}: {a.authorizationProblem}.</>}</p>}
      <div className="table-wrap">
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
                <td>{tr(c.weather)}</td>
                <td>{c.terrain ? tr("Open") : tr("Closed")}</td>
                <td>{f(c.unlimited)}</td>
                <td>{f(c.capped)}</td>
                <td>{f(c.unsold)} m³</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details>
        <summary>{tr("Assortment appraisal in")}{" "}{tr(weather)}{" "}{tr("conditions")}</summary>
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
      </details>
      <ProcurementCharts game={game} standId={standId} />
      <h3>{tr("Forecast operating windows")}</h3>
      <p className="muted">{" "}{tr("Known closures, forecast terrain and routes to mills with demand. An auction lot is available only after its settlement week. Open access does not reserve crew, truck or demand capacity.")}{" "}</p>
      <div className="table-wrap">
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
                <td>{tr(w.weather)}</td>
                <td>{w.terrain ? tr("Open") : tr("Closed")}</td>
                <td>{w.destinations.join(", ") || tr("No route to demand")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>{tr("Bid exposure comparison")}</h3>
      <p className="muted">{" "}{tr("101 equally weighted rival-bid scenarios over the game’s published rival range. This does not inspect the campaign seed or reveal the actual rival bid. Score = expected net margin − downside weight × worst loss.")}{" "}</p>
      <div className="table-wrap">
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
          stand.auctionWeek !== game.week ||
          game.stands.find((s) => s.id === standId)?.owned
        }
        onClick={() => onBid(bid)}
      >{" "}{tr("Use")}{" "}{f(bid)}{" "}{tr("as this week’s sealed bid")}{" "}</button>
    </section><ProcurementStudy game={game} standId={standId} onBid={onBid}/></>
  );
}
