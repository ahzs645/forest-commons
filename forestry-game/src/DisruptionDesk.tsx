import {useLanguage} from "./i18n";
import type { Game } from "./simulation/types";
import { activeDisruptions } from "./simulation/disruptions";
export default function DisruptionDesk({
  game,
  onRespond,
}: {
  game: Game;
  onRespond: (id: string, action: "repair" | "wait") => void;
}) {
  const {t:tr,language}=useLanguage();
  const events = (game.region.disruptions ?? []).filter(
    (e) => e.revealWeek <= game.week,
  );
  if (!events.length) return null;
  const active = activeDisruptions(game);
  return (
    <section className="panel">
      <span className="eyebrow">{tr("OPERATING DISRUPTIONS")}</span>
      <h2>{tr("Respond to changing conditions")}</h2>
      <p className="muted">
        {tr("Authored teaching events. Closures change available routes and capacity; recovery payments enter the campaign ledger immediately.")}
      </p>
      <div className="resource-grid">
        {events.map((e) => {
          const response = game.eventResponses?.find(
              (a) => a.event === e.id && a.action === "repair",
            ),
            open = active.some((a) => a.id === e.id);
          return (
            <article className="resource-card" key={e.id}>
              <h3>{tr(e.title)}</h3>
              <p>{tr(e.description)}</p>
              <p>
                {tr("Weeks")} {e.week}–{e.endWeek} · {tr(e.kind)} {e.target}
              </p>
              {response ? (
                <p>{tr("Recovery paid · restored week")} {response.restoredWeek}</p>
              ) : open ? (
                <>
                  <p>
                    {tr("Recovery:")} {game.region.currency}{" "}
                    {e.repairCost.toLocaleString(language==="fr"?"fr-CA":"en-CA")} ·{" "}
                    {tr(e.repairWeeks === 0
                      ? "available immediately"
                      : `available in ${e.repairWeeks} week(s)`)}
                  </p>
                  <div className="button-row">
                    <button onClick={() => onRespond(e.id, "repair")}>
                      {tr("Pay for recovery")}
                    </button>
                    <button onClick={() => onRespond(e.id, "wait")}>
                      {tr("Wait for normal reopening")}
                    </button>
                  </div>
                  {game.eventResponses?.some(
                    (a) => a.event === e.id && a.action === "wait",
                  ) && <p>{tr("Waiting recorded. You can still choose recovery.")}</p>}
                </>
              ) : (
                <p>
                  {tr(game.week < e.week
                    ? "Upcoming closure"
                    : "Normal service restored")}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
