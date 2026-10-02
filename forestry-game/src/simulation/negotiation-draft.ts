import { allocate, savings, stability } from '../coalition';
import type { Negotiation, NegotiationOffer } from './types';

export type DraftIssue = { kind: 'round' | 'nonnegative' | 'balance' | 'allocation'; message: string; members: string[] };
export function assessNegotiationDraft(n: Negotiation) {
  const members = Array.from({ length: n.count }, (_, i) => String(i + 1));
  const partitions = [...new Set(n.groups.slice(0, n.count))].map(id => ({ id, members: members.filter((_, i) => n.groups[i] === id) }));
  const issues: DraftIssue[] = [];
  if (n.phase === 'pairs' && partitions.some(group => group.members.length > 2)) issues.push({ kind: 'round', message: 'Round A allows only pairs and single companies.', members: [] });
  const shares: Record<string, number> = {};
  const groups = partitions.map(group => {
    let preset: Record<string, number> = {};
    try { preset = allocate(group.members, n.method, n.count); }
    catch (error) { issues.push({ kind: 'allocation', message: error instanceof Error ? error.message : String(error), members: group.members }); }
    for (const company of group.members) shares[company] = n.custom[company] ?? preset[company] ?? NaN;
    const offered = group.members.reduce((sum, company) => sum + shares[company], 0);
    const available = savings(group.members, n.count);
    if (group.members.some(company => !Number.isFinite(shares[company]) || shares[company] < 0)) issues.push({ kind: 'nonnegative', message: 'Every company must receive nonnegative savings.', members: group.members });
    // Keep the operating engine's existing budget tolerance. Round only for display.
    if (Math.abs(offered - available) > 0.01) issues.push({ kind: 'balance', message: 'Allocate each group’s savings exactly before making a proposal.', members: group.members });
    return { ...group, available, offered, residual: offered - available };
  });
  const finite = members.every(company => Number.isFinite(shares[company]));
  const total = finite ? members.reduce((sum, company) => sum + shares[company], 0) : NaN;
  const blocking = finite ? stability(members, shares, n.count) : [];
  const grandGap = savings(members, n.count) - total;
  if (grandGap > 1e-6) blocking.push({ members, gap: grandGap });
  blocking.sort((a, b) => b.gap - a.gap);
  return { members, shares, groups, issues, total, blocking, canPublish: issues.length === 0 };
}
export type NegotiationDraft = ReturnType<typeof assessNegotiationDraft>;

/** A live draft can differ; recorded historical offers remain immutable evidence. */
export function compareNegotiationDraft(n: Negotiation, draft: NegotiationDraft, offer?: NegotiationOffer) {
  if (!offer) return { unchanged: false, datasetChanged: false, roundChanged: false, changedCompanies: [] as string[] };
  const datasetChanged = offer.count !== n.count;
  const roundChanged = offer.phase !== undefined && offer.phase !== n.phase;
  const changedCompanies = draft.members.filter((company, i) => offer.groups[i] !== n.groups[i] || offer.shares[company] === undefined || !Number.isFinite(draft.shares[company]) || Math.abs(offer.shares[company] - draft.shares[company]) > 1e-8);
  return { datasetChanged, roundChanged, changedCompanies, unchanged: !datasetChanged && !roundChanged && changedCompanies.length === 0 };
}
