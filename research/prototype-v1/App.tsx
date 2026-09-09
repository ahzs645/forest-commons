import { useEffect, useRef, useState } from "react";
import {
  Trees,
  LayoutDashboard,
  Map,
  Axe,
  Truck,
  Handshake,
  BarChart3,
  BookOpen,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  CloudRain,
  Snowflake,
  Sun,
  Wind,
  Leaf,
  Factory,
  Wallet,
  Play,
  X,
  Check,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  CircleHelp,
  ShieldCheck,
  Mountain,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  accessible,
  crews,
  distance,
  forecast,
  mills,
  newGame,
  parseSave,
  productNames,
  products,
  projectedStock,
  simulate,
  suggestPlan,
  total,
  trucks,
  upgradeRoad,
  validatePlan,
  weatherNames,
} from "./engine";
import type { Game, Scenario, Weather } from "./engine";
import { allocate, companies, cost, savings, stability } from "./coalition";
import type { Method } from "./coalition";

type Page =
  | "Overview"
  | "Forest & timber"
  | "Harvest planning"
  | "Transport"
  | "Collaboration"
  | "Performance"
  | "Field guide";
const nav: { page: Page; icon: LucideIcon }[] = [
  { page: "Overview", icon: LayoutDashboard },
  { page: "Forest & timber", icon: Map },
  { page: "Harvest planning", icon: Axe },
  { page: "Transport", icon: Truck },
  { page: "Collaboration", icon: Handshake },
  { page: "Performance", icon: BarChart3 },
];
const num = (n: number) => Math.round(n).toLocaleString("en-CA");
const money = (n: number) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);
const short = (n: number) =>
  Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1)}k` : num(n);
const weatherIcon: Record<Weather, LucideIcon> = {
  frozen: Snowflake,
  normal: Sun,
  wet: CloudRain,
  thaw: Wind,
};
const bearingNames = [
  "",
  "All conditions",
  "Wet, normal & frozen",
  "Normal & frozen",
  "Frozen only",
];
const scenarioNames: Record<Scenario, string> = {
  balanced: "Changing seasons",
  "wet-spring": "A difficult spring",
  "dry-summer": "The summer window",
};
const storageKey = "forest-commons-save-v1";
function load(): Game {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? parseSave(raw) : newGame();
  } catch {
    return newGame();
  }
}
function Pill({
  children,
  tone = "green",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`pill ${tone}`}>{children}</span>;
}
function Progress({ value, tone = "green" }: { value: number; tone?: string }) {
  return (
    <div className={`progress ${tone}`}>
      <i style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
function WeatherChip({ weather }: { weather: Weather }) {
  const Icon = weatherIcon[weather];
  return (
    <span className={`weather-chip ${weather}`}>
      <Icon size={16} />
      {weatherNames[weather]}
    </span>
  );
}

function ForestMap({
  game,
  selected,
  onSelect,
  compact = false,
}: {
  game: Game;
  selected: string;
  onSelect: (id: string) => void;
  compact?: boolean;
}) {
  const w = forecast(game.scenario, Math.min(game.week, 12));
  return (
    <div className={`forest-map ${compact ? "compact" : ""}`}>
      <div className="map-heading">
        <span>
          <span className="live-dot" /> NORTH VALLEY DISTRICT
        </span>
        <span>SCHEMATIC · 1 UNIT ≈ 1.6 KM</span>
      </div>
      <svg
        viewBox="0 0 1000 690"
        role="group"
        aria-label="Schematic North Valley forest district showing timber stands, mills and planned haul routes"
      >
        <defs>
          <pattern
            id="grid"
            width="50"
            height="50"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke="#315d4b"
              strokeWidth=".7"
              opacity=".22"
            />
          </pattern>
          <pattern
            id="forest"
            width="36"
            height="36"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="m18 8-7 13h14z m0 6-9 14h18z"
              fill="#709078"
              opacity=".13"
            />
          </pattern>
        </defs>
        <rect width="1000" height="690" fill="#dbe5d6" />
        <rect width="1000" height="690" fill="url(#forest)" />
        <path
          d="M0 0h490l-28 90 73 79-73 120-142 34-160-21L0 359z"
          fill="#c9d9c3"
        />
        <path d="m548 0 73 93 161 13 63 163 155 67V0" fill="#bbd0b9" />
        <g fill="none" stroke="#6e9277" opacity=".16" strokeWidth="1.3">
          {Array.from({ length: 8 }, (_, i) => (
            <path
              key={i}
              d={`M ${-50 + i * 21} ${90 + i * 21} Q 240 ${-30 + i * 32} 350 ${90 + i * 21} T 650 ${80 + i * 27} T 1100 ${50 + i * 34}`}
            />
          ))}
          {Array.from({ length: 5 }, (_, i) => (
            <path
              key={`b${i}`}
              d={`M ${90 + i * 23} 690 Q 290 ${430 + i * 22} 510 ${490 + i * 21} T 1040 ${400 + i * 28}`}
            />
          ))}
        </g>
        <path
          d="M490-20C410 90 592 150 477 254S407 367 510 408 527 519 443 575 456 650 429 720"
          fill="none"
          stroke="#a4c6c9"
          strokeWidth="34"
        />
        <path
          d="M490-20C410 90 592 150 477 254S407 367 510 408 527 519 443 575 456 650 429 720"
          fill="none"
          stroke="#c0dade"
          strokeWidth="23"
        />
        <path
          d="M0 505 230 425 360 450 556 377 745 460 1000 380 M350 690 360 450 309 235 496 90 M556 377 680 185 865 125"
          fill="none"
          stroke="#faf7e9"
          strokeWidth="10"
        />
        <path
          d="M0 505 230 425 360 450 556 377 745 460 1000 380 M350 690 360 450 309 235 496 90 M556 377 680 185 865 125"
          fill="none"
          stroke="#bdb6a1"
          strokeWidth="1.5"
          strokeDasharray="5 4"
        />
        <rect width="1000" height="690" fill="url(#grid)" />
        <g className="map-region">
          <text x="130" y="86">
            N O R T H H I G H L A N D S
          </text>
          <text x="550" y="620">
            V A L L E Y L O W L A N D S
          </text>
        </g>
        <text
          x="490"
          y="540"
          transform="rotate(-52 490 540)"
          className="river-label"
        >
          Willow River
        </text>
        {Object.entries(game.plan.trucks).map(([id, a]) => {
          const s = game.stands.find((s) => s.id === a.stand)!,
            m = mills.find((m) => m.id === a.mill)!;
          return (
            <g key={id}>
              <path
                d={`M${s.x * 10} ${s.y * 7} Q${m.x * 10} ${s.y * 7} ${m.x * 10} ${m.y * 7}`}
                className="haul-route"
              />
              <text
                x={(s.x + m.x) * 5}
                y={(s.y + m.y) * 3.5}
                className="route-label"
              >
                {id}
              </text>
            </g>
          );
        })}
        {game.stands.map((s) => {
          const active = selected === s.id,
            blocked = !accessible(s.bearing, w),
            planned = Object.values(game.plan.crews).includes(s.id);
          return (
            <g
              key={s.id}
              role="button"
              tabIndex={0}
              aria-label={`${s.name}, ${s.reserve ? "protected" : s.owned ? "owned" : "available"}, ${num(s.volume)} cubic metres`}
              onClick={() => onSelect(s.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(s.id);
                }
              }}
              className="stand-marker"
              transform={`translate(${s.x * 10},${s.y * 7})`}
            >
              <circle
                r={active ? 26 : 20}
                fill={s.reserve ? "#a7bea3" : s.owned ? "#2e6550" : "#f4f1e7"}
                stroke={active ? "#d88a3a" : s.owned ? "#edf4e8" : "#8d9f86"}
                strokeWidth={active ? 4 : 2}
              />
              <path
                d="m0-11-7 11h4l-6 7h7v5h4V7h7L3 0h4z"
                fill={s.owned ? "#eff5ea" : "#56735a"}
              />
              {blocked && !s.reserve && (
                <circle cx="15" cy="-16" r="5" fill="#ca8e49" />
              )}
              {planned && <circle cx="-17" cy="-15" r="7" fill="#f5c77c" />}
              <text y="37" textAnchor="middle" className="stand-label">
                {s.id}
              </text>
            </g>
          );
        })}
        {mills.map((m) => (
          <g key={m.id} transform={`translate(${m.x * 10},${m.y * 7})`}>
            <rect
              x="-20"
              y="-20"
              width="40"
              height="40"
              rx="9"
              fill="#314553"
              stroke="#f2f6ee"
              strokeWidth="3"
            />
            <path d="M-10 10V-4l7 4v-5l8 5v-13h5v23z" fill="#f4f2e8" />
            <text y="38" textAnchor="middle" className="mill-label">
              {m.name}
            </text>
          </g>
        ))}
        <g transform="translate(938,72)" fill="#284e3d">
          <path d="m0-21-7 29 7-5 7 5z" />
          <text y="-29" textAnchor="middle" fontSize="14">
            N
          </text>
        </g>
      </svg>
      <div className="map-legend">
        <span>
          <i className="owned" />
          Owned timber
        </span>
        <span>
          <i />
          Available lots
        </span>
        <span>
          <i className="amber" />
          Access risk
        </span>
        <span>
          <i className="mill" />
          Mill
        </span>
      </div>
    </div>
  );
}

function Collaboration() {
  const [count, setCount] = useState<4 | 5>(5),
    [members, setMembers] = useState(["1", "2", "3", "4", "5"]),
    [method, setMethod] = useState<Method>("shapley"),
    [phase, setPhase] = useState<"A" | "B">("B");
  const shares = allocate(members, method, count),
    issues = stability(members, shares, count),
    saved = savings(members, count),
    base = members.reduce((n, c) => n + cost([c], count), 0);
  const toggle = (c: string) => {
    if (members.includes(c)) {
      if (members.length > 1) setMembers(members.filter((v) => v !== c));
    } else if (phase === "B" || members.length < 2) setMembers([...members, c]);
  };
  return (
    <>
      <div className="intro-banner">
        <Handshake />
        <div>
          <h3>A better deal, together.</h3>
          <p>
            Pool transport demand, then negotiate how to share the savings. This
            exercise uses the supplied FORAC coalition costs.
          </p>
        </div>
        <Pill tone="neutral">Independent learning lab</Pill>
      </div>
      <div className="two-col">
        <section className="panel padded">
          <div className="section-title">
            <h2>Build a coalition</h2>
            <select
              aria-label="Company dataset"
              value={count}
              onChange={(e) => {
                const n = Number(e.target.value) as 4 | 5;
                setCount(n);
                setMembers(phase === "A" ? ["1", "2"] : companies.slice(0, n));
              }}
            >
              <option value="5">5 companies</option>
              <option value="4">4 companies</option>
            </select>
          </div>
          <div className="segmented">
            <button
              className={phase === "A" ? "active" : ""}
              onClick={() => {
                setPhase("A");
                setMembers(members.slice(0, 2));
              }}
            >
              Part A · pairs only
            </button>
            <button
              className={phase === "B" ? "active" : ""}
              onClick={() => setPhase("B")}
            >
              Part B · any coalition
            </button>
          </div>
          <p className="muted">
            Select the companies negotiating this agreement. Unselected
            companies operate alone.
          </p>
          {companies.slice(0, count).map((c, i) => (
            <button
              className={`company-row ${members.includes(c) ? "selected" : ""}`}
              key={c}
              onClick={() => toggle(c)}
              disabled={
                phase === "A" && members.length >= 2 && !members.includes(c)
              }
            >
              <span className={`company-avatar c${i}`}>C{c}</span>
              <span>
                <b>Company {c}</b>
                <small>Standalone cost · {num(cost([c], count))} kSEK</small>
              </span>
              <span className="checkbox">
                {members.includes(c) && <Check size={14} />}
              </span>
            </button>
          ))}
          <label className="field-label">
            Savings allocation method
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as Method)}
            >
              <option value="shapley">Shapley · marginal contribution</option>
              <option value="proportional">
                Proportional to standalone cost
              </option>
              <option value="equal">Equal savings per company</option>
            </select>
          </label>
          <p className="footnote">
            Shapley averages each partner's marginal contribution across all
            joining orders. It does not guarantee a stable agreement.
          </p>
        </section>
        <section className="panel padded">
          <span className="eyebrow">THE COLLABORATION DIVIDEND</span>
          <div className="big-number">
            {num(saved)} <span>kSEK saved</span>
          </div>
          <p className="muted">
            {base ? ((saved / base) * 100).toFixed(2) : 0}% lower cost for the
            selected partners
          </p>
          <div className="cost-compare">
            <div>
              <span>Working alone</span>
              <b>{num(base)}</b>
            </div>
            <div>
              <span>Working together</span>
              <b>{num(cost(members, count))}</b>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Partner</th>
                <th>Savings</th>
                <th>Net cost</th>
                <th>Benefit</th>
              </tr>
            </thead>
            <tbody>
              {members
                .slice()
                .sort()
                .map((c) => (
                  <tr key={c}>
                    <td>
                      <b>C{c}</b>
                    </td>
                    <td>{num(shares[c])}</td>
                    <td>{num(cost([c], count) - shares[c])}</td>
                    <td>
                      {((shares[c] / cost([c], count)) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <small className="muted">
            Values in kSEK. Displayed shares are rounded; calculations use full
            precision.
          </small>
          <div className={`callout ${issues.length ? "warning" : ""}`}>
            <ShieldCheck size={20} />
            <div>
              <b>
                {issues.length
                  ? "This allocation has breakaway incentives"
                  : "No profitable breakaway found"}
              </b>
              <p>
                {issues.length
                  ? issues
                      .slice(0, 3)
                      .map(
                        (i) =>
                          `${i.members.map((c) => `C${c}`).join(" + ")} could save ${num(i.gap)} kSEK more independently.`,
                      )
                      .join(" ")
                  : "The allocated savings meet or exceed what each smaller coalition could achieve independently."}
              </p>
            </div>
          </div>
          <p className="footnote">
            Source correction: the five-company workbook's grand total is 10
            units too high. Standalone costs sum to 38,680; grand-coalition
            savings are 2,990 kSEK, matching the Word handout. Workbook currency
            labels differ; this lab follows the handout's kSEK.
          </p>
        </section>
      </div>
    </>
  );
}

export default function App() {
  const [game, setGame] = useState<Game>(load),
    [page, setPage] = useState<Page>("Overview"),
    [selected, setSelected] = useState("S01"),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [notice, setNotice] = useState(""),
    [modal, setModal] = useState<"advance" | "new" | "help" | null>(null),
    [scenario, setScenario] = useState<Scenario>("balanced"),
    [report, setReport] = useState<number | null>(null),
    [bid, setBid] = useState("18"),
    [menu, setMenu] = useState(false),
    [storageOk, setStorageOk] = useState(true);
  const upload = useRef<HTMLInputElement>(null);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(game));
      setStorageOk(true);
    } catch {
      setStorageOk(false);
      setNotice(
        "Browser storage is unavailable. Export your save to keep progress.",
      );
    }
  }, [game]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setModal(null);
        setReport(null);
        setMenu(false);
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const current = game.stands.find((s) => s.id === selected)!,
    week = Math.min(12, game.week),
    weather = forecast(game.scenario, week),
    done = game.week > 12,
    month = Math.ceil(week / 4);
  const harvested = game.history.reduce((n, r) => n + r.harvested, 0),
    delivered = game.history.reduce((n, r) => n + r.delivered, 0),
    emissions = game.history.reduce((n, r) => n + r.emissions, 0),
    roadside = game.stands.reduce((n, s) => n + total(s.stock), 0);
  const targetVolume = mills.reduce((n, m) => n + m.demand, 0),
    monthlyDelivered = done
      ? game.history.slice(-4).reduce((n, r) => n + r.delivered, 0)
      : Object.values(game.delivered).reduce((a, b) => a + b, 0);
  const owned = game.stands.filter((s) => s.owned && !s.reserve),
    assigned = Object.keys(game.plan.crews).length,
    routed = Object.keys(game.plan.trucks).length,
    last = game.history.at(-1),
    errors = validatePlan(game);
  function go(p: Page) {
    setPage(p);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function selectStand(id: string) {
    setSelected(id);
    const s = game.stands.find((s) => s.id === id)!;
    setBid(String(s.price + 3));
  }
  function saveExport() {
    const blob = new Blob([JSON.stringify(game, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `forest-commons-week-${game.week}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice("Your campaign save has been exported.");
  }
  function advance() {
    try {
      const next = simulate(game);
      setGame(next);
      setModal(null);
      setReport(next.history.length - 1);
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  function assignCrew(c: string, id: string) {
    setGame((g) => {
      const p = structuredClone(g.plan);
      if (id) p.crews[c] = id;
      else delete p.crews[c];
      return { ...g, plan: p };
    });
  }
  function assignTruck(t: string, s: string, m: string) {
    setGame((g) => {
      const p = structuredClone(g.plan);
      if (s) p.trucks[t] = { stand: s, mill: m };
      else delete p.trucks[t];
      return { ...g, plan: p };
    });
  }
  function draft() {
    setGame((g) => ({ ...g, plan: suggestPlan(g) }));
    setNotice(
      "A forecast-based plan is ready. Review the crew and truck assignments before advancing.",
    );
  }
  function buy() {
    const value = Number(bid);
    if (!Number.isFinite(value) || value <= 0) {
      setNotice("Enter a positive bid per cubic metre.");
      return;
    }
    setGame((g) => ({
      ...g,
      plan: { ...g.plan, bids: { ...g.plan.bids, [current.id]: value } },
    }));
    setNotice(
      "Bid added. It resolves at the end of the week; winning timber becomes available next week.",
    );
  }
  function cancelBid(id: string) {
    setGame((g) => {
      const bids = { ...g.plan.bids };
      delete bids[id];
      return { ...g, plan: { ...g.plan, bids } };
    });
  }
  const standDetail = (
    <section className="panel stand-detail">
      <div className="section-title">
        <span className="eyebrow">STAND DETAILS</span>
        <Pill
          tone={current.reserve ? "neutral" : current.owned ? "green" : "amber"}
        >
          {current.reserve
            ? "Protected"
            : current.owned
              ? "Owned"
              : "Auction lot"}
        </Pill>
      </div>
      <h2>{current.name}</h2>
      <p className="muted">
        {current.id} · {current.region}
      </p>
      <div className="stand-stats">
        <div>
          <small>Standing timber</small>
          <b>
            {num(current.volume)} <em>m³</em>
          </b>
        </div>
        <div>
          <small>Harvest productivity</small>
          <b>
            {current.rate} <em>m³/day</em>
          </b>
        </div>
      </div>
      <div className="mix-bar">
        {products.map((p) => (
          <i
            key={p}
            className={p}
            style={{ width: `${current.mix[p] * 100}%` }}
          />
        ))}
      </div>
      <div className="mix-legend">
        {products.map((p) => (
          <span key={p}>
            <i className={p} />
            {productNames[p]} <b>{Math.round(current.mix[p] * 100)}%</b>
          </span>
        ))}
      </div>
      <dl>
        <div>
          <dt>Terrain access</dt>
          <dd>{bearingNames[current.bearing]}</dd>
        </div>
        <div>
          <dt>Road access</dt>
          <dd>
            {current.improved ? "All conditions" : bearingNames[current.road]}
          </dd>
        </div>
        <div>
          <dt>Harvest cost</dt>
          <dd>{money(current.cost)}/m³</dd>
        </div>
        <div>
          <dt>Roadside stock</dt>
          <dd>{num(total(current.stock))} m³</dd>
        </div>
      </dl>
      {current.reserve ? (
        <div className="callout">
          <Leaf size={18} />
          <p>
            This stand is protected habitat and stays outside the timber supply.
          </p>
        </div>
      ) : current.owned ? (
        <>
          <button
            className="button primary full"
            onClick={() => go("Harvest planning")}
            disabled={done}
          >
            Plan a harvest <ArrowRight size={16} />
          </button>
          <button
            className="button full"
            disabled={done || current.improved || game.cash < 15000}
            onClick={() => {
              try {
                setGame(upgradeRoad(game, current.id));
                setNotice(
                  "Road improved for all-weather hauling. Terrain access is unchanged.",
                );
              } catch (e) {
                setNotice((e as Error).message);
              }
            }}
          >
            {current.improved ? (
              <>
                <Check size={15} />
                Road improved
              </>
            ) : (
              <>Improve road · $15,000</>
            )}
          </button>
          <p className="footnote">
            Road improvements are charged immediately. Terrain restrictions
            still apply.
          </p>
        </>
      ) : (
        <>
          <label className="field-label">
            Your bid · CAD per m³
            <input
              aria-label="Bid per cubic metre"
              type="number"
              min="0.01"
              step="0.5"
              value={bid}
              disabled={done}
              onChange={(e) => setBid(e.target.value)}
            />
          </label>
          <div className="bid-total">
            <span>Total commitment</span>
            <b>{money((Number(bid) || 0) * current.volume)}</b>
          </div>
          <button className="button primary full" onClick={buy} disabled={done}>
            {game.plan.bids[current.id] ? "Update bid" : "Place sealed bid"}
            <ArrowRight size={16} />
          </button>
          {game.plan.bids[current.id] && (
            <button
              className="text-button"
              onClick={() => cancelBid(current.id)}
            >
              Withdraw bid
            </button>
          )}
          <p className="footnote">
            Guide price {money(current.price)}/m³. Rival bids are hidden until
            resolution. This is a simulated auction.
          </p>
        </>
      )}
    </section>
  );
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("Overview");
          }}
        >
          <span className="brand-mark">
            <Trees size={26} />
          </span>
          <span>
            forest<span className="brand-light">commons</span>
            <small>THE WOOD SUPPLY GAME</small>
          </span>
        </a>
        <div className="workspace-label">YOUR OPERATIONS</div>
        <nav>
          {nav.map(({ page: p, icon: Icon }) => (
            <button
              key={p}
              className={page === p ? "active" : ""}
              onClick={() => go(p)}
            >
              <Icon size={18} />
              {p}
              {p === page && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="scenario-card">
            <span className="eyebrow">CURRENT CAMPAIGN</span>
            <b>North Valley</b>
            <span>{scenarioNames[game.scenario]}</span>
            <Progress value={done ? 100 : ((week - 1) / 12) * 100} />
            <small>
              {done ? "Campaign complete" : `Week ${week} of 12`}{" "}
              <span>Solo sandbox</span>
            </small>
          </div>
          <button
            className={`guide-link ${page === "Field guide" ? "active" : ""}`}
            onClick={() => go("Field guide")}
          >
            <BookOpen size={18} />
            Field guide
            <ArrowUpRight size={16} />
          </button>
          <div className="profile">
            <span>FR</span>
            <div>
              <b>Forest manager</b>
              <small>All operating roles</small>
            </div>
            <ShieldCheck size={16} />
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="mobile-menu"
              onClick={() => setMenu(!menu)}
              aria-label="Toggle navigation"
            >
              <Trees size={23} />
            </button>
            <span>North Valley</span>
            <ChevronRight size={13} />
            <b>{page}</b>
          </div>
          <div className="top-actions">
            <span className="save-status">
              <i />
              {storageOk ? "Saved on this device" : "Export to save progress"}
            </span>
            <button
              title="Export campaign"
              aria-label="Export campaign"
              onClick={saveExport}
            >
              <Download size={17} />
            </button>
            <button
              title="Import campaign"
              aria-label="Import campaign"
              onClick={() => upload.current?.click()}
            >
              <Upload size={17} />
            </button>
            <button
              title="New campaign"
              aria-label="New campaign"
              onClick={() => setModal("new")}
            >
              <RotateCcw size={17} />
            </button>
            <button
              title="How to play"
              aria-label="How to play"
              onClick={() => setModal("help")}
            >
              <CircleHelp size={18} />
            </button>
            <input
              hidden
              type="file"
              accept=".json,application/json"
              ref={upload}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  if (file.size > 2_000_000)
                    throw new Error("Save files must be smaller than 2 MB.");
                  setGame(parseSave(await file.text()));
                  setNotice("Campaign imported successfully.");
                  setReport(null);
                } catch (err) {
                  setNotice((err as Error).message);
                }
                e.target.value = "";
              }}
            />
          </div>
        </header>
        <div className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {page === "Collaboration"
                  ? "FORAC LEARNING LAB"
                  : `CAMPAIGN 01 / MONTH ${month} / ${done ? "COMPLETE" : `WEEK ${week}`}`}
              </div>
              <h1>
                {page === "Overview" ? "A forest of possibilities." : page}
              </h1>
              <p>
                {page === "Overview"
                  ? "Keep the mills supplied. Keep the forest resilient."
                  : page === "Forest & timber"
                    ? "Know your wood. Secure the right supply for the weeks ahead."
                    : page === "Harvest planning"
                      ? "Put the right crew in the right stand, at the right time."
                      : page === "Transport"
                        ? "Turn roadside inventory into reliable mill deliveries."
                        : page === "Collaboration"
                          ? "Find an agreement that makes working together worthwhile."
                          : page === "Performance"
                            ? "Understand the consequences of each operating decision."
                            : "The rules, the research, and a place to start."}
              </p>
            </div>
            {page !== "Collaboration" && page !== "Field guide" && (
              <button
                className="button primary advance"
                onClick={() => setModal(done ? "new" : "advance")}
              >
                <Play size={15} fill="currentColor" />
                {done ? "New campaign" : `Advance week ${week}`}
                <ArrowRight size={16} />
              </button>
            )}
          </div>
          {page === "Overview" && (
            <>
              <div className="metrics">
                <Metric
                  label="AVAILABLE CASH"
                  value={money(game.cash)}
                  icon={Wallet}
                  sub={
                    last
                      ? `${last.revenue - last.cost >= 0 ? "+" : ""}${money(last.revenue - last.cost)} last week`
                      : "$400,000 starting capital"
                  }
                />
                <Metric
                  label="MILL FULFILLMENT"
                  value={`${Math.round((monthlyDelivered / targetVolume) * 100)}%`}
                  icon={Factory}
                  sub={`${num(monthlyDelivered)} / ${num(targetVolume)} m³ this month`}
                />
                <Metric
                  label="ROADSIDE INVENTORY"
                  value={`${short(roadside)} m³`}
                  icon={Truck}
                  sub="Harvested and ready to haul"
                />
                <Metric
                  label="FOREST RETENTION"
                  value={`${game.plan.retention}%`}
                  icon={Leaf}
                  sub="Minimum standing volume per stand"
                />
              </div>
              <div className="overview-grid">
                <section className="panel map-panel">
                  <div className="section-title">
                    <h2>Your forest, at a glance</h2>
                    <button
                      className="text-button"
                      onClick={() => go("Forest & timber")}
                    >
                      Explore district
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                  <ForestMap
                    game={game}
                    selected={selected}
                    onSelect={selectStand}
                    compact
                  />
                  <div className="map-selection">
                    <div>
                      <Trees size={18} />
                      <span>
                        <b>{current.name}</b>
                        <small>
                          {num(current.volume)} m³ standing · {current.region}
                        </small>
                      </span>
                    </div>
                    <button
                      className="button small"
                      onClick={() => go("Forest & timber")}
                    >
                      View stand
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </section>
                <aside className="overview-aside">
                  <section className="panel weather-panel">
                    <div className="section-title">
                      <h2>The week ahead</h2>
                      <CloudRain size={19} />
                    </div>
                    <WeatherChip weather={weather} />
                    <p>
                      {weather === "thaw"
                        ? "Thaw limits access to the most resilient sites. Keep roadside stocks near dependable roads."
                        : weather === "wet"
                          ? "Wet weather narrows your options. Check terrain and road access separately."
                          : weather === "frozen"
                            ? "Frozen ground opens sensitive terrain. Consider building stocks before the thaw."
                            : "A good operating window. Balance production with the trucks available to haul it."}
                    </p>
                    <div className="forecast-row">
                      {Array.from(
                        { length: Math.min(4, 13 - week) },
                        (_, i) => {
                          const w = forecast(game.scenario, week + i),
                            Icon = weatherIcon[w];
                          return (
                            <div key={i}>
                              <small>WK {week + i}</small>
                              <Icon size={20} />
                              <span>
                                {w === "frozen"
                                  ? "Frozen"
                                  : w === "normal"
                                    ? "Normal"
                                    : w === "wet"
                                      ? "Wet"
                                      : "Thaw"}
                              </span>
                            </div>
                          );
                        },
                      )}
                    </div>
                    <small className="footnote">
                      Forecast only. Actual weather is revealed when the week
                      resolves.
                    </small>
                  </section>
                  <section className="panel plan-panel">
                    <div className="section-title">
                      <h2>Your operating plan</h2>
                      <span className="muted">{assigned + routed}/8</span>
                    </div>
                    <button onClick={() => go("Harvest planning")}>
                      <span className="plan-icon">
                        <Axe size={18} />
                      </span>
                      <span>
                        <b>Assign harvest crews</b>
                        <small>{assigned} of 4 crews scheduled</small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                    <button onClick={() => go("Transport")}>
                      <span className="plan-icon">
                        <Truck size={18} />
                      </span>
                      <span>
                        <b>Schedule deliveries</b>
                        <small>{routed} of 4 trucks assigned</small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                    <button
                      className="suggest-link"
                      onClick={draft}
                      disabled={done}
                    >
                      <Sparkles size={16} />
                      Draft a plan from the forecast
                    </button>
                  </section>
                </aside>
              </div>
              <div className="bottom-grid">
                <section className="panel padded">
                  <div className="section-title">
                    <h2>Mill delivery commitments</h2>
                    <Pill tone="neutral">Month {month}</Pill>
                  </div>
                  <MillGoals game={game} />
                </section>
                <section className="learning-card">
                  <div className="learning-icon">
                    <Handshake size={25} />
                  </div>
                  <span className="eyebrow">BETTER TOGETHER</span>
                  <h2>
                    What is a fair share
                    <br />
                    of the savings?
                  </h2>
                  <p>
                    Explore how five forestry companies can reduce transport
                    costs through collaboration.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => go("Collaboration")}
                  >
                    Enter the collaboration lab
                    <ArrowRight size={16} />
                  </button>
                </section>
              </div>
            </>
          )}
          {page === "Forest & timber" && (
            <>
              <div className="forest-layout">
                <div>
                  <ForestMap
                    game={game}
                    selected={selected}
                    onSelect={selectStand}
                  />
                  <div className="callout slim">
                    <Map size={18} />
                    <p>
                      North Valley is a fictional teaching district. Click a
                      stand to inspect timber, access conditions, and purchase
                      options.
                    </p>
                  </div>
                </div>
                {standDetail}
              </div>
              <section className="panel padded">
                <div className="section-title">
                  <h2>Timber inventory</h2>
                  <div className="table-filters">
                    <input
                      aria-label="Search stands"
                      placeholder="Search stands…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <select
                      aria-label="Filter stands"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="all">All stands</option>
                      <option value="owned">Owned timber</option>
                      <option value="auction">Auction lots</option>
                      <option value="accessible">Accessible in forecast</option>
                    </select>
                  </div>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Stand</th>
                        <th>Status</th>
                        <th>Standing m³</th>
                        <th>Roadside m³</th>
                        <th>Terrain</th>
                        <th>Road</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {game.stands
                        .filter(
                          (s) =>
                            (s.name + " " + s.id)
                              .toLowerCase()
                              .includes(search.toLowerCase()) &&
                            (filter === "all" ||
                              (filter === "owned" && s.owned) ||
                              (filter === "auction" &&
                                !s.owned &&
                                !s.reserve) ||
                              (filter === "accessible" &&
                                accessible(s.bearing, weather) &&
                                !s.reserve)),
                        )
                        .map((s) => (
                          <tr
                            key={s.id}
                            className={selected === s.id ? "selected-row" : ""}
                          >
                            <td>
                              <b>{s.name}</b>
                              <small>
                                {s.id} · {s.region}
                              </small>
                            </td>
                            <td>
                              <Pill
                                tone={
                                  s.reserve
                                    ? "neutral"
                                    : s.owned
                                      ? "green"
                                      : "amber"
                                }
                              >
                                {s.reserve
                                  ? "Protected"
                                  : s.owned
                                    ? "Owned"
                                    : "Auction"}
                              </Pill>
                            </td>
                            <td>{num(s.volume)}</td>
                            <td>{num(total(s.stock))}</td>
                            <td>{bearingNames[s.bearing]}</td>
                            <td>
                              {s.improved
                                ? "All conditions"
                                : bearingNames[s.road]}
                            </td>
                            <td>
                              <button
                                className="text-button"
                                onClick={() => {
                                  selectStand(s.id);
                                  window.scrollTo({
                                    top: 0,
                                    behavior: "smooth",
                                  });
                                }}
                              >
                                Inspect
                                <ArrowUpRight size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
          {page === "Harvest planning" && (
            <>
              <div className="intro-banner">
                <Axe />
                <div>
                  <h3>Four crews. Five working days. One shared plan.</h3>
                  <p>
                    Crews can share a stand, but harvest is capped by remaining
                    timber and your retention setting. Actual weather can stop a
                    crew.
                  </p>
                </div>
                <WeatherChip weather={weather} />
              </div>
              <div className="planning-layout">
                <section className="panel padded">
                  <div className="section-title">
                    <h2>Crew assignments</h2>
                    <button
                      className="button small"
                      onClick={draft}
                      disabled={done}
                    >
                      <Sparkles size={15} />
                      Draft plan
                    </button>
                  </div>
                  {crews.map((c, i) => {
                    const s = game.stands.find(
                        (s) => s.id === game.plan.crews[c],
                      ),
                      blocked = s && !accessible(s.bearing, weather);
                    return (
                      <div className="resource-row" key={c}>
                        <span className="resource-icon">
                          <Axe size={21} />
                        </span>
                        <div className="resource-name">
                          <b>Crew {i + 1}</b>
                          <small>{c} · 5 days available</small>
                        </div>
                        <label>
                          <span className="sr-only">
                            Stand for crew {i + 1}
                          </span>
                          <select
                            disabled={done}
                            value={s?.id || ""}
                            onChange={(e) => assignCrew(c, e.target.value)}
                          >
                            <option value="">Unassigned</option>
                            {owned.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} · {s.rate} m³/day
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="resource-status">
                          {s ? (
                            <>
                              <b>{num(s.rate * 5)} m³</b>
                              <small className={blocked ? "warn-text" : ""}>
                                {blocked
                                  ? "Forecast access risk"
                                  : "Weekly capacity"}
                              </small>
                            </>
                          ) : (
                            <span className="muted">Idle</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="callout">
                    <Leaf size={20} />
                    <div>
                      <b>Leave growing stock for the future</b>
                      <p>
                        Retention reserves a share of each stand's initial
                        volume. It reduces this campaign's harvestable timber.
                      </p>
                      <label className="range-label">
                        Minimum retention <b>{game.plan.retention}%</b>
                        <input
                          aria-label="Minimum forest retention"
                          type="range"
                          min="0"
                          max="30"
                          step="5"
                          disabled={done}
                          value={game.plan.retention}
                          onChange={(e) =>
                            setGame({
                              ...game,
                              plan: {
                                ...game.plan,
                                retention: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </label>
                    </div>
                  </div>
                </section>
                <section className="panel padded">
                  <div className="section-title">
                    <h2>Stand readiness</h2>
                    <Pill tone="neutral">Forecast</Pill>
                  </div>
                  {owned.map((s) => (
                    <div className="readiness-row" key={s.id}>
                      <span
                        className={
                          accessible(s.bearing, weather)
                            ? "ready-dot"
                            : "risk-dot"
                        }
                      />
                      <div>
                        <b>{s.name}</b>
                        <small>{bearingNames[s.bearing]}</small>
                      </div>
                      <span>
                        {num(
                          Math.max(
                            0,
                            s.volume - (s.initial * game.plan.retention) / 100,
                          ),
                        )}{" "}
                        m³
                      </span>
                    </div>
                  ))}
                  <p className="footnote">
                    Amounts show available volume above the selected retention
                    floor. Protected stands cannot be assigned.
                  </p>
                </section>
              </div>
            </>
          )}
          {page === "Transport" && (
            <>
              <div className="intro-banner">
                <Truck />
                <div>
                  <h3>The final kilometre matters.</h3>
                  <p>
                    Haul existing stock and this week's planned harvest. Trucks
                    deliver one assortment to one mill each week.
                  </p>
                </div>
                <WeatherChip weather={weather} />
              </div>
              <section className="panel padded">
                <div className="section-title">
                  <h2>Truck dispatch</h2>
                  <span className="muted">
                    Capacity decreases with haul distance
                  </span>
                </div>
                {trucks.map((t, i) => {
                  const a = game.plan.trucks[t],
                    s = game.stands.find((s) => s.id === a?.stand),
                    m = mills.find((m) => m.id === a?.mill) || mills[0];
                  return (
                    <div className="resource-row truck-row" key={t}>
                      <span className="resource-icon blue">
                        <Truck size={21} />
                      </span>
                      <div className="resource-name">
                        <b>Truck {i + 1}</b>
                        <small>{t}</small>
                      </div>
                      <label>
                        <small>FROM STAND</small>
                        <select
                          aria-label={`Source for truck ${i + 1}`}
                          disabled={done}
                          value={s?.id || ""}
                          onChange={(e) => assignTruck(t, e.target.value, m.id)}
                        >
                          <option value="">Unassigned</option>
                          {owned.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <ArrowRight size={18} className="muted" />
                      <label>
                        <small>TO MILL</small>
                        <select
                          aria-label={`Destination for truck ${i + 1}`}
                          disabled={done || !s}
                          value={m.id}
                          onChange={(e) =>
                            assignTruck(t, s!.id, e.target.value)
                          }
                        >
                          {mills.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} · {productNames[m.product]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="resource-status">
                        {s ? (
                          <>
                            <b>{distance(s, m)} km</b>
                            <small>
                              {num(
                                Math.floor(1500 / (1 + distance(s, m) / 100)),
                              )}{" "}
                              m³ capacity
                            </small>
                            {!accessible(s.improved ? 1 : s.road, weather) && (
                              <small className="warn-text">
                                Road access risk
                              </small>
                            )}
                          </>
                        ) : (
                          <span className="muted">Idle</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>
              <div className="bottom-grid">
                <section className="panel padded">
                  <div className="section-title">
                    <h2>Stock by assortment</h2>
                    <Pill tone="neutral">Current + planned</Pill>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Assortment</th>
                        <th>At roadside</th>
                        <th>After planned harvest*</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <tr key={p}>
                          <td>{productNames[p]}</td>
                          <td>
                            {num(owned.reduce((n, s) => n + s.stock[p], 0))} m³
                          </td>
                          <td>
                            {num(
                              owned.reduce(
                                (n, s) => n + projectedStock(game, s)[p],
                                0,
                              ),
                            )}{" "}
                            m³
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="footnote">
                    *Before weather restrictions and truck loading. Several
                    trucks share available inventory; nothing can be shipped
                    twice.
                  </p>
                </section>
                <section className="panel padded">
                  <h2>Mill delivery commitments</h2>
                  <MillGoals game={game} />
                </section>
              </div>
            </>
          )}
          {page === "Collaboration" && <Collaboration />}
          {page === "Performance" && (
            <>
              <div className="metrics">
                <Metric
                  label="TOTAL HARVEST"
                  value={`${short(harvested)} m³`}
                  icon={Axe}
                  sub={`${game.history.length} weeks completed`}
                />
                <Metric
                  label="TOTAL DELIVERIES"
                  value={`${short(delivered)} m³`}
                  icon={Factory}
                  sub="Physical volume delivered to mills"
                />
                <Metric
                  label="MODELLED EMISSIONS"
                  value={`${(emissions / 1000).toFixed(1)} t`}
                  icon={Leaf}
                  sub="Synthetic operational CO₂e estimate"
                />
                <Metric
                  label="CASH CHANGE"
                  value={money(game.cash - 400000)}
                  icon={Wallet}
                  sub="Includes bids and road improvements"
                />
              </div>
              <section className="panel padded">
                <div className="section-title">
                  <h2>Production and deliveries</h2>
                  <div className="chart-legend">
                    <span>
                      <i />
                      Harvested
                    </span>
                    <span>
                      <i />
                      Delivered
                    </span>
                  </div>
                </div>
                <div className="history-chart">
                  {Array.from({ length: 12 }, (_, i) => {
                    const r = game.history[i],
                      max = Math.max(
                        4000,
                        ...game.history.map((r) => r.harvested),
                      );
                    return (
                      <div className="chart-week" key={i}>
                        <div className="chart-bars">
                          <div
                            style={{
                              height: `${r ? (r.harvested / max) * 100 : 0}%`,
                            }}
                            title={`${num(r?.harvested || 0)} m³ harvested`}
                          />
                          <div
                            style={{
                              height: `${r ? (r.delivered / max) * 100 : 0}%`,
                            }}
                            title={`${num(r?.delivered || 0)} m³ delivered`}
                          />
                        </div>
                        <span>{i + 1}</span>
                      </div>
                    );
                  })}
                </div>
                <small className="muted">
                  Week of campaign · bar heights show volume in m³
                </small>
              </section>
              <section className="panel padded">
                <div className="section-title">
                  <h2>Weekly operating ledger</h2>
                  <button className="text-button" onClick={saveExport}>
                    Export results
                    <Download size={15} />
                  </button>
                </div>
                {!game.history.length ? (
                  <div className="empty-state">
                    <BarChart3 size={32} />
                    <h3>Your story starts with the first week.</h3>
                    <p>
                      Build an operating plan and advance a week to see your
                      results.
                    </p>
                    <button
                      className="button"
                      onClick={() => go("Harvest planning")}
                    >
                      Plan your first harvest
                      <ArrowRight size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Week</th>
                          <th>Actual weather</th>
                          <th>Harvest m³</th>
                          <th>Delivery m³</th>
                          <th>Costs</th>
                          <th>Revenue</th>
                          <th>Cash</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {game.history.map((r, i) => (
                          <tr key={r.week}>
                            <td>
                              <b>{r.week}</b>
                            </td>
                            <td>
                              <WeatherChip weather={r.weather} />
                            </td>
                            <td>{num(r.harvested)}</td>
                            <td>{num(r.delivered)}</td>
                            <td>{money(r.cost)}</td>
                            <td>{money(r.revenue)}</td>
                            <td>{money(r.cash)}</td>
                            <td>
                              <button
                                className="text-button"
                                onClick={() => setReport(i)}
                              >
                                Review
                                <ArrowUpRight size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="footnote">
                  Road improvements ({money(game.upgrades)}) are paid
                  immediately outside the weekly ledger. Emissions and
                  disturbance are illustrative teaching models, not validated
                  environmental measurements.
                </p>
              </section>
            </>
          )}
          {page === "Field guide" && (
            <>
              <section className="guide-hero">
                <Mountain size={40} />
                <span className="eyebrow">WELCOME TO FOREST COMMONS</span>
                <h2>
                  Manage the whole journey.
                  <br />
                  Learn from every week.
                </h2>
                <p>
                  You manage a fictional forest enterprise over 12 weeks. Each
                  four-week month has mill commitments. Every purchase, crew
                  assignment and truck route affects what you can deliver.
                </p>
                <button
                  className="button primary"
                  onClick={() => {
                    draft();
                    go("Harvest planning");
                  }}
                  disabled={done}
                >
                  <Sparkles size={16} />
                  Draft your first operating plan
                </button>
              </section>
              <div className="guide-grid">
                {[
                  {
                    icon: Trees,
                    title: "1. Secure the supply",
                    text: "Start with six owned stands and roadside stock at Cedar Reach. Bid for additional timber in Forest & timber. Bids resolve at week end and won lots become harvestable next week.",
                  },
                  {
                    icon: Axe,
                    title: "2. Plan the harvest",
                    text: "Assign four crews for five days each. Check terrain access against the forecast. Harvesting leaves your chosen retention volume standing. Actual weather may halt planned work.",
                  },
                  {
                    icon: Truck,
                    title: "3. Make the delivery",
                    text: "Assign four trucks to source stands and compatible mills. Hauling uses road access, available assortment stock, and distance-dependent capacity. Current-week harvest may ship in the same week.",
                  },
                  {
                    icon: Target,
                    title: "4. Review and adapt",
                    text: "Advance the week to reveal weather and results. Every fourth week, deliveries within 90–110% of demand earn a $3/m³ bonus. Shortfalls below 90% cost $12/m³. Assignments clear each week for replanning.",
                  },
                ].map(({ icon: Icon, title, text }) => (
                  <section className="panel padded" key={title}>
                    <Icon className="green-text" size={25} />
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </section>
                ))}
              </div>
              <section className="panel padded source-notes">
                <h2>Built from your forestry learning materials</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>What it contributes</th>
                      <th>Implementation</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Harvest Arena + introduction slides</td>
                      <td>
                        Crews, terrain bearing capacity, forecasts, monthly
                        goals
                      </td>
                      <td>Adapted into the 12-week campaign</td>
                    </tr>
                    <tr>
                      <td>Virtual Wood Supply Arena + 2022 abstract</td>
                      <td>
                        Purchasing, production, transport and roadside stocks
                      </td>
                      <td>Unified solo management workflow</td>
                    </tr>
                    <tr>
                      <td>BidGame user guide + Raja Ziedi thesis</td>
                      <td>Timber auctions and uncertain procurement</td>
                      <td>
                        Simplified sealed bids against deterministic simulated
                        rivals
                      </td>
                    </tr>
                    <tr>
                      <td>Collaboration handouts and workbooks</td>
                      <td>Four- and five-company coalition costs</td>
                      <td>Original cost tables; recomputed savings</td>
                    </tr>
                    <tr>
                      <td>D'Amours–Rönnqvist (2013), Frisk et al. (2010)</td>
                      <td>
                        Cost sharing, Shapley allocations, coalition stability
                      </td>
                      <td>Allocation comparison and breakaway checks</td>
                    </tr>
                  </tbody>
                </table>
                <div className="callout">
                  <BookOpen size={22} />
                  <div>
                    <b>A playable prototype with explicit assumptions</b>
                    <p>
                      The district, prices, fleet capacities, road upgrades,
                      retention, emissions, and weather sequences are synthetic.
                      They are not a reproduction of FORAC's hidden simulation.
                      Multiplayer, instructor rooms, full route optimization,
                      forest regrowth, and validated ecology remain future work.
                      The collaboration lab is separate from campaign cash.
                    </p>
                  </div>
                </div>
                <p>
                  Budgets use CAD in the campaign; collaboration uses kSEK.
                  Saves stay in this browser and can be exported. No server or
                  account is required.
                </p>
              </section>
            </>
          )}
          <footer>
            <span>
              <Trees size={14} />
              FOREST COMMONS
            </span>
            <span>Learn by managing. Improve by reflecting.</span>
            <span>Research prototype · Vite 8</span>
          </footer>
        </div>
      </main>
      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {modal && (
        <Dialog
          title={
            modal === "advance"
              ? `Resolve week ${week}`
              : modal === "new"
                ? "Start a new campaign"
                : "How to play"
          }
          close={() => setModal(null)}
        >
          {modal === "advance" ? (
            <>
              <p>
                Your assignments resolve against the actual weather. Review your
                plan before committing this week.
              </p>
              <div className="review-counts">
                <span>
                  <b>{assigned}/4</b>crews assigned
                </span>
                <span>
                  <b>{routed}/4</b>trucks routed
                </span>
                <span>
                  <b>{Object.keys(game.plan.bids).length}</b>sealed bids
                </span>
              </div>
              {(assigned === 0 || routed === 0) && (
                <div className="callout warning">
                  <AlertTriangle size={18} />
                  <p>
                    {assigned === 0 ? "No crews are assigned. " : ""}
                    {routed === 0 ? "No trucks are assigned. " : ""}Fixed
                    operating costs still apply.
                  </p>
                </div>
              )}
              {errors.map((e) => (
                <p className="error-text" key={e}>
                  {e}
                </p>
              ))}
              <p className="footnote">
                This commits the week and clears assignments. Export a save
                first if you want to revisit this decision.
              </p>
              <div className="dialog-actions">
                <button className="button" onClick={() => setModal(null)}>
                  Keep planning
                </button>
                <button
                  className="button primary"
                  onClick={advance}
                  disabled={errors.length > 0}
                >
                  Run this week
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          ) : modal === "new" ? (
            <>
              <p>
                Choose a weather challenge. Starting a new campaign replaces the
                current local save.
              </p>
              <label className="field-label">
                Scenario
                <select
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value as Scenario)}
                >
                  {Object.entries(scenarioNames).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="dialog-actions">
                <button className="button" onClick={saveExport}>
                  <Download size={16} />
                  Export current save
                </button>
                <button
                  className="button primary"
                  onClick={() => {
                    setGame(newGame(scenario));
                    setModal(null);
                    setReport(null);
                    go("Overview");
                  }}
                >
                  Start campaign
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          ) : (
            <>
              <p>
                Begin in Harvest planning and assign crews. In Transport, assign
                trucks to move timber to mills. Advance the week to see what
                happened.
              </p>
              <p>
                Use “Draft plan” for a forecast-based starting point. It is a
                simple heuristic, not an optimal solution. Keep extra supply
                available for changing weather.
              </p>
              <button
                className="button primary"
                onClick={() => {
                  setModal(null);
                  go("Field guide");
                }}
              >
                Open the field guide
                <ArrowRight size={16} />
              </button>
            </>
          )}
        </Dialog>
      )}
      {report !== null &&
        game.history[report] &&
        (() => {
          const r = game.history[report];
          return (
            <Dialog
              title={`Week ${r.week} · operating review`}
              close={() => setReport(null)}
            >
              <WeatherChip weather={r.weather} />
              <div className="report-stats">
                <div>
                  <small>Harvested</small>
                  <b>{num(r.harvested)} m³</b>
                </div>
                <div>
                  <small>Delivered</small>
                  <b>{num(r.delivered)} m³</b>
                </div>
                <div>
                  <small>Net cash flow</small>
                  <b>{money(r.revenue - r.cost)}</b>
                </div>
                <div>
                  <small>Crew utilization</small>
                  <b>{Math.round(r.crewUse * 100)}%</b>
                </div>
                <div>
                  <small>Truck utilization</small>
                  <b>{Math.round(r.truckUse * 100)}%</b>
                </div>
                <div>
                  <small>Disturbance index*</small>
                  <b>{r.damage.toFixed(1)}</b>
                </div>
              </div>
              <h3>What happened</h3>
              {r.messages.length ? (
                <ul className="event-list">
                  {r.messages.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              ) : (
                <p>
                  All assigned work completed within the available inventory and
                  capacity limits.
                </p>
              )}
              <p className="footnote">
                *Synthetic disturbance units for comparing decisions. Not a
                measured area or ecological outcome.
              </p>
              {r.week === 12 && (
                <div className="callout">
                  <Target size={20} />
                  <div>
                    <b>Campaign complete</b>
                    <p>
                      You delivered {num(delivered)} m³ and finished with{" "}
                      {money(game.cash)}. Review your ledger, then try another
                      weather scenario.
                    </p>
                  </div>
                </div>
              )}
              <button
                className="button primary full"
                onClick={() => {
                  setReport(null);
                  go(r.week === 12 ? "Performance" : "Overview");
                }}
              >
                {r.week === 12 ? "View campaign results" : "Plan the next week"}
                <ArrowRight size={16} />
              </button>
            </Dialog>
          );
        })()}
    </div>
  );
}
function Metric({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
}) {
  return (
    <section className="metric">
      <div>
        <span>{label}</span>
        <Icon size={18} />
      </div>
      <strong>{value}</strong>
      <small>{sub}</small>
    </section>
  );
}
function MillGoals({ game }: { game: Game }) {
  return (
    <div className="mill-goals">
      {mills.map((m) => {
        const amount =
          game.week > 12
            ? game.history.slice(-4).reduce((n, r) => n + r.deliveries[m.id], 0)
            : game.delivered[m.id];
        return (
          <div className="mill-goal" key={m.id}>
            <span className="mill-icon">
              <Factory size={18} />
            </span>
            <div>
              <div>
                <b>{m.name}</b>
                <span>
                  {num(amount)} <small>/ {num(m.demand)} m³</small>
                </span>
              </div>
              <Progress value={(amount / m.demand) * 100} />
              <small>
                {productNames[m.product]} · {money(m.price)}/m³
              </small>
            </div>
            <span>{Math.round((amount / m.demand) * 100)}%</span>
          </div>
        );
      })}
    </div>
  );
}
function Dialog({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    const first = ref.current?.querySelector<HTMLElement>(
      "button,input,select",
    );
    first?.focus();
    function trap(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const items = Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]',
        ) || [],
      );
      const a = items[0],
        b = items.at(-1);
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        b?.focus();
      } else if (!e.shiftKey && document.activeElement === b) {
        e.preventDefault();
        a?.focus();
      }
    }
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      before?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop" onClick={close}>
      <div
        ref={ref}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="section-title">
          <h2>{title}</h2>
          <button
            className="icon-button"
            onClick={close}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
