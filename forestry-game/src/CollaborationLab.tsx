import { useLanguage } from "./i18n";
import {lazy, Suspense} from "react";
const TeachingPackets=lazy(()=>import("./TeachingPackets"));
import TransportObligationsLab from './TransportObligationsLab';
import CoalitionCharts from "./CoalitionCharts";
import { companyProfiles } from "./company-profiles";
import PartnerComparison from "./PartnerComparison";
import NegotiationOffers from "./NegotiationOffers";
import { allocate, cost, savings, stability } from "./coalition";
import type { Method } from "./coalition";
import type { Game, Negotiation } from "./simulation/types";
export default function CollaborationLab({
  game,
  onChange,
}: {
  game: Game;
  onChange: (g: Game) => void;
}) {
 const {t: tr, language}=useLanguage();
  const money = (value: number) => value.toLocaleString(language === "fr" ? "fr-CA" : "en-CA", {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const { count, groups, method, custom, phase } = game.negotiation;
  const negotiate = (patch: Partial<Negotiation>) =>
    onChange({ ...game, negotiation: { ...game.negotiation, ...patch } });
  const members = Array.from({ length: count }, (_, i) => String(i + 1)),
    partition = [...new Set(groups.slice(0, count))].map((group) =>
      members.filter((_, i) => groups[i] === group),
    );
  const proposals = partition.map((coalition) => ({
    members: coalition,
    shares: {
      ...allocate(coalition, method, count),
      ...Object.fromEntries(
        coalition
          .filter((c) => custom[c] !== undefined)
          .map((c) => [c, custom[c]]),
      ),
    },
  }));
  const efficient = proposals.every(
      (p) =>
        Math.abs(
          Object.values(p.shares).reduce((a, b) => a + b, 0) -
            savings(p.members, count),
        ) < 0.01,
    ),
    rational = proposals.every((p) =>
      Object.values(p.shares).every((v) => v >= 0),
    ),
    blocking = proposals.flatMap((p) => stability(p.members, p.shares, count));
  const allShares = Object.assign({}, ...proposals.map((p) => p.shares)),
    cross = stability(members, allShares, count),
    pairValid = phase !== "pairs" || partition.every((p) => p.length <= 2);
  const grandGap =
    savings(members, count) -
    Object.values(allShares).reduce<number>((n, v) => n + Number(v), 0);
  if (grandGap > 1e-6) cross.push({ members, gap: grandGap });
  const agreement = (cooperation: Game["cooperation"]) =>
    onChange({
      ...game,
      cooperation,
      plan: {
        ...game.plan,
        ready: { purchase: false, production: false, transport: false },
      },
    });
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>{tr("Collaboration laboratory")}</h2>
          <p>{tr("Negotiate a complete partition and test whether each group would stay together.")}{" "}</p>
        </div>
      </div>
      <div className="panel">
        <div className="form-row">
          <label>
            {tr("Teaching dataset")}
            <select
              value={count}
              onChange={(e) => {
                negotiate({
                  count: Number(e.target.value) as 4 | 5,
                  custom: {},
                });
              }}
            >
              <option value={4}>{tr("4 companies")}</option>
              <option value={5}>{tr("5 companies")}</option>
            </select>
          </label>
          <label>{tr("Negotiation round")}{" "}<select
              value={phase}
              onChange={(e) =>
                negotiate({
                  phase: e.target.value as "open" | "pairs",
                  ...(e.target.value === "pairs"
                    ? { groups: [1, 1, 2, 2, 3], custom: {} }
                    : {}),
                })
              }
            >
              <option value="pairs">{tr("A · pairs only")}</option>
              <option value="open">{tr("B · any coalition")}</option>
            </select>
          </label>
          <label>
            {tr("Allocation preset")}
            <select
              value={method}
              onChange={(e) => {
                negotiate({ method: e.target.value as Method, custom: {} });
              }}
            >
              <option value="nucleolus">{tr("Nucleolus · lexicographic excess minimization")}</option>
              <option value="shapley">{tr("Shapley marginal contribution")}</option>
              <option value="equal">{tr("Equal savings")}</option>
              <option value="epm">{tr("Equal profit method · optimized stable allocation")}{" "}</option>
              <option value="volume">{tr("Volume-weighted total cost")}</option>
              <option value="proportional">{tr("Proportional standalone cost")}</option>
            </select>
          </label>
        </div>
        <p className="muted">{tr("Each company belongs to exactly one group. Savings below use the handout’s kSEK units; they are separate from campaign CAD. Proportional allocation is not the constrained equal-profit method.")}{" "}</p>
        <details>
          <summary>{tr("Company profiles from the handouts")}</summary>
          <div className="table-wrap" tabIndex={0} role="region" aria-label={language==='fr'?'Tableau défilant des profils d’entreprises':'Scrollable company profiles table'}>
            <table>
              <thead>
                <tr>
                  <th>{tr("Company")}</th>
                  <th>{tr("Monthly volume m³")}</th>
                  <th>{tr("Mean distance km")}</th>
                  <th>{tr("Standalone cost SEK/m³")}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((c) => (
                  <tr key={c}>
                    <td>{c}</td>
                    <td>{companyProfiles[count][c].volume.toLocaleString()}</td>
                    <td>{companyProfiles[count][c].distance}</td>
                    <td>
                      {(
                        (cost([c], count) * 1000) /
                        companyProfiles[count][c].volume
                      ).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>{tr("Volume-weighted total cost allocates the coalition's cost in proportion to these volumes, then subtracts each allocation from standalone cost to obtain savings. Negative savings mean a company loses; such an offer cannot be submitted under this game's individual-rationality rule.")}{" "}</p>
          {count === 5 && (
            <p className="muted">{tr("The five-company rows sum to 795,190 m³; the printed total is 795,200 m³. Calculations use the individual rows. The four-company handout has different volumes for companies 1 and 2.")}{" "}</p>
          )}
        </details>
        <Suspense fallback={<p>{tr("Loading teaching materials…")}</p>}><TeachingPackets negotiation={game.negotiation} /></Suspense>
        <CoalitionCharts count={count} groups={groups} shares={allShares} />
        <div className="table-wrap" tabIndex={0} role="region" aria-label={language==='fr'?'Tableau défilant des allocations de coalition':'Scrollable coalition allocation table'}>
          <table>
            <thead>
              <tr>
                <th>{tr("Company")}</th>
                <th>{tr("Group")}</th>
                <th>{tr("Standalone cost")}</th>
                <th>{tr("Negotiated savings")}</th>
                <th>{tr("Allocated cost")}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((c, i) => (
                <tr key={c}>
                  <td>{tr("Company")} {c}</td>
                  <td>
                    <select
                      aria-label={`${tr("Group for company")} ${c}`}
                      value={groups[i]}
                      onChange={(e) => {
                        const next = [...groups];
                        next[i] = Number(e.target.value);
                        negotiate({ groups: next, custom: {} });
                      }}
                    >
                      {members.map((g) => (
                        <option key={g} value={g}>
                          {tr("Group")} {g}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{money(cost([c], count))}</td>
                  <td>
                    <input
                      aria-label={`${tr("Savings for company")} ${c}`}
                      type="number"
                      step="0.01"
                      value={Math.round(allShares[c] * 100) / 100}
                      onChange={(e) =>
                        negotiate({
                          custom: { ...custom, [c]: Number(e.target.value) },
                        })
                      }
                    />
                  </td>
                  <td>
                    {money(cost([c], count) - allShares[c])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="metric-grid">
          <article>
            <small>{tr("Partition savings")}</small>
            <strong>
              {partition
                .reduce((n, p) => n + savings(p, count), 0)
                .toLocaleString()}{" "}{" "}{tr("kSEK")}{" "}</strong>
          </article>
          <article>
            <small>{tr("Efficiency")}</small>
            <strong>{tr(efficient ? "Balanced" : "Unallocated / excess")}</strong>
          </article>
          <article>
            <small>{tr("Individual rationality")}</small>
            <strong>{tr(rational ? "Satisfied" : "Some lose")}</strong>
          </article>
          <article>
            <small>{tr("Internal core")}</small>
            <strong>{tr(blocking.length ? "Unstable" : "Stable")}</strong>
          </article>
        </div>
        {!pairValid && (
          <p className="notice">{tr("Round A allows at most two companies per group.")}{" "}</p>
        )}
        {proposals.map((p) => (
          <p key={p.members.join("")}>
            {tr("Group")} {p.members.join(" + ")}{" "}{tr("· joint cost")}{" "}
            {cost(p.members, count).toLocaleString()}{" "}{tr("· savings")}{" "}
            {savings(p.members, count).toLocaleString()}{" "}{tr("kSEK")}{" "}</p>
        ))}
        <details>
          <summary>{tr("Blocking coalitions (")}{" "}{cross.length})</summary>
          <p>{tr("A subgroup can leave the proposed partition if its achievable savings exceed its negotiated shares. The grand coalition also needs enough savings to keep all companies together.")}{" "}</p>
          {cross.length ? (
            cross.map((p) => (
              <p key={p.members.join("")}>
                {tr("Companies")} {p.members.join(" + ")}{" "}{tr("can gain")}{" "}{p.gap.toFixed(2)}{" "}{" "}{tr("kSEK by regrouping.")}{" "}</p>
            ))
          ) : (
            <p>{tr("No proper subgroup can improve on these shares.")}</p>
          )}
        </details>
      </div>
      <p className="muted">{tr("EPM solves a linear program: minimize the largest difference in relative savings while balancing each coalition and satisfying every subgroup’s stability constraint. It does not assume proportional savings are stable.")}{" "}</p>
      <p className="muted">{tr("The nucleolus lexicographically minimizes the sorted subgroup excesses over individually rational, budget-balanced savings allocations. Each LP stage checks constraints across the whole optimal face before fixing them. This bounded solver uses the four/five-company source tables with numerical tolerance, not shadow prices or a one-stage least-core approximation. Manual share overrides replace the calculated result and may lose its properties.")}</p>
      <PartnerComparison game={game} />
      <NegotiationOffers game={game} onChange={onChange} />
      <div className="panel">
        <h3>{tr("Partner freight contract")}</h3>
        <p>{tr("Select explicit partner jobs on truck haul orders. A shared journey must visit the partner origin and destination before collecting your own timber; both loads consume time and the partner's finite stock is tracked separately. Payment covers added travel plus your share of measured joint savings, within the freight quote. There is no automatic empty-leg credit.")}{" "}</p>
        <label className="check-label">
          <input
            type="checkbox"
            checked={game.cooperation.pooling}
            disabled={game.week > game.region.weeks}
            onChange={(e) =>
              agreement({ ...game.cooperation, pooling: e.target.checked })
            }
          />{" "}{" "}{tr("Enable partner freight dispatch")}{" "}</label>
        <label>{tr("Our share of measured travel savings:")}{" "}
          {Math.round(game.cooperation.partnerShare * 100)}%
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            disabled={game.week > game.region.weeks}
            value={game.cooperation.partnerShare}
            onChange={(e) =>
              agreement({
                ...game.cooperation,
                partnerShare: Number(e.target.value),
              })
            }
          />
        </label>
        <p className="muted">{tr("Each payment appears in the weekly ledger. The handout allocations remain separate from this regional freight contract.")}{" "}</p>
      </div>
      <TransportObligationsLab/>
    </>
  );
}
