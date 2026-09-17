import { bcOperatingLesson } from "./scenarios/bc-operating-lesson";
import { ConnectivityNotice, OperationsStatus, MobileOperationsNav, LessonLauncher, anchorWorkbench } from "./operations/OperationsShell";
import { DraftReview, TurnReview } from "./operations/PlanReview";
import DecisionDebrief from "./operations/DecisionDebrief";
import SettledReservationResults from "./SettledReservationResults";
import ProcurementBudget from "./ProcurementBudget";
import BidCompositionRecord from './BidCompositionRecord';
import {advancedMessage} from "./advanced-runtime";
import { ledgerCategoryLabel, ledgerDescription } from "./ledger-labels";
import { StandaloneSaveGuard } from "./standalone-save";
import {turnIntervalLabel} from "./turn-labels";
import { LanguageSelect, useLanguage } from "./i18n";
import MillCommitmentInput from "./MillCommitmentInput";
import {effectiveMarketRegion} from "./simulation/bc-market";
import BCMarketDesk from "./BCMarketDesk";
import TenureDesk from "./TenureDesk";
import ReciprocalDesk from './ReciprocalDesk';
import CommonValueExperiment from './CommonValueExperiment';
import TurnDurationMode from './TurnDurationMode';
import EightCompanyExercise from './EightCompanyExercise';
import PreSeasonDesk from './PreSeasonDesk';
import BuckingDesk,{BuckingSelect} from './BuckingDesk';
import LotProfitability from './LotProfitability';
import BidCompositionDesk from './BidCompositionDesk';
import RollingOptimizer from "./RollingOptimizer";
import {FacilityTransferDesk} from "./FacilityTransferDesk";
import {withIllustrativeFacilityTransfer} from "./simulation/facility-transfers";
import ReservationDesk from "./ReservationDesk";
import MillProcessingDesk from "./MillProcessingDesk";
import OfftakeDesk from "./OfftakeDesk";
import {teachingOfftakeOffers,teachingRepeatedOfftakeOffers} from "./simulation/offtake";
import RegionalCalibration from "./RegionalCalibration";
import SeasonBuilder from "./SeasonBuilder";
import NetworkDispatchLab from "./NetworkDispatchLab";
import InventoryCharts from "./InventoryCharts";
import DraftOptions from "./DraftOptions";
import CrewTimeline from './CrewTimeline';
const OperationsCharts = lazy(() => import('./OperationsCharts'));
import HarvestPlanning from './HarvestPlanning';
import Classroom from "./Classroom";
import StewardshipLab from "./StewardshipLab";
import Debrief from "./Debrief";
import TeamComparison from "./TeamComparison";
import DisruptionDesk from "./DisruptionDesk";
import { respondToDisruption, operatingRegion } from "./simulation/disruptions";
import MapWorkspace from "./MapWorkspace";
import ProcurementLab from "./ProcurementLab";
import { serializeGame } from "./simulation/save-format";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  Trees,
  LayoutDashboard,
  Map as MapIcon,
  Axe,
  Truck,
  Handshake,
  BarChart3,
  BookOpen,
  Settings,
  Play,
  Download,
  Upload,
  Sparkles,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { Game, Plan, RegionDefinition } from "./simulation/types";
