import { validateOperationsProfile, validateFieldEvidence } from './operations-profile';
import {validOfferAllocation} from './negotiation';
import {validateBCMarketRegion,validateBCMarketState} from './bc-market';
import {validateBCTenureRegion,validateBCTenureState} from './tenure';
import {validateShipmentRecords} from './shipment-records';
import {validateReciprocal,validateReciprocalRegion} from './reciprocal';
import {validateBidCompositions} from './bid-composition';
import {validateBucking} from './bucking';
import {validateMobilization,validateMobilizationRegion} from './mobilization';
import {reservationProblems} from "./reservations";
import {validateProcessingRegion,validateProcessingState} from "./processing";
import {validateOfftakeRegion,validateOfftakeState,validOfftakeOrder} from "./offtake";
import {validateCalibration} from "./regional-calibration";
import {validateSeasonCalendar,validateLinkedSeason} from "./season-calendar";
import {validateVisualRegion,validateProductionRecords} from "./visual-validation";
import { validateScheduledCrews } from "./scheduling";
import { validateStewardship } from "./stewardship";
import { unpackGame } from "./save-format";
import type { Game, RegionDefinition } from "./types";
// Validate at the file boundary: unknown region files never reach the engine.
export function validateRegion(value: unknown): RegionDefinition {
  const r = value as RegionDefinition;
  const fail = (s: string): never => {
    throw Error(`Invalid scenario: ${s}`);
  };
  const text = (v: unknown) =>
    typeof v === "string" && v.length > 0 && v.length < 1000;
  const positive = (v: unknown, zero = false) =>
    typeof v === "number" && Number.isFinite(v) && (zero ? v >= 0 : v > 0);
  const position = (v: unknown) =>
    Array.isArray(v) &&
    v.length === 2 &&
    v.every((n) => typeof n === "number" && Number.isFinite(n)) &&
    Math.abs(v[0]) <= 180 &&
    Math.abs(v[1]) <= 85;
  const list = (v: unknown, min = 1) =>
    Array.isArray(v) && v.length >= min && v.length <= 1000;
  const unique = (values: { id: string }[]) =>
    values.every(
      (v) =>
        text(v.id) &&
        /^[a-zA-Z0-9_-]+$/.test(v.id) &&
        !["__proto__", "constructor", "prototype"].includes(v.id),
    ) && new Set(values.map((v) => v.id)).size === values.length;
  if (
    !r ||
    r.schemaVersion !== 1 ||
    (r.turnDurationWeeks !== undefined && ![1,.5,.25,1/7].includes(r.turnDurationWeeks)) ||
    ((r.turnDurationWeeks ?? 1) !== 1 && (!!r.seasonCalendar || !!r.weatherCharts)) ||
    !text(r.id) ||
    !text(r.name) ||
    !text(r.description) ||
    !text(r.currency) ||
    !position(r.center) ||
    !positive(r.zoom) ||
    r.zoom > 20
  )
    fail("metadata or map location");
  if (
    !Number.isInteger(r.weeks) ||
    r.weeks < 1 ||
    r.weeks > 104 ||
    !Number.isInteger(r.weeksPerMonth) ||
    r.weeksPerMonth < 1 ||
    r.weeksPerMonth > r.weeks
  )
    fail("campaign length");
  for (const values of [
    r.products,
    r.zones,
    r.stands,
    r.mills,
    r.crews,
    r.trucks,
    r.roads?.nodes,
    r.roads?.edges,
  ])
    if (!list(values) || !unique(values))
      fail("missing entities or duplicate IDs");
  const product = new Set(r.products.map((p) => p.id)),
    nodes = new Set(r.roads.nodes.map((n) => n.id)),
    zones = new Set(r.zones.map((z) => z.id));
  for (const p of r.products)
    if (
      !text(p.name) ||
      !text(p.color) ||
      (p.symbol !== undefined && !["logs", "boards", "pulp", "chips"].includes(p.symbol)) ||
      !Number.isInteger(p.maxFreshWeeks) ||
      p.maxFreshWeeks < 1 ||
      (p.downgradeTo && !product.has(p.downgradeTo))
    )
      fail(`product ${p.id}`);
  for (const p of r.products) {
    const seen = new Set([p.id]);
    let next = p.downgradeTo;
    while (next) {
      if (seen.has(next)) fail("circular product degradation");
      seen.add(next);
      next = r.products.find((p) => p.id === next)?.downgradeTo;
    }
  }
  for (const n of r.roads.nodes)
    if (!position(n.position)) fail(`node ${n.id}`);
  for (const e of r.roads.edges)
    if (
      !nodes.has(e.from) ||
      !nodes.has(e.to) ||
      e.from === e.to ||
      !positive(e.km) ||
      !positive(e.speed) ||
      ![1, 2, 3, 4].includes(e.bearing) ||
      !zones.has(e.zone) ||
      !list(e.geometry, 2) ||
      !e.geometry.every(position)
    )
      fail(`road ${e.id}`);
  const stock = (s: unknown) =>
    s &&
    typeof s === "object" &&
    !Array.isArray(s) &&
    Object.entries(s).every(([p, n]) => product.has(p) && positive(n, true));
  if (r.auctionDisclosure) {
    const p = r.auctionDisclosure;
    const range = (v: unknown) => Array.isArray(v) && v.length === 2 && v.every(n => typeof n === "number" && Number.isFinite(n) && n > 0 && n <= 10) && v[0] < v[1];
    if (p.mode !== "release-week" || !range(p.volumeMultiplier) || !range(p.priceMultiplier) || !r.stands.some(s => s.supply === "guaranteed" || s.supply === "private")) fail("auction disclosure policy");
  }
  for (const s of r.stands)
    if (
      !text(s.name) ||
      !position(s.position) ||
      !list(s.polygon, 4) ||
      !s.polygon.every(position) ||
      !nodes.has(s.node) ||
      !zones.has(s.zone) ||
      ![1, 2, 3, 4].includes(s.terrain) ||
      !positive(s.volume, true) ||
      !positive(s.hectares) ||
      (s.sourceNote !== undefined && !text(s.sourceNote)) ||
      !positive(s.productivity) ||
      !positive(s.harvestCost, true) ||
      !positive(s.askingPrice, true) ||
      !stock(s.mix) ||
      Math.abs(Object.values(s.mix).reduce((a, b) => a + b, 0) - 1) > 1e-6 ||
      !["guaranteed", "private", "auction", "protected"].includes(s.supply) ||
      !Number.isInteger(s.auctionWeek) ||
      s.auctionWeek < 1 ||
      s.auctionWeek > r.weeks
    )
      fail(`stand ${s.id}`);
  for (const m of r.mills)
    if (
      !text(m.name) ||
      !position(m.position) ||
      !nodes.has(m.node) ||
      !stock(m.prices) ||
      (m.spotPrices !== undefined && (!stock(m.spotPrices) || Object.keys(m.spotPrices).some(p=>!(p in m.prices)))) ||
      Object.keys(m.prices).length === 0 ||
      !Array.isArray(m.demand) ||
      m.demand.length !== Math.ceil(r.weeks / r.weeksPerMonth) ||
      !m.demand.every(stock) ||
      m.demand.some((d) => Object.keys(d).some((p) => !(p in m.prices)))
    )
      fail(`mill ${m.id}`);
  validateOperationsProfile(r);
  validateBCTenureRegion(r);
  validateBCMarketRegion(r);
  validateBucking(r);
  validateReciprocalRegion(r);
  validateMobilizationRegion(r);
  for (const c of r.crews)
    if (
      !nodes.has(c.node) ||
      ![c.hours, c.productivityFactor, c.relocationSpeed].every((n) =>
        positive(n),
      ) ||
      ![c.hourlyCost, c.relocationCostKm].every((n) => positive(n, true))
    )
      fail(`crew ${c.id}`);
  for (const t of r.trucks)
    if (
      !nodes.has(t.node) ||
      ![t.hours, t.payload, t.loadingHours, t.unloadingHours, t.costKm].every(
        (n) => positive(n),
      ) ||
      !positive(t.fixedWeekly, true)
    )
      fail(`truck ${t.id}`);
  if (!r.weather || !Object.keys(r.weather).length) fail("weather scenarios");
  for (const w of Object.values(r.weather))
    for (const type of [w.actual, w.forecast])
      for (const z of zones)
        if (
          !Array.isArray(type?.[z]) ||
          type[z].length !== r.weeks ||
          !type[z].every((v) => ["normal", "wet", "thaw", "frozen"].includes(v))
        )
          fail("weather schedule");
  validateProcessingRegion(r);
  validateOfftakeRegion(r);
  validateVisualRegion(r);
  validateSeasonCalendar(r);
  validateCalibration(r.calibration);
  const economy = [
    "startingCash",
    "fixedWeekly",
    "bonusPerM3",
    "shortfallPerM3",
    "tolerance",
    "roadUpgradePerKm",
    "refusalPercent",
    "storageCostM3",
    "terminalStandingCostM3",
    "terminalRoadsideCostM3",
  ] as const;
  if (
    !r.economy ||
    !economy.every((k) => positive(r.economy[k], true)) ||
    r.economy.refusalPercent > 1 ||
    r.economy.tolerance > 1
  )
    fail("economics");
  if(r.economy.timberPayment!==undefined && !["upfront","harvest-royalty"].includes(r.economy.timberPayment))fail("timber payment mode");
  for (const key of ["procurementCreditLimit", "annualDebtRate", "terminalStandingAllowanceM3", "terminalRoadsideAllowanceM3"] as const)
    if (r.economy[key] !== undefined && !positive(r.economy[key], true)) fail(`economics ${key}`);
  if (
    !r.ecology ||
    !positive(r.ecology.minimumRetention, true) ||
    r.ecology.minimumRetention > 0.8 ||
    !positive(r.ecology.harvestKgCO2M3, true) ||
    !positive(r.ecology.haulKgCO2Km, true) ||
    !["normal", "wet", "thaw", "frozen"].every((w) =>
      positive(
        r.ecology.disturbance?.[w as keyof typeof r.ecology.disturbance],
        true,
      ),
    )
  )
    fail("ecology");
  if (
    !Array.isArray(r.sources) ||
    !r.sources.every(
      (s) =>
        text(s.title) &&
        text(s.note) &&
        typeof s.url === "string" &&
        /^https?:\/\//.test(s.url),
    )
  )
    fail("source metadata");
  if (r.treatments) {
    if (!r.treatments.final) fail("missing final treatment");
    for (const t of Object.values(r.treatments))
      if (
        !text(t.name) ||
        !positive(t.retention, true) ||
        t.retention > 1 ||
        !positive(t.productivity) ||
        !positive(t.cost) ||
        !positive(t.disturbance, true)
      )
        fail("treatment parameters");
  }
  if (
    r.objectives &&
    (!Array.isArray(r.objectives) ||
      !unique(r.objectives) ||
      !r.objectives.every(
        (o) =>
          text(o.title) &&
          text(o.description) &&
          ["delivered", "service", "waste", "emissions", "profit"].includes(
            o.metric,
          ) &&
          ["at-least", "at-most"].includes(o.direction) &&
          typeof o.target === "number" &&
          Number.isFinite(o.target) &&
          text(o.unit),
      ))
  )
    fail("learning objectives");
  if (r.disruptions !== undefined) {
    if (!Array.isArray(r.disruptions) || !unique(r.disruptions))
      fail("disruptions");
    for (const e of r.disruptions) {
      const targets =
        e.kind === "road"
          ? r.roads.edges
          : e.kind === "crew"
            ? r.crews
            : e.kind === "truck"
              ? r.trucks
              : e.kind === "mill"
                ? r.mills
                : [];
      if (
        !text(e.title) ||
        !text(e.description) ||
        !targets.some((t) => t.id === e.target) ||
        !Number.isInteger(e.week) ||
        e.week < 1 ||
        !Number.isInteger(e.endWeek) ||
        e.endWeek < e.week ||
        e.endWeek > r.weeks ||
        !Number.isInteger(e.revealWeek) ||
        e.revealWeek < 1 ||
        e.revealWeek > e.week ||
        !positive(e.repairCost, true) ||
        !Number.isInteger(e.repairWeeks) ||
        e.repairWeeks < 0 ||
        e.repairWeeks > r.weeks
      )
        fail("disruption parameters");
    }
  }
  if (
    r.partnerJobs &&
    (!Array.isArray(r.partnerJobs) ||
      !unique(r.partnerJobs) ||
      !r.partnerJobs.every(
        (j) =>
          text(j.company) &&
          nodes.has(j.from) &&
          nodes.has(j.to) &&
          product.has(j.product) &&
          positive(j.volume) &&
          positive(j.paymentPerM3, true) &&
          Number.isInteger(j.week) &&
          j.week >= 1 &&
          Number.isInteger(j.deadline) &&
          j.deadline >= j.week &&
          j.deadline <= r.weeks,
      ))
  )
    fail("partner freight jobs");
  if (r.stewardship) {
    const p = r.stewardship;
    if (
      !Number.isInteger(p.years) ||
      p.years < 1 ||
      p.years > 200 ||
      !text(p.note) ||
      ![
        p.annualGrowthM3Ha,
        p.carryingCapacityM3Ha,
        p.plantingCostHa,
        p.startingBudget,
      ].every((v) => positive(v)) ||
      ![p.thinningNetM3, p.finalNetM3].every((v) => positive(v, true)) ||
      ![
        p.thinningFraction,
        p.finalRetention,
        p.habitatRecoveryPerYear,
        p.initialHabitat,
      ].every((v) => positive(v, true) && v <= 1) ||
      ![p.naturalRegenerationYears, p.plantedRegenerationYears].every(
        (v) => Number.isInteger(v) && v >= 0 && v <= p.years,
      )
    )
      fail("stewardship parameters");
  }
  // Every resource and parcel must be connected on an unrestricted network.
  const visited = new Set([r.roads.nodes[0].id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const e of r.roads.edges)
      if (visited.has(e.from) !== visited.has(e.to)) {
        visited.add(e.from);
        visited.add(e.to);
        changed = true;
      }
  }
  if (visited.size !== nodes.size) fail("disconnected road network");
  return structuredClone(r);
}
export function parseGame(raw: string): Game {
  if (raw.length > 50000000) throw Error("Save is too large.");
  const g = unpackGame(JSON.parse(raw)) as Game;
  if (g.version !== 2)
    throw Error(
      "This is a version 1 prototype save. Its schematic geography cannot be migrated faithfully. Keep the original export and start a regional campaign.",
    );
  validateRegion(g.region);
  if(g.linkedSeason) validateRegion(g.linkedSeason.baseRegion);
  if (g.stewardship) validateStewardship(g.linkedSeason?.baseRegion ?? g.region, g.stewardship);
  validateLinkedSeason(g);
  validateBCTenureState(g);
  validateBCMarketState(g);
  validateFieldEvidence(g);
  if (g.region.operations && g.linkedSeason) throw Error("Operating-profile campaigns do not support linked annual seasons.");
  const r = g.region,
    finite = (n: unknown) => typeof n === "number" && Number.isFinite(n),
    nonnegative = (n: unknown) => finite(n) && (n as number) >= 0;
  if (g.eventResponses !== undefined) {
    if (!Array.isArray(g.eventResponses))
      throw Error("Invalid event responses");
    const repaired = new Set<string>();
    for (const a of g.eventResponses) {
      const e = r.disruptions?.find((e) => e.id === a.event);
      if (
        !e ||
        !["repair", "wait"].includes(a.action) ||
        !Number.isInteger(a.week) ||
        a.week < e.week ||
        a.week > e.endWeek ||
        a.week > g.week ||
        a.restoredWeek !==
          (a.action === "repair" ? a.week + e.repairWeeks : e.endWeek + 1) ||
        repaired.has(a.event)
      )
        throw Error("Invalid event response");
      if (a.action === "repair") repaired.add(a.event);
    }
  }
  const validPoint = (p: unknown) =>
    Array.isArray(p) &&
    p.length === 2 &&
    p.every(finite) &&
    Math.abs(p[0]) <= 180 &&
    Math.abs(p[1]) <= 85;
  const bad = () => {
    throw Error("Invalid save: inconsistent campaign state.");
  };
  if (
    !Number.isInteger(g.week) ||
    g.week < 1 ||
    g.week > r.weeks + 1 ||
    !finite(g.cash) ||
    !Number.isInteger(g.seed) ||
    !r.weather[g.weatherId] ||
    !Array.isArray(g.history) ||
    g.history.length !== g.week - 1 ||
    !Array.isArray(g.stands) ||
    g.stands.length !== r.stands.length ||
    new Set(g.stands.map((s) => s.id)).size !== g.stands.length
  )
    bad();
  for (const s of g.stands) {
    const d = r.stands.find((d) => d.id === s.id);
    if (
      !d ||
      typeof s.owned !== "boolean" ||
      typeof s.refused !== "boolean" ||
      !nonnegative(s.remaining) ||
      !nonnegative(s.harvested) ||
      Math.abs(s.remaining + s.harvested - d.volume) > 0.01 ||
      !nonnegative(s.purchasePaid) ||
      (s.royaltyM3 !== undefined && !nonnegative(s.royaltyM3)) ||
      !Array.isArray(s.stock) ||
      !s.stock.every(
        (b) =>
          r.products.some((p) => p.id === b.product) &&
          nonnegative(b.volume) &&
          nonnegative(b.week) &&
          b.week <= g.week &&
          nonnegative(b.quality) &&
          b.quality <= 1,
      )
    )
      bad();
  }
  const stock = (v: unknown) =>
    !!v &&
    typeof v === "object" &&
    Object.entries(v).every(
      ([p, n]) => r.products.some((p1) => p1.id === p) && nonnegative(n),
    );
  if (
    !g.plan ||
    !g.plan.crews ||
    !g.plan.trucks ||
    !g.plan.bids ||
    !g.plan.targets ||
    !g.plan.ready ||
    !nonnegative(g.plan.retention) ||
    g.plan.retention < r.ecology.minimumRetention ||
    g.plan.retention > 0.8
  )
    bad();
  if(!validateBidCompositions(r,g.plan.bidComposition))bad();
  if(reservationProblems(g).length)bad();
  validateProcessingState(g);
  validateOfftakeState(g);
  validateScheduledCrews(g);
  validateMobilization(g);
  validateReciprocal(g);
  validateShipmentRecords(g);
  for (const c of r.crews)
    if (
      !r.roads.nodes.some((n) => n.id === g.crewPositions?.[c.id]) ||
      !Array.isArray(g.plan.crews[c.id]) ||
      !g.plan.crews[c.id].every(
        (o) =>
          r.stands.some((s) => s.id === o.stand) &&
          nonnegative(o.hours) &&
          (o.bucking === undefined || o.bucking === "standard" || !!r.buckingProfiles?.[o.bucking]) &&
          (o.treatment === undefined ||
            o.treatment === "final" ||
            !!r.treatments?.[o.treatment]),
      )
    )
      bad();
  for (const t of r.trucks)
    if (
      !r.roads.nodes.some((n) => n.id === g.truckPositions?.[t.id]) ||
      !Array.isArray(g.plan.trucks[t.id]) ||
      !g.plan.trucks[t.id].every(
        (o) =>
          r.stands.some((s) => s.id === o.stand) &&
          r.mills.some((m) => m.id === o.mill) &&
          r.products.some((p) => p.id === o.product) &&
          validOfftakeOrder(g,o) &&
          Number.isInteger(o.loads) &&
          o.loads > 0,
      )
    )
      bad();
  if (
    !Object.entries(g.plan.bids).every(
      ([id, n]) => r.stands.some((s) => s.id === id) && nonnegative(n),
    ) ||
    !Object.values(g.plan.targets).every(stock) ||
    !r.mills.every((m) => stock(g.plan.targets[m.id])) ||
    !Object.keys(g.plan.targets).every((id) =>
      r.mills.some((m) => m.id === id),
    ) ||
    !g.deliveries ||
    !Object.values(g.deliveries).every(stock) ||
    !Array.isArray(g.improvedRoads) ||
    !g.improvedRoads.every((id) => r.roads.edges.some((e) => e.id === id)) ||
    !g.cooperation ||
    typeof g.cooperation.pooling !== "boolean" ||
    !nonnegative(g.cooperation.partnerShare) ||
    g.cooperation.partnerShare > 1 ||
    typeof g.roleMode !== "boolean"
  )
    bad();
  for (const [i, h] of g.history.entries())
    if (
      h.week !== i + 1 ||
      !validateBidCompositions(r,h.plan?.bidComposition) ||
      !finite(h.cash) ||
      !stock(h.harvested) ||
      !stock(h.delivered) ||
      !Array.isArray(h.ledger) ||
      !h.ledger.every((e) => finite(e.amount)) ||
      !Array.isArray(h.movements) ||
      !h.movements.every(
        (m) =>
          nonnegative(m.km) &&
          nonnegative(m.hours) &&
          nonnegative(m.volume) &&
          Array.isArray(m.path) &&
          m.path.every(validPoint),
      ) ||
      !nonnegative(h.waste) ||
      !nonnegative(h.degraded) ||
      !nonnegative(h.emissions) ||
      !nonnegative(h.disturbance) ||
      !nonnegative(h.targetChecks) ||
      !nonnegative(h.targetHits) ||
      !h.weather ||
      !r.zones.every((z) =>
        ["normal", "wet", "thaw", "frozen"].includes(h.weather[z.id]),
      ) ||
      !h.crewHours ||
      !Object.values(h.crewHours).every(nonnegative) ||
      !h.truckHours ||
      !Object.values(h.truckHours).every(nonnegative) ||
      !h.plan ||
      !h.plan.targets ||
      !Object.values(h.plan.targets).every(stock) ||
      !Array.isArray(h.messages) ||
      !h.messages.every((m) => typeof m === "string")
    )
      bad();
  if (
    !["purchase", "production", "transport"].every(
      (k) => typeof g.plan.ready[k as keyof typeof g.plan.ready] === "boolean",
    )
  )
    bad();
  if (
    !Array.isArray(g.instantLedger) ||
    !g.instantLedger.every((e) => finite(e.amount))
  )
    bad();
  validateProductionRecords(g);
  const harvested = g.stands.reduce((n, s) => n + s.harvested, 0),
    roadside = g.stands.reduce(
      (n, s) => n + s.stock.reduce((a, b) => a + b.volume, 0),
      0,
    ),
    delivered = g.history.reduce(
      (n, h) =>
        n + Object.values(h.delivered).reduce((a, b) => a + b, 0) + h.waste,
      0,
    );
  if (Math.abs(harvested - roadside - delivered) > 0.1) bad();
  for(const h of g.history)if(h.reservationFulfillment!==undefined){
    if(!h.reservationFulfillment||typeof h.reservationFulfillment!=='object'||Array.isArray(h.reservationFulfillment))bad();
    for(const [id,n] of Object.entries(h.reservationFulfillment)){const row=h.plan.reservations?.find(r=>r.id===id);if(!row||!nonnegative(n)||n>row.volume+1e-6)bad();}
    if(Object.values(h.reservationFulfillment).reduce((a,b)=>a+b,0)>Object.values(h.millDeliveries).reduce((a,b)=>a+Object.values(b).reduce((x,y)=>x+y,0),0)+1e-6)bad();
  }
  for (const h of g.history)
    if (h.snapshot) {
      const snap = h.snapshot;
      if(snap.operationalRoadIds!==undefined&&(!Array.isArray(snap.operationalRoadIds)||new Set(snap.operationalRoadIds).size!==snap.operationalRoadIds.length||snap.operationalRoadIds.some(id=>!r.roads.edges.some(e=>e.id===id))))bad();
      if (
        !Array.isArray(snap.stands) ||
        snap.stands.length !== r.stands.length ||
        new Set(snap.stands.map((s) => s.id)).size !== r.stands.length ||
        !snap.stands.every(
          (s) =>
            r.stands.some((d) => d.id === s.id) &&
            nonnegative(s.remaining) &&
            typeof s.owned === "boolean" &&
            Array.isArray(s.stock) &&
            s.stock.every(
              (b) =>
                r.products.some((p) => p.id === b.product) &&
                nonnegative(b.volume),
            ),
        ) ||
        !r.crews.every((c) =>
          r.roads.nodes.some((n) => n.id === snap.crewPositions?.[c.id]),
        ) ||
        !r.trucks.every((t) =>
          r.roads.nodes.some((n) => n.id === snap.truckPositions?.[t.id]),
        ) ||
        !Array.isArray(snap.improvedRoads) ||
        !snap.improvedRoads.every((id) =>
          r.roads.edges.some((e) => e.id === id),
        )
      )
        bad();
    }
  // Add the negotiation state for early regional v2 saves that predate the lab.
  g.negotiation ??= {
    count: 5,
    groups: [1, 1, 1, 1, 1],
    method: "shapley",
    custom: {},
    phase: "open",
  };
  const n = g.negotiation;
  if (
    ![4, 5].includes(n.count) ||
    !Array.isArray(n.groups) ||
    n.groups.length !== 5 ||
    !n.groups.every((v) => Number.isInteger(v) && v >= 1 && v <= 5) ||
    !["equal", "proportional", "shapley", "epm", "volume", "nucleolus"].includes(n.method) ||
    !["pairs", "open"].includes(n.phase) ||
    !n.custom ||
    !Object.entries(n.custom).every(
      ([id, v]) => ["1", "2", "3", "4", "5"].includes(id) && finite(v),
    )
  )
    bad();
  if (
    n.offers &&
    (!Array.isArray(n.offers) ||
      n.offers.length > 50 ||
      new Set(n.offers.map((o) => o.id)).size !== n.offers.length ||
      !n.offers.every(
        (o) =>
          Number.isInteger(o.id) &&
          o.id > 0 &&
          [4, 5].includes(o.count) &&
          Array.isArray(o.groups) &&
          o.groups.length === 5 &&
          o.groups.every((v) => Number.isInteger(v) && v >= 1 && v <= 5) &&
          o.shares &&
          Array.from({ length: o.count }, (_, i) => String(i + 1)).every((c) =>
            nonnegative(o.shares[c]),
          ) &&
          Array.isArray(o.accepted) &&
          new Set(o.accepted).size === o.accepted.length &&
          o.accepted.every((c) =>
            Array.from({ length: o.count }, (_, i) => String(i + 1)).includes(
              c,
            ),
          ) &&
          ["proposed", "agreed", "rejected", "superseded"].includes(o.status) &&
          (o.status !== "agreed" || o.accepted.length === o.count) && validOfferAllocation(o),
      ))
  )
    bad();
  if (g.previousCampaign) {
    const p = g.previousCampaign;
    if (
      typeof p.region !== "string" ||
      !Number.isInteger(p.seed) ||
      !finite(p.cash) ||
      !nonnegative(p.delivered) ||
      !nonnegative(p.emissions)
    )
      bad();
  }
  if (
    g.partnerDelivered &&
    !Object.entries(g.partnerDelivered).every(([id, n]) => {
      const j = r.partnerJobs?.find((j) => j.id === id);
      return j && nonnegative(n) && n <= j.volume + 0.001;
    })
  )
    bad();
  for (const t of r.trucks)
    if (
      g.plan.trucks[t.id].some(
        (o) =>
          o.partnerJob !== undefined &&
          !r.partnerJobs?.some((j) => j.id === o.partnerJob),
      )
    )
      bad();
  for (const h of g.history)
    if (
      (h.partnerDeliveries &&
        !Object.entries(h.partnerDeliveries).every(
          ([id, n]) =>
            r.partnerJobs?.some((j) => j.id === id) && nonnegative(n),
        )) ||
      (h.partnerAvoidedKm !== undefined && !finite(h.partnerAvoidedKm)) ||
      (h.partnerSavings !== undefined && !nonnegative(h.partnerSavings))
    )
      bad();
  for (const job of r.partnerJobs ?? []) {
    const delivered = g.history.reduce(
      (n, h) => n + (h.partnerDeliveries?.[job.id] ?? 0),
      0,
    );
    if (
      delivered > job.volume + 0.001 ||
      Math.abs(delivered - (g.partnerDelivered?.[job.id] ?? 0)) > 0.001
    )
      bad();
  }
  const balance =
    r.economy.startingCash +
    g.history.flatMap((h) => h.ledger).reduce((n, e) => n + e.amount, 0) +
    g.instantLedger.reduce((n, e) => n + e.amount, 0);
  if (Math.abs(balance - g.cash) > 0.1) bad();
  return g;
}
