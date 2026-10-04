import { useState, type ReactNode } from 'react';
import type { Game, NegotiationOffer } from './simulation/types';
import { propose, respond } from './simulation/negotiation';
import { stability } from './coalition';
import { useNegotiationLanguage } from './negotiation-language';
import NegotiationDraftPreview from './NegotiationDraftPreview';
import { assessNegotiationDraft } from './simulation/negotiation-draft';
import './teaching-interactive.css';

function statusLabel(status: NegotiationOffer['status']) {
  return { proposed: 'Open for responses', agreed: 'All companies accepted', rejected: 'Rejected · closed', superseded: 'Replaced by a later proposal' }[status];
}

/** Read-only evidence; classroom callers retain their own authenticated response controls. */
export function NegotiationOfferEvidence({ offer, previousOffer, children }: {
  offer: NegotiationOffer;
  previousOffer?: NegotiationOffer;
  children?: ReactNode;
}) {
  const { t: tr, language } = useNegotiationLanguage();
  const members = Array.from({ length: offer.count }, (_, i) => String(i + 1));
  const blocking = stability(members, offer.shares, offer.count);
  const number = (value: number) => value.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return <div className="negotiation-evidence">
    <h3>{tr('Proposal')} {offer.id} · {tr(statusLabel(offer.status))}</h3>
    <p>{tr('Recorded offer dataset')}: <strong>{tr(`${offer.count} companies`)}</strong>{offer.phase && <> · {tr(offer.phase === 'pairs' ? 'A · pairs only' : 'B · any coalition')}</>}</p>
    {previousOffer && previousOffer.count !== offer.count && <p className="notice">{tr('The previous offer uses a different company cost table. Savings changes across these datasets are not shown as allocation improvements.')}</p>}
    <p>{tr('Recorded acceptances')}: <strong>{offer.accepted.length} / {offer.count}</strong>. {tr('Acceptance applies to this exact allocation.')}</p>
    {offer.status === 'rejected' && <p className="notice">{tr('This record does not identify who rejected the offer or why. A company without acceptance is not necessarily the rejecting company.')}</p>}
    {offer.status === 'superseded' && <p className="muted">{tr('A later proposal closed this offer; its recorded acceptances remain in history.')}</p>}
    {offer.status === 'agreed' && <p className="notice">{tr('Every company accepted this offer.')}</p>}
    <div className="table-wrap" tabIndex={0} role="region" aria-label={language === 'fr' ? 'Tableau défilant de l’offre négociée' : 'Scrollable negotiation offer table'}>
      <table><thead><tr><th>{tr('Company')}</th><th>{tr('Group')}</th><th>{tr('Offered savings (kSEK)')}</th><th>{tr('Change from previous offer (kSEK)')}</th><th>{tr('Response')}</th></tr></thead>
        <tbody>{members.map((company, i) => <tr key={company}>
          <td>{tr('Company')} {company}</td><td>{offer.groups[i]}</td><td>{number(offer.shares[company])}</td>
          <td>{!previousOffer ? tr('First offer') : previousOffer.count !== offer.count ? tr('Different teaching dataset') : previousOffer.shares[company] === undefined ? tr('Not in previous offer') : number(offer.shares[company] - previousOffer.shares[company])}</td>
          <td>{offer.accepted.includes(company) ? tr('✓ Accepted') : tr(offer.status === 'proposed' ? 'Awaiting response' : 'No acceptance recorded')}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {children}
    <details><summary>{tr('Economic evidence for this frozen offer')}</summary>
      <dl className="teaching-metrics"><div><dt>{tr('Total offered savings')}</dt><dd>{number(members.reduce((sum, company) => sum + offer.shares[company], 0))} kSEK</dd></div><div><dt>{tr('Potential blocking coalitions')}</dt><dd>{blocking.length}</dd></div></dl>
      {blocking.length ? <ul>{blocking.slice(0, 3).map(group => <li key={group.members.join(',')}>{tr('Company group')} {group.members.join(' / ')}: {tr('Additional attainable savings')} {number(group.gap)} kSEK</li>)}</ul> : <p>{tr('No subgroup can earn more than its offered savings under the teaching cost table.')}</p>}
      <p className="muted">{tr('These comparisons use the teaching cost table, not recorded reasons for company decisions.')}</p>
    </details>
  </div>;
}

export default function NegotiationOffers({ game, onChange }: { game: Game; onChange: (g: Game) => void }) {
  const { t: tr } = useNegotiationLanguage();
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const offers = game.negotiation.offers ?? [];
  const latest = offers.at(-1);
  const draft = assessNegotiationDraft(game.negotiation);
  const selected = offers.find(offer => offer.id === selectedId) ?? latest;
  const selectedIndex = selected ? offers.findIndex(offer => offer.id === selected.id) : -1;
  const act = (fn: () => Game) => {
    try { onChange(fn()); setError(''); } catch (e) { setError(String(e)); }
  };
  const step = !latest ? 0 : latest.status === 'agreed' ? 3 : latest.status === 'proposed' ? 2 : 1;
  return <section className="panel negotiation-workspace">
    <h2>{tr('From allocation to agreement')}</h2>
    <p>{tr('Freeze the current allocation as a proposal. Each company can accept or reject that exact offer. Later edits create a new draft; they never rewrite a signed proposal.')}</p>
    <ol className="negotiation-flow" aria-label={tr('Negotiation board')}>{['Draft allocation', 'Publish proposal', 'Company responses', 'Agreement'].map((label, i) => <li key={label} aria-current={i === step ? 'step' : undefined}>{i + 1} · {tr(label)}</li>)}</ol>
    <NegotiationDraftPreview game={game} previousOffer={latest}/>
    <button className="primary" disabled={!draft.canPublish} onClick={() => act(() => {
      const next = propose(game);
      setSelectedId(next.negotiation.offers!.at(-1)!.id);
      return next;
    })}>{tr(latest ? 'Publish revised allocation' : 'Propose current allocation')}</button>
    {latest && <p className="muted">{tr('Each revised proposal freezes a new allocation and closes any earlier open proposal. Edit the draft allocation before publishing a revision.')}</p>}
    {error && <p className="notice" role="alert">{tr(error)}</p>}
    {!selected ? <p>{tr('No proposal yet. Review the draft allocation, then publish it for company responses.')}</p> : <div className="negotiation-board">
      <nav className="negotiation-history" aria-label={tr('Select a proposal')}>
        {[...offers].reverse().map(offer => <button key={offer.id} aria-pressed={offer.id === selected.id} onClick={() => setSelectedId(offer.id)}><strong>{tr('Proposal')} {offer.id}</strong><span>{tr(statusLabel(offer.status))}</span><small>{offer.accepted.length} / {offer.count} · {tr('Recorded acceptances')}</small></button>)}
      </nav>
      <NegotiationOfferEvidence offer={selected} previousOffer={offers[selectedIndex - 1]}>
        {selected.status === 'proposed' && <fieldset><legend>{tr('Company responses')}</legend>
          <p className="muted">{tr('No motive is recorded for a company decision.')}</p>
          <div className="button-row">{Array.from({ length: selected.count }, (_, i) => String(i + 1)).filter(company => !selected.accepted.includes(company)).map(company => <div key={company} className="button-row">
            <button onClick={() => act(() => respond(game, selected.id, company, true))}>{tr('Company')} {company} · {tr('Accept')}</button>
            <button onClick={() => act(() => respond(game, selected.id, company, false))}>{tr('Company')} {company} · {tr('Reject')}</button>
          </div>)}</div>
        </fieldset>}
      </NegotiationOfferEvidence>
    </div>}
    <p className="muted">{tr('Shared-device classroom exercise: these are recorded role decisions, not authenticated signatures or messages to other people. An efficient offer can still be unstable; review blocking coalitions before accepting. The campaign backhaul contract remains a separate operating assumption.')}</p>
  </section>;
}