import {
  advance,
  budgetCommitted,
  createGame,
  draftPlan,
  improveRoad,
  month,
  planProblems,
  purchase,
  refuse,
  stockAt,
  sum,
} from "./simulation/engine";
import { parseGame, validateRegion } from "./simulation/validation";
import { canAccess, route, weatherAt } from "./simulation/routing";
import { quebec } from "./scenarios/quebec";
import { princeGeorge } from "./scenarios/prince-george";
const builtInRegions = [quebec, princeGeorge, bcOperatingLesson];
import OperationsMap from "./maps/LazyMap";
import CollaborationLab from "./CollaborationLab";
import PlanningDesk, { LearningObjectives } from "./PlanningDesk";
import "./regional.css";
import "./operations/operations.css";
const key = "forest-commons-regional-v2";
const fmt = (n: number) => Math.round(n).toLocaleString("en-CA");
const pages = [
  ["Overview", LayoutDashboard],
  ["Planning desk", BookOpen],
  ["Forest & timber", MapIcon],
  ["Production", Axe],
  ["Transport", Truck],
  ["Commitments", BarChart3],
  ["Collaboration", Handshake],
  ["Reports", BookOpen],
  ["Classroom", Handshake],
  ["Stewardship", Trees],
  ["Scenario studio", Settings],
] as const;
function download(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob(
      [
        (value as Game).version === 2
          ? serializeGame(value as Game)
          : JSON.stringify(value, null, 2),
      ],
      { type: "application/json" },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function initial() {
  try {
    const raw = localStorage.getItem(key);
    return { game: raw ? parseGame(raw) : createGame(quebec), error: "", raw };
  } catch (e) {
    return {
      game: createGame(quebec),
      raw: null,
      error: `Saved campaign could not be restored: ${String(e)}. The original browser save has not been overwritten.`,
    };
  }
}
export default function RegionalApp() {
 const {t: tr,language}=useLanguage();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem("forest-sidebar-collapsed");
      return saved === null
        ? window.matchMedia("(max-width: 1100px)").matches
        : saved === "true";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(
        "forest-sidebar-collapsed",
        String(sidebarCollapsed),
      );
    } catch {
      /* Layout preferences must not interrupt the game. */
    }
  }, [sidebarCollapsed]);

  const [boot] = useState(initial),
    [game, setGame] = useState(boot.game),
    [campaignGeneration, setCampaignGeneration] = useState(0),
    [classroomPendingChanges, setClassroomPendingChanges] = useState(false),
    [page, setPage] = useState<string>(()=>new URLSearchParams(window.location.hash.slice(1)).has("room")?"Classroom":"Overview"),
    [selected, setSelected] = useState("Q01"),
    [notice, setNotice] = useState(boot.error),
    [savePaused, setSavePaused] = useState(!!boot.error),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [reportIndex, setReportIndex] = useState(-1),
    [confirm, setConfirm] = useState<"advance" | "new" | null>(null),
    [region, setRegion] = useState<RegionDefinition>(boot.game.region),
    [weatherId, setWeatherId] = useState(boot.game.weatherId),
    [seed, setSeed] = useState(boot.game.seed);
  const [draftReviewOpen, setDraftReviewOpen] = useState(false);
  const [showLessonWelcome, setShowLessonWelcome] = useState(!boot.raw && !boot.error);
  const navigate = (target: string) => {
    if (page === "Classroom" && target !== "Classroom" && classroomPendingChanges) {
      setNotice("Submit or discard your classroom draft, and wait for any submission to finish, before leaving this screen.");
      return;
    }
    setNotice("");
    setPage(target);
    if (window.matchMedia("(max-width: 600px)").matches) setSidebarCollapsed(true);
    // A tab starts a screen, so it must not inherit the previous screen's scroll
    // offset. Entering the map anchors its workbench instead, including when the
    // map tab is tapped while already open and nothing remounts.
    requestAnimationFrame(() => { if (!anchorWorkbench()) window.scrollTo({ top: 0 }); });
  };
  const chooseLesson = (preset: RegionDefinition) => {
    setRegion(structuredClone(preset));
    setWeatherId(Object.keys(preset.weather)[0]);
    setShowLessonWelcome(false);
    setConfirm("new");
  };
  const saveGuard = useRef(new StandaloneSaveGuard(boot.raw, !!boot.error));
  const [savePauseReason, setSavePauseReason] = useState(boot.error);
  const importSave = useRef<HTMLInputElement>(null),
    importRegion = useRef<HTMLInputElement>(null),
    dialog = useRef<HTMLDialogElement>(null);
  const standaloneControls = page !== "Classroom" && page !== "Stewardship";
  const marketRegion = effectiveMarketRegion(game);
  const r = game.region,
    done = game.week > r.weeks,
    periodLabel = (r.turnDurationWeeks ?? 1) !== 1 ? "Turn" : "Week",
    forecast = weatherAt(game, true),
    money = (n: number) => `${r.currency} ${fmt(n)}`;
  const chosen = r.stands.find((s) => s.id === selected) ?? r.stands[0],
    state = game.stands.find((s) => s.id === chosen.id)!,
    problems = done ? [] : planProblems(game),
    report =
      game.history[reportIndex < 0 ? game.history.length - 1 : reportIndex];
  useEffect(() => {
    if (savePaused) return;
    try {
      const saved = serializeGame(game);
      if (!saveGuard.current.write(localStorage, key, saved)) {
        setSavePaused(true);
        setSavePauseReason("Another tab updated the standalone save. Autosave is paused here; export this plan or reload to use the other tab’s campaign.");
        return;
      }

    } catch {
      setNotice(
        "Browser storage is full. Export your campaign to preserve progress.",
      );
    }
  }, [game, savePaused]);
  useEffect(() => {
    if (confirm) dialog.current?.showModal();
    else dialog.current?.close();
  }, [confirm]);
  const change = (next: Game) => {
    setGame(next);
  };
  const replaceCampaign = (next: Game) => {
    setCampaignGeneration(generation => generation + 1);
    saveGuard.current.replace(localStorage, key);
    setSavePaused(false);
    setSavePauseReason("");
    setGame(next);
  };
  const act = (fn: () => Game) => {
    try {
      change(fn());
      setNotice("");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    }
  };
  const updatePlan = (fn: (p: Plan) => void) => {
    const next = structuredClone(game);
    fn(next.plan);
    next.plan.ready = { purchase: false, production: false, transport: false };
    change(next);
  };
  const select = useCallback((id: string) => setSelected(id), []);
  const totalHarvest = game.history.reduce((n, h) => n + sum(h.harvested), 0),
    totalDelivered = game.history.reduce((n, h) => n + sum(h.delivered), 0),
    totalEmissions = game.history.reduce((n, h) => n + h.emissions, 0),
    roadside = game.stands.reduce((n, s) => n + sum(stockAt(game, s.id)), 0);
  const start = () => {
    try {
      validateRegion(region);
      if (!Number.isInteger(seed)) throw Error("Seed must be an integer.");
    } catch (e) {
      setNotice(String(e));
      setConfirm(null);
      return;
    }

    const next = createGame(region, weatherId, seed);
    next.previousCampaign = done
      ? {
          region: r.id,
          seed: game.seed,
          cash: game.cash,
          delivered: totalDelivered,
          emissions: totalEmissions,
        }
      : game.previousCampaign;
    replaceCampaign(next);
    setSelected(region.stands[0].id);
    setReportIndex(-1);
    setConfirm(null);
    setPage("Overview");
  };
  const file = async (
    e: React.ChangeEvent<HTMLInputElement>,
    scenario = false,
  ) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      if (scenario) {
        const next = validateRegion(JSON.parse(text));
        setRegion(next);
        setWeatherId(Object.keys(next.weather)[0]);
        setNotice(
          `Scenario ${next.name} validated. Review it in Scenario studio, then start a campaign.`,
        );
      } else {
        const next = parseGame(text);
        replaceCampaign(next);
        setSelected(next.region.stands[0].id);
        setRegion(next.region);
        setWeatherId(next.weatherId);
        setSeed(next.seed);
        setReportIndex(-1);
        setNotice("Campaign imported.");
      }
    } catch (err) {
      setNotice(String(err));
    }
    e.target.value = "";
  };
  const roleReady = (role: "purchase" | "production" | "transport") => (
    <button
      className={game.plan.ready[role] ? "ready" : ""}
      disabled={done}
      onClick={() =>
        change({
          ...game,
          plan: {
            ...game.plan,
            ready: { ...game.plan.ready, [role]: !game.plan.ready[role] },
          },
        })
      }
    >
      {tr(game.plan.ready[role] ? "✓ Ready" : "Mark ready")} · {role}
    </button>
  );
  return (
    <div
      className={`regional-app ${page === "Overview" ? "map-first" : ""} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
    >
      {!sidebarCollapsed && (
        <button
          className="rail-scrim"
          aria-label={tr("Close navigation backdrop")}
          tabIndex={-1}
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
      <aside className="rail" id="game-sidebar" aria-label={tr("Game sidebar")}>
        <button
          className="rail-close"
          onClick={() => setSidebarCollapsed(true)}
          aria-label={tr("Close navigation")}
        >
          <PanelLeftClose size={19} />
        </button>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if(page === "Classroom" && classroomPendingChanges){
              setNotice("Submit or discard your classroom draft, and wait for any submission to finish, before leaving this screen.");
              if(window.matchMedia("(max-width: 600px)").matches)setSidebarCollapsed(true);
              return;
            }
            setNotice("");
            setPage("Overview");
          }}
        >
          <span>
            <Trees size={28} />
          </span>
          <div>
            forest commons<small>{tr("OPERATIONS ARENA")}</small>
          </div>
        </a>
        <div className="district-label">
          {tr("YOUR DISTRICT")}<small>{r.name}</small>
        </div>
        <nav aria-label={tr("Main navigation")}>
          {pages.map(([name, Icon]) => (
            <button
              key={name}
              aria-label={tr(name === "Overview" ? "Map" : name)}
              title={tr(name === "Overview" ? "Map" : name)}
              className={page === name ? "active" : ""}
              onClick={() => {
                if(page === "Classroom" && name !== "Classroom" && classroomPendingChanges){
                  setNotice("Submit or discard your classroom draft, and wait for any submission to finish, before leaving this screen.");
              if(window.matchMedia("(max-width: 600px)").matches)setSidebarCollapsed(true);
                  return;
                }
                setNotice("");
                setPage(name);
                if (window.matchMedia("(max-width: 600px)").matches)
                  setSidebarCollapsed(true);
              }}
            >
              <Icon size={19} />
              <span className="nav-label">
                {tr(name === "Overview" ? "Map" : name)}
              </span>
              {page === name && <ChevronRight size={16} />}
            </button>
          ))}
        </nav>
        <div className="rail-bottom">
          <span className="live-dot" />{" "}
          {tr(savePaused ? "Save paused" : "Saved on this device")}
          <p>
            {tr("One forest. Many decisions.")}
            <br />{tr("A shared future.")}
          </p>
        </div>
      </aside>
      <main key={campaignGeneration}>
        <header className="topbar unified-toolbar">
          <LanguageSelect />
          <button
            className="sidebar-toggle"
            aria-controls="game-sidebar"
            aria-expanded={!sidebarCollapsed}
            aria-label={
              sidebarCollapsed ? tr("Expand sidebar") : tr("Collapse sidebar")
            }
            title={sidebarCollapsed ? tr("Expand sidebar") : tr("Collapse sidebar")}
            onClick={() => setSidebarCollapsed((v) => !v)}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={20} />
            ) : (
              <PanelLeftClose size={20} />
            )}
          </button>
          <div className="toolbar-context">
            <strong className="toolbar-region">
              {standaloneControls
                ? r.name
                : page === "Classroom"
                  ? tr("Classroom")
                  : tr("Forest stewardship")}
            </strong>
            <div className="toolbar-progress">
              {standaloneControls ? (
                <>
                  <span className="week-badge">
                    {done
                      ? tr("Season complete")
                      : `${tr(periodLabel)} ${game.week} / ${r.weeks}${(r.turnDurationWeeks??1)!==1?` · ${turnIntervalLabel(r.turnDurationWeeks!,language)}`:""}`}
                  </span>
                  <span className="toolbar-month">{tr("Month")} {month(game) + 1}</span>
                  <span className="toolbar-stat">{money(game.cash)}</span>
                  <span className="toolbar-stat">
                    {fmt(totalDelivered)} {tr("m³ delivered")}
                  </span>
                </>
              ) : (
                <span>
                  {page === "Classroom"
                    ? tr("Shared campaign · use the room controls below")
                    : tr("Annual planning · use the exercise controls below")}
                </span>
              )}
            </div>
          </div>
          {standaloneControls && (
            <div className="toolbar-actions">
              <button
                disabled={done}
                onClick={() => setDraftReviewOpen(true)}
              >
                <Sparkles size={16} />
                <span>{tr("Draft plan")}</span>
              </button>
              <button
                className="primary"
                disabled={done}
                onClick={() => setConfirm("advance")}
              >
                <Play size={16} />
                <span>{tr("Run")} {tr(periodLabel).toLowerCase()} {Math.min(game.week, r.weeks)}</span>
              </button>
              <div className="save-actions">
                <button
                  className="icon-action"
                  aria-label={tr("Export save")}
                  title={tr("Export save")}
                  onClick={() =>
                    download(`forest-campaign-week-${game.week}.json`, game)
                  }
                >
                  <Download size={17} />
                </button>
                <button
                  className="icon-action"
                  aria-label={tr("Import save")}
                  title={tr("Import save")}
                  onClick={() => importSave.current?.click()}
                >
                  <Upload size={17} />
                </button>
              </div>
            </div>
          )}
          <input
            hidden
            ref={importSave}
            type="file"
            accept=".json"
            onChange={(e) => void file(e)}
          />
        </header>
        <div className="workspace">
          <ConnectivityNotice />
          {showLessonWelcome && page === "Overview" && <LessonLauncher
            regions={[bcOperatingLesson, princeGeorge, quebec]} welcome
            onChoose={chooseLesson}
            onDismiss={() => { setShowLessonWelcome(false); requestAnimationFrame(anchorWorkbench); }} />}
          {page === "Overview" && <OperationsStatus game={game} onNavigate={navigate} onSelect={select} />}
          {page === "Planning desk" && <section className="panel"><TurnReview game={game} />
            <button className="primary" disabled={done} onClick={() => setConfirm("advance")}>
              {language === "fr" ? "Examiner et exécuter le tour" : "Review and run turn"}
            </button></section>}
          {page === "Reports" && <DecisionDebrief game={game}
            onSelect={id => { select(id); navigate("Overview"); }} />}
          {page !== "Overview" && (
            <div className="page-heading">
              <h1>{tr(page)}</h1>
            </div>
          )}
          {savePaused && savePauseReason && <div className="notice" role="alert">{tr(savePauseReason)}</div>}
          {notice && (
            <div className="notice" role="status">
              {tr(notice)}
              <button
                onClick={() => setNotice("")}
                aria-label={tr("Dismiss notification")}
              >
                ×
              </button>
            </div>
          )}
          {game.cash < 0 && !done && (
            <div className="notice">
              {language === "fr" ? "La trésorerie est négative. Les opérations existantes peuvent continuer avec un découvert pédagogique; les frais et intérêts configurés restent applicables." : "Operating cash is negative. Existing operations can continue on an educational overdraft; configured costs and interest still apply."} <ProcurementBudget game={game}/>
            </div>
          )}
          {!["Classroom", "Stewardship"].includes(page) && <>
          <div className="metric-grid">
            <article>
              <small>{tr("Operating cash")}</small>
              <strong>{money(game.cash)}</strong>
              <span>{money(budgetCommitted(game))} {tr("committed to bids")}</span>
              <ProcurementBudget game={game}/>
            </article>
            <article>
              <small>{tr("Timber delivered")}</small>
              <strong>
                {fmt(totalDelivered)} <em>m³</em>
              </strong>
              <span>{fmt(totalHarvest)} {tr("m³ harvested")}</span>
            </article>
            <article>
              <small>{tr("Roadside inventory")}</small>
              <strong>
                {fmt(roadside)} <em>m³</em>
              </strong>
              <span>{tr("Age and quality affect future value")}</span>
            </article>
            <article>
              <small>{tr("Seasonal outlook")}</small>
              <strong>{tr(r.weather[game.weatherId].name)}</strong>
              <span>
                {r.zones.map((z) => `${tr(z.name)}: ${tr(forecast[z.id])}`).join(" · ")}
              </span>
            </article>
          </div>
          </>}
          {page === "Overview" && game.region.bcTenure && <section className="panel"><p>{tr("BC secured timber still needs active harvesting and road authorizations. Check applications, renewals, stumpage and obligations before assigning crews or trucks.")}</p><button onClick={()=>setPage("Forest & timber")}>{tr("Review selected lot tenure and permits")}</button></section>}
          {page === "Overview" && (
            <MapWorkspace
              key={JSON.stringify([r.id,r.stands.map(s=>s.id),r.crews.map(c=>c.id),r.trucks.map(t=>t.id),r.mills.map(m=>m.id),r.products.map(p=>p.id),r.zones.map(z=>z.id)])}
              game={game}
              selected={chosen.id}
              onSelect={select}
              onChange={change}
              onNavigate={navigate}
            />
          )}
          {page === "Forest & timber" && (
            <>
              <div className="split">
                <section className="panel map-panel">
                  <OperationsMap
                    game={game}
                    selected={chosen.id}
                    onSelect={select}
                  />
                </section>
                <section className="panel">
                  <span className="eyebrow">{tr("SUPPLY AREA")} {chosen.id}</span>
                  <h2>{chosen.name}</h2>
                  {chosen.sourceNote && <p className="muted">{chosen.sourceNote}</p>}
                  <p>
                    {chosen.hectares} {tr("hectares ·")} {chosen.zone} {tr("sector")}
                  </p>
                  <dl className="facts">
                    <dt>{tr("Standing")}</dt>
                    <dd>{fmt(state.remaining)} m³</dd>
                    <dt>{tr("Roadside")}</dt>
                    <dd>{fmt(sum(stockAt(game, chosen.id)))} m³</dd>
                    <dt>{tr("Ownership")}</dt>
                    <dd>
                      {state.owned
                        ? tr("Secured")
                        : state.refused
                          ? tr("Refused")
                          : chosen.supply}
                    </dd>
                    <dt>{tr("Production")}</dt>
                    <dd>{chosen.productivity} {tr("m³/hour")}</dd>
                    <dt>{tr("Terrain / forecast")}</dt>
                    <dd>
                      {tr("Class")} {chosen.terrain} /{" "}
                      {canAccess(chosen.terrain, forecast[chosen.zone])
                        ? tr("open")
                        : tr("closed")}
                    </dd>
                  </dl>
                  <div className="assortment-bar">
                    {Object.entries(chosen.mix).map(([p, n]) => (
                      <span
                        key={p}
                        style={{
                          width: `${n * 100}%`,
                          background: r.products.find((x) => x.id === p)?.color,
                        }}
                        title={`${p}: ${n * 100}%`}
                      />
                    ))}
                  </div>
                  {r.products.map((p) => (
                    <p className="small" key={p.id}>
                      {tr(p.name)}: {fmt((chosen.mix[p.id] ?? 0) * 100)}{tr("% · stock")}{" "}
                      {fmt(stockAt(game, chosen.id)[p.id] ?? 0)} m³
                    </p>
                  ))}
                  {!done &&
                    chosen.supply === "private" &&
                    !state.owned &&
                    !state.refused && (
                      <button
                        className="primary wide"
                        onClick={() => act(() => purchase(game, chosen.id))}
                      >
                        {!game.region.bcTenure && game.region.economy.timberPayment === "harvest-royalty" ? <>{tr("Acquire lot · pay on harvest ·")} {game.region.currency} {(chosen.askingPrice / chosen.volume).toFixed(2)}{tr("/m³ harvested")}</> : <>{tr("Buy private lot ·")} {money(chosen.askingPrice)}</>}
                      </button>
                    )}
                  {!done &&
                    chosen.supply === "auction" &&
                    !state.owned &&
                    !state.refused && (
                      <label>
                        {tr("Sealed bid · auction")} {tr(periodLabel).toLowerCase()} {chosen.auctionWeek}
                        <input
                          aria-label={`${tr("Bid for")} ${chosen.id}`}
                          type="number"
                          min="0"
                          step="100"
                          disabled={chosen.auctionWeek !== game.week}
                          value={game.plan.bids[chosen.id] ?? 0}
                          onChange={(e) =>
                            updatePlan((p) => {
                              const n = Number(e.target.value);
                              if (n > 0) p.bids[chosen.id] = n;
                              else delete p.bids[chosen.id];
                            })
                          }
                        />
                        <small>
                          {tr("Indicative value")} {money(chosen.askingPrice)}{tr(". Clear to\n                          cancel. Successful lots available next week.")}
                        </small>
                      </label>
                    )}
                  {!done &&
                    state.owned &&
                    chosen.supply === "auction" &&
                    state.purchaseWeek != null && game.week-state.purchaseWeek>=1 && game.week-state.purchaseWeek<=1/(r.turnDurationWeeks??1) &&
                    state.harvested === 0 && (
                      <button
                        onClick={() => act(() => refuse(game, chosen.id))}
                      >
                        {tr("Refuse lot · retain")} {r.economy.refusalPercent * 100}{tr("%\n                        guarantee")}
                      </button>
                    )}
                  <details>
                    <summary>{tr("Inventory batches and freshness")}</summary>
                    {state.stock.length ? (
                      state.stock.map((b, i) => (
                        <p key={i}>
                          {r.products.find((p) => p.id === b.product)?.name}:{" "}
                          {fmt(b.volume)} {tr("m³ · age")} {(game.week - b.week)*(r.turnDurationWeeks??1)} {tr("weeks ·\n                          quality")} {fmt(b.quality * 100)}%
                        </p>
                      ))
                    ) : (
                      <p>{tr("No roadside stock in this area.")}</p>
                    )}
                  </details>
                  {r.roads.edges
                    .filter((e) => e.to === chosen.node && e.bearing > 1)
                    .map((e) => (
                      <button
                        className="wide"
                        key={e.id}
                        disabled={done || game.improvedRoads.includes(e.id)}
                        onClick={() => act(() => improveRoad(game, e.id))}
                      >
                        {game.improvedRoads.includes(e.id)
                          ? tr("\u2713 All-season road")
                          : `${tr("Upgrade access")} · ${money(e.km * r.economy.roadUpgradePerKm)}`}
                      </button>
                    ))}
                </section>
              </div>
              <section className="panel">
                <div className="section-heading">
                  <h2>{tr("Supply inventory")}</h2>
                  <div className="button-row">
                    <input
                      aria-label={tr("Search supply areas")}
                      placeholder={tr("Search supply areas…")}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <select
                      aria-label={tr("Supply filter")}
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      {["all", "owned", "private", "auction", "protected"].map(
                        (v) => (
                          <option key={v}>{v}</option>
                        ),
                      )}
                    </select>
                    {game.roleMode && roleReady("purchase")}
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{tr("Area")}</th>
                        <th>{tr("Supply")}</th>
                        <th>{tr("Standing m³")}</th>
                        <th>{tr("Roadside m³")}</th>
                        <th>{tr("Forecast access")}</th>
                        <th>{tr("Availability")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.stands
                        .filter((s) =>
                          `${s.id} ${s.name}`
                            .toLowerCase()
                            .includes(search.toLowerCase()),
                        )
                        .filter(
                          (s) =>
                            filter === "all" ||
                            (filter === "owned"
                              ? game.stands.find((t) => t.id === s.id)?.owned
                              : s.supply === filter),
                        )
                        .map((s) => {
                          const st = game.stands.find((t) => t.id === s.id)!;
                          return (
                            <tr
                              key={s.id}
                              className={chosen.id === s.id ? "selected" : ""}
                            >
                              <td>
                                <button
                                  className="text-button"
                                  onClick={() => setSelected(s.id)}
                                >
                                  {s.id} · {s.name}
                                </button>
                              </td>
                              <td>{tr(st.owned ? "Owned" : s.supply)}</td>
                              <td>{fmt(st.remaining)}</td>
                              <td>{fmt(sum(stockAt(game, s.id)))}</td>
                              <td>
                                {canAccess(s.terrain, forecast[s.zone])
                                  ? tr("Open terrain")
                                  : tr("Terrain closed")}
                              </td>
                              <td>
                                {s.supply === "auction"
                                  ? `${tr("Auction")} ${tr(periodLabel).toLowerCase()} ${s.auctionWeek}`
                                  : s.supply === "protected"
                                    ? tr("Conservation")
                                    : tr("Now")}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
          {page === "Forest & timber" && (
            <ProcurementLab
              key={chosen.id}
              game={game}
              standId={chosen.id}
              onBid={(amount) =>
                updatePlan((p) => {
                  p.bids[chosen.id] = amount;
                })
              }
            />
          )}
          {["Forest & timber","Planning desk","Reports"].includes(page) && <BCMarketDesk game={game}/>}
          {["Forest & timber","Planning desk","Production","Transport","Reports"].includes(page) && <TenureDesk key={`tenure-${game.region.id}`} game={game} standId={page === "Forest & timber" ? chosen.id : undefined} onChange={change} />}
          {page === "Forest & timber" && <><CommonValueExperiment/><BidCompositionDesk game={game} standId={chosen.id} onChange={change}/><BuckingDesk game={game} standId={chosen.id}/></>}
          {(page === "Planning desk"||page === "Production"||page === "Transport")&&<PreSeasonDesk game={game} onChange={change}/>}
          {page === "Reports"&&<LotProfitability game={game}/>}
          {page === "Classroom" && <Classroom region={r} onPendingChanges={setClassroomPendingChanges} />}
          {page === "Transport" && !!game.region.facilityTransfers?.length && <FacilityTransferDesk game={game} onChange={change}/>}
          {page === "Production" && <ReservationDesk game={game} onChange={change}/>}
          {(page === "Production" || page === "Transport") && <MillProcessingDesk key={`processing-${game.region.id}`} game={game} onChange={change}/>}
          {(page === "Transport" || page === "Commitments") && <OfftakeDesk key={`offtake-${game.region.id}`} game={game} onChange={change}/>}
          {page === "Stewardship" && (
            <><SeasonBuilder game={game} onChange={change}/><StewardshipLab game={game} onChange={change} /></>
          )}
          {page === "Planning desk" && (
            <>
              <RollingOptimizer game={game} onChange={change}/>
              <DisruptionDesk
                game={game}
                onRespond={(id, action) =>
                  act(() => respondToDisruption(game, id, action))
                }
              />
              <PlanningDesk
                game={game}
                onNavigate={setPage}
                onChange={change}
              />
            </>
          )}
          {page === "Production" && (
            <>
              <DraftOptions key={game.region.id} game={game} onDraft={options=>act(()=>draftPlan(game,options))}/>
              <CrewTimeline game={game} onChange={change}/>
              <HarvestPlanning game={game} onChange={change} onInspect={id=>{select(id);setPage("Overview");}}/>
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>{tr("Crew queues")}</h2>
                    <p>
                      {tr("Order matters. Hours include relocation; unfinished areas\n                      remain in the queue.")}
                    </p>
                  </div>
                  {game.roleMode && roleReady("production")}
                </div>
                <label>
                  {tr("Standing retention:")} {fmt(game.plan.retention * 100)}%
                  <input
                    type="range"
                    min={r.ecology.minimumRetention}
                    max="0.8"
                    step="0.01"
                    disabled={done}
                    value={game.plan.retention}
                    onChange={(e) =>
                      updatePlan((p) => {
                        p.retention = Number(e.target.value);
                      })
                    }
                  />
                </label>
                <div className="resource-grid">
                  {r.crews.map((c) => (
                    <article className="resource-card" key={c.id}>
                      <div className="section-heading">
                        <h3>{c.name}</h3>
                        <span>{c.hours} h/{tr(periodLabel).toLowerCase()}</span>
                      </div>
                      <p className="muted">
                        {tr("At")} {game.crewPositions[c.id]} ·{" "}
                        {fmt(
                          game.plan.crews[c.id].reduce(
                            (n, o) => n + o.hours,
                            0,
                          ),
                        )}{" "}
                        {tr("h scheduled")}
                      </p>
                      {game.plan.crews[c.id].map((o, i) => (
                        <div className="queue-order" key={i}>
                          <span>{i + 1}</span>
                          <label>
                            {tr("Area")}
                            <select
                              disabled={done}
                              value={o.stand}
                              onChange={(e) =>
                                updatePlan((p) => {
                                  p.crews[c.id][i].stand = e.target.value;
                                })
                              }
                            >
                              {r.stands
                                .filter(
                                  (s) =>
                                    game.stands.find((t) => t.id === s.id)
                                      ?.owned,
                                )
                                .map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.id} · {s.name}
                                  </option>
                                ))}
                            </select>
                          </label>
                          <BuckingSelect game={game} crew={c.id} index={i} onChange={change}/>
                          <label>
                            {tr("Treatment")}
                            <select
                              aria-label={`${c.name} ${tr("stop")} ${i + 1} ${tr("treatment")}`}
                              disabled={done}
                              value={o.treatment ?? "final"}
                              onChange={(e) =>
                                updatePlan((p) => {
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
                                  {t.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            {tr("Hours")}
                            <input
                              disabled={done}
                              type="number"
                              min="1"
                              max={c.hours}
                              value={o.hours}
                              onChange={(e) =>
                                updatePlan((p) => {
                                  p.crews[c.id][i].hours = Number(
                                    e.target.value,
                                  );
                                })
                              }
                            />
                          </label>
                          <button
                            disabled={done}
                            aria-label={`${tr("Remove")} ${c.id} ${tr("order")} ${i + 1}`}
                            onClick={() =>
                              updatePlan((p) => {
                                p.crews[c.id].splice(i, 1);
                              })
                            }
                          >
                            ×
                          </button>
                          {i > 0 && (
                            <button
                              disabled={done}
                              aria-label={`${tr("Move")} ${c.id} ${tr("order")} ${i + 1} ${tr("up")}`}
                              onClick={() =>
                                updatePlan((p) => {
                                  [p.crews[c.id][i - 1], p.crews[c.id][i]] = [
                                    p.crews[c.id][i],
                                    p.crews[c.id][i - 1],
                                  ];
                                })
                              }
                            >
                              ↑
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        disabled={done}
                        onClick={() =>
                          updatePlan((p) => {
                            const s = game.stands.find(
                              (s) => s.owned && s.remaining > 0,
                            );
                            if (s)
                              p.crews[c.id].push({
                                stand: s.id,
                                hours: Math.max(
                                  1,
                                  c.hours -
                                    p.crews[c.id].reduce(
                                      (n, o) => n + o.hours,
                                      0,
                                    ),
                                ),
                              });
                          })
                        }
                      >
                        {tr("+ Add stop")}
                      </button>
                    </article>
                  ))}
                </div>
              </section>
              <section className="panel map-panel">
                <OperationsMap
                  game={game}
                  selected={chosen.id}
                  onSelect={select}
                />
              </section>
            </>
          )}
          {page === "Transport" && (
            <>
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>{tr("Truck dispatch")}</h2>
                    <p>
                      {tr("Orders run in sequence against shared roadside stock,\n                      including this week’s production. Sales stop at monthly\n                      mill demand.")}
                    </p>
                  </div>
                  {game.roleMode && roleReady("transport")}
                </div>
                <div className="resource-grid">
                  {r.trucks.map((t) => (
                    <article className="resource-card" key={t.id}>
                      <div className="section-heading">
                        <h3>{t.name}</h3>
                        <span>
                          {t.payload} m³ · {t.hours} h/{tr(periodLabel).toLowerCase()}
                        </span>
                      </div>
                      <p className="muted">
                        {tr("At")} {game.truckPositions[t.id]} ·{" "}
                        {t.loadingHours + t.unloadingHours} {tr("h handling/load")}
                      </p>
                      {game.plan.trucks[t.id].map((o, i) => {
                        const d = r.stands.find((s) => s.id === o.stand)!,
                          m = r.mills.find((m) => m.id === o.mill)!,
                          path = route(
                            operatingRegion(game),
                            d.node,
                            m.node,
                            forecast,
                            game.improvedRoads,
                          );
                        return (
                          <div className="haul-order" key={i}>
                            {o.offtake && <strong>{tr("Partner contract ·")} {o.offtake}</strong>}
                            {o.spot && <strong>{tr("Spot sale · no monthly commitment credit")}</strong>}
                            {o.process && <strong>{tr("Mill inventory intake · no log sales revenue")}</strong>}
                            <div className="form-row">
                              <label>
                                {tr("Source")}
                                <select
                                  disabled={done}
                                  value={o.stand}
                                  onChange={(e) =>
                                    updatePlan((p) => {
                                      p.trucks[t.id][i].stand = e.target.value;
                                    })
                                  }
                                >
                                  {r.stands
                                    .filter(
                                      (s) =>
                                        game.stands.find((t) => t.id === s.id)
                                          ?.owned,
                                    )
                                    .map((s) => (
                                      <option key={s.id} value={s.id}>
                                        {s.id} · {s.name}
                                      </option>
                                    ))}
                                </select>
                              </label>
                              <label>
                                {tr("Mill")}
                                <select
                                  disabled={done || !!o.offtake || !!o.spot || !!o.process}
                                  value={o.mill}
                                  onChange={(e) =>
                                    updatePlan((p) => {
                                      const order = p.trucks[t.id][i];
                                      order.mill = e.target.value;
                                      const mill = r.mills.find(
                                        (m) => m.id === order.mill,
                                      )!;
                                      if (!(order.product in mill.prices))
                                        order.product = Object.keys(
                                          mill.prices,
                                        )[0];
                                    })
                                  }
                                >
                                  {r.mills.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                            <div className="form-row">
                              <label>
                                {tr("Assortment")}
                                <select
                                  disabled={done || !!o.offtake || !!o.spot || !!o.process}
                                  value={o.product}
                                  onChange={(e) =>
                                    updatePlan((p) => {
                                      p.trucks[t.id][i].product =
                                        e.target.value;
                                    })
                                  }
                                >
                                  {r.products
                                    .filter((p) => p.id in m.prices)
                                    .map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {tr(p.name)}
                                      </option>
                                    ))}
                                </select>
                              </label>
                              <label>
                                {tr("Loads")}
                                <input
                                  disabled={done}
                                  type="number"
                                  min="1"
                                  max="1000"
                                  value={o.loads}
                                  onChange={(e) =>
                                    updatePlan((p) => {
                                      p.trucks[t.id][i].loads = Number(
                                        e.target.value,
                                      );
                                    })
                                  }
                                />
                              </label>
                              <button
                                disabled={done}
                                aria-label={`${tr("Remove")} ${t.id} ${tr("haul")} ${i + 1}`}
                                onClick={() =>
                                  updatePlan((p) => {
                                    p.trucks[t.id].splice(i, 1);
                                  })
                                }
                              >
                                ×
                              </button>
                              {i > 0 && (
                                <button
                                  disabled={done}
                                  aria-label={`${tr("Move")} ${t.id} ${tr("haul")} ${i + 1} ${tr("up")}`}
                                  onClick={() =>
                                    updatePlan((p) => {
                                      [
                                        p.trucks[t.id][i - 1],
                                        p.trucks[t.id][i],
                                      ] = [
                                        p.trucks[t.id][i],
                                        p.trucks[t.id][i - 1],
                                      ];
                                    })
                                  }
                                >
                                  ↑
                                </button>
                              )}
                            </div>
                            <label>
                              {tr("Partner freight en route")}
                              <select
                                aria-label={`${t.name} ${tr("haul")} ${i + 1} ${tr("partner job")}`}
                                disabled={done || !game.cooperation.pooling}
                                value={o.partnerJob ?? ""}
                                onChange={(e) =>
                                  updatePlan((p) => {
                                    p.trucks[t.id][i].partnerJob =
                                      e.target.value || undefined;
                                  })
                                }
                              >
                                <option value="">{tr("Own timber only")}</option>
                                {(r.partnerJobs ?? []).map((j) => (
                                  <option key={j.id} value={j.id}>
                                    {j.id} · {j.company} ·{" "}
                                    {fmt(
                                      j.volume -
                                        (game.partnerDelivered?.[j.id] ?? 0),
                                    )}{" "}
                                    {tr("m³ remaining")}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <small>
                              {path
                                ? `${fmt(path.km)} ${tr("km loaded")} · ${path.hours.toFixed(1)} ${tr("h one way")}`
                                : tr("No open forecast route")}{" "}
                              {tr("· current stock")}{" "}
                              {fmt(stockAt(game, o.stand)[o.product] ?? 0)} m³
                            </small>
                          </div>
                        );
                      })}
                      <button
                        disabled={done}
                        onClick={() =>
                          updatePlan((p) => {
                            const s = game.stands.find((s) => s.owned);
                            if (!s) return;
                            const m = r.mills[0];
                            p.trucks[t.id].push({
                              stand: s.id,
                              mill: m.id,
                              product: Object.keys(m.prices)[0],
                              loads: 5,
                            });
                          })
                        }
                      >
                        {tr("+ Add haul order")}
                      </button>
                    </article>
                  ))}
                </div>
              </section>
              <section className="panel map-panel">
                <OperationsMap
                  game={game}
                  selected={chosen.id}
                  onSelect={select}
                />
              </section>
            </>
          )}
          {page === "Commitments" && (
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>{tr("Month")} {month(game) + 1} {tr("· mill commitments")}</h2>
                  <p>
                    {tr("Commitments lock after the first week of each month. Lower\n                    targets reduce bonuses; demand remains the sales ceiling.")}
                  </p>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{tr("Mill / assortment")}</th>
                      <th>{tr("Demand m³")}</th>
                      <th>{tr("Commitment m³")}</th>
                      <th>{tr("Delivered this month")}</th>
                      <th>{tr("Remaining to target")}</th>
                      <th>{tr("Sale price / m³")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketRegion.mills.flatMap((m) =>
                      Object.entries(m.demand[month(game)]).map(([p, n]) => (
                        <tr key={`${m.id}-${p}`}>
                          <td>
                            {m.name}
                            <small>
                              {r.products.find((x) => x.id === p)?.name}
                            </small>
                          </td>
                          <td>{fmt(n)}</td>
                          <td>
                            <MillCommitmentInput game={game} millId={m.id} product={p} value={game.plan.targets[m.id]?.[p]??0} onChange={value=>updatePlan(plan=>{plan.targets[m.id][p]=value;})}/>
                          </td>
                          <td>{fmt(game.deliveries[m.id]?.[p] ?? 0)}</td>
                          <td>
                            {fmt(
                              Math.max(
                                0,
                                (game.plan.targets[m.id]?.[p] ?? 0) -
                                  (game.deliveries[m.id]?.[p] ?? 0),
                              ),
                            )}
                          </td>
                          <td>{money(m.prices[p])}</td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </div>
              <p className="muted">
                {tr("At month end: ±")}{r.economy.tolerance * 100}{tr("% earns")}{" "}
                {money(r.economy.bonusPerM3)}{tr("/m³ on fulfilled commitment.\n                Shortfalls below the tolerance incur")}{" "}
                {money(r.economy.shortfallPerM3)}{tr("/m³. Overdelivery earns sales\n                revenue but no commitment bonus beyond the tolerance.")}
              </p>
            </section>
          )}
          {page === "Collaboration"&&<EightCompanyExercise/>}
          {page === "Collaboration" && (
            <><ReciprocalDesk key={`reciprocal-${game.region.id}`} game={game} onChange={change}/><CollaborationLab game={game} onChange={change} /><NetworkDispatchLab key={`network-${game.region.id}`} game={game}/></>
          )}
          {(page === "Reports" || page === "Planning desk") && (
            <><Debrief game={game} onNavigate={setPage} />
            <TeamComparison game={game} /></>
          )}
          {page === "Reports" && (
            <>
              <Suspense fallback={<p>{tr("Loading operating charts…")}</p>}><OperationsCharts key={game.region.id} game={game}/></Suspense>
              <InventoryCharts game={game}/>
              {done && <LearningObjectives game={game} />}
              {done && (
                <Scorecard
                  game={game}
                  comparison={game.previousCampaign ?? null}
                />
              )}
              <section className="panel">
                <div className="section-heading">
                  <h2>{tr("Operating record")}</h2>
                  <select
                    aria-label={tr("Report turn")}
                    value={reportIndex}
                    onChange={(e) => setReportIndex(Number(e.target.value))}
                  >
                    <option value={-1}>{tr("Latest completed turn")}</option>
                    {game.history.map((h, i) => (
                      <option key={h.week} value={i}>
                        {tr(periodLabel)} {h.week}
                      </option>
                    ))}
                  </select>
                </div>
                {report ? (
                  <>
                    {!!Object.keys(report.plan.bidComposition??{}).length&&<details><summary>{tr("Past bid breakdowns ·")} {tr(periodLabel)} {report.week}</summary>{Object.keys(report.plan.bidComposition??{}).map(id=><BidCompositionRecord key={id} region={r} plan={report.plan} standId={id}/>)}</details>}
                    <div className="metric-grid">
                      <article>
                        <small>{tr("Harvested")}</small>
                        <strong>{fmt(sum(report.harvested))} m³</strong>
                      </article>
                      <article>
                        <small>{tr("Delivered")}</small>
                        <strong>{fmt(sum(report.delivered))} m³</strong>
                      </article>
                      <article>
                        <small>{tr("Degraded / wasted")}</small>
                        <strong>
                          {fmt(report.degraded)} / {fmt(report.waste)} m³
                        </strong>
                      </article>
                      <article>
                        <small>{tr("Operating emissions")}</small>
                        <strong>
                          {(report.emissions / 1000).toFixed(1)} t CO₂e
                        </strong>
                      </article>
                    </div>
                    <p>
                      {tr("Actual conditions:")}{" "}
                      {r.zones
                        .map((z) => `${tr(z.name)}: ${tr(report.weather[z.id])}`)
                        .join(" · ")}
                      {tr(". Targets met:")} {report.targetHits}/{report.targetChecks}.
                    </p>
                    <OperationsMap
                      game={game}
                      selected={chosen.id}
                      onSelect={select}
                      replay={
                        reportIndex < 0 ? game.history.length - 1 : reportIndex
                      }
                    />
                    <SettledReservationResults report={report} region={r}/>
                    <div className="two-cols">
                      <div>
                        <h3>{tr("Resource utilization")}</h3>
                        {r.crews.map((c) => (
                          <Meter
                            key={c.id}
                            label={c.name}
                            value={report.crewHours[c.id] ?? 0}
                            max={c.hours}
                            unit="h"
                          />
                        ))}
                        {r.trucks.map((t) => (
                          <Meter
                            key={t.id}
                            label={t.name}
                            value={report.truckHours[t.id] ?? 0}
                            max={t.hours}
                            unit="h"
                          />
                        ))}
                      </div>
                      <div>
                        <h3>{tr("Dispatch notes")}</h3>
                        {report.messages.length ? (
                          report.messages.map((m, i) => (
                            <p className="report-note" key={i}>
                              {advancedMessage(m,tr)}
                            </p>
                          ))
                        ) : (
                          <p>
                            {tr("All scheduled operations completed without\n                            exceptions.")}
                          </p>
                        )}
                      </div>
                    </div>
                    <details>
                      <summary>
                        {tr("Financial ledger ·")} {report.ledger.length} {tr("entries ·")}{" "}
                        {money(report.ledger.reduce((n, e) => n + e.amount, 0))}{" "}
                        {tr("net")}
                      </summary>
                      <div className="table-wrap" tabIndex={0} role="region" aria-label={language === "fr" ? "Registre financier défilant" : "Scrollable financial ledger"}>
                        <table>
                          <thead>
                            <tr>
                              <th>{tr("Category")}</th>
                              <th>{tr("Entry")}</th>
                              <th>{tr("Cash movement")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.ledger.map((e, i) => (
                              <tr key={i}>
                                <td>{tr(ledgerCategoryLabel(e.category))}</td>
                                <td>{ledgerDescription(e, game.region, tr)}</td>
                                <td
                                  className={
                                    e.amount >= 0 ? "positive" : "negative"
                                  }
                                >
                                  {money(e.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  </>
                ) : (
                  <p>
                    {tr("Run the first week to see actual routes, inventory changes\n                    and financial results.")}
                  </p>
                )}
              </section>
              <section className="panel">
                <h2>{tr("Campaign history")}</h2>
                <div className="table-wrap" tabIndex={0} role="region" aria-label={tr("Campaign history")}>
                  <table>
                    <thead>
                      <tr>
                        <th>{tr(periodLabel)}</th>
                        <th>{tr("Harvest m³")}</th>
                        <th>{tr("Delivery m³")}</th>
                        <th>{tr("Cash")}</th>
                        <th>{tr("CO₂e tonnes")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {game.history.map((h, i) => (
                        <tr key={h.week}>
                          <td>
                            <button
                              className="text-button"
                              onClick={() => setReportIndex(i)}
                            >
                              {tr(periodLabel)} {h.week}
                            </button>
                          </td>
                          <td>{fmt(sum(h.harvested))}</td>
                          <td>{fmt(sum(h.delivered))}</td>
                          <td>{money(h.cash)}</td>
                          <td>{(h.emissions / 1000).toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
          {page === "Scenario studio" && (
            <>
              <LessonLauncher regions={[bcOperatingLesson, princeGeorge, quebec]} onChoose={chooseLesson} />
              <TurnDurationMode region={region} onChange={setRegion}/>
              <RegionalCalibration key={region.id} region={region} onChange={setRegion} />
              <section className="panel">
                <h2>{tr("Regional scenario studio")}</h2>
                <p><strong>{tr("Active campaign:")}</strong> {game.region.name}. <strong>{tr("Studio selection:")}</strong> {region.name}{tr(". Changes here apply only when you start a new campaign.")}</p>
                <p>
                  {tr("The operating rules read a validated region package: road\n                  graph, assortments, supply areas, mills, fleets, weather and\n                  economics. Québec and the Prince George FSR pilot use distinct\n                  regional geography with the same operating engine.")}
                </p>
                <button onClick={()=>{setRegion(structuredClone(princeGeorge));setWeatherId("normal");}}>{tr("Load latest Prince George preset")}</button>
                <div className="form-row">
                  <label>
                    {tr("Scenario")}
                    <select
                      value={region.id}
                      onChange={(e) => {
                        const preset = builtInRegions.find(r => r.id === e.target.value);
                        if (!preset) return;
                        setRegion(structuredClone(preset));
                        setWeatherId("normal");
                      }}
                    >
                      <option value={region.id}>{region.name}</option>
                      {builtInRegions.filter(r => r.id !== region.id).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </label>
                  <label>
                    {tr("Weather schedule")}
                    <select
                      value={weatherId}
                      onChange={(e) => setWeatherId(e.target.value)}
                    >
                      {Object.entries(region.weather).map(([id, w]) => (
                        <option key={id} value={id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {tr("Auction seed")}
                    <input
                      type="number"
                      value={seed}
                      onChange={(e) =>
                        setSeed(Math.trunc(Number(e.target.value)))
                      }
                    />
                  </label>
                  <label>
                    {tr("Starting cash")}
                    <input
                      type="number"
                      min="0"
                      value={region.economy.startingCash}
                      onChange={(e) =>
                        setRegion({
                          ...region,
                          economy: {
                            ...region.economy,
                            startingCash: Math.max(0, Number(e.target.value)),
                          },
                        })
                      }
                    />
                  </label>
                </div>
                <div className="form-grid">
                  {([['procurementCreditLimit', 'Procurement credit limit'], ['annualDebtRate', 'Effective annual debt rate (decimal; 0.1 = 10%)'], ['terminalStandingAllowanceM3', 'Free closing purchased timber (m³)'], ['terminalRoadsideAllowanceM3', 'Free closing roadside stock (m³)']] as const).map(([key, label]) => <label key={key}>{tr(label)}<input type="number" min="0" step={key === 'annualDebtRate' ? '0.01' : '1'} value={region.economy[key] ?? 0} onChange={e => setRegion({...region, economy: {...region.economy, [key]: Math.max(0, Number(e.target.value))}})} /></label>)}
                </div>
                <p className="muted">{tr("Procurement credit allows purchases and auctions to borrow up to the limit; operating costs can exceed it. Debt interest compounds by elapsed physical time on negative closing cash, including final settlement. These settings apply when starting a new campaign; zero preserves existing scenario rules.")}</p>
                <label><input type="checkbox" disabled={region.mills.filter(m=>!!m.processing).length<2} checked={!!region.facilityTransfers?.length} onChange={e=>setRegion(e.target.checked?withIllustrativeFacilityTransfer(region):{...region,facilityTransfers:undefined})}/> {tr("Enable illustrative by-product transfers")}</label>
                {!!region.facilityTransfers?.length && <p>{tr("Transfer exercise: one mill’s chip by-product supplies a second mill’s fibre-product recipe (90% output, 10% residue). This illustrative conversion replaces that receiving mill’s lumber recipe. Transfers use remaining truck capacity and earn no internal sales revenue.")}</p>}
                <label><input type="checkbox" checked={region.mills.some(m=>!!m.processing)} onChange={e=>setRegion({...region,facilityTransfers:undefined,mills:region.mills.map(m=>({...m,processing:e.target.checked?{inputs:Object.keys(m.prices),capacityM3:1000,costM3:18,outputs:[{id:'lumber',name:'Lumber equivalent',yield:.55,price:180,weeklyDemand:400},{id:'chips',name:'Chip by-product equivalent',yield:.35,price:60,weeklyDemand:250}]}:undefined}))})}/> {tr("Enable illustrative mill processing")}</label>
                <p className="muted">{tr("Teaching recipe: 55% lumber equivalent, 35% chip equivalent, 10% residue in input-equivalent m³. Capacity, prices and yields are illustrative; import authored regional recipes for another exercise.")}</p>
                {region.bcTenure ? <p>{tr("BC timber payment: acquisition / teaching sale premium is paid upfront; Crown stumpage is charged separately on harvest. See the tenure desk for rates and obligations.")}</p> : <label>{tr("Timber payment")}<select value={region.economy.timberPayment??"upfront"} onChange={e=>setRegion({...region,economy:{...region.economy,timberPayment:e.target.value as "upfront"|"harvest-royalty"}})}><option value="upfront">{tr("Pay acquisition price upfront")}</option><option value="harvest-royalty">{tr("Pay per m³ when harvested")}</option></select></label>}
                {!region.bcTenure && <p className="muted">{tr("Harvest royalties divide the award price by original stand volume; only harvested volume is charged. Refusing an unused auction lot charges the guarantee instead of refunding an upfront payment. This mode does not require acquisition cash; weekly debt interest still applies.")}</p>}
                <label><input type="checkbox" checked={region.mills.some(m=>!!m.spotPrices)} onChange={e=>setRegion({...region,mills:region.mills.map(m=>({...m,spotPrices:e.target.checked?Object.fromEntries(Object.entries(m.prices).map(([p,n])=>[p,n*.8])):undefined}))})}/> {tr("Enable illustrative spot outlets at 80% of ordinary prices")}</label>
                <p className="muted">{tr("Spot outlets have no demand ceiling in this exercise. Stock, access and truck hours still limit every shipment; spot deliveries do not fulfill monthly commitments.")}</p>
                <label><input type="checkbox" checked={!!region.offtakeOffers?.some(o=>o.agreement)} onChange={e=>setRegion({...region,offtakeOffers:e.target.checked?teachingRepeatedOfftakeOffers(region):teachingOfftakeOffers(region)})}/> {tr("Use repeated partner delivery agreements")}</label>
                <label><input type="checkbox" checked={!!region.offtakeOffers?.length} onChange={e=>setRegion({...region,offtakeOffers:e.target.checked?teachingOfftakeOffers(region):undefined})}/> {tr("Enable illustrative partner timber offers")}</label>
                <p className="muted">{tr("Teaching offers use 10% of each receiving yard’s first assortment demand, a 5% price premium and a 12/m³ shortfall charge. These are exercise assumptions. Authored regional offers can be imported instead.")}</p>
                <div className="button-row">
                  <button
                    onClick={() =>
                      download(`${region.id}-scenario.json`, region)
                    }
                  >
                    {tr("Export scenario package")}
                  </button>
                  <button onClick={() => importRegion.current?.click()}>
                    {tr("Import region package")}
                  </button>
                  <button
                    onClick={() => {
                      setRegion(structuredClone(quebec));
                      setWeatherId("normal");
                      setNotice(
                        "Latest Québec preset loaded in the studio. Start a new campaign to use its new mechanics; your current season is unchanged.",
                      );
                    }}
                  >
                    {tr("Load latest Québec preset")}
                  </button>

                  <input
                    ref={importRegion}
                    hidden
                    type="file"
                    accept=".json"
                    onChange={(e) => void file(e, true)}
                  />
                  <button className="primary" onClick={() => setConfirm("new")}>
                    {tr("Start new campaign")}
                  </button>
                </div>
                <p>{region.description}</p>
                <p className="muted">
                  {region.stands.length} {tr("areas ·")} {region.mills.length} {tr("mills ·")}{" "}
                  {region.products.length} {tr("assortments ·")} {region.crews.length}{" "}
                  {tr("crews ·")} {region.trucks.length} {tr("trucks ·")} {region.weeks} {tr("turns")}
                </p>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={game.roleMode}
                    disabled={done}
                    onChange={(e) =>
                      change({ ...game, roleMode: e.target.checked })
                    }
                  />{" "}
                  {tr("Shared-device role mode: require all three role plans ready\n                  before advancing")}
                </label>
                <p className="muted">
                  {tr("Standalone and pass-the-device play use this campaign. Open Classroom\n                  for server-owned rooms with private role credentials.")}
                </p>
              </section>
              <section className="panel">
                <h2>{tr("Field guide")}</h2>
                {region.bcTenure && <p>{tr("BC rights and operating authorizations are separate. BC09 and BC10 require an illustrative one-week cutting-permit application; BC08 needs renewal after six operating weeks. A BCTS auction award secures timber rights, but harvesting and hauling also require the Timber Sale Licence and access authorizations in the tenure desk. Simulation approvals issue no real permits.")}</p>}
                <ol className="guide">
                  <li>
                    <strong>{tr("Secure supply.")}</strong> {tr("Guaranteed areas are owned\n                    at the start. Private purchases are immediate. Sealed\n                    auctions settle after operations; a winning lot is available\n                    next week, with a one-week refusal window.")}
                  </li>
                  <li>
                    <strong>{tr("Set monthly commitments.")}</strong> {tr("At the month’s\n                    first week, choose per-mill targets within demand. These\n                    remain locked for the month. Deliver the right assortment to\n                    the right mill.")}
                  </li>
                  <li>
                    <strong>{tr("Queue production.")}</strong> {tr("Crews share finite\n                    standing volume. Assigned hours include relocation.\n                    Retention, regional weather and terrain bearing limit\n                    harvest.")}
                  </li>
                  <li>
                    <strong>{tr("Dispatch trucks.")}</strong> {tr("Each truck starts at its\n                    last location. Road paths determine travel time and cost;\n                    loads also consume handling time. Production enters roadside\n                    inventory before transport.")}
                  </li>
                  <li>
                    <strong>{tr("Watch freshness.")}</strong> {tr("Sawlogs downgrade to pulp\n                    after their freshness window; old pulp becomes recorded\n                    waste. Oldest stock ships first, with a quality-adjusted\n                    price.")}
                  </li>
                  <li>
                    <strong>{tr("Prepare for changing access.")}</strong> {tr("Bearing class\n                    1 works in all conditions, 2 excludes thaw, 3 requires\n                    normal/frozen, 4 frozen only. Road upgrades improve roads,\n                    not soil bearing.")}
                  </li>
                  <li>
                    <strong>{tr("Review and adapt.")}</strong> {tr("The draft planner uses\n                    the forecast; realized weather may differ. Reports explain\n                    blocked work, actual routes, each cash movement and resource\n                    utilization.")}
                  </li>
                  <li>
                    <strong>{tr("Finish the season.")}</strong> {tr("The final week settles\n                    targets and terminal inventory charges. Compare results\n                    against a replay with the same seed and scenario.")}
                  </li>
                </ol>
              </section>
              <section className="panel">
                <h2>{tr("Scenario provenance & assumptions")}</h2>
                {region.sources.map((s) => (
                  <p key={tr(s.title)}>
                    <strong>
                      <a href={s.url} target="_blank" rel="noreferrer">
                        {tr(s.title)}
                      </a>
                    </strong>
                    <br />
                    {s.note}
                  </p>
                ))}
                <p>{region.description}</p>
                <details>
                  <summary>{tr("Instructor weather schedule")}</summary>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>{tr(periodLabel)}</th>
                          {region.zones.map((z) => (
                            <th key={z.id}>{tr(z.name)}{tr(": forecast / actual")}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: region.weeks }, (_, i) => (
                          <tr key={i}>
                            <td>{i + 1}</td>
                            {region.zones.map((z) => (
                              <td key={z.id}>
                                {tr(region.weather[weatherId].forecast[z.id][i])} /{" "}
                                {tr(region.weather[weatherId].actual[z.id][i])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </section>
            </>
          )}
        </div>
        <footer>
          Forest Commons · {game.region.name} {tr("· MapLibre GL + deck.gl ·\n          Simulation, not an operational forestry prescription")}
        </footer>
      </main>
      <MobileOperationsNav page={page} onNavigate={navigate} onMenu={() => setSidebarCollapsed(false)} />
      {draftReviewOpen && standaloneControls && <DraftReview game={game} buildDraft={draftPlan}
        onApply={candidate => { change(candidate); setDraftReviewOpen(false); }}
        onClose={() => setDraftReviewOpen(false)} />}
      <dialog ref={dialog} onCancel={() => setConfirm(null)}>
        <div className="dialog-body">
          <h2>
            {confirm === "new"
              ? tr("Start a new campaign?")
              : `${tr("Run")} ${tr(periodLabel).toLowerCase()} ${game.week}?`}
          </h2>
          {confirm === "new" ? (
            <>
              <p>
                {tr("Start")} {region.name} {tr("with")} {tr(region.weather[weatherId]?.name??"")}{tr(". This replaces")} {game.region.name} {tr("on this device. Export it\n                first if you want to retain it.")}
              </p>
              <button
                onClick={() =>
                  download(`forest-campaign-week-${game.week}.json`, game)
                }
              >
                {tr("Export current campaign")}
              </button>
            </>
          ) : (
            <>
              <p>
                {tr("Purchasing, production and transport will settle together. This\n                week’s actual weather is revealed in the report.")}
              </p>
              {confirm === "advance" && <TurnReview game={game} />}
              {problems.length ? (
                <div className="notice">
                  {problems.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </div>
              ) : (
                <p>
                  {
                    Object.values(game.plan.crews).filter((q) => q.length)
                      .length
                  }{" "}
                  {tr("crews ·")}{" "}
                  {
                    Object.values(game.plan.trucks).filter((q) => q.length)
                      .length
                  }{" "}
                  {tr("trucks ·")} {money(budgetCommitted(game))} {tr("in bids")}
                </p>
              )}
            </>
          )}
          <div className="button-row">
            <button onClick={() => setConfirm(null)}>{tr("Keep planning")}</button>
            <button
              className="primary"
              disabled={confirm === "advance" && !!problems.length}
              onClick={() => {
                if (confirm === "new") start();
                else {
                  act(() => advance(game));
                  setConfirm(null);
                  setReportIndex(-1);
                }
              }}
            >
              {confirm === "new" ? tr("Start campaign") : tr("Run operations")}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
function Meter({
  label,
  value,
  max,
  unit,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
}) {
 const {t:tr}=useLanguage();
 
  return (
    <div className="meter">
      <span>{tr(label)}</span>
      <progress value={value} max={max} />
      <small>
        {fmt(value)} / {max} {unit}
      </small>
    </div>
  );
}
function Scorecard({
  game,
  comparison,
}: {
  game: Game;
  comparison: {
    region: string;
    seed: number;
    cash: number;
    delivered: number;
    emissions: number;
  } | null;
}) {
 const {t: tr}=useLanguage();
 
  const h = game.history,
    delivered = h.reduce((n, w) => n + sum(w.delivered), 0),
    emissions = h.reduce((n, w) => n + w.emissions, 0),
    targets = h.reduce((n, w) => n + w.targetChecks, 0),
    hits = h.reduce((n, w) => n + w.targetHits, 0),
    waste = h.reduce((n, w) => n + w.waste, 0),
    relocation = h
      .flatMap((w) => w.movements)
      .filter((m) => m.kind === "crew")
      .reduce((n, m) => n + m.km, 0);
  return (
    <section className="panel scorecard">
      <span className="eyebrow">{tr("SEASON SCORECARD")}</span>
      <h2>{tr("Profit, service and stewardship.")}</h2>
      <div className="metric-grid">
        <article>
          <small>{tr("Net result")}</small>
          <strong>
            {game.region.currency}{" "}
            {fmt(game.cash - game.region.economy.startingCash)}
          </strong>
        </article>
        <article>
          <small>{tr("Commitments achieved")}</small>
          <strong>
            {hits} / {targets}
          </strong>
        </article>
        <article>
          <small>{tr("Emission intensity")}</small>
          <strong>
            {delivered ? (emissions / delivered).toFixed(1) : "—"} kg/m³
          </strong>
        </article>
        <article>
          <small>{tr("Inventory waste")}</small>
          <strong>{fmt(waste)} m³</strong>
        </article>
      </div>
      <p>
        {fmt(relocation)} {tr("km of crew relocation ·")}{" "}
        {fmt(h.reduce((n, w) => n + w.disturbance, 0))} {tr("modelled disturbance\n        units ·")} {fmt(game.stands.reduce((n, s) => n + s.remaining, 0))} {tr("m³\n        standing timber retained.")}
      </p>
      {comparison && comparison.region === game.region.id && (
        <p>
          {tr("Previous season (seed")} {comparison.seed}{tr("): cash difference")}{" "}
          {fmt(game.cash - comparison.cash)}{tr(", delivery difference")}{" "}
          {fmt(delivered - comparison.delivered)} {tr("m³, emissions difference")}{" "}
          {((emissions - comparison.emissions) / 1000).toFixed(1)} {tr("tonnes.")}{" "}
          {comparison.seed === game.seed
            ? tr("Same auction seed.")
            : tr("Different auction seeds.")}
        </p>
      )}
    </section>
  );
}
