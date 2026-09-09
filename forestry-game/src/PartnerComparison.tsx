import { useLanguage } from "./i18n";
import { useState } from "react";
import type { Game } from "./simulation/types";
import { partnerTrip, freightSettlement } from "./simulation/partner";
import { weatherAt, route } from "./simulation/routing";
import { operatingRegion } from "./simulation/disruptions";
export default function PartnerComparison({ game }: { game: Game }) {
 const {t: tr, language}=useLanguage();
  const [truck, setTruck] = useState(game.region.trucks[0].id),
    [stand, setStand] = useState(game.region.stands[0].id);
  const r = game.region,
    t = r.trucks.find((t) => t.id === truck)!,
    s = r.stands.find((s) => s.id === stand)!,
    w = weatherAt(game, true),
    g = structuredClone(game);
  g.cooperation.pooling = true;
  g.region.disruptions = g.region.disruptions?.filter(
    (e) => e.revealWeek <= game.week,
  );
  const empty = route(
      operatingRegion(g),
      g.truckPositions[t.id],
      s.node,
      w,
      g.improvedRoads,
    ),
    f = (n: number) => n.toLocaleString(language === "fr" ? "fr-CA" : "en-CA", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return (
    <section className="panel">
      <h3>{tr("Measure shared-route savings")}</h3>
      <p>{tr("Compare the same truck’s repositioning plus a partner’s independent out-and-back freight journey against one shared journey. Travel cost uses this truck’s rate. Handling also consumes fleet hours. These local trip comparisons do not optimize the entire network.")}{" "}</p>
      <div className="form-row">
        <label>
          {tr("Truck")}
          <select value={truck} onChange={(e) => setTruck(e.target.value)}>
            {r.trucks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>{tr("Next own pickup")}{" "}<select value={stand} onChange={(e) => setStand(e.target.value)}>
            {r.stands.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="table-wrap" tabIndex={0} role="region" aria-label={language==='fr'?'Tableau défilant des transports partenaires':'Scrollable partner freight comparison table'}>
        <table>
          <thead>
            <tr>
              <th>{tr("Partner job")}</th>
              <th>{tr("Cargo")}</th>
              <th>{tr("Independent / pooled km")}</th>
              <th>{tr("Joint travel saving")}</th>
              <th>{tr("Payment to us")}</th>
              <th>{tr("Our / partner saving")}</th>
              <th>{tr("Added hours")}</th>
            </tr>
          </thead>
          <tbody>
            {(r.partnerJobs ?? []).map((j) => {
              const trip = partnerTrip(
                  g,
                  j.id,
                  g.truckPositions[t.id],
                  s.node,
                  w,
                  t.payload,
                ),
                a =
                  trip && empty
                    ? freightSettlement(
                        trip,
                        empty.km,
                        t.costKm,
                        g.cooperation.partnerShare,
                      )
                    : null;
              return (
                <tr key={j.id}>
                  <td>
                    {j.id} · {j.company}
                    <small>
                      {" "}
                      {j.from} → {j.to}
                    </small>
                  </td>
                  {a && trip && empty ? (
                    <>
                      <td>{f(trip.volume)} {tr("m³")}</td>
                      <td>
                        {f(empty.km + trip.standaloneKm)} / {f(trip.km)}
                      </td>
                      <td>
                        {r.currency} {f(a.savings)}
                      </td>
                      <td>
                        {a.feasible
                          ? f(a.payment)
                          : tr("No mutually beneficial quote")}
                      </td>
                      <td>
                        {f(a.ownSaving)} / {f(a.partnerSaving)}
                      </td>
                      <td>
                        {f(
                          trip.hours -
                            empty.hours +
                            t.loadingHours +
                            t.unloadingHours,
                        )}
                      </td>
                    </>
                  ) : (
                    <td colSpan={6}>{tr("Unavailable, completed, outside its contract window, or no open route.")}{" "}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted">{tr("Payment covers extra travel cost plus our negotiated share of the measured saving, capped by the partner’s freight quote. A trip is accepted only if both sides avoid a travel-cost loss. Actual weather and remaining hours can still prevent dispatch.")}{" "}</p>
    </section>
  );
}
