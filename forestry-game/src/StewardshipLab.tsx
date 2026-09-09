import { useLanguage } from "./i18n";
import StewardshipCharts from "./StewardshipCharts";
import { useState } from "react";
import type { Game } from "./simulation/types";
import { startStewardship, stewardshipYear, stewardshipHabitat } from "./simulation/stewardship";
import type { StewardshipAction } from "./simulation/stewardship";
export default function StewardshipLab({
  game,
  onChange,
}: {
  game: Game;
  onChange: (g: Game) => void;
}) {
 const {t: tr,language}=useLanguage();
 const f=(n:number)=>Math.round(n).toLocaleString(language==='fr'?'fr-CA':'en-CA');
  const [actions, setActions] = useState<Record<string, StewardshipAction>>({}),
    [error, setError] = useState(""),
    region = game.linkedSeason?.baseRegion ?? game.region,
    locked = !!game.linkedSeason && !game.linkedSeason.settled,
    p = region.stewardship,
    s = game.stewardship;
  if (!p)
    return (
      <section className="panel">
        <h2>{tr("Annual stewardship")}</h2>
        <p>{tr("This region has no annual model. Load an authored scenario with stewardship parameters.")}{" "}</p>
      </section>
    );
  return (
    <section className="panel">
      <h2>{tr("Annual forest stewardship")}</h2>
      <p>{tr("This")}{" "}{p.years}{" "}{tr("-year exercise starts from current standing volumes. Use Connected annual operating seasons to carry this forest and budget into another operating window. Independent annual actions advance one full management year.")}{" "}</p>
      <p className="notice">{tr(p.note)}</p>
      {region.bcTenure && <p className="notice">{tr("BC annual harvest uses the authorization snapshot captured when this exercise starts. Approvals and expiry do not advance within the independent annual exercise. Published stumpage rates are also fixed at exercise opening; connected operating seasons model market changes. Resolve applications in the operating campaign first, or use connected operating seasons for renewed authorization checks. Harvest margins exclude the stumpage and operator provisions shown below. Monitoring provisions exclude planting; choosing Plant regeneration charges planting separately.")}</p>}
      <details>
        <summary>{tr("Model parameters and timing")}</summary>
        <p>
          {tr("Growth")} {p.annualGrowthM3Ha}{" "}{tr("m³/ha/year, capacity")}{" "}
          {p.carryingCapacityM3Ha}{" "}{tr("m³/ha (at least opening scenario volume). Natural regeneration waits")}{" "}{p.naturalRegenerationYears}{" "}{tr("years; planting waits")}{" "}{p.plantedRegenerationYears}{" "}{tr(". Planting costs")}{" "}
          {region.currency} {p.plantingCostHa}{" "}{tr("/ha. Sparse stands wait for establishment before growth; retained mature canopy continues growing above half capacity. Treatments are at least five years apart.")}{" "}</p>
        <p>{tr("Thinning removes")}{" "}{p.thinningFraction * 100}{" "}{tr("%; final harvest retains")}{" "}
          {p.finalRetention * 100}{" "}{tr("%. Net teaching revenues are")}{" "}{p.thinningNetM3}
          /{p.finalNetM3}{" "}{tr("per m³. Habitat is a bounded teaching index that falls with removals and recovers by")}{" "}{p.habitatRecoveryPerYear}{" "}{tr("per rest year. Only stands secured when this exercise began can be treated; protected areas remain untouched.")}{" "}</p>
      </details>
      {!s ? (
        <button
          className="primary"
          onClick={() =>
            onChange({ ...game, stewardship: startStewardship(game) })
          }
        >{tr("Start annual exercise from current forest")}{" "}</button>
      ) : (
        <>
          {locked && <p className="notice">{tr("The active operating window owns this year. Complete and settle it before applying annual actions.")}</p>}
          <p>
            <strong>
              {tr("Year")} {Math.min(s.year, p.years)} / {p.years}
            </strong>{" "}{" "}{tr("· budget")}{" "}{region.currency} {f(s.cash)}{" "}{tr("· standing")}{" "}
            {f(s.stands.reduce((n, t) => n + t.volume, 0))}{" "}{tr("m³")}{" "}</p>
          <p>{tr("Landscape habitat:")}{" "}{(stewardshipHabitat(region, s).landscape * 100).toFixed(1)}{" "}{tr("% · Managed-area habitat:")}{" "}{stewardshipHabitat(region, s).managed == null ? tr("No managed area") : `${(stewardshipHabitat(region, s).managed! * 100).toFixed(1)}%`}</p>
          <StewardshipCharts state={s} region={region}/>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{tr("Stand")}</th>
                  <th>{tr("Standing m³")}</th>
                  <th>{tr("Habitat index")}</th>
                  <th>{tr("Regeneration")}</th>
                  {region.bcTenure && <th>{tr("Harvest authorization snapshot")}</th>}
                  <th>{tr("This year")}</th>
                </tr>
              </thead>
              <tbody>
                {s.stands.map((t) => (
                  <tr key={t.id}>
                    <td>
                      {t.id} ·{" "}
                      {region.stands.find((d) => d.id === t.id)!.name}
                    </td>
                    <td>{f(t.volume)}</td>
                    <td>{t.habitat.toFixed(2)}</td>
                    <td>
                      {tr(t.planted ? "Planted" : "Natural")} · {t.regenerationAge}{" "}{" "}{tr("years")}{" "}</td>
                    {region.bcTenure && <td>{t.harvestAuthorizationProblem ? tr(t.harvestAuthorizationProblem) : tr("No authorization block in opening snapshot")}</td>}
                    <td>
                      <select
                        aria-label={`${t.id} ${tr("annual treatment")}`}
                        disabled={locked || s.year > p.years || !t.managed}
                        value={actions[t.id] ?? "rest"}
                        onChange={(e) =>
                          setActions({
                            ...actions,
                            [t.id]: e.target.value as StewardshipAction,
                          })
                        }
                      >
                        <option value="rest">{tr("Rest / recover")}</option>
                        <option value="thin" disabled={!!t.harvestAuthorizationProblem}>{tr("Commercial thinning")}</option>
                        <option value="final" disabled={!!t.harvestAuthorizationProblem}>{tr("Final harvest")}</option>
                        <option value="plant">{tr("Plant regeneration")}</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="primary"
            disabled={locked || s.year > p.years}
            onClick={() => {
              try {
                onChange({
                  ...game,
                  stewardship: stewardshipYear(region, s, actions),
                });
                setActions({});
                setError("");
              } catch (e) {
                setError(String(e));
              }
            }}
          >{tr("Apply treatments and advance one year")}{" "}</button>
          {error && <p role="alert">{tr(error)}</p>}
          <h3>{tr("Annual record")}</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{tr("Year")}</th>
                  <th>{tr("Growth")}</th>
                  <th>{tr("Harvest")}</th>
                  <th>{tr("Closing timber")}</th>
                  <th>{tr("Cash movement")}</th>
                  {region.bcTenure && <><th>{tr("Stumpage paid")}</th><th>{tr("Operator provisions paid")}</th><th>{tr("All-party obligations accrued")}</th></>}
                  <th>{tr("Landscape habitat")}</th><th>{tr("Managed habitat")}</th>
                </tr>
              </thead>
              <tbody>
                {s.history.map((h) => (
                  <tr key={h.year}>
                    <td>{h.year}</td>
                    <td>{f(h.growth)}</td>
                    <td>{f(h.harvest)}</td>
                    <td>{f(h.closing)}</td>
                    <td>{f(h.cashChange)}</td>
                    {region.bcTenure && <><td>{f(h.stumpageCost??0)}</td><td>{f(h.postHarvestCost??0)}</td><td>{f(h.postHarvestAccrued??0)}</td></>}
                    <td>{h.habitat.toFixed(2)}</td><td>{h.managedHabitat == null ? tr("Unavailable") : h.managedHabitat.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
