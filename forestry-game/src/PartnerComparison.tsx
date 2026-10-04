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
  const fr = language === "fr";
  const rows = (r.partnerJobs ?? []).map((j) => {
    const trip = partnerTrip(g, j.id, g.truckPositions[t.id], s.node, w, t.payload),
      a = trip && empty ? freightSettlement(trip, empty.km, t.costKm, g.cooperation.partnerShare) : null;
    return { j, trip, a };
  });
  const available = rows.filter((row) => row.a && row.trip && empty);
  const unavailable = rows.filter((row) => !(row.a && row.trip && empty));
  return (
    <section className="partner-comparison">
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
      <p className="muted" role="status">{fr ? `${available.length} sur ${rows.length} transports partenaires peuvent être comparés pour ce camion.` : `${available.length} of ${rows.length} partner jobs can be compared for this truck.`}</p>
      <div className="table-wrap scroll-x" tabIndex={0} role="region" aria-label={language==='fr'?'Tableau défilant des transports partenaires':'Scrollable partner freight comparison table'}>
        <table className="stack-table">
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
            {available.map(({ j, trip, a }) => (
              <tr key={j.id}>
                <td>
                  {j.id} · {j.company}
                  <small>
                    {" "}
                    {j.from} → {j.to}
                  </small>
                </td>
                <td data-label={tr("Cargo")}>{f(trip!.volume)} {tr("m³")}</td>
                <td data-label={tr("Independent / pooled km")}>
                  {f(empty!.km + trip!.standaloneKm)} / {f(trip!.km)}
                </td>
                <td data-label={tr("Joint travel saving")}>
                  {r.currency} {f(a!.savings)}
                </td>
                <td data-label={tr("Payment to us")}>
                  {a!.feasible
                    ? f(a!.payment)
                    : tr("No mutually beneficial quote")}
                </td>
                <td data-label={tr("Our / partner saving")}>
                  {f(a!.ownSaving)} / {f(a!.partnerSaving)}
                </td>
                <td data-label={tr("Added hours")}>
                  {f(
                    trip!.hours -
                      empty!.hours +
                      t.loadingHours +
                      t.unloadingHours,
                  )}
                </td>
              </tr>
            ))}
            {unavailable.length > 0 && (
              <tr>
                <td colSpan={7}>
                  {unavailable.map(({ j }) => j.id).join(", ")}
                  <small>{tr("Unavailable, completed, outside its contract window, or no open route.")}</small>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="muted">{tr("Payment covers extra travel cost plus our negotiated share of the measured saving, capped by the partner’s freight quote. A trip is accepted only if both sides avoid a travel-cost loss. Actual weather and remaining hours can still prevent dispatch.")}{" "}</p>
    </section>
  );
}
