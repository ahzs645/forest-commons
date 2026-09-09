import { useLanguage } from "./i18n";
import { useEffect, useState } from "react";
export interface SessionTiming { paused: boolean; remainingMs: number; deadline: number | null; serverNow: number }
export default function SessionClock({ timer, instructor = false, act }: { timer?: SessionTiming | null; instructor?: boolean; act?: (action: string, payload: unknown) => unknown }) {
 const {t: tr}=useLanguage();
  const [minutes, setMinutes] = useState(15);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(0);
    const start = Date.now();
    const tick = setInterval(() => setElapsed(Date.now() - start), 1000);
    return () => clearInterval(tick);
  }, [timer]);
  const seconds = Math.max(0, Math.ceil(((timer?.remainingMs ?? 0) - (timer?.paused ? 0 : elapsed)) / 1000));
  return <section aria-label={tr("Classroom session timer")} className="notice">
    <strong>{!timer ? tr("Untimed session") : timer.paused ? tr("Session paused") : seconds === 0 ? tr("Session deadline reached") : `${tr("Session time")}: ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}</strong>
    <p>{timer?.paused ? tr("Participant submissions are paused.") : timer && seconds === 0 ? tr("Submissions are closed until the instructor extends or disables the timer.") : tr("The instructor advances only after operating roles are ready. The timer never advances the game automatically.")} {tr("Advancing clears the timer for the next week.")}</p>
    {instructor && act && <div className="button-row">
      <label>{tr("Minutes")}<input aria-label={tr("Session duration in minutes")} type="number" min="1" max="240" value={minutes} onChange={e => setMinutes(Number(e.target.value))} /></label>
      <button disabled={!Number.isFinite(minutes) || minutes < 1 || minutes > 240} onClick={() => act("timer", { command: timer ? "extend" : "start", minutes })}>{timer ? tr("Extend session") : tr("Start timer")}</button>
      {timer && <><button disabled={timer.paused && seconds === 0} onClick={() => act("timer", { command: timer.paused ? "resume" : "pause" })}>{timer.paused ? tr("Resume submissions") : tr("Pause submissions")}</button><button onClick={() => act("timer", { command: "disable" })}>{tr("Disable timer")}</button></>}
    </div>}
  </section>;
}
