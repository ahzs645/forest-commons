import { useLanguage } from "./i18n";
import { classroomApi, classroomEnabled } from "./classroom-api";
import SessionClock, { type SessionTiming } from "./SessionClock";
import { useEffect, useState } from "react";
import "./cohort-monitor.css";
interface Connection { id: string; token: string; label: string }
interface Summary {
  timer?: SessionTiming | null;
  id: string; revision: number; region: string; currency: string; week: number; weeks: number;
  complete: boolean; cash: number; delivered: number; ready: Record<string, boolean>;
  issuedRoles: string[]; lastAction: { role: string; action: string; at: string } | null;
}
interface Result { data?: Summary; checked?: number; error?: string }
const key = "forest-cohort-monitor";
export default function CohortMonitor({ current }: { current?: { id: string; token: string } }) {
 const {t: tr}=useLanguage();
  const [connections, setConnections] = useState<Connection[]>(() => {
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(key) ?? "[]");
      return Array.isArray(saved) ? saved.filter((x): x is Connection => typeof x?.id === "string" && /^[a-f0-9]{16}$/.test(x.id) && typeof x.token === "string" && typeof x.label === "string").slice(0, 20) : [];
    } catch { return []; }
  });
  const [results, setResults] = useState<Record<string, Result>>({});
  const [id, setId] = useState(""), [token, setToken] = useState(""), [label, setLabel] = useState("");
  const [error, setError] = useState(""), [refresh, setRefresh] = useState(0);
  useEffect(() => { try { sessionStorage.setItem(key, JSON.stringify(connections)); } catch { setError("This browser cannot retain monitor connections for reconnecting."); } }, [connections]);
  useEffect(() => {
    if (!classroomEnabled) return;
    let active = true;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      await Promise.all(connections.map(async connection => {
        try {
          const response = await fetch(classroomApi(`/api/rooms/${connection.id}/summary`), { headers: { Authorization: `Bearer ${connection.token}` }, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) });
          const data = await response.json().catch(() => { throw Error("Room service is unavailable or returned an unreadable response"); });
          if (!response.ok) throw Error(data.error ?? "Group cannot be reached");
          if (active) setResults(previous => ({ ...previous, [connection.id]: { data, checked: Date.now() } }));
        } catch (e) {
          if (active) setResults(previous => ({ ...previous, [connection.id]: { ...previous[connection.id], error: e instanceof Error ? e.message : "Group cannot be reached" } }));
        }
      }));
      if (active) timer = setTimeout(poll, 5000);
    };
    void poll();
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [connections, refresh]);
  const add = (connection: Connection) => {
    if (connections.length >= 20 && !connections.some(c => c.id === connection.id)) { setError("Monitor up to 20 groups at once."); return; }
    setConnections(previous => [...previous.filter(c => c.id !== connection.id), connection]);
    setResults(previous => { const next = { ...previous }; delete next[connection.id]; return next; });
    setId(""); setToken(""); setLabel(""); setError("");
  };
  if (!classroomEnabled) return null;
  return <section className="panel cohort-monitor" aria-label={tr("Live instructor group monitor")}>
    <div className="section-heading"><h2>{tr("Live group monitor")}</h2><button onClick={() => setRefresh(n => n + 1)}>{tr("Refresh groups")}</button></div>
    <p>{tr("Compare progress and role readiness across your rooms. Summaries refresh every five seconds. Issued roles indicate invitations, not online presence. Connections stay in this browser tab’s session.")}</p>
    <details><summary>{tr("Add or reconnect a group")}</summary>
      <form onSubmit={e => { e.preventDefault(); if (/^[a-f0-9]{16}$/.test(id) && token) add({ id, token, label: label.trim() || `Group ${connections.length + 1}` }); }}>
        <div className="cohort-connect">
          <label>{tr("Group label")}<input value={label} maxLength={60} onChange={e => setLabel(e.target.value)} placeholder={tr("Team Cedar")} /></label>
          <label>{tr("Room ID")}<input required pattern="[a-f0-9]{16}" value={id} onChange={e => setId(e.target.value.trim())} /></label>
          <label>{tr("Instructor credential")}<input required type="password" autoComplete="off" value={token} onChange={e => setToken(e.target.value.trim())} /></label>
          <button type="submit">{tr("Monitor group")}</button>
        </div>
      </form>
      {current && <button onClick={() => add({ ...current, label: `Classroom ${current.id.slice(-6)}` })}>{tr("Monitor current classroom")}</button>}
    </details>
    {error && <p role="alert">{tr(error)}</p>}
    {!connections.length && <p className="notice">{tr("No groups connected yet. Add each room with its instructor credential to compare progress, identify roles still planning and see settled delivery totals.")}</p>}
    <div className="cohort-grid">{connections.map(connection => {
      const result = results[connection.id], data = result?.data;
      return <article className="cohort-card" key={connection.id}>
        <div className="section-heading"><h3>{connection.label}</h3><button aria-label={`Remove ${connection.label}`} onClick={() => setConnections(previous => previous.filter(c => c.id !== connection.id))}>{tr("Remove")}</button></div>
        <small>{tr("Room")} {connection.id}</small>
        {result?.error ? <p role="status">{data ? tr("Stale summary")+" — " : tr("Unavailable")+" — "}{tr(result.error)}{tr(". Check the room service or replace the instructor credential.")}</p> : <p role="status">{data ? tr("Live summary") : tr("Connecting…")}</p>}
        {data && <><SessionClock timer={data.timer} /><p>{data.region} · {data.complete ? tr("Campaign complete") : `${tr("Turn")} ${data.week} / ${data.weeks}`}</p>
          <ul>{Object.entries(data.ready).map(([role, ready]) => <li key={role}>{tr(role)}: {data.complete ? tr("finished") : ready ? tr("Ready") : data.issuedRoles.includes(role) ? tr("Planning") : tr("No invitation issued")}</li>)}</ul>
          <p>{data.currency} {Math.round(data.cash).toLocaleString()} {tr("cash ·")} {Math.round(data.delivered).toLocaleString()} {tr("m³ delivered")}</p>
          <p>{data.complete ? tr("Review settled results with the group.") : Object.values(data.ready).every(Boolean) ? tr("All operating roles ready for instructor review.") : tr("Waiting for the operating roles listed above.")}</p>
          <small>{tr("Revision")} {data.revision} {tr("· checked")} {new Date(result.checked!).toLocaleTimeString()}{data.lastAction ? ` · ${tr("last action")}: ${tr(data.lastAction.role)} ${tr(data.lastAction.action)}` : " · "+tr("no decisions submitted")}</small></>}
      </article>;
    })}</div>
  </section>;
}
