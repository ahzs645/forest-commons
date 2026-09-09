import { acceptReciprocal, renewReciprocal } from "../src/simulation/reciprocal";
import { applyHarvestAuthorization, applyRoadAuthorization, settlePostHarvestObligations } from '../src/simulation/tenure';
import { realizeAuctions, unreleasedAuctions, referencesWithheld, filterAuctionObservation } from "./auction-disclosure";
import { mobilize } from "../src/simulation/mobilization";
import {acceptOfftake,acceptAgreement} from "../src/simulation/offtake";
import { disclosureAction, disclosureView, type DisclosureExperiment } from "../src/simulation/disclosure";
import {teachingWeatherCharts} from "../src/scenarios/weather-charts";
import { randomBytes, createHash, randomInt } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import {
  createGame,
  advance,
  draftPlan,
  purchase,
  refuse,
  improveRoad,
  planProblems,
} from "../src/simulation/engine";
import { parseGame, validateRegion } from "../src/simulation/validation";
import { respondToDisruption } from "../src/simulation/disruptions";
import { propose, respond } from "../src/simulation/negotiation";
import { quebec } from "../src/scenarios/quebec";
import { serializeGame } from "../src/simulation/save-format";
import type { Game, Plan } from "../src/simulation/types";
export const roles = [
  "instructor",
  "purchase",
  "production",
  "transport",
  "company1",
  "company2",
  "company3",
  "company4",
  "company5",
] as const;
export type Role = (typeof roles)[number];
interface SessionTimer { deadline: number | null; remainingMs: number; paused: boolean }
interface Room {
  timer?: SessionTimer;
  id: string;
  revision: number;
  recoveryHash?: string;
  disclosure?: DisclosureExperiment;
  game: Game;
  tokens: Partial<Record<Role, string>>;
  audit: { revision: number; role: Role; action: string; at: string }[];
}
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export class RoomError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
/** Redact source calendars as well as the active window; only current settled chart observations survive. */
export function maskClassroomWeather(game: Game) {
  const maskRegion = (region: Game["region"], active: boolean) => {
    const revealed = new Set(active ? (region.disruptions ?? []).filter(e => e.revealWeek <= game.week).map(e => e.id) : []);
    for (const weather of Object.values(region.weather))
      for (const zone of region.zones) weather.actual[zone.id] = [...weather.forecast[zone.id]];
    if (region.seasonCalendar) {
      for (const weather of Object.values(region.seasonCalendar.weather))
        for (const zone of region.zones) weather.actual[zone.id] = [...weather.forecast[zone.id]];
      region.seasonCalendar.events = region.seasonCalendar.events.filter(e => revealed.has(e.id));
    }
    if (region.weatherCharts) {
      const first = region.weatherCharts.startCalendarWeek - 1;
      for (const [scenarioId, chart] of Object.entries(region.weatherCharts.scenarios))
        for (const zone of region.zones) chart.actual[zone.id] = chart.actual[zone.id].map((point, i) => {
          const week = (i - first + 52) % 52 + 1;
          const settled = active && scenarioId === game.weatherId && game.history.some(h => h.week === week) && week < game.week && week <= region.weeks;
          return settled ? point : chart.forecast[zone.id][i];
        });
    }
    region.disruptions = (region.disruptions ?? []).filter(e => revealed.has(e.id));
  };
  maskRegion(game.region, true);
  if (game.linkedSeason?.baseRegion) maskRegion(game.linkedSeason.baseRegion, false);
}
export class RoomStore {
  private rooms = new Map<string, Room>();
  constructor(private directory: string) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
  }
  private get(id: string) {
    if (!/^[a-f0-9]{16}$/.test(id)) throw new RoomError("Room not found", 404);
    let r = this.rooms.get(id);
    if (!r) {
      const file = join(this.directory, id + ".json");
      if (!existsSync(file)) throw new RoomError("Room not found", 404);
      const raw = JSON.parse(readFileSync(file, "utf8"));
      r = { ...raw, game: parseGame(raw.game) };
      this.rooms.set(id, r!);
    }
    return r!;
  }
  private persist(r: Room) {
    const path = join(this.directory, r.id + ".json");
    writeFileSync(
      path + ".tmp",
      JSON.stringify({ ...r, game: serializeGame(r.game) }),
      { mode: 0o600 },
    );
    renameSync(path + ".tmp", path);
    this.rooms.set(r.id, r);
  }
  create(region: unknown = quebec) {
    const r = realizeAuctions(validateRegion(region)),
      id = randomBytes(8).toString("hex"),
      token = randomBytes(32).toString("base64url"),
      recoveryToken = randomBytes(32).toString("base64url"),
      game = createGame(r);
    game.seed = randomInt(1, 1_000_000_000);
    game.roleMode = true;
    // Independent server-only realizations prevent bundled teaching presets revealing the future.
    for (const w of Object.values(game.region.weather))
      for (const z of game.region.zones)
        w.actual[z.id] = w.forecast[z.id].map((f) =>
          randomInt(100) < 65
            ? f
            : (["thaw", "wet", "normal", "frozen"] as const)[randomInt(4)],
        );
    if(game.region.weatherCharts?.model === "category-illustration") game.region.weatherCharts = teachingWeatherCharts(game.region.weather, game.region.weatherCharts.startCalendarWeek);
    const room: Room = {
      id,
      revision: 1,
      game,
      tokens: { instructor: hash(token) },
      recoveryHash: hash(recoveryToken),
      disclosure: { phase: "private", shared: [], estimates: {}, economics: Object.fromEntries(Array.from({length:5},(_,i)=>{ const standalone=randomInt(3000,10000); return [String(i+1), {standalone, pooled:standalone-randomInt(100,900)}]; })) },
      audit: [],
    };
    this.persist(room);
    return { id, token, recoveryToken };
  }
  recover(id: string, recoveryToken: string) {
    const r = structuredClone(this.get(id));
    if (!r.recoveryHash || hash(recoveryToken) !== r.recoveryHash) throw new RoomError("Recovery credential is invalid.", 401);
    const token = randomBytes(32).toString("base64url"), nextRecovery = randomBytes(32).toString("base64url");
    r.tokens.instructor = hash(token);
    r.recoveryHash = hash(nextRecovery);
    r.revision++;
    r.audit.push({revision:r.revision,role:"instructor",action:"recover",at:new Date().toISOString()});
    this.persist(r);
    return {id,token,recoveryToken:nextRecovery};
  }
  private authorize(r: Room, token: string): Role {
    const digest = hash(token),
      role = roles.find((role) => r.tokens[role] === digest);
    if (!role)
      throw new RoomError(
        "Room credential is invalid or has been replaced.",
        401,
      );
    return role;
  }
  /** Allowlisted instructor overview: never return plans, calendars or credentials. */
  private timing(r: Room) {
    const now = Date.now();
    return r.timer ? { ...r.timer, remainingMs: r.timer.paused ? r.timer.remainingMs : Math.max(0, (r.timer.deadline ?? now) - now), serverNow: now } : null;
  }
  summary(id: string, token: string) {
    const r = this.get(id);
    if (this.authorize(r, token) !== "instructor")
      throw new RoomError("Instructor access is required for group monitoring.", 403);
    const g = r.game;
    return {
      id, timer: this.timing(r), revision: r.revision, region: g.region.name, currency: g.region.currency,
      week: g.week, weeks: g.region.weeks, complete: g.week > g.region.weeks,
      cash: g.cash, ready: { ...g.plan.ready },
      issuedRoles: roles.filter(role => !!r.tokens[role]),
      delivered: g.history.reduce((total, h) => total + Object.values(h.delivered).reduce((a,b) => a+b, 0), 0),
      lastAction: r.audit.at(-1) ? { ...r.audit.at(-1)! } : null,
    };
  }
  view(id: string, token: string) {
    const r = this.get(id),
      role = this.authorize(r, token),
      g = structuredClone(r.game);
    g.seed = 0;
    maskClassroomWeather(g);
    if (role !== "instructor") {
      if (g.region.bcMarket) {
        const physicalWeek = 1 + (g.week - 1) * (g.region.turnDurationWeeks ?? 1);
        g.region.bcMarket.events = g.region.bcMarket.events.filter(e => e.revealWeek <= physicalWeek);
      }
      if (role !== "purchase") { g.plan.bids = {}; delete g.plan.bidComposition; }
      if (role !== "production") {delete g.scheduledCrews;delete g.plan.processing;}
      if(role !== "transport") {delete g.plan.facilityTransfers; delete g.plan.reciprocal;}
      if (role !== "production")
        g.plan.crews = Object.fromEntries(
          g.region.crews.map((c) => [c.id, []]),
        );
      if (role !== "transport")
        g.plan.trucks = Object.fromEntries(
          g.region.trucks.map((t) => [t.id, []]),
        );
      for (const h of g.history) {
        if (role !== "production") delete h.production;
        delete h.plan.processing;
        delete h.plan.facilityTransfers;
        delete h.plan.reciprocal;
        h.plan.bids = {};
        delete h.plan.bidComposition;
        h.plan.crews = {};
        h.plan.trucks = {};
      }
    }
    const withheldAuctions = role === "instructor" ? [] : filterAuctionObservation(g);
    return {
      id,
      withheldAuctions,
      revision: r.revision,
      timer: this.timing(r),
      role,
      game: g,
      audit: role === "instructor" ? r.audit : [],
      connectedRoles: roles.filter((role) => r.tokens[role]),
      disclosure: r.disclosure ? disclosureView(r.disclosure, role) : null,
    };
  }
  mutate(
    id: string,
    token: string,
    revision: number,
    action: string,
    payload: unknown = {},
  ) {
    const current = this.get(id),
      role = this.authorize(current, token);
    if (revision !== current.revision)
      throw new RoomError(
        "Room changed. Refresh before submitting your decision.",
        409,
      );
    const r = structuredClone(current),
      p = payload as Record<string, unknown>;
    if (role !== "instructor" && referencesWithheld(payload, new Set([...unreleasedAuctions(r.game).map(s => s.id), ...(r.game.region.reciprocalPairs ?? []).filter(pair => unreleasedAuctions(r.game).some(s => s.id === pair.standA || s.id === pair.standB)).map(pair => pair.id)])))
      throw new RoomError("This auction lot has not been released yet.", 403);
    let credential: string | undefined;
    const requireRole = (...allowed: Role[]) => {
      if (!allowed.includes(role))
        throw new RoomError("This role cannot perform that action.", 403);
    };
    if (role !== "instructor" && r.timer && (r.timer.paused || (r.timer.deadline ?? 0) <= Date.now()))
      throw new RoomError(r.timer.paused ? "Session is paused. Ask the instructor to resume submissions." : "Session deadline reached. Ask the instructor to extend the timer before submitting.", 409);
    if (action === "timer") {
      requireRole("instructor");
      const now = Date.now();
      const remaining = r.timer ? (r.timer.paused ? r.timer.remainingMs : Math.max(0, (r.timer.deadline ?? now) - now)) : 0;
      if (p.command === "disable") delete r.timer;
      else if (p.command === "start" || p.command === "extend") {
        const minutes = p.minutes;
        if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes < 1 || minutes > 240)
          throw new RoomError("Choose a duration from 1 to 240 minutes.");
        const duration = minutes * 60000 + (p.command === "extend" ? remaining : 0);
        if (duration > 240 * 60000) throw new RoomError("Session cannot exceed 240 remaining minutes.");
        const paused = p.command === "extend" && !!r.timer?.paused;
        r.timer = { deadline: paused ? null : now + duration, remainingMs: duration, paused };
      } else if (p.command === "pause" && r.timer && !r.timer.paused) {
        r.timer = { deadline: null, remainingMs: remaining, paused: true };
      } else if (p.command === "resume" && r.timer?.paused && remaining > 0) {
        r.timer = { deadline: now + remaining, remainingMs: remaining, paused: false };
      } else throw new RoomError("Timer command is not available in the current state.");
    } else if (action.startsWith("disclosure-")) {
      if (!r.disclosure) throw new RoomError("This legacy room has no disclosure experiment; create a new room.");
      r.disclosure = disclosureAction(r.disclosure, role, action, p);
    } else if (action === "invite") {
      requireRole("instructor");
      const target = p.role as Role;
      if (!roles.includes(target) || target === "instructor")
        throw new RoomError("Choose a participant role.");
      credential = randomBytes(32).toString("base64url");
      r.tokens[target] = hash(credential);
    } else if (action === "advance") {
      requireRole("instructor");
      if (r.timer?.paused) throw new RoomError("Resume or disable the paused timer before advancing.");
      r.game = advance(r.game);
      delete r.timer;
    } else if (action === "renew-reciprocal") {
      requireRole("instructor");
      r.game = renewReciprocal(r.game, String(p.id), {opens:Number(p.opens),deadline:Number(p.deadline)});
    } else if (action === "accept-reciprocal") {
      const company = role === "company1" ? "A" : role === "company2" ? "B" : role === "instructor" ? p.company : undefined;
      if (!company || !["A", "B"].includes(String(company)) || (p.company !== undefined && p.company !== company)) throw new RoomError("Only the assigned company may accept its reciprocal terms.", 403);
      if (p.method !== "equal" && p.method !== "cost-weighted") throw new RoomError("Choose a reciprocal sharing method.");
      const pair = r.game.region.reciprocalPairs?.find(pair => pair.id === p.id);
      if (role !== "instructor" && pair && [pair.standA, pair.standB].some(id => unreleasedAuctions(r.game).some(s => s.id === id))) throw new RoomError("Reciprocal supply has not been released.", 403);
      r.game = acceptReciprocal(r.game, String(p.id), company as "A" | "B", p.method);
    } else if (action === "mobilize") {
      if (p.kind !== "crew" && p.kind !== "truck") throw new RoomError("Choose a crew or truck.");
      requireRole("instructor", p.kind === "crew" ? "production" : "transport");
      r.game = mobilize(r.game, p.kind, String(p.id), String(p.to));
    } else if (action === "ready") {
      requireRole("purchase", "production", "transport");
      r.game.plan.ready[role as keyof Plan["ready"]] = p.ready === true;
    } else if (action === "draft") {
      requireRole("purchase", "production", "transport");
      const suggestion = draftPlan(r.game);
      if (role === "production") r.game.plan.crews = suggestion.plan.crews;
      if (role === "transport") r.game.plan.trucks = suggestion.plan.trucks;
      r.game.plan.ready = {purchase:false,production:false,transport:false};
    } else if (action === "plan") {
      requireRole("purchase", "production", "transport");
      const allowed =
        role === "purchase"
          ? ["bids", "bidComposition"]
          : role === "production"
            ? ["crews", "retention", "scheduledCrews", "processing", "reservations"]
            : ["trucks", "targets", "cooperation", "facilityTransfers", "reciprocal"];
      if (Object.keys(p).some((k) => !allowed.includes(k)))
        throw new RoomError("Plan contains fields owned by another role.", 403);
      for (const k of allowed)
        if (k in p) {
          if (k === "scheduledCrews")
            r.game.scheduledCrews = p[k] as Game["scheduledCrews"];
          else if (k === "cooperation")
            r.game.cooperation = p[k] as Game["cooperation"];
          else (r.game.plan as unknown as Record<string, unknown>)[k] = p[k];
        }
      r.game.plan.ready = {purchase:false,production:false,transport:false};
    } else if (action === "accept-agreement") {
      requireRole("purchase");
      r.game=acceptAgreement(r.game,String(p.id));
    } else if (action === "accept-offtake") {
      requireRole("purchase");
      r.game=acceptOfftake(r.game,String(p.id));
    } else if (action === "purchase" || action === "refuse") {
      requireRole("purchase");
      r.game =
        action === "purchase"
          ? purchase(r.game, String(p.id))
          : refuse(r.game, String(p.id));
    } else if (action === 'tenure-harvest') {
      requireRole('instructor', 'purchase');
      r.game = applyHarvestAuthorization(r.game, String(p.id));
    } else if (action === 'tenure-road') {
      requireRole('instructor', 'transport');
      r.game = applyRoadAuthorization(r.game, String(p.id));
    } else if (action === 'tenure-settle') {
      requireRole('instructor', 'production');
      r.game = settlePostHarvestObligations(r.game, String(p.id));
    } else if (action === "road") {
      requireRole("transport");
      r.game = improveRoad(r.game, String(p.id));
    } else if (action === "recovery") {
      requireRole("instructor");
      if (p.action !== "repair" && p.action !== "wait")
        throw new RoomError("Unknown recovery action");
      r.game = respondToDisruption(r.game, String(p.id), p.action);
    } else if (action === "proposal") {
      requireRole("instructor");
      r.game.negotiation = {
        ...r.game.negotiation,
        ...p,
        offers: r.game.negotiation.offers,
      };
      r.game = parseGame(serializeGame(r.game));
      r.game = propose(r.game);
    } else if (action === "respond") {
      if (!role.startsWith("company"))
        throw new RoomError("Only the assigned company can respond.", 403);
      r.game = respond(r.game, Number(p.id), role.slice(7), p.accept === true);
    } else throw new RoomError("Unknown room action");
    // The same full save validator protects role patches before any state is committed.
    r.game = parseGame(serializeGame(r.game));
    if (action === "plan") {
      const check = structuredClone(r.game);
      check.roleMode = false;
      const issues = planProblems(check);
      if (issues.length) throw new RoomError(issues.join(" "));
    }
    r.revision++;
    r.audit.push({
      revision: r.revision,
      role,
      action,
      at: new Date().toISOString(),
    });
    r.audit = r.audit.slice(-500);
    this.persist(r);
    return { ...this.view(id, token), ...(credential ? { credential } : {}) };
  }
}
