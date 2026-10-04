import { bcOperatingLesson } from "./scenarios/bc-operating-lesson";
import { ConnectivityNotice, MobileOperationsNav, LessonDialog, LessonLauncher, anchorWorkbench } from "./operations/OperationsShell";
import { DraftReview, TurnReview } from "./operations/PlanReview";
import { FirstDeliveryGuide, useFirstDeliveryGuideController } from './operations/FirstDeliveryGuide';
import { ModelTermHelp, ModelGlossary, ResourceLocation } from './operations/ModelGlossary';
import SelectedLotStatus from './operations/SelectedLotStatus';
import AnalysisTools from './operations/AnalysisTools';
import RecordedStateComparison from './maps/RecordedStateComparison';
import OperatingAgreementTools from './OperatingAgreementTools';
import QueueEditor from './operations/QueueEditor';
import PlanComparison from './operations/PlanComparison';
import RouteReplay from './operations/RouteReplay';
import TurnOutcomeDialog, { TurnSummary } from './operations/TurnOutcome';
import WorkspaceSections, { defaultWorkspaceSection, ResourcePicker } from './operations/WorkspaceSections';
import { idleTurnLabel } from './simulation/plan-intent';
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
import BuckingDesk from './BuckingDesk';
import LotProfitability from './LotProfitability';
import BidCompositionDesk from './BidCompositionDesk';
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
import { CurrentTurnBriefing } from "./DisruptionDesk";
import { respondToDisruption, activeDisruptions } from "./simulation/disruptions";
import MapWorkspace from "./MapWorkspace";
import useMapQueueUndo from "./operations/useMapQueueUndo";
import Sheet from "./operations/Sheet";
import MapNote from "./operations/MapNote";
import ProcurementLab from "./ProcurementLab";
import { serializeGame } from "./simulation/save-format";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { securedAwaitingAuthorization } from "./simulation/tenure";
import {
  Trees,
  Map as MapIcon,
  Axe,
  Truck,
  Handshake,
  ClipboardList,
  ChartLine,
  TreePine,
  GraduationCap,
  Sprout,
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
import { canAccess, weatherAt } from "./simulation/routing";
import { quebec } from "./scenarios/quebec";
import { princeGeorge } from "./scenarios/prince-george";
const builtInRegions = [quebec, princeGeorge, bcOperatingLesson];
import CollaborationLab from "./CollaborationLab";
import NegotiationOffers from './NegotiationOffers';
import { LearningObjectives } from "./PlanningDesk";
import "./regional.css";
import "./operations/operations.css";
import "./operations/mobile-play.css";
import "./operations/map-screen.css";
const key = "forest-commons-regional-v2";
const interfaceSessionKey = 'forest-commons-interface-session-v1';
function newInterfaceSession() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function initialInterfaceSession(hasCampaign: boolean) {
  try {
    const saved = hasCampaign ? localStorage.getItem(interfaceSessionKey) : null;
    if (saved && saved.length < 100) return saved;
  } catch { /* Device storage is optional for interface preferences. */ }
  return newInterfaceSession();
}
const fmt = (n: number) => Math.round(n).toLocaleString("en-CA");
/** Short header figures for phones, e.g. 1.8M or 24k. */
const compact = (n: number, language: string) =>
  new Intl.NumberFormat(language === "fr" ? "fr-CA" : "en-CA", { notation: "compact", maximumFractionDigits: 1 }).format(n);
// Play happens on the map, the plan and the results. The desks hold the full
// editors and advanced tools; learning modes and setup stay outside the turn loop.
const pages = [
  ["Overview", MapIcon, "play"],
  ["Planning desk", ClipboardList, "play"],
  ["Reports", ChartLine, "play"],
  ["Forest & timber", TreePine, "desks"],
  ["Production", Axe, "desks"],
  ["Transport", Truck, "desks"],
  ["Collaboration", Handshake, "learn"],
  ["Classroom", GraduationCap, "learn"],
  ["Stewardship", Sprout, "learn"],
  ["Scenario studio", Settings, "setup"],
] as const;
const navGroups: Record<string, [string, string]> = {
  play: ["Play", "Jouer"], desks: ["Desks", "Bureaux"], learn: ["Learn", "Apprendre"], setup: ["Setup", "Configuration"],
};
/** Screens folded into another screen's tab, so links to them still land somewhere. */
const pageAliases: Record<string, [string, string]> = {
  Commitments: ["Planning desk", "commitments"],
};
function pageLabel(name: string, language: string, tr: (s: string) => string) {
  const short: Record<string, [string, string]> = {
    Overview: ["Map", "Carte"], "Planning desk": ["Plan", "Plan"], Reports: ["Results", "Résultats"],
  };
  return short[name] ? short[name][language === "fr" ? 1 : 0] : tr(name);
}
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
  // The map is the main screen, so the rail starts as icons. On a phone the
  // rail is a drawer and always starts closed; a desktop preference to keep it
  // open must not cover the map on the next phone visit.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      if (window.matchMedia("(max-width: 600px)").matches) return true;
      return localStorage.getItem("forest-sidebar-collapsed") !== "false";
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      if (window.matchMedia("(max-width: 600px)").matches) return;
      localStorage.setItem(
        "forest-sidebar-collapsed",
        String(sidebarCollapsed),
      );
    } catch {
      /* Layout preferences must not interrupt the game. */
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (sidebarCollapsed) return;
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !window.matchMedia('(max-width: 1100px)').matches || document.querySelector('dialog[open]')) return;
      setSidebarCollapsed(true);
      requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.mobile-operations-nav button:last-child')?.focus());
    };
    window.addEventListener('keydown', closeWithEscape);
    return () => window.removeEventListener('keydown', closeWithEscape);
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
  const [campaignKey, setCampaignKey] = useState(() => initialInterfaceSession(!!boot.raw));
  const guideController = useFirstDeliveryGuideController(game, campaignKey);
  const [analysisTask, setAnalysisTask] = useState('supply');
  const [workspaceViews, setWorkspaceViews] = useState<Record<string, string>>({});
  const [activeCrewId, setActiveCrewId] = useState(boot.game.region.crews[0]?.id ?? '');
  const [activeTruckId, setActiveTruckId] = useState(boot.game.region.trucks[0]?.id ?? '');
  const [outcomeIndex, setOutcomeIndex] = useState<number | null>(null);
  const activeView = workspaceViews[page] ?? defaultWorkspaceSection(page);
  const setWorkspaceView = (value: string) => {
    setWorkspaceViews(views => ({ ...views, [page]: value }));
  };
  useEffect(() => {
    try { localStorage.setItem(interfaceSessionKey, campaignKey); } catch { /* Keep an in-memory session. */ }
  }, [campaignKey]);
  const [draftReviewOpen, setDraftReviewOpen] = useState(false);
  const [showLessonWelcome, setShowLessonWelcome] = useState(!boot.raw && !boot.error);
  const navigate = (requested: string) => {
    const alias = pageAliases[requested];
    const target = alias ? alias[0] : requested;
    if (alias) setWorkspaceViews(views => ({ ...views, [target]: alias[1] }));
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
  const navigateToTask = (target: string) => {
    if (!pageAliases[target]) setWorkspaceViews(views => ({ ...views, [target]: defaultWorkspaceSection(target) }));
    navigate(target);
    if (target === 'Reports' && game.week > game.region.weeks) requestAnimationFrame(() => {
      const results = document.getElementById('season-results');
      results?.scrollIntoView({ block: 'start' }); results?.focus({ preventScroll: true });
    });
  };
  const chooseLesson = (preset: RegionDefinition) => {
    setRegion(structuredClone(preset));
    setWeatherId(Object.keys(preset.weather)[0]);
    setShowLessonWelcome(false);
    setConfirm("new");
  };
  const saveGuard = useRef(new StandaloneSaveGuard(boot.raw, !!boot.error));
  const [savePauseReason, setSavePauseReason] = useState(boot.error);
  useEffect(() => {
    const externalSave = (event: StorageEvent) => {
      if (event.key !== key && event.key !== null) return;
      if (event.key === key && event.newValue === saveGuard.current.baseline) return;
      saveGuard.current.paused = true;
      setSavePaused(true);
      setSavePauseReason('Another tab updated the standalone save. Autosave is paused here; export this plan or reload to use the other tab’s campaign.');
    };
    window.addEventListener('storage', externalSave);
    return () => window.removeEventListener('storage', externalSave);
  }, []);
  const importSave = useRef<HTMLInputElement>(null),
    importRegion = useRef<HTMLInputElement>(null);
  const runTurnButton = useRef<HTMLButtonElement>(null);
  const standaloneControls = page !== "Classroom" && page !== "Stewardship";
  const marketRegion = effectiveMarketRegion(game);
  const r = game.region,
    done = game.week > r.weeks,
    periodLabel = (r.turnDurationWeeks ?? 1) !== 1 ? "Turn" : "Week",
    forecast = weatherAt(game, true),
    money = (n: number) => `${r.currency} ${fmt(n)}`;
  const editingCrew = r.crews.find(c => c.id === activeCrewId) ?? r.crews[0];
  const editingTruck = r.trucks.find(t => t.id === activeTruckId) ?? r.trucks[0];
  const chosen = r.stands.find((s) => s.id === selected) ?? r.stands[0],
    state = game.stands.find((s) => s.id === chosen.id)!,
    problems = done ? [] : planProblems(game),
    report =
      game.history[reportIndex < 0 ? game.history.length - 1 : reportIndex];
  const reportPicker = <label className="workspace-report-picker">
    {tr('Report turn')}<select aria-label={tr('Report turn')} value={reportIndex} onChange={event => setReportIndex(Number(event.target.value))}>
      <option value={-1}>{tr('Latest completed turn')}</option>
      {game.history.map((history, index) => <option key={history.week} value={index}>{tr(periodLabel)} {history.week}</option>)}
    </select>
  </label>;
  useEffect(() => {
    if (savePaused) return;
    try {
      const saved = serializeGame(game);
      if (!saveGuard.current.write(localStorage, key, saved)) {
        setSavePaused(true);
        setSavePauseReason("Another tab updated the standalone save. Autosave is paused here; export this plan or reload to use the other tab’s campaign.");
        return;
      }

    } catch (error) {
      saveGuard.current.paused = true;
      setSavePaused(true);
      setSavePauseReason(error instanceof DOMException && error.name === 'QuotaExceededError'
        ? 'Browser storage is full. Export your campaign to preserve progress.'
        : 'Browser storage is unavailable. Export your campaign to preserve progress.');
    }
  }, [game, savePaused]);
  const change = (next: Game) => {
    setGame(next);
  };
  // The desks keep their own short undo history, like the map panel's.
  const deskQueue = useMapQueueUndo(game, change);
  const deskUndo = deskQueue.count > 0 && <div className="map-queue-undo">
    <button disabled={done} onClick={deskQueue.undo}>{language === "fr" ? "Annuler la modification de file" : "Undo queue edit"} ({deskQueue.count})</button>
  </div>;
  const replaceCampaign = (next: Game) => {
    setCampaignKey(newInterfaceSession());
    setWorkspaceViews({});
    setAnalysisTask('supply');
    setOutcomeIndex(null);
    setDraftReviewOpen(false);
    setShowLessonWelcome(false);
    setActiveCrewId(next.region.crews[0]?.id ?? '');
    setActiveTruckId(next.region.trucks[0]?.id ?? '');
    setCampaignGeneration(generation => generation + 1);
    try { saveGuard.current.replace(localStorage, key); }
    catch { saveGuard.current = new StandaloneSaveGuard(null); }
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
  const awaitingAuthorization = useMemo(() => securedAwaitingAuthorization(game), [game]);
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
  const openReplay = () => {
    setWorkspaceViews(views => ({ ...views, Reports: 'replay' }));
    navigate('Reports');
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
        {/* On a phone the toolbar keeps only the turn action; the drawer hosts
            the language picker and the campaign file actions. */}
        <div className="rail-language"><LanguageSelect /></div>
        {standaloneControls && <div className="rail-campaign">
          <span>{tr("Campaign")}</span>
          <button onClick={() => download(`forest-campaign-week-${game.week}.json`, game)}>
            <Download size={17} /> {tr("Export save")}
          </button>
          <button onClick={() => importSave.current?.click()}>
            <Upload size={17} /> {tr("Import save")}
          </button>
        </div>}
        <nav id="main-navigation" aria-label={tr("Main navigation")}>
          {pages.map(([name, Icon, group], index) => (
            <div className="rail-nav-group" data-group={group} key={name}>
              {pages[index - 1]?.[2] !== group && <span>{navGroups[group][language === "fr" ? 1 : 0]}</span>}
            <button
              aria-label={pageLabel(name, language, tr)}
              title={pageLabel(name, language, tr)}
              className={page === name ? "active" : ""}
              onClick={() => {
                if(page === "Classroom" && name !== "Classroom" && classroomPendingChanges){
                  setNotice("Submit or discard your classroom draft, and wait for any submission to finish, before leaving this screen.");
              if(window.matchMedia("(max-width: 600px)").matches)setSidebarCollapsed(true);
                  return;
                }
                navigate(name);
              }}
            >
              <Icon size={19} />
              <span className="nav-label">
                {pageLabel(name, language, tr)}
              </span>
              {page === name && <ChevronRight size={16} />}
            </button>
            </div>
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
                  <span className="toolbar-stat"><span className="stat-full">{money(game.cash)}</span><span className="stat-short" aria-hidden="true">{r.currency} {compact(game.cash, language)}</span></span>
                  <span className="toolbar-stat">
                    <span className="stat-full">{fmt(totalDelivered)} {tr("m³ delivered")}</span>
                    <span className="stat-short" aria-hidden="true">{compact(totalDelivered, language)} m³</span>
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
              {!done && <button
                className="toolbar-draft"
                onClick={() => setDraftReviewOpen(true)}
              >
                <Sparkles size={16} />
                <span>{tr("Draft plan")}</span>
              </button>}
              {/* After the last turn the main action leads to the season results. */}
              <button
                className="primary"
                ref={runTurnButton}
                onClick={() => done ? navigateToTask("Reports") : setConfirm("advance")}
              >
                {done ? <ChartLine size={16} /> : <Play size={16} />}
                <span>{done ? (language === "fr" ? "Résultats de la saison" : "Season results") : <>{tr("Run")} {tr(periodLabel).toLowerCase()} {Math.min(game.week, r.weeks)}</>}</span>
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
          {showLessonWelcome && page === "Overview" && <LessonDialog
            regions={[bcOperatingLesson, princeGeorge, quebec]}
            onChoose={chooseLesson}
            onDismiss={() => { setShowLessonWelcome(false); requestAnimationFrame(anchorWorkbench); }} />}
          {page !== "Overview" && (
            <div className="page-heading">
              <h1>{pageLabel(page, language, tr)}</h1>
            </div>
          )}
          <WorkspaceSections page={page} value={activeView} onChange={setWorkspaceView} />
          {(page === 'Production' || page === 'Transport') && activeView === 'tools' && <ModelGlossary/>}
          {page === 'Reports' && !game.history.length && <section className="panel results-empty">
            <h2>{language === 'fr' ? 'Aucun résultat pour l’instant' : 'No results yet'}</h2>
            <p>{language === 'fr' ? 'Exécutez votre premier tour pour voir les livraisons, les trajets réels et les coûts.' : 'Run your first turn to see deliveries, actual routes and costs here.'}</p>
            <button className="primary" onClick={() => navigate('Overview')}>{language === 'fr' ? 'Retour à la carte' : 'Back to the map'}</button>
          </section>}
          {/* At season end the scorecard leads; the turn picker belongs with the turn summary below it. */}
          {page === 'Reports' && game.history.length > 1 && (activeView === 'replay' || (activeView === 'summary' && !done)) && reportPicker}
          {page === 'Planning desk' && activeView === 'review' && <>
            <CurrentTurnBriefing game={game} onReviewConditions={() => {
              setAnalysisTask('conditions');
              setWorkspaceView('analysis'); requestAnimationFrame(() => {
                const choices = document.getElementById('disruption-desk');
                choices?.scrollIntoView({ block: 'start' }); choices?.focus({ preventScroll: true });
              });
            }} />
          </>}
          {page === "Planning desk" && activeView === 'review' && <section className="panel"><TurnReview game={game} onNavigate={navigateToTask} />
            <div className="button-row page-actions">
              {standaloneControls && <button className="operating-phone-only" disabled={done} onClick={() => setDraftReviewOpen(true)}>
                <Sparkles size={16} /><span>{tr("Draft plan")}</span>
              </button>}
              <button className="primary" disabled={done} onClick={() => setConfirm("advance")}>
                {language === "fr" ? "Examiner et exécuter le tour" : "Review and run turn"}
              </button>
            </div></section>}
          {page === "Reports" && activeView === 'summary' && !!game.history.length && <>
            {done && <div id="season-results" tabIndex={-1}><Scorecard game={game} comparison={game.previousCampaign ?? null} />
              <LearningObjectives game={game} /></div>}
            {done && game.history.length > 1 && reportPicker}
            <TurnSummary game={game} reportIndex={reportIndex < 0 ? undefined : reportIndex} onNavigate={navigateToTask} onReplay={openReplay} />
            <details className="workspace-metrics"><summary>{language === 'fr' ? 'Résultats par site' : 'Results by site'}</summary>
              <DecisionDebrief game={game} reportIndex={reportIndex < 0 ? undefined : reportIndex} onSelect={id => { select(id); navigate("Overview"); }} />
            </details>
          </>}
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
          {page === "Planning desk" && activeView === "review" && <details className="workspace-metrics">
          <summary>{language === 'fr' ? 'Trésorerie, stock et conditions actuelles' : 'Current cash, inventory & conditions'}</summary>
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
          </details>}
          {page === "Overview" && (
            <MapWorkspace
              overlay={<>
                {!done && activeDisruptions(game).length > 0 && <MapNote className="map-overlay-event"
                  summary={<>{tr(activeDisruptions(game)[0].title)}{activeDisruptions(game).length > 1 ? ` +${activeDisruptions(game).length - 1}` : ""}</>}>
                  <ul>{activeDisruptions(game).map(event => {
                    const subject = [...r.roads.edges, ...r.crews, ...r.trucks, ...r.mills].find(item => item.id === event.target);
                    return <li key={event.id}><strong>{tr(event.title)}</strong>{subject?.name ? ` · ${tr(subject.name)}` : ""} · {tr(event.description)}</li>;
                  })}</ul>
                  <button onClick={() => navigateToTask("Planning desk")}>{language === "fr" ? "Examiner les conditions" : "Review conditions"}</button>
                </MapNote>}
                {!done && totalDelivered === 0 && <FirstDeliveryGuide overlay selectedStandId={chosen.id}
                  game={game} campaignKey={campaignKey} controller={guideController} onNavigate={navigateToTask} onSelect={select} onDraft={() => setDraftReviewOpen(true)} />}
                {game.region.bcTenure && <MapNote className="bc-tenure-callout"
                  summary={awaitingAuthorization.length > 0 ? `${awaitingAuthorization.length} ${language === "fr" ? "lots attendent une autorisation" : "lots await harvest authorization"}` : tr("BC tenure & permits")}>
                  <p>{tr("BC secured timber still needs active harvesting and road authorizations. Check applications, renewals, stumpage and obligations before assigning crews or trucks.")}</p>{awaitingAuthorization.length > 0 && <p><strong>{tr("Secured timber waiting for a harvest authorization:")}</strong> {awaitingAuthorization.map(a => a.id).join(", ")}. {tr("The draft plan skips these lots until an application is approved.")}</p>}<button onClick={()=>{if(awaitingAuthorization[0])setSelected(awaitingAuthorization[0].id);setPage("Forest & timber");}}>{tr("Review selected lot tenure and permits")}</button>
                </MapNote>}
              </>}
              key={JSON.stringify([r.id,r.stands.map(s=>s.id),r.crews.map(c=>c.id),r.trucks.map(t=>t.id),r.mills.map(m=>m.id),r.products.map(p=>p.id),r.zones.map(z=>z.id)])}
              game={game}
              selected={chosen.id}
              onSelect={select}
              onChange={change}
              onNavigate={navigateToTask}
              onResourceNavigate={(kind, id) => {
                if (kind === 'crew') setActiveCrewId(id); else setActiveTruckId(id);
                navigateToTask(kind === 'crew' ? 'Production' : 'Transport');
              }}
            />
          )}
          {page === "Forest & timber" && activeView === 'lot' && (
            <>
              <div className="lot-detail">
                <section className="panel">
                  <div className="section-heading"><div><span className="eyebrow">{tr("SUPPLY AREA")} {chosen.id}</span>
                  <h2>{chosen.name}</h2></div>
                  <button onClick={() => navigate("Overview")}>{language === "fr" ? "Voir sur la carte" : "Show on map"}</button></div>
                  <SelectedLotStatus game={game} standId={chosen.id} onReviewPermits={() => {
                    const controls = document.getElementById('selected-lot-permits');
                    controls?.scrollIntoView({ block: 'start' }); controls?.focus({ preventScroll: true });
                  }}/>
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
                  {chosen.supply === "auction" &&
                    !state.owned &&
                    !state.refused &&
                    chosen.auctionWeek != null && chosen.auctionWeek < game.week && (() => {
                      // A closed auction keeps its lot on the map, so show the
                      // recorded outcome instead of a bid field that cannot change.
                      const outcome = game.history.find(h => h.week === chosen.auctionWeek)?.messages.find(m => m.startsWith(`${chosen.id}: `));
                      return <p className="muted">{tr("Auction closed")} · {outcome ? tr(outcome) : tr("No bid was placed.")}</p>;
                    })()}
                  {!done &&
                    chosen.supply === "auction" &&
                    !state.owned &&
                    !state.refused &&
                    !(chosen.auctionWeek != null && chosen.auctionWeek < game.week) && (
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
            </>
          )}
          {page === "Forest & timber" && activeView === 'inventory' && (
            <>
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
                      {([["all", "All supply", "Tout l’approvisionnement"], ["owned", "Secured", "Acquis"], ["private", "Private", "Privé"], ["auction", "Auction", "Enchères"], ["protected", "Protected", "Protégé"]] as const).map(
                        ([v, en, fr]) => (
                          <option key={v} value={v}>{language === "fr" ? fr : en}</option>
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
                                  onClick={() => { setSelected(s.id); setWorkspaceView('lot'); }}
                                >
                                  {s.id} · {s.name}
                                </button>
                              </td>
                              <td>{tr(st.owned ? "Owned" : s.supply[0].toUpperCase() + s.supply.slice(1))}</td>
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
                                    ? tr(s.unavailableReason ?? "Conservation")
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
          {page === "Forest & timber" && activeView === 'appraisal' && (
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
          {((page === 'Forest & timber' && activeView === 'appraisal') || (page === 'Reports' && activeView === 'charts' && !!game.history.length)) && <BCMarketDesk game={game}/>}
          {page === "Reports" && activeView === 'charts' && !!game.history.length && <details className="workspace-metrics"><summary>{language === 'fr' ? 'Contribution par lot (registre)' : 'Contribution by lot (ledger)'}</summary><LotProfitability game={game}/></details>}
          {page === 'Forest & timber' && activeView === 'lot' && <div id="selected-lot-permits" tabIndex={-1}><TenureDesk key={`tenure-${game.region.id}`} game={game} standId={page === "Forest & timber" ? chosen.id : undefined} onChange={change} /></div>}
          {page === "Forest & timber" && activeView === 'appraisal' && <><BidCompositionDesk game={game} standId={chosen.id} onChange={change}/><BuckingDesk game={game} standId={chosen.id}/></>}
          {page === "Forest & timber" && activeView === 'experiments' && <CommonValueExperiment/>}

          {page === "Classroom" && <Classroom region={r} onPendingChanges={setClassroomPendingChanges} />}
          {page === "Transport" && activeView === 'tools' && !!game.region.facilityTransfers?.length && <FacilityTransferDesk game={game} onChange={change}/>}
          {((page === "Transport" && activeView === 'tools') || (page === 'Planning desk' && activeView === 'commitments')) && <OfftakeDesk key={`offtake-${game.region.id}`} game={game} onChange={change}/>}
          {page === 'Stewardship' && activeView === 'annual' && <StewardshipLab key={campaignKey} game={game} onChange={change}/>}
          {page === 'Stewardship' && activeView === 'seasons' && <SeasonBuilder game={game} onChange={change}/>}
          {page === 'Planning desk' && activeView === 'alternatives' && <PlanComparison
            game={game} onChange={change} campaignKey={campaignKey} saveKey={key} blocked={savePaused} />}
          {page === "Planning desk" && activeView === 'analysis' && (
            <AnalysisTools game={game} onChange={change} onNavigate={navigateToTask} value={analysisTask}
              onSelectTask={setAnalysisTask} standId={chosen.id} onRespond={(id, action) => act(() => respondToDisruption(game, id, action))}/>
          )}
          {page === 'Production' && activeView === 'calendar' && <CrewTimeline game={game} onChange={change}/>}
          {page === 'Production' && activeView === 'tools' && <>
            <HarvestPlanning game={game} onChange={change} onInspect={id=>{select(id);navigate('Overview');}}/>
            <DraftOptions key={game.region.id} game={game} onDraft={options=>act(()=>draftPlan(game,options))}/>
            <details className="workspace-metrics"><summary>{language === 'fr' ? 'Permis, positionnement, réservations et transformation' : 'Permits, pre-season, reservations & processing'}</summary>
              <TenureDesk key={`tenure-${game.region.id}`} game={game} onChange={change}/>
              <PreSeasonDesk game={game} onChange={change}/>
              <ReservationDesk game={game} onChange={change}/>
              <MillProcessingDesk key={`processing-${game.region.id}`} game={game} onChange={change}/>
            </details>
          </>}
          {page === "Production" && activeView === 'queues' && (
            <>
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
                {/* A plan-wide setting, not part of editing one crew, so it stays folded. */}
                <details className="workspace-metrics">
                <summary>{tr("Standing retention:")} {fmt(game.plan.retention * 100)}%</summary>
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
                <div className="queue-model-help"><ModelTermHelp term="retention"/><ModelTermHelp term="bucking"/></div>
                </details>
                <ResourcePicker resources={r.crews} selected={editingCrew?.id ?? ''} onSelect={setActiveCrewId} kind="crew"
                  counts={Object.fromEntries(Object.entries(game.plan.crews).map(([id,orders])=>[id,orders.length]))}/>
                {editingCrew && <>
                  <p className="queue-desk-summary">
                    <strong>{editingCrew.name}</strong>
                    <span>{editingCrew.hours} h/{tr(periodLabel).toLowerCase()}</span>
                    <span>{tr("At")} <ResourceLocation game={game} nodeId={game.crewPositions[editingCrew.id]}/> · {fmt((game.plan.crews[editingCrew.id] ?? []).reduce((n, o) => n + o.hours, 0))} {tr("h scheduled")}</span>
                  </p>
                  <QueueEditor variant="desk" game={game} kind="crew" resourceId={editingCrew.id} selected={selected} onSelect={select} onChange={deskQueue.changeQueue} addStand={chosen.id}/>
                  {deskUndo}
                </>}
              </section>
            </>
          )}
          {page === "Transport" && activeView === 'dispatch' && (
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
                <ResourcePicker resources={r.trucks} selected={editingTruck?.id ?? ''} onSelect={setActiveTruckId} kind="truck"
                  counts={Object.fromEntries(Object.entries(game.plan.trucks).map(([id,orders])=>[id,orders.length]))}/>
                <div className="queue-model-help"><ModelTermHelp term="loads"/><ModelTermHelp term="roadside"/></div>
                {editingTruck && <>
                  <p className="queue-desk-summary">
                    <strong>{editingTruck.name}</strong>
                    <span>{editingTruck.payload} m³ · {editingTruck.hours} h/{tr(periodLabel).toLowerCase()}</span>
                    <span>{tr("At")} <ResourceLocation game={game} nodeId={game.truckPositions[editingTruck.id]}/> · {editingTruck.loadingHours + editingTruck.unloadingHours} {tr("h handling/load")}</span>
                  </p>
                  <QueueEditor variant="desk" game={game} kind="truck" resourceId={editingTruck.id} selected={selected} onSelect={select} onChange={deskQueue.changeQueue} addStand={chosen.id}/>
                  {deskUndo}
                </>}
              </section>
            </>
          )}
          {page === 'Planning desk' && activeView === 'commitments' && done && <section className="panel results-empty">
            <h2>{language === 'fr' ? 'Saison terminée' : 'Season complete'}</h2>
            <p>{language === 'fr' ? 'Les engagements mensuels sont réglés. Les livraisons par usine figurent dans les résultats de la saison.' : 'Monthly commitments are settled. Deliveries by mill are in the season results.'}</p>
            <button className="primary" onClick={() => navigateToTask('Reports')}>{language === 'fr' ? 'Résultats de la saison' : 'Season results'}</button>
          </section>}
          {(page === 'Planning desk' && activeView === 'commitments') && !done && (
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
                      <th>{tr("Commitment m³")}</th>
                      <th>{tr("Delivered this month")}</th>
                      <th>{tr("Remaining to target")}</th>
                      <th>{tr("Demand m³")}</th>
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
                          <td>{fmt(n)}</td>
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
          {/* The handout-based four/five-company laboratory leads; the generated
              eight-company round is an extension, so it follows the campaign desks. */}
          {page === 'Collaboration' && activeView === 'negotiation' && <>
            <div className="button-row workspace-link-row">
              <button onClick={() => setWorkspaceView('allocation')}>{language === 'fr' ? 'Modifier la répartition proposée →' : 'Edit proposed allocation →'}</button>
            </div>
            <NegotiationOffers game={game} onChange={change}/>
          </>}
          {page === 'Collaboration' && activeView === 'allocation' && <CollaborationLab game={game} onChange={change} onOpenBoard={() => setWorkspaceView('negotiation')}/>}
          {page === 'Collaboration' && activeView === 'dispatch' && <><OperatingAgreementTools game={game} onChange={change}/>
            <details className="workspace-metrics"><summary>{language === 'fr' ? 'Services réciproques' : 'Reciprocal services'}</summary><ReciprocalDesk key={`reciprocal-${game.region.id}`} game={game} onChange={change}/></details>
            <details className="workspace-metrics"><summary>{language === 'fr' ? 'Laboratoire du réseau coopératif' : 'Cooperative network lab'}</summary><NetworkDispatchLab key={`network-${game.region.id}`} game={game}/></details></>}
          {page === 'Collaboration' && activeView === 'exercises' && <EightCompanyExercise/>}
          {page === "Reports" && activeView === 'reflection' && !!game.history.length && <><Debrief game={game} onNavigate={navigateToTask}/><TeamComparison game={game}/></>}
          {page === 'Reports' && activeView === 'charts' && !!game.history.length && <>
              <InventoryCharts game={game}/>
              <Suspense fallback={<p>{tr("Loading operating charts…")}</p>}><OperationsCharts key={game.region.id} game={game}/></Suspense>
          </>}
          {page === 'Reports' && activeView === 'compare' && !!game.history.length && <RecordedStateComparison key={campaignKey} game={game} reportIndex={reportIndex}/>}
          {page === "Reports" && activeView === 'replay' && !!game.history.length && (<>
              <section className="panel">
                <div className="section-heading">
                  <h2>{tr("Operating record")}</h2>
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
                    <RouteReplay game={game} reportIndex={reportIndex} campaignKey={campaignKey} onSelect={select}/>
                    <SettledReservationResults report={report} region={r}/>
                    <div className="two-cols">
                      {/* Twenty bars are reference detail; the summary names the exceptions. */}
                      <details className="results-definitions">
                        <summary>{tr("Resource utilization")} · {[...r.crews.map(c => (report.crewHours[c.id] ?? 0) <= 0), ...r.trucks.map(t => (report.truckHours[t.id] ?? 0) <= 0)].filter(Boolean).length} {language === "fr" ? "inactifs" : "idle"} · {[...r.crews.map(c => (report.crewHours[c.id] ?? 0) >= c.hours * 0.95), ...r.trucks.map(t => (report.truckHours[t.id] ?? 0) >= t.hours * 0.95)].filter(Boolean).length} {language === "fr" ? "à pleine capacité" : "at capacity"}</summary>
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
                      </details>
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
                <details className="results-definitions">
                <summary>{tr("Campaign history")} · {game.history.length} {tr(periodLabel).toLowerCase()}{game.history.length === 1 ? "" : "s"}</summary>
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
                </details>
              </section>
            </>
          )}
          {page === "Scenario studio" && (
            <>
              {activeView === 'cases' && <LessonLauncher regions={[bcOperatingLesson, princeGeorge, quebec]} onChoose={chooseLesson} />}
              {activeView === 'custom' && <section className="panel">
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
              </section>}
              {activeView === 'custom' && <>
                <details className="workspace-metrics"><summary>{language === 'fr' ? 'Avancé : intervalle de décision et données d’étalonnage' : 'Advanced: decision interval & calibration evidence'}</summary>
                  <TurnDurationMode region={region} onChange={setRegion}/>
                  <RegionalCalibration key={region.id} region={region} onChange={setRegion} />
                </details>
              </>}
              {activeView === 'guide' && <section className="panel">
                <h2>{tr("Field guide")}</h2>
                {game.region.bcTenure && <p>{tr("BC rights and operating authorizations are separate. BC09 and BC10 require an illustrative one-week cutting-permit application; BC08 needs renewal after six operating weeks. A BCTS auction award secures timber rights, but harvesting and hauling also require the Timber Sale Licence and access authorizations in the tenure desk. Simulation approvals issue no real permits.")}</p>}
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
                    <strong>{tr("Watch freshness.")}</strong> {tr("Sawlogs and poplar downgrade to pulp after their freshness window; old pulp becomes recorded waste. Oldest stock ships first, with a quality-adjusted price.")}
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
              </section>}
              {activeView === 'guide' && <section className="panel">
                <h2>{tr("Scenario provenance & assumptions")}</h2>
                {game.region.sources.map((s) => (
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
                <p>{game.region.description}</p>
                <details>
                  <summary>{language === "fr" ? "Instructeur · météo réelle (révèle les conditions futures)" : "Instructor · actual weather (reveals future conditions)"}</summary>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>{tr(periodLabel)}</th>
                          {game.region.zones.map((z) => (
                            <th key={z.id}>{tr(z.name)}{tr(": forecast / actual")}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: game.region.weeks }, (_, i) => (
                          <tr key={i}>
                            <td>{i + 1}</td>
                            {game.region.zones.map((z) => (
                              <td key={z.id}>
                                {tr(game.region.weather[game.weatherId].forecast[z.id][i])} /{" "}
                                {tr(game.region.weather[game.weatherId].actual[z.id][i])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </section>}
            </>
          )}
        </div>
        <footer>
          Forest Commons · {game.region.name} {tr("· MapLibre GL + deck.gl ·\n          Simulation, not an operational forestry prescription")}
        </footer>
      </main>
      <MobileOperationsNav page={page} onNavigate={navigate} onMenu={() => setSidebarCollapsed(false)} menuOpen={!sidebarCollapsed} />
      {draftReviewOpen && standaloneControls && <DraftReview game={game} buildDraft={draftPlan}
        onApply={candidate => { change(candidate); setDraftReviewOpen(false); }}
        onClose={() => setDraftReviewOpen(false)} />}
      {outcomeIndex !== null && <TurnOutcomeDialog game={game} reportIndex={outcomeIndex}
        onClose={() => setOutcomeIndex(null)} onNavigate={navigateToTask} onReplay={openReplay} returnFocus={runTurnButton}/>}
      <Sheet open={!!confirm} onClose={() => setConfirm(null)} labelledBy="confirm-sheet-title" returnFocus={runTurnButton}>
        <div className="dialog-body">
          <h2 id="confirm-sheet-title">
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
          <div className="button-row sheet-actions">
            <button onClick={() => setConfirm(null)}>{tr("Keep planning")}</button>
            <button
              className="primary"
              disabled={confirm === "advance" && !!problems.length}
              onClick={() => {
                if (confirm === "new") start();
                else {
                  try {
                    const next = advance(game);
                    change(next);
                    setNotice('');
                    setConfirm(null);
                    setReportIndex(-1);
                    setOutcomeIndex(next.history.length - 1);
                  } catch (error) {
                    setNotice(error instanceof Error ? error.message : String(error));
                    setConfirm(null);
                  }
                }
              }}
            >
              {confirm === "new" ? tr("Start campaign") : idleTurnLabel(game, language)}
            </button>
          </div>
        </div>
      </Sheet>
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
