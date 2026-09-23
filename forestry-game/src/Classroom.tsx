import {forestIntakeProducts} from "./simulation/intake-products";
import BidCompositionRecord from "./BidCompositionRecord";
import {classroomJson} from "./classroom-http";
import SettledReservationResults from "./SettledReservationResults";
import ReciprocalSettlement from "./ReciprocalSettlement";
import MillCommitmentInput from "./MillCommitmentInput";
import {effectiveMarketRegion} from "./simulation/bc-market";
import BCMarketDesk from "./BCMarketDesk";
import TenureDesk from "./TenureDesk";
import ReciprocalService from './ReciprocalService';
import ReciprocalRenewal from './ReciprocalRenewal';
import {ClassroomRequestGuard} from "./classroom-request-guard";
import BidCompositionDesk from "./BidCompositionDesk";
import { useLanguage } from "./i18n";
import { classroomApi, classroomEnabled } from "./classroom-api";
import PreSeasonDesk from "./PreSeasonDesk";
import { BuckingSelect } from "./BuckingDesk";
import SessionClock, { type SessionTiming } from "./SessionClock";
import CohortMonitor from "./CohortMonitor";
import {FacilityTransferDesk} from "./FacilityTransferDesk";
import ReservationDesk from "./ReservationDesk";
import OfftakeDesk from "./OfftakeDesk";
import MillProcessingDesk from "./MillProcessingDesk";
import DisclosureDesk from "./DisclosureDesk";
import type { DisclosureView } from "./simulation/disclosure";
import CrewTimeline from "./CrewTimeline";
import { useEffect, useState, useRef } from "react";
import type { Game, Plan } from "./simulation/types";
import OperationsMap from "./maps/LazyMap";
import DisruptionDesk from "./DisruptionDesk";
interface View {
  withheldAuctions?: {id:string;releaseWeek:number}[];
  timer?: SessionTiming | null;
  id: string;
  revision: number;
  role: string;
  game: Game;
  connectedRoles: string[];
  audit: { revision: number; role: string; action: string; at: string }[];
  credential?: string;
  disclosure?: DisclosureView | null;
}
export function classroomConflictRecovered(error: string, rejectedRevision: number | null, currentRevision: number, unsent: boolean) {
  return error === "Error: Room changed. Refresh before submitting your decision." && rejectedRevision !== null && currentRevision > rejectedRevision && !unsent;
}
export function ClassroomCampaignStatus({ complete, ready }: { complete: boolean; ready: Plan["ready"] }) {
  const {t: tr} = useLanguage();
  return complete ? <p role="status" className="notice">{tr("Campaign complete. All turns have settled. Review the operating results below; no further planning approvals are needed.")}</p> : <p>{Object.entries(ready).map(([role, approved]) => `${tr(role)}: ${tr(approved ? "Ready" : "Planning")}`).join(" · ")}</p>;
}
const roleNames = [
  "purchase",
  "production",
  "transport",
  "company1",
  "company2",
  "company3",
  "company4",
  "company5",
];
export default function Classroom({ region, onPendingChanges }: { region: Game["region"]; onPendingChanges?: (pending:boolean)=>void }) {
 const {t: tr}=useLanguage();
  const [hideAuctions, setHideAuctions] = useState(!!region.auctionDisclosure);
  const [session, setSession] = useState<{ id: string; token: string } | null>(
      () => {
        try {
          const fragment = new URLSearchParams(location.hash.slice(1));
          if (fragment.get("room") && fragment.get("credential")) {
            const invitation = {id: fragment.get("room")!, token: fragment.get("credential")!};
            history.replaceState(null, "", location.pathname + location.search);
            return invitation;
          }
          return JSON.parse(sessionStorage.getItem("forest-room") ?? "null");
        } catch {
          return null;
        }
      },
    ),
    [view, setView] = useState<View | null>(null),
    [draft, setDraft] = useState<Plan | null>(null),
    [scheduleDraft, setScheduleDraft] = useState<Game["scheduledCrews"]>({}),
    [base, setBase] = useState(0),
    [dirty, setDirty] = useState(false),
    [roomId, setRoomId] = useState(""),
    [adminToken, setAdminToken] = useState(""),
    [recovery, setRecovery] = useState(""),
    [recoveryKey, setRecoveryKey] = useState(""),
    [token, setToken] = useState(""),
    [error, setError] = useState(""),
    [invite, setInvite] = useState(""),
    [inviteRole, setInviteRole] = useState("purchase"),
    [selected, setSelected] = useState("Q01");
  const guard=useRef(new ClassroomRequestGuard());
  const [pending,setPending]=useState(false);
  useEffect(()=>{onPendingChanges?.(dirty||pending);return ()=>onPendingChanges?.(false);},[dirty,pending,onPendingChanges]);
  const [rejectedRevision,setRejectedRevision]=useState<number | null>(null);
  const request = async (path: string, body?: unknown, auth = session) => {
    return classroomJson(classroomApi(path), {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: `Bearer ${auth.token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  };
  const accept = (v: View) => {
    guard.current.accepted();
    setView(v);
    setDraft(structuredClone(v.game.plan));
    setScheduleDraft(structuredClone(v.game.scheduledCrews ?? {}));
    setBase(v.revision);
    setDirty(false);
  };
  useEffect(() => {
    if (!session || !classroomEnabled) return;
    sessionStorage.setItem("forest-room", JSON.stringify(session));
    let live = true;
    const poll = () => {
      const generation=guard.current.generation;
      if(guard.current.busy)return;
      const sequence=guard.current.startPoll();
      return request(`/api/rooms/${session.id}`)
        .then((v: View) => {
          if (!live || !guard.current.canApplyPoll(generation,sequence)) return;
          guard.current.applied(sequence);
          setView(v);
          if (!dirty && !guard.current.unsent) {
            setDraft(structuredClone(v.game.plan));
    setScheduleDraft(structuredClone(v.game.scheduledCrews ?? {}));
            setBase(v.revision);
          }
        })
        .catch((e) => {
          if (live && guard.current.canApplyPoll(generation,sequence)) setError(String(e));
        });
    };
    void poll();
    const timer = setInterval(poll, 4000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [session, dirty]);
  const act = async (
    action: string,
    payload: unknown = {},
    useDraft = false,
  ) => {
    if ((dirty || guard.current.unsent) && !useDraft) {
      setError("Submit or discard your unsent plan before another room action.");
      return;
    }
    if(!guard.current.begin())return;
    setPending(true);
    const submittedRevision = useDraft ? base : view!.revision;
    try {
      const v: View = await request(`/api/rooms/${session!.id}`, {
        revision: submittedRevision,
        action,
        payload,
      });
      accept(v);
      setError("");
      if (v.credential) setInvite(`${location.origin}${location.pathname}#room=${session!.id}&credential=${encodeURIComponent(v.credential)}`);
    } catch (e) {
      setRejectedRevision(submittedRevision);
      setError(String(e));
    } finally {guard.current.finish();setPending(false);}
  };
  const edit = (fn: (p: Plan) => void) => {
    if(guard.current.busy)return;
    guard.current.edited();
    const next = structuredClone(draft!);
    fn(next);
    setDraft(next);
    setDirty(true);
  };
  const join = async (s: { id: string; token: string }) => {
    try {
      const v = await request(`/api/rooms/${s.id}`, undefined, s);
      setSession(s);
      accept(v);
      setError("");
    } catch (e) {
      setError(String(e));
    }
  };
  if (!classroomEnabled) return <section className="panel"><h2>{tr("Standalone edition")}</h2><p>{tr("This hosted edition includes the local forestry campaign, saves and scenario tools. Live classroom rooms and group monitoring require a separately hosted classroom service. No classroom connection is attempted.")}</p></section>;
  if (!session || !view)
    return (
      <section className="panel">
        <h2>{tr("Classroom rooms")}</h2>
        <p>
          {tr("Each participant joins an assigned role. The server owns the campaign,\n          keeps submitted bids private until settlement, and requires purchase,\n          production and transport readiness before the instructor advances. The\n          standalone campaign remains separate.")}
        </p>
        {/* Participants outnumber instructors, so joining comes first; room
            creation and monitoring are grouped below as instructor tools. */}
        <h3>{tr("Join your assigned role")}</h3>
        <label>
          {tr("Room ID")}
          <input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.trim())}
          />
        </label>
        <label>
          {tr("Role credential")}
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value.trim())}
            autoComplete="off"
          />
        </label>
        <button
          disabled={!roomId || !token}
          onClick={() => join({ id: roomId, token })}
        >
          {tr("Join assigned role")}
        </button>
        <h3>{tr("Instructor tools")}</h3>
        <label><input type="checkbox" checked={hideAuctions} onChange={e => setHideAuctions(e.target.checked)} /> {tr("Release auction quantities only when each auction opens")}</label>
        <p className="muted">{tr("When enabled, the server draws each auction’s volume and asking price independently within 80–120% of the teaching preset (or the imported policy ranges). Unreleased lots are excluded from participant maps and totals. Instructor access remains complete; standalone campaigns are not secret.")}</p>
        <label>{tr("Room creation administrator credential")}<input type="password" autoComplete="off" value={adminToken} onChange={e=>setAdminToken(e.target.value)}/></label>
        <div className="button-row">
          <button
            className="primary"
            onClick={async () => {
              try {
                const s = await request("/api/rooms", { region: { ...region, auctionDisclosure: hideAuctions ? region.auctionDisclosure ?? {mode:"release-week",volumeMultiplier:[.8,1.2],priceMultiplier:[.8,1.2]} : undefined } }, adminToken ? {id:"",token:adminToken}:null);
                setRecoveryKey(s.recoveryToken ?? "");
                setAdminToken("");
                await join(s);
              } catch (e) {
                setError(String(e));
              }
            }}
          >
            {tr("Create instructor room from this region")}
          </button>
          {session && (
            <button
              onClick={() => {
                setSession(null);
                setRecoveryKey("");
                setRecovery("");
                sessionStorage.removeItem("forest-room");
              }}
            >
              {tr("Forget saved room connection")}
            </button>
          )}
        </div>
        <details><summary>{tr("Recover instructor access")}</summary><p>{tr("Enter the room ID above and your offline recovery credential. This replaces the instructor and recovery credentials.")}</p><input aria-label={tr("Recovery credential")} type="password" autoComplete="off" value={recovery} onChange={e=>setRecovery(e.target.value)}/><button disabled={!roomId || !recovery} onClick={async()=>{try{const s=await request(`/api/rooms/${roomId}/recover`,{}, {id:roomId,token:recovery});setRecoveryKey(s.recoveryToken);setRecovery("");await join(s);}catch(e){setError(String(e));}}}>{tr("Recover instructor role")}</button></details>
        <CohortMonitor />
        {error && <p role="alert">{tr(error)}</p>}
        <p className="muted">
          {tr("The classroom service must be running alongside the app. Invitations\n          grant access to one role; the instructor can replace a lost\n          credential. This is role authentication, not identity verification.")}
        </p>
      </section>
    );
  const g = view.game,
    r = g.region,
    marketRegion = effectiveMarketRegion(g),
    role = view.role,
    done = g.week > r.weeks;
  const defaultHaul=g.stands.filter(s=>s.owned).flatMap(s=>r.mills.flatMap(m=>{
    const product=forestIntakeProducts(g,s.id,Object.keys(m.prices))[0];
    return product?[{stand:s.id,mill:m.id,product}]:[];
  }))[0];
  return (
    <fieldset className="classroom-workspace" disabled={pending} aria-busy={pending} style={{border:0,padding:0,margin:0,minWidth:0}}>
      {pending&&<p role="status">{tr("Saving room decision…")}</p>}
      {!!view.withheldAuctions?.length && <p className="notice">{tr("Future auction quantities are not released.")} {view.withheldAuctions.map(s => `${s.id}: ${tr((r.turnDurationWeeks??1)===1?"Week":"Turn")} ${s.releaseWeek}`).join(" · ")}{tr(". Maps and totals include released lots only.")}</p>}
      {view.role === "instructor" && <CohortMonitor current={session} />}
      {view.disclosure && <DisclosureDesk value={view.disclosure} role={view.role} act={act} />}
      <section className="panel">
        {recoveryKey && <details open><summary>{tr("Save your instructor recovery credential offline")}</summary><p>{tr("Shown only after creation or recovery; keep it separate from invitations. It can replace instructor access.")}</p><code style={{overflowWrap:"anywhere"}}>{recoveryKey}</code><button onClick={()=>setRecoveryKey("")}>{tr("I saved it; hide credential")}</button></details>}
        <div className="section-heading">
          <h2>
            {tr("Room")} {view.id} · {tr(role)}
          </h2>
          <button
            onClick={() => {
              setSession(null);
              setView(null);
              setRecoveryKey("");
              setRecovery("");
              setError("");
              setRejectedRevision(null);
              sessionStorage.removeItem("forest-room");
              setInvite("");
            }}
          >
            {tr("Leave room")}
          </button>
        </div>
        <details><summary>{tr("My reconnect credential")}</summary><p>{tr("Keep this room ID and credential to reopen your assigned role on another device.")}</p><code style={{overflowWrap:'anywhere'}}>{session.token}</code></details>
        <p>
          {tr((r.turnDurationWeeks??1)===1?"Week":"Turn")} {Math.min(g.week, r.weeks)} / {r.weeks} · {r.currency}{" "}
          {Math.round(g.cash).toLocaleString()} {tr("· revision")} {view.revision}
        </p>
        <ClassroomCampaignStatus complete={done} ready={g.plan.ready} />
        <p className="muted">
          {tr("Refreshes every four seconds. Future actual weather and the auction\n          seed stay on the server. Issued roles:")}{" "}
          {view.connectedRoles.join(", ")}.
        </p>
        <SessionClock timer={view.timer} instructor={role === "instructor"} act={act} />
        {error && (
          <p role="alert">
            {tr(classroomConflictRecovered(error, rejectedRevision, view.revision, dirty || guard.current.unsent)
              ? "Room refreshed. Review the current plan, then try your action again."
              : error)}{" "}
            <button
              disabled={pending}
              onClick={async () => {
                if(!guard.current.begin())return;
                setPending(true);
                try {
                  accept(await request(`/api/rooms/${session.id}`));
                  setError("");
                } catch (e) {
                  setError(String(e));
                } finally {guard.current.finish();setPending(false);}
              }}
            >
              {tr(dirty || guard.current.unsent ? "Refresh room and discard draft" : "Refresh room")}
            </button>
          </p>
        )}
        {dirty && (
          <p className="notice">
            {tr("You have unsent changes.")}{" "}
            {base !== view.revision
              ? tr("Another participant changed the room; review refreshed state before resubmitting.")
              : ""}
            <button onClick={() => accept(view)}>
              {tr("Discard draft and refresh")}
            </button>
          </p>
        )}
        {role === "instructor" && (
          <>
            <label>
              {tr("Participant role")}
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                {roleNames.map((n) => (
                  <option key={n}>{tr(n)}</option>
                ))}
              </select>
            </label>
            <button onClick={() => act("invite", { role: inviteRole })}>
              {tr("Issue / replace role credential")}
            </button>
            {invite && (
              <p className="notice" style={{ overflowWrap: "anywhere" }}>
                {tr("Give this role invitation link to that participant:")}{" "}
                <code style={{overflowWrap:"anywhere"}}>{invite}</code>
              </p>
            )}
            <button
              className="primary"
              disabled={done || !Object.values(g.plan.ready).every(Boolean)}
              onClick={() => act("advance")}
            >
              {tr("Advance all participants one week")}
            </button>
            <DisruptionDesk
              game={g}
              onRespond={(id, action) => void act("recovery", { id, action })}
            />
            {(r.reciprocalPairs??[]).map(pair=><ReciprocalRenewal key={pair.id} game={g} pair={pair} pending={pending} onRenew={(opens,deadline)=>void act("renew-reciprocal",{id:pair.id,opens,deadline})}/>)}
            <h3>{tr("Company negotiation")}</h3>
            <p>
              {tr("Create an EPM grand-coalition offer; each assigned company must\n              respond using its own credential.")}
            </p>
            <button
              onClick={() =>
                act("proposal", {
                  groups: [1, 1, 1, 1, 1],
                  phase: "open",
                  method: "epm",
                  custom: {},
                })
              }
            >
              {tr("Propose stable EPM grand coalition")}
            </button>
          </>
        )}
        {role.startsWith("company") && (
          <>
            <h3>{tr("Your company decision")}</h3>
            {["company1", "company2"].includes(role) && (r.reciprocalPairs ?? []).map(pair => {
              const company = role === "company1" ? "A" : "B", agreement = g.reciprocal?.[pair.id];
              return <article key={pair.id} className="resource-card"><h4>{pair.name} · {pair.id} {tr("· Company")} {company}</h4><p>{tr("Classroom mapping: company1 represents A and company2 represents B for this exercise. Both must accept before transport can dispatch balanced pairs. The first acceptance freezes the sharing method.")}</p><ReciprocalService game={g} pair={pair}/>{agreement&&agreement.movedM3>0&&<ReciprocalSettlement agreement={agreement} currency={r.currency} company={company}/>}<p>{tr(pair.settlement==='no-cash'?"No-cash exchange: each company retains its own transport saving or loss; no balancing transfer is made.":"Paid savings sharing")}</p>{(pair.settlement==='no-cash'?[agreement?.method??'equal']:['equal','cost-weighted'] as const).map(method => <button key={method} disabled={done || g.week < pair.opens || g.week > pair.deadline || !!agreement?.accepted.includes(company) || (!!agreement && agreement.method !== method)} onClick={() => void act("accept-reciprocal", {id:pair.id,company,method})}>{tr("Accept")} {tr(pair.settlement==='no-cash'?'No-cash exchange':method)} {tr("as")} {company}</button>)}</article>;
            })}
            {g.negotiation.offers?.at(-1) ? (
              <>
                <p>
                  {tr("Proposal")} {g.negotiation.offers.at(-1)!.id} ·{" "}
                  {g.negotiation.offers.at(-1)!.status} {tr("· your savings")}{" "}
                  {g.negotiation.offers
                    .at(-1)!
                    .shares[role.slice(7)]?.toFixed(2)}{" "}
                  kSEK
                </p>
                <button
                  disabled={g.negotiation.offers.at(-1)!.status !== "proposed"}
                  onClick={() =>
                    act("respond", {
                      id: g.negotiation.offers!.at(-1)!.id,
                      accept: true,
                    })
                  }
                >
                  {tr("Accept as")} {role}
                </button>
                <button
                  disabled={g.negotiation.offers.at(-1)!.status !== "proposed"}
                  onClick={() =>
                    act("respond", {
                      id: g.negotiation.offers!.at(-1)!.id,
                      accept: false,
                    })
                  }
                >
                  {tr("Reject as")} {role}
                </button>
              </>
            ) : (
              <p>{tr("Waiting for an instructor proposal.")}</p>
            )}
          </>
        )}
        <BCMarketDesk game={g}/>
        {g.region.bcTenure && <TenureDesk game={g} editable={!done&&!dirty}
          allowHarvest={['instructor','purchase'].includes(role)}
          allowRoad={['instructor','transport'].includes(role)}
          allowSettlement={['instructor','production'].includes(role)}
          onApplyHarvest={id=>void act('tenure-harvest',{id})}
          onApplyRoad={id=>void act('tenure-road',{id})}
          onSettle={id=>void act('tenure-settle',{id})}/>}
        {["purchase", "production", "transport"].includes(role) && draft && (
          <>
            <h3>{tr("Your planning desk")}</h3>
            <div className="button-row">
              {role !== "purchase" && (
                <button disabled={done || dirty} onClick={() => act("draft")}>
                  {tr("Suggest this role’s plan")}
                </button>
              )}
              <button
                disabled={done || dirty}
                onClick={() =>
                  act("ready", {
                    ready: !g.plan.ready[role as keyof Plan["ready"]],
                  })
                }
              >
                {g.plan.ready[role as keyof Plan["ready"]]
                  ? tr("Return to planning")
                  : tr("Mark my role ready")}
              </button>
            </div>
            {['purchase','transport'].includes(role) && <OfftakeDesk game={{...g,plan:draft}} allowAccept={role==='purchase'&&!dirty} allowDispatch={role==='transport'} onAccept={id=>void act('accept-offtake',{id})} onAcceptAgreement={id=>void act('accept-agreement',{id})} onChange={next=>edit(p=>{p.trucks=next.plan.trucks;})}/>}
            {role==='transport' && <FacilityTransferDesk game={{...g,plan:draft}} onChange={next=>edit(p=>{p.facilityTransfers=next.plan.facilityTransfers;})}/>}
            {['production','transport'].includes(role) && <MillProcessingDesk game={{...g,plan:draft}} allowIntake={role==='transport'} allowProcessing={role==='production'} onChange={next=>edit(p=>{if(role==='production')p.processing=next.plan.processing;else p.trucks=next.plan.trucks;})}/>}
            {role === "purchase" && (
              <details>
                <summary>{tr("Unused auction lots eligible for refusal")}</summary>
                {g.stands
                  .filter(
                    (s) =>
                      s.owned &&
                      s.purchaseWeek !== null && g.week - s.purchaseWeek >= 1 && g.week - s.purchaseWeek <= 1 / (r.turnDurationWeeks ?? 1) &&
                      s.harvested === 0 &&
                      r.stands.find((d) => d.id === s.id)!.supply === "auction",
                  )
                  .map((s) => (
                    <button
                      key={s.id}
                      disabled={done || dirty}
                      onClick={() => act("refuse", { id: s.id })}
                    >
                      {tr("Refuse")} {s.id} · {r.economy.timberPayment==='harvest-royalty'?tr('guarantee charge'):tr('refund')}{" "}
                      {Math.round(
                        s.purchasePaid * (r.economy.timberPayment==='harvest-royalty'?r.economy.refusalPercent:1-r.economy.refusalPercent),
                      ).toLocaleString()}
                    </button>
                  ))}
              </details>
            )}
            {role === "purchase" && (
              <div className="resource-grid">
                {r.stands
                  .filter(
                    (s) =>
                      !g.stands.find((t) => t.id === s.id)!.owned &&
                      (s.supply === "private" ||
                        (s.supply === "auction" && s.auctionWeek === g.week)),
                  )
                  .map((s) => (
                    <article className="resource-card" key={s.id}>
                      <h4>
                        {s.id} · {s.name}
                      </h4>
                      <p>
                        {s.supply} {tr("· asking")} {s.askingPrice.toLocaleString()}
                      </p>
                      {s.supply === "private" ? (
                        <button
                          disabled={done || dirty}
                          onClick={() => act("purchase", { id: s.id })}
                        >
                          {tr("Secure private lot")}
                        </button>
                      ) : (
                        <><label>
                          {tr("Private sealed bid")}
                          <input
                            type="number"
                            min="0"
                            value={draft.bids[s.id] ?? 0}
                            onChange={(e) =>
                              edit((p) => {
                                if (Number(e.target.value) > 0)
                                  p.bids[s.id] = Number(e.target.value);
                                else delete p.bids[s.id];
                              })
                            }
                          />
                        </label>
                        <details><summary>{tr("Build bid by product ·")} {s.id}</summary>
                          <BidCompositionDesk game={{...g,plan:draft}} standId={s.id} onChange={next=>edit(p=>{p.bids=next.plan.bids;p.bidComposition=next.plan.bidComposition;})}/>
                        </details></>
                      )}
                    </article>
                  ))}
              </div>
            )}
            {role === "production" && (
              <>
                <ReservationDesk completePlan={false} game={{...g,plan:draft}} onChange={next=>edit(p=>{p.reservations=next.plan.reservations;})}/>
                <CrewTimeline game={{...g, plan: draft, scheduledCrews: scheduleDraft}} onChange={done || pending ? undefined : next => { if(guard.current.busy)return;guard.current.edited();setScheduleDraft(next.scheduledCrews ?? {}); setDirty(true); }} />
                <label>
                  {tr("Retained fraction")}
                  <input
                    type="number"
                    min={r.ecology.minimumRetention}
                    max=".8"
                    step=".05"
                    value={draft.retention}
                    onChange={(e) =>
                      edit((p) => {
                        p.retention = Number(e.target.value);
                      })
                    }
                  />
                </label>
                {r.crews.map((c) => (
                  <article className="resource-card" key={c.id}>
                    <h4>
                      {tr(c.name)} · {c.hours} h
                    </h4>
                    <p>{tr("Scheduled hours")}: {draft.crews[c.id].reduce((sum,o)=>sum+o.hours,0)} / {c.hours}. {tr("Assigned hours include relocation.")}</p>
                    {draft.crews[c.id].map((o, i) => (
                      <div className="form-row" key={i}>
                        <label>
                          {tr("Stand")}
                          <select
                            value={o.stand}
                            onChange={(e) =>
                              edit((p) => {
                                p.crews[c.id][i].stand = e.target.value;
                              })
                            }
                          >
                            {r.stands.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.id} · {s.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          {tr("Hours")}
                          <input
                            type="number"
                            min="1"
                            max={c.hours}
                            value={o.hours}
                            onChange={(e) =>
                              edit((p) => {
                                p.crews[c.id][i].hours = Number(e.target.value);
                              })
                            }
                          />
                        </label>
                        <label>
                          {tr("Treatment")}
                          <select
                            value={o.treatment ?? "final"}
                            onChange={(e) =>
                              edit((p) => {
                                p.crews[c.id][i].treatment = e.target.value;
                              })
                            }
                          >
                            {Object.entries(
                              r.treatments ?? {
                                final: { name: "Final harvest" },
                              },
                            ).map(([id, t]) => (
                              <option key={id} value={id}>
                                {tr(t.name)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <BuckingSelect game={{...g,plan:draft}} crew={c.id} index={i} onChange={next => edit(p => { p.crews = next.plan.crews; })} />
                        <button
                          onClick={() =>
                            edit((p) => {
                              p.crews[c.id].splice(i, 1);
                            })
                          }
                        >
                          {tr("Remove")}
                        </button>
                      </div>
                    ))}
                    <button
                      disabled={!g.stands.some(s=>s.owned)||draft.crews[c.id].reduce((sum,o)=>sum+o.hours,0)>=c.hours}
                      onClick={() =>
                        edit((p) => {
                          const stand=g.stands.find(s=>s.owned);
                          const remaining=c.hours-p.crews[c.id].reduce((sum,o)=>sum+o.hours,0);
                          if(!stand||remaining<=0)return;
                          p.crews[c.id].push({
                            stand: stand.id,
                            hours: Math.min(40,remaining),
                          });
                        })
                      }
                    >
                      {tr("Add crew stop")}
                    </button>
                  </article>
                ))}
              </>
            )}
            {role === "transport" && (
              <>
                {!!r.reciprocalPairs?.length && <details><summary>{tr("Balanced reciprocal haul queue")}</summary><p>{tr("Company1 (A) and company2 (B) must accept terms before dispatch. Both legs share the available truck hours and matching stock.")}</p>{(draft.reciprocal ?? []).map((order,index) => <div className="form-row" key={index}><strong>{order.pair}</strong>{(["truckA", "truckB"] as const).map(field => <label key={field}>{tr(field)}<select value={order[field]} onChange={e => edit(p => {p.reciprocal![index][field] = e.target.value;})}>{r.trucks.map(t => <option value={t.id} key={t.id}>{tr(t.name)}</option>)}</select></label>)}<label>{tr("Paired loads")}<input type="number" min="1" max="100" value={order.loads} onChange={e => edit(p => {p.reciprocal![index].loads = Number(e.target.value);})}/></label><button onClick={() => edit(p => {p.reciprocal!.splice(index,1);})}>{tr("Remove pair")}</button></div>)}{r.reciprocalPairs.map(pair => <button key={pair.id} disabled={done || pair.routing==='fixed' || g.week < pair.opens || g.week > pair.deadline || g.reciprocal?.[pair.id]?.accepted.length !== 2} onClick={() => edit(p => {p.reciprocal ??= [];p.reciprocal.push({pair:pair.id,truckA:r.trucks[0].id,truckB:(r.trucks[1] ?? r.trucks[0]).id,loads:1});})}>{tr("Queue")} {pair.name}</button>)}</details>}
                <details>
                  <summary>{tr("Monthly commitments")}</summary>
                  <p>{tr("Targets are editable only at the start of each month.")}</p>
                  {marketRegion.mills.map((m) => (
                    <div className="form-row" key={m.id}>
                      {Object.entries(
                        m.demand[
                          Math.min(
                            Math.floor((g.week - 1) / r.weeksPerMonth),
                            m.demand.length - 1,
                          )
                        ],
                      ).map(([product]) => (
                        <label key={product}>
                          {tr(m.name)} · {product}
                          <small>{tr("Demand m³")}: {m.demand[Math.min(Math.floor((g.week-1)/r.weeksPerMonth),m.demand.length-1)][product]} · {r.currency} {m.prices[product].toFixed(2)} / m³</small>
                          <MillCommitmentInput game={g} millId={m.id} product={product} value={draft.targets[m.id]?.[product]??0} onChange={value=>edit(p=>{p.targets[m.id]??={};p.targets[m.id][product]=value;})}/>
                        </label>
                      ))}
                    </div>
                  ))}
                </details>
                <details>
                  <summary>{tr("Road investment")}</summary>
                  {r.roads.edges
                    .filter(
                      (e) => e.bearing > 1 && !g.improvedRoads.includes(e.id),
                    )
                    .map((e) => (
                      <button
                        key={e.id}
                        disabled={dirty || done}
                        onClick={() => act("road", { id: e.id })}
                      >
                        {tr("Improve")} {e.name} ·{" "}
                        {Math.round(
                          e.km * r.economy.roadUpgradePerKm,
                        ).toLocaleString()}
                      </button>
                    ))}
                </details>
                <label>
                  <input
                    type="checkbox"
                    disabled={dirty || done}
                    checked={g.cooperation.pooling}
                    onChange={(e) =>
                      act("plan", {
                        cooperation: {
                          ...g.cooperation,
                          pooling: e.target.checked,
                        },
                      })
                    }
                  />{" "}
                  {tr("Enable partner freight")}
                </label>
                <label>
                  {tr("Our share of measured freight savings")}
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step=".05"
                    disabled={dirty || done}
                    value={g.cooperation.partnerShare}
                    onChange={(e) =>
                      act("plan", {
                        cooperation: {
                          ...g.cooperation,
                          partnerShare: Number(e.target.value),
                        },
                      })
                    }
                  />
                </label>
              </>
            )}
            {role === "transport" &&
              r.trucks.map((t) => (
                <article className="resource-card" key={t.id}>
                  <h4>{tr(t.name)}</h4>
                  {draft.trucks[t.id].map((o, i) => (
                    <div className="form-row" key={i}>
                      {(o.offtake||o.spot||o.process)&&<strong>{o.offtake?`${tr("Contract")} ${o.offtake}`:o.process?tr("Mill intake"):tr("Spot sale")}</strong>}
                      <label>
                        {tr("Stand")}
                        <select
                          value={o.stand}
                          onChange={(e) =>
                            edit((p) => {
                              p.trucks[t.id][i].stand = e.target.value;
                            })
                          }
                        >
                          {r.stands.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.id}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {tr("Mill")}
                        <select
                          disabled={!!o.offtake||!!o.spot||!!o.process}
                          value={o.mill}
                          onChange={(e) =>
                            edit((p) => {
                              p.trucks[t.id][i].mill = e.target.value;
                            })
                          }
                        >
                          {r.mills.map((m) => (
                            <option key={m.id} value={m.id}>
                              {tr(m.name)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {tr("Product")}
                        <select
                          disabled={!!o.offtake||!!o.spot||!!o.process}
                          value={o.product}
                          onChange={(e) =>
                            edit((p) => {
                              p.trucks[t.id][i].product = e.target.value;
                            })
                          }
                        >
                          {r.products.map((p) => (
                            <option key={p.id} value={p.id} disabled={!(p.id in (r.mills.find(m=>m.id===o.mill)?.prices??{}))}>
                              {tr(p.name)}
                            </option>
                          ))}
                        </select>
                      </label>
                      {!(o.product in (r.mills.find(m=>m.id===o.mill)?.prices??{}))&&<p role="alert">{tr("This mill does not accept the selected assortment. Choose a compatible product or destination before submitting.")}</p>}
                      <label>
                        {tr("Partner job")}
                        <select
                          disabled={!g.cooperation.pooling}
                          value={o.partnerJob ?? ""}
                          onChange={(e) =>
                            edit((p) => {
                              p.trucks[t.id][i].partnerJob =
                                e.target.value || undefined;
                            })
                          }
                        >
                          <option value="">{tr("Own timber only")}</option>
                          {(r.partnerJobs ?? []).map((j) => (
                            <option key={j.id} value={j.id}>
                              {j.id} · {j.company}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {tr("Loads")}
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={o.loads}
                          onChange={(e) =>
                            edit((p) => {
                              p.trucks[t.id][i].loads = Number(e.target.value);
                            })
                          }
                        />
                      </label>
                      <button
                        onClick={() =>
                          edit((p) => {
                            p.trucks[t.id].splice(i, 1);
                          })
                        }
                      >
                        {tr("Remove")}
                      </button>
                    </div>
                  ))}
                  <button
                    disabled={!defaultHaul}
                    onClick={() =>
                      edit((p) => {
                        if(!defaultHaul)return;
                        p.trucks[t.id].push({
                          ...defaultHaul!,
                          loads: 1,
                        });
                      })
                    }
                  >
                    {tr("Add haul stop")}
                  </button>
                  {!defaultHaul&&<p>{tr("No owned source has an assortment accepted by a mill.")}</p>}
                </article>
              ))}
            <button
              className="primary"
              disabled={done || !dirty}
              onClick={() =>
                act(
                  "plan",
                  role === "purchase"
                    ? { bids: draft.bids, bidComposition: draft.bidComposition }
                    : role === "production"
                      ? { crews: draft.crews, retention: draft.retention, scheduledCrews: scheduleDraft, processing: draft.processing, reservations:draft.reservations }
                      : { trucks: draft.trucks, targets: draft.targets, facilityTransfers:draft.facilityTransfers, reciprocal:draft.reciprocal },
                  true,
                )
              }
            >
              {tr("Submit my plan")}
            </button>
          </>
        )}
      </section>
      {["instructor", "production", "transport"].includes(role) && <PreSeasonDesk game={g} role={role} onMobilize={(kind,id,to) => void act("mobilize", {kind,id,to})} />}
      <OperationsMap game={g} selected={selected} onSelect={setSelected} />
      <section className="panel">
        <h3>{tr("Settled operating results")}</h3>
        {g.history.map((h) => (
          <details key={h.week}>
            <summary>
              {tr((r.turnDurationWeeks??1)===1?"Week":"Turn")} {h.week} ·{" "}
              {Math.round(
                Object.values(h.delivered).reduce((a, b) => a + b, 0),
              )}{" "}
              {tr("m³ delivered")}
            </summary>
            <SettledReservationResults report={h} region={r}/>
            {role === "instructor" && Object.keys(h.plan.bidComposition??{}).map(standId=><BidCompositionRecord key={standId} region={r} plan={h.plan} standId={standId}/>)}
            {h.messages.map((m, i) => (
              <p key={i}>{tr(m)}</p>
            ))}
          </details>
        ))}
        {role === "instructor" && (
          <details>
            <summary>{tr("Room audit trail")}</summary>
            {view.audit.map((a) => (
              <p key={a.revision}>
                {a.at} · {a.role} · {a.action}
              </p>
            ))}
          </details>
        )}
      </section>
    </fieldset>
  );
}
