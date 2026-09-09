import { useLanguage } from "./i18n";
import { useState } from "react";
import type { Game } from "./simulation/types";
import { propose, respond } from "./simulation/negotiation";
export default function NegotiationOffers({
  game,
  onChange,
}: {
  game: Game;
  onChange: (g: Game) => void;
}) {
 const {t: tr,language}=useLanguage();
  const [error, setError] = useState(""),
    offers = game.negotiation.offers ?? [],
    latest = offers.at(-1);
  const act = (fn: () => Game) => {
    try {
      onChange(fn());
      setError("");
    } catch (e) {
      setError(String(e));
    }
  };
  return (
    <section className="panel">
      <h2>{tr("From allocation to agreement")}</h2>
      <p>{tr("Freeze the current allocation as a proposal. Each company can accept or reject that exact offer. Later edits create a new draft; they never rewrite a signed proposal.")}{" "}</p>
      <button className="primary" onClick={() => act(() => propose(game))}>
        {tr("Propose current allocation")}
      </button>
      {error && (
        <p className="notice" role="status">
          {tr(error)}
        </p>
      )}
      {latest && (
        <>
          <h3>
            {tr("Proposal")} {latest.id} · {tr(latest.status)}
          </h3>
          <div className="table-wrap" tabIndex={0} role="region" aria-label={language==='fr'?'Tableau défilant de l’offre négociée':'Scrollable negotiation offer table'}>
            <table>
              <thead>
                <tr>
                  <th>{tr("Company")}</th>
                  <th>{tr("Group")}</th>
                  <th>{tr("Offered savings (kSEK)")}</th>
                  <th>{tr("Response")}</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: latest.count }, (_, i) =>
                  String(i + 1),
                ).map((c, i) => (
                  <tr key={c}>
                    <td>{tr("Company")} {c}</td>
                    <td>{latest.groups[i]}</td>
                    <td>{latest.shares[c].toFixed(2)}</td>
                    <td>
                      {latest.accepted.includes(c) ? (
                        tr("✓ Accepted")
                      ) : latest.status === "proposed" ? (
                        <div className="button-row">
                          <button
                            onClick={() =>
                              act(() => respond(game, latest.id, c, true))
                            }
                          >
                            {tr("Company")} {c}{tr("accepts")}{" "}</button>
                          <button
                            onClick={() =>
                              act(() => respond(game, latest.id, c, false))
                            }
                          >
                            {tr("Reject")}
                          </button>
                        </div>
                      ) : (
                        tr("No acceptance recorded")
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="muted">{tr("Shared-device classroom exercise: these are recorded role decisions, not authenticated signatures or messages to other people. An efficient offer can still be unstable; review blocking coalitions before accepting. The campaign backhaul contract remains a separate operating assumption.")}{" "}</p>
      {offers.length > 1 && (
        <details>
          <summary>{tr("Offer history (")}{offers.length})</summary>
          {[...offers].reverse().map((o) => (
            <p key={o.id}>
              {tr("Proposal")} {o.id} · {o.count}{tr("companies · groups")}{" "}
              {o.groups.slice(0, o.count).join(" / ")} · {o.accepted.length}{" "}{tr("acceptances ·")}{" "}{tr(o.status)}
            </p>
          ))}
        </details>
      )}
    </section>
  );
}
