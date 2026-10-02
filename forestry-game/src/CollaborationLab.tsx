import { useNegotiationLanguage } from "./negotiation-language";
import { assessNegotiationDraft } from "./simulation/negotiation-draft";
import { DraftValidation } from "./NegotiationDraftPreview";
import NegotiationSavingsInput from "./NegotiationSavingsInput";
import "./negotiation-workspace.css";
import {lazy, Suspense} from "react";
const TeachingPackets=lazy(()=>import("./TeachingPackets"));
import CoalitionCharts from "./CoalitionCharts";
import { companyProfiles } from "./company-profiles";
import { cost, savings, stability } from "./coalition";
import type { Method } from "./coalition";
import type { Game, Negotiation } from "./simulation/types";
export default function CollaborationLab({
  game,
  onChange,
  onOpenBoard,
}: {
  game: Game;
  onChange: (g: Game) => void;
  onOpenBoard?: () => void;
}) {
 const {t: tr, language}=useNegotiationLanguage();
  const money = (value: number) => value.toLocaleString(language === "fr" ? "fr-CA" : "en-CA", {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const { count, groups, method, custom, phase } = game.negotiation;
  const negotiate = (patch: Partial<Negotiation>) =>
    onChange({ ...game, negotiation: { ...game.negotiation, ...patch } });
  const members = Array.from({ length: count }, (_, i) => String(i + 1)),
    partition = [...new Set(groups.slice(0, count))].map((group) =>
      members.filter((_, i) => groups[i] === group),
    );
  const draft = assessNegotiationDraft(game.negotiation);
  const proposals = draft.groups.map(group => ({ members: group.members, shares: Object.fromEntries(group.members.map(company => [company, draft.shares[company]])) }));
  const efficient = draft.groups.every(group => Number.isFinite(group.residual) && Math.abs(group.residual) <= 0.01),
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
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>{tr("Collaboration laboratory")}</h2>
          <p>{tr("Edit groups and savings first; review the draft on the negotiation board before publishing.")}{" "}</p>
        </div>
      </div>
      <div className="panel negotiation-allocation-editor">
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
                    <NegotiationSavingsInput
                      label={`${tr("Savings for company")} ${c}`}
                      value={allShares[c]}
                      onCommit={amount => negotiate({ custom: { ...custom, [c]: amount } })}
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
        <p className="muted">{tr('Press Enter or leave the savings field to apply it. Escape restores its saved value. Negative draft savings prevent publication.')}</p>
        <DraftValidation draft={draft}/>
        {onOpenBoard && <button className="primary" onClick={onOpenBoard}>{tr('Review on negotiation board')}</button>}
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
            <p className="muted">{tr("The five-company rows sum to 795,190 m³; the printed total is 795,200 m³. Calculations use the individual rows of the English five-company handout. The four-company handout and the French printed map sheet give 77,300 and 301,300 m³ for companies 1 and 2.")}{" "}</p>
          )}
        </details>
        <Suspense fallback={<p>{tr("Loading teaching materials…")}</p>}><TeachingPackets negotiation={game.negotiation} /></Suspense>
        <details><summary>{tr('Allocation evidence and charts')}</summary><CoalitionCharts count={count} groups={groups} shares={allShares}/></details>
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
      <details className="panel"><summary>{tr('How the allocation presets work')}</summary>
      <p className="muted">{tr("EPM solves a linear program: minimize the largest difference in relative savings while balancing each coalition and satisfying every subgroup’s stability constraint. It does not assume proportional savings are stable.")}{" "}</p>
      <p className="muted">{tr("The nucleolus lexicographically minimizes the sorted subgroup excesses over individually rational, budget-balanced savings allocations. Each LP stage checks constraints across the whole optimal face before fixing them. This bounded solver uses the four/five-company source tables with numerical tolerance, not shadow prices or a one-stage least-core approximation. Manual share overrides replace the calculated result and may lose its properties.")}</p>
      </details>
    </>
  );
}
