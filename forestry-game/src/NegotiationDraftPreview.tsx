import type { Game, NegotiationOffer } from './simulation/types';
import { assessNegotiationDraft, compareNegotiationDraft, type NegotiationDraft } from './simulation/negotiation-draft';
import { useNegotiationLanguage } from './negotiation-language';
import './negotiation-workspace.css';
export function DraftValidation({ draft }: { draft: NegotiationDraft }) {
  const { t: tr } = useNegotiationLanguage();
  const hints = { round: 'Use groups of one or two companies in round A.', nonnegative: 'Use finite, nonnegative savings for every company.', balance: 'Balance each group’s savings in the allocation lab.', allocation: 'Allocation unavailable; choose another preset or review the group.' };
  return <div className={draft.canPublish ? 'muted' : 'notice'} aria-live="polite"><strong>{tr(draft.canPublish ? 'Ready to publish' : 'Fix the draft before publishing')}</strong>{!draft.canPublish && <ul>{draft.issues.map((issue, index) => <li key={index}>{tr(hints[issue.kind])}{issue.members.length > 0 && <> {tr('Company group')}: {issue.members.join(' / ')}.</>}</li>)}</ul>}</div>;
}
export default function NegotiationDraftPreview({ game, previousOffer }: { game: Game; previousOffer?: NegotiationOffer }) {
  const { t: tr, language } = useNegotiationLanguage();
  const n = game.negotiation;
  const draft = assessNegotiationDraft(n);
  const comparison = compareNegotiationDraft(n, draft, previousOffer);
  const number = (value: number) => Number.isFinite(value) ? value.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
  const method = { equal: 'Equal savings', shapley: 'Shapley marginal contribution', epm: 'Equal profit method · optimized stable allocation', volume: 'Volume-weighted total cost', proportional: 'Proportional standalone cost', nucleolus: 'Nucleolus · lexicographic excess minimization' }[n.method];
  return <section className="negotiation-draft" aria-label={tr('Current draft allocation')}>
    <h3>{tr('Review the current draft')}</h3>
    <p>{tr('Teaching dataset')}: <strong>{tr(`${n.count} companies`)}</strong> · {tr(n.phase === 'pairs' ? 'A · pairs only' : 'B · any coalition')} · {tr(method)}{draft.members.some(company => n.custom[company] !== undefined) && <> · {tr('Manual share overrides')}</>}</p>
    <details><summary>{tr('Company savings and group balance')} <small>· {number(draft.total)} kSEK · {draft.groups.length} {language === 'fr' ? (draft.groups.length > 1 ? 'groupes' : 'groupe') : draft.groups.length > 1 ? 'groups' : 'group'} · {tr('Potential blocking coalitions')}: {draft.blocking.length}</small></summary>
    <div className="table-wrap" tabIndex={0} role="region" aria-label={tr('Current draft allocation')}><table><thead><tr><th>{tr('Company')}</th><th>{tr('Group')}</th><th>{tr('Draft savings (kSEK)')}</th>{previousOffer && <th>{tr('Change from previous offer (kSEK)')}</th>}</tr></thead><tbody>{draft.members.map((company, i) => <tr key={company}><td>{tr('Company')} {company}</td><td>{previousOffer && i < previousOffer.count && previousOffer.groups[i] !== n.groups[i] ? `${previousOffer.groups[i]} → ${n.groups[i]}` : n.groups[i]}</td><td>{number(draft.shares[company])}</td>{previousOffer && <td>{previousOffer.count !== n.count ? tr('Different teaching dataset') : previousOffer.shares[company] === undefined ? tr('Not in previous offer') : number(draft.shares[company] - previousOffer.shares[company])}</td>}</tr>)}</tbody></table></div>
    <p><strong>{tr('Available / offered savings (kSEK)')}</strong></p><ul>{draft.groups.map(group => <li key={group.id}>{tr('Group')} {group.id} ({group.members.join(' / ')}): {number(group.available)} / {number(group.offered)}</li>)}</ul>
    <p>{tr('Potential blocking coalitions')}: <strong>{draft.blocking.length}</strong>. {tr('Potential economic alternatives do not predict company responses or prevent publication.')}</p>
    </details>
    <DraftValidation draft={draft}/>
    {previousOffer && <div className="negotiation-revision"><strong>{tr(comparison.unchanged ? 'Draft matches the latest proposal.' : 'Changes from the latest proposal')}</strong>{!comparison.unchanged && <ul>{comparison.datasetChanged && <li>{tr('Dataset changed')}: {previousOffer.count} → {n.count}</li>}{comparison.roundChanged && <li>{tr('Round changed')}</li>}{comparison.changedCompanies.length > 0 && <li>{tr('Changed companies')}: {comparison.changedCompanies.join(' / ')}</li>}</ul>}{previousOffer.status === 'proposed' && <p>{tr('Proposal')} {previousOffer.id} · {tr('Recorded acceptances')}: {previousOffer.accepted.length} / {previousOffer.count}. {tr('Prior recorded acceptances stay with that proposal; a new proposal starts without acceptances.')}</p>}</div>}
  </section>;
}
