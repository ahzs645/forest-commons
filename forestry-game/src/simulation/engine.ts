import { profilePlanProblems, standWorkProblems, operatingProductionRate, operatingPayload, type TravelRequest } from './operations-profile';
import {marketSnapshot, lockAwardStumpage, effectiveMarketRegion} from './bc-market';
import { initializeBCTenure, refreshAuthorizations, harvestAuthorizationProblem, stumpageCost, accruePostHarvestObligations, settleObligationEntries, roadAuthorizationProblem } from './tenure';
import {reciprocalProblems,runReciprocal,reciprocalDispatchableStock,reciprocalDispatchRestriction} from './reciprocal';
import {buckingProfile,recoveredMix} from './bucking';
import {runFacilityTransfers} from "./facility-transfers";
import {dispatchableStock,consumeReservation,reservationProblems} from "./reservations";
import {receiveProcessing,runProcessing,processingPlanProblems} from "./processing";
import { validOfftakeOrder } from "./offtake";
import { activateScheduledCrews, validateScheduledCrews } from "./scheduling";
import { partnerTrip, freightSettlement } from "./partner";
import { operatingRegion, activeDisruptions } from "./disruptions";
import { treatmentFor, retainedFraction } from "./treatments";
import type {
  Game,
  RegionDefinition,
  Stock,
  Plan,
  WeekResult,
  LedgerEntry,
} from "./types";
import { canAccess, route, weatherAt } from "./routing";
export const sum = (stock: Stock) =>
  Object.values(stock).reduce((a, b) => a + b, 0);
export const stockAt = (g: Game, id: string): Stock => {
  const stock: Stock = {};
  for (const b of g.stands.find((s) => s.id === id)?.stock ?? [])
    stock[b.product] = (stock[b.product] ?? 0) + b.volume;
  return stock;
};
export const month = (g: Game) =>
  Math.min(
    Math.floor((g.week - 1) / g.region.weeksPerMonth),
    Math.ceil(g.region.weeks / g.region.weeksPerMonth) - 1,
  );
const add = (stock: Stock, p: string, n: number) => {
  stock[p] = (stock[p] ?? 0) + n;
};
const random = (seed: number, week: number, key: string) => {
  let n = (seed ^ week) >>> 0;
  for (const c of key) n = Math.imul(n ^ c.charCodeAt(0), 16777619) >>> 0;
  return n / 4294967296;
};
export function blankPlan(region: RegionDefinition, m = 0): Plan {
  return {
    crews: Object.fromEntries(region.crews.map((c) => [c.id, []])),
    trucks: Object.fromEntries(region.trucks.map((t) => [t.id, []])),
    bids: {},
    retention: region.ecology.minimumRetention,
    targets: Object.fromEntries(
      region.mills.map((mill) => [mill.id, { ...mill.demand[m] }]),
    ),
    ready: { purchase: false, production: false, transport: false },
  };
}
/** Presentation of amounts inside English operating messages and ledger text;
 * French display reformats them in i18n-runtime. */
const messageMoney = (r: RegionDefinition, n: number) => `${r.currency} ${Math.round(n).toLocaleString("en-CA")}`;
const messageM3 = (n: number) => n.toLocaleString("en-CA", { maximumFractionDigits: 1 });
export function createGame(
  region: RegionDefinition,
  weatherId = Object.keys(region.weather)[0],
  seed = 2026,
): Game {
  // Linked successors belong to the played campaign's consent and settlement history.
  // A fresh campaign retains the original templates and negotiates renewals anew.
  region = structuredClone(region);
  if (region.reciprocalPairs) region.reciprocalPairs = region.reciprocalPairs.filter(pair => !pair.renews);
  const game: Game = {
    version: 2,
    bcTenure: initializeBCTenure(region),
    ...(region.bcMarket?{bcMarket:{lockedRates:Object.fromEntries(region.stands.filter(s=>s.supply==="guaranteed"&&region.bcTenure?.stands[s.id]?.stumpage.ratePolicy==="fixed-at-award").map(s=>[s.id,{...region.bcTenure!.stands[s.id].stumpage.rates}]))}}:{}),
    negotiation: {
      count: 5,
      groups: [1, 1, 1, 1, 1],
      method: "shapley",
      custom: {},
      phase: "open",
    },
    region: structuredClone(region),
    weatherId,
    seed,
    week: 1,
    cash: region.economy.startingCash,
    stands: region.stands.map((s) => ({
      id: s.id,
      remaining: s.volume,
      owned: s.supply === "guaranteed",
      purchaseWeek: null,
      purchasePaid: 0,
      refused: false,
      stock: [],
      harvested: 0,
    })),
    crewPositions: Object.fromEntries(region.crews.map((c) => [c.id, c.node])),
    truckPositions: Object.fromEntries(
      region.trucks.map((t) => [t.id, t.node]),
    ),
    improvedRoads: [],
    deliveries: {},
    plan: blankPlan(region),
    history: [],
    instantLedger: [],
    roleMode: false,
    cooperation: { pooling: false, partnerShare: 0.3 },
  };
  if (region.bcMarket) game.plan = blankPlan(effectiveMarketRegion(game));
  return game;
}
export const budgetCommitted = (g: Game) => sum(g.plan.bids);
function transaction(g: Game, entry: LedgerEntry) {
  g.cash += entry.amount;
  g.instantLedger.push(entry);
  g.plan.ready = { purchase: false, production: false, transport: false };
}
export function purchase(g: Game, id: string): Game {
  const next = structuredClone(g),
    definition = next.region.stands.find((s) => s.id === id),
    stand = next.stands.find((s) => s.id === id);
  if (
    g.week > g.region.weeks ||
    !definition ||
    !stand ||
    stand.owned ||
    stand.refused ||
    definition.supply !== "private"
  )
    throw Error("This private lot is not available.");
  if ((!!g.region.bcTenure || g.region.economy.timberPayment !== "harvest-royalty") && g.cash + (g.region.economy.procurementCreditLimit ?? 0) - budgetCommitted(g) < definition.askingPrice)
    throw Error("Insufficient uncommitted cash and procurement credit.");
  stand.owned = true;
  stand.purchaseWeek = g.week;
  stand.purchasePaid = definition.askingPrice;
  if((!g.region.bcTenure && g.region.economy.timberPayment === "harvest-royalty"))stand.royaltyM3=definition.askingPrice/definition.volume;
  transaction(next, {
    category: "purchase",
    standId: id,
    description: `Private supply ${id}`,
    amount: (!g.region.bcTenure && g.region.economy.timberPayment === "harvest-royalty") ? 0 : -definition.askingPrice,
  });
  return next;
}
export function refuse(g: Game, id: string): Game {
  const next = structuredClone(g),
    stand = next.stands.find((s) => s.id === id),
    definition = next.region.stands.find((s) => s.id === id);
  if (
    g.week > g.region.weeks ||
    !stand ||
    !definition ||
    definition.supply !== "auction" ||
    (!stand.purchaseWeek || g.week - stand.purchaseWeek < 1 || g.week - stand.purchaseWeek > 1 / (g.region.turnDurationWeeks ?? 1)) ||
    stand.harvested > 0 ||
    !stand.owned
  )
    throw Error("Only an unused auction lot won last week can be refused.");
  stand.owned = false;
  stand.refused = true;
  transaction(next, {
    category: "refusal",
    standId: id,
    description: `Refused ${id}; ${g.region.economy.refusalPercent * 100}% guarantee retained`,
    amount: (!g.region.bcTenure && g.region.economy.timberPayment === "harvest-royalty") ? -stand.purchasePaid*g.region.economy.refusalPercent : stand.purchasePaid * (1 - g.region.economy.refusalPercent),
  });
  return next;
}
export function improveRoad(g: Game, id: string): Game {
  if (roadAuthorizationProblem(g,id)) throw Error("Road authorization is required before upgrading this road.");
  const next = structuredClone(g),
    edge = next.region.roads.edges.find((e) => e.id === id);
  if (
    g.week > g.region.weeks ||
    !edge ||
    edge.bearing === 1 ||
    next.improvedRoads.includes(id)
  )
    throw Error("Road cannot be upgraded.");
  const price = edge.km * g.region.economy.roadUpgradePerKm;
  if (g.cash - budgetCommitted(g) < price)
    throw Error("Insufficient uncommitted cash and procurement credit.");
  next.improvedRoads.push(id);
  transaction(next, {
    category: "roads",
    description: `All-season access: ${edge.name}`,
    amount: -price,
  });
  return next;
}
export function planProblems(g: Game): string[] {
  const issues: string[] = [],
    r = effectiveMarketRegion(g);
  if (g.week > r.weeks)
    issues.push("Campaign complete. Start a new scenario to continue.");
  if (
    !Number.isFinite(g.plan.retention) ||
    g.plan.retention < r.ecology.minimumRetention ||
    g.plan.retention > 0.8
  )
    issues.push("Retention must be within the scenario minimum and 80%.");
  if ((!!r.bcTenure || r.economy.timberPayment !== "harvest-royalty") && budgetCommitted(g) > 0 && budgetCommitted(g) > g.cash + (r.economy.procurementCreditLimit ?? 0))
    issues.push("Auction commitments exceed available cash and procurement credit.");
  for (const [id, bid] of Object.entries(g.plan.bids)) {
    const s = r.stands.find((s) => s.id === id);
    if (
      !Number.isFinite(bid) ||
      bid < 0 ||
      !s ||
      s.supply !== "auction" ||
      s.auctionWeek !== g.week ||
      g.stands.find((s) => s.id === id)?.owned
    )
      issues.push(`Invalid bid for ${id}.`);
  }
  for (const c of r.crews) {
    const queue = g.plan.crews[c.id] ?? [];
    if (queue.reduce((n, o) => n + o.hours, 0) > c.hours + 0.001)
      issues.push(`${c.name}: scheduled hours exceed capacity.`);
    for (const o of queue)
      if (
        !r.stands.some((s) => s.id === o.stand) ||
        !Number.isFinite(o.hours) ||
        o.hours <= 0 ||
        (o.bucking !== undefined && o.bucking !== "standard" && !r.buckingProfiles?.[o.bucking]) ||
        (o.treatment !== undefined &&
          o.treatment !== "final" &&
          !r.treatments?.[o.treatment])
      )
        issues.push(`${c.name}: invalid production order.`);
  }
  for (const t of r.trucks)
    for (const o of g.plan.trucks[t.id] ?? []) {
      const mill = r.mills.find((m) => m.id === o.mill);
      if (
        !r.stands.some((s) => s.id === o.stand) ||
        !mill ||
        !r.products.some((p) => p.id === o.product) ||
        !(o.product in mill.prices) ||
        !validOfftakeOrder(g, o) ||
        !Number.isInteger(o.loads) ||
        o.loads < 1 ||
        o.loads > 1000 ||
        (o.partnerJob !== undefined &&
          !r.partnerJobs?.some((j) => j.id === o.partnerJob))
      )
        issues.push(`${t.name}: invalid haul order.`);
    }
  for (const m of r.mills)
    for (const p of r.products) {
      const n = g.plan.targets[m.id]?.[p.id] ?? 0,
        maximum = m.demand[month(g)][p.id] ?? 0;
      if (!Number.isFinite(n) || n < 0 || n > maximum)
        issues.push(`${m.name}: target outside this month's demand.`);
    }
  if (
    (g.week - 1) % r.weeksPerMonth !== 0 &&
    g.history.length &&
    r.mills.some((m) =>
      r.products.some(
        (p) =>
          (g.plan.targets[m.id]?.[p.id] ?? 0) !==
          (g.history.at(-1)!.plan.targets[m.id]?.[p.id] ?? 0),
      ),
    )
  )
    issues.push("Monthly commitments are locked until the next month.");
  issues.push(...reciprocalProblems(g),...processingPlanProblems(g),...reservationProblems(g));
  if (g.roleMode && !Object.values(g.plan.ready).every(Boolean))
    issues.push(
      "Purchase, production and transport roles must mark their plans ready.",
    );
  issues.push(...profilePlanProblems(g));
  return [...new Set(issues)];
}
export function advance(input: Game): Game {
  validateScheduledCrews(input);
  const problems = planProblems(input);
  if (problems.length) throw Error(problems.join(" "));
  const g = structuredClone(input);
  refreshAuthorizations(g);
  const r = operatingRegion(g, false),
    w = weatherAt(g),
    report: WeekResult = {
      ...(g.region.bcMarket?{market:marketSnapshot(g,g.week,false)}:{}),
      shipments: [],
      reservationFulfillment: {},
      week: g.week,
      weather: w,
      harvested: {},
      production: [],
      delivered: {},
      millDeliveries: {},
      ledger: [...g.instantLedger],
      cash: 0,
      messages: [],
      movements: [],
      crewHours: {},
      truckHours: {},
      truckActivity: {},
      emissions: 0,
      disturbance: 0,
      degraded: 0,
      waste: 0,
      fulfillment: {},
      targetChecks: 0,
      targetHits: 0,
      plan: structuredClone(g.plan),
    };
  if(g.mobilization)g.mobilization.locked=true;
  report.messages.push(
    ...activeDisruptions(g, false).map(
      (e) =>
        `${e.title}: ${e.kind} ${e.target} unavailable through week ${e.endWeek}, unless recovery finishes earlier.`,
    ),
  );
  g.instantLedger = [];
  const post = (category: string, description: string, amount: number, standId?: string) => {
    g.cash += amount;
    report.ledger.push({ category, description, amount, ...(standId ? {standId} : {}) });
  };
  // Deterioration happens before new production. A downgraded batch starts a new
  // storage window; pulp eventually becomes waste rather than disappearing.
  for (const s of g.stands) {
    for (const batch of s.stock) {
      const p = r.products.find((p) => p.id === batch.product)!;
      if (g.week - batch.week >= p.maxFreshWeeks) {
        if (p.downgradeTo) {
          batch.product = p.downgradeTo;
          batch.week = g.week;
          batch.quality *= 0.9;
          report.degraded += batch.volume;
        } else {
          report.waste += batch.volume;
          batch.volume = 0;
        }
      }
    }
    s.stock = s.stock.filter((b) => b.volume > 1e-7);
  }
  for (const c of r.crews) {
    let hours = c.hours;
    report.crewHours[c.id] = 0;
    for (const order of g.plan.crews[c.id] ?? []) {
      const def = r.stands.find((s) => s.id === order.stand)!,
        s = g.stands.find((s) => s.id === order.stand)!;
      if (!s.owned || s.refused) {
        report.messages.push(`${c.name}: ${s.id} is not owned.`);
        continue;
      }
      const eligibility = standWorkProblems(g, s.id, c.id, order.treatment, w[def.zone]);
      if (eligibility.length) {
        report.messages.push(...eligibility.map(issue => `${c.name}: ${s.id}: ${issue.message}`));
        continue;
      }
      const authorizationProblem = harvestAuthorizationProblem(g, s.id);
      if (authorizationProblem) { report.messages.push(`${c.name}: ${s.id}: ${authorizationProblem}.`); continue; }
      if (!canAccess(def.terrain, w[def.zone])) {
        report.messages.push(
          `${c.name}: terrain closed at ${s.id} (${w[def.zone]}).`,
        );
        continue;
      }
      const treatment = treatmentFor(g, order),
        retention = retainedFraction(g, order);
      const available = Math.max(0, s.remaining - def.volume * retention);
      if (available < 0.001) continue;
      const relocation = route(
        r,
        g.crewPositions[c.id],
        def.node,
        w,
        g.improvedRoads,
        { kind: "crew", id: c.id },
      );
      if (!relocation) {
        report.messages.push(`${c.name}: no open road to ${s.id}.`);
        continue;
      }
      const moveHours = r.operations ? Math.max(relocation.hours, relocation.km / c.relocationSpeed) : relocation.km / c.relocationSpeed,
        slot = Math.min(hours, order.hours);
      if (moveHours >= slot) {
        report.messages.push(
          `${c.name}: relocation exceeds assigned hours for ${s.id}.`,
        );
        continue;
      }
      const bucking=buckingProfile(r,order.bucking),mix=recoveredMix(r,def.mix,order.bucking);
      const unconstrainedProductivity =
          def.productivity * bucking.productivity *
          treatment.productivity *
          c.productivityFactor *
          (w[def.zone] === "wet" ? 0.8 : w[def.zone] === "thaw" ? 0.65 : 1);
      const productivity = operatingProductionRate(r, c.id, s.id, unconstrainedProductivity, w[def.zone]),
        volume = Math.min(available, (slot - moveHours) * productivity),
        used = volume / productivity + moveHours;
      const incident = g.region.roads.edges.filter(e => e.from === def.node || e.to === def.node);
      const roadClass = incident.length && incident.every(e => e.roadClass === 'public') ? 'public' : incident.some(e => e.roadClass === 'forest') ? 'forest' : 'unknown';
      report.production!.push({bucking:order.bucking??"standard",stand: s.id, crew:c.id, treatment: order.treatment ?? 'final', startHour: c.hours-hours, endHour:c.hours-hours+used, relocationHours:moveHours, products:Object.fromEntries(Object.entries(mix).map(([p,ratio])=>[p,volume*ratio])), roadClass});
      hours -= used;
      report.crewHours[c.id] += used;
      g.crewPositions[c.id] = def.node;
      s.remaining -= volume;
      s.harvested += volume;
      const stumpage = stumpageCost(r, s.id, Object.fromEntries(Object.entries(mix).map(([p,ratio])=>[p,volume*ratio])));
      if (stumpage > 0) post("stumpage", `${s.id} · authored Interior teaching rates`, -stumpage, s.id);
      accruePostHarvestObligations(g, s.id, volume);
      if ((!r.bcTenure && r.economy.timberPayment === "harvest-royalty") && (s.royaltyM3 ?? s.purchasePaid/def.volume)>0)
        post("royalty",`${s.id} · ${messageM3(volume)} m³ harvested`, -volume*(s.royaltyM3 ?? s.purchasePaid/def.volume), s.id);
      for (const [p, ratio] of Object.entries(mix)) {
        const n = volume * ratio;
        s.stock.push({ product: p, volume: n, week: g.week, quality: 1 });
        add(report.harvested, p, n);
      }
      if (relocation.km > 0)
        report.movements.push({
          resource: c.id,
          kind: "crew",
          path: relocation.path,
          km: relocation.km,
          hours: moveHours,
          volume: 0,
          from: relocation.nodes[0],
          to: def.node,
        });
      post(
        "production",
        `${c.name} · ${s.id} · ${treatment.name} · ${Math.round(volume)} m³`,
        -volume * def.harvestCost * treatment.cost * bucking.cost -
          used * c.hourlyCost -
          relocation.km * c.relocationCostKm,
        s.id,
      );
      report.emissions += volume * r.ecology.harvestKgCO2M3;
      report.disturbance +=
        volume *
        r.ecology.disturbance[w[def.zone]] *
        (1 - retention) *
        treatment.disturbance;
      if (s.remaining - def.volume * retention < 0.001)
        report.messages.push(
          `${s.id}: ${treatment.name.toLowerCase()} complete; ${Math.round(retention * 100)}% standing retention.`,
        );
    }
  }
  // Trucks persist at their actual last destination. Each loop includes empty
  // repositioning then a loaded road journey; one shared stock ledger prevents double shipments.
  for (const t of r.trucks) {
    let hours = t.hours;
    report.truckHours[t.id] = 0;
    report.truckActivity![t.id] = {travel:0,handling:0};
    post("fleet", `${t.name} weekly availability`, -t.fixedWeekly);
    for (const order of g.plan.trucks[t.id] ?? []) {
      const s = g.stands.find((s) => s.id === order.stand)!,
        def = r.stands.find((s) => s.id === order.stand)!,
        mill = r.mills.find((m) => m.id === order.mill)!;
      const payload = operatingPayload(r, t.id, order.product);
      if (!s.owned || payload <= 0) continue;
      if (
        activeDisruptions(g, false).some(
          (e) => e.kind === "mill" && e.target === mill.id,
        )
      ) {
        report.messages.push(
          `${t.name}: ${mill.name} is temporarily unavailable.`,
        );
        continue;
      }
      let shipped = 0, serviceRestricted = false;
      for (let load = 0; load < order.loads; load++) {
        const empty = route(
            r,
            g.truckPositions[t.id],
            def.node,
            w,
            g.improvedRoads,
            { kind: "truck", id: t.id, product: order.product, payloadM3: 0 },
          ),
          loaded = route(r, def.node, mill.node, w, g.improvedRoads,
            { kind: "truck", id: t.id, product: order.product, payloadM3: payload });
        if (!empty || !loaded) {
          if (!shipped)
            report.messages.push(
              `${t.name}: closed road for ${s.id} → ${mill.name}.`,
            );
          break;
        }
        const contract = r.offtakeOffers?.find(c=>c.id===order.offtake);
        const contractState = order.offtake ? g.offtake?.[order.offtake] : undefined;
        let partner = partnerTrip(
          g,
          order.partnerJob,
          g.truckPositions[t.id],
          def.node,
          w,
          payload,
        );
        let settlement = partner
          ? freightSettlement(
              partner,
              empty.km,
              t.costKm,
              g.cooperation.partnerShare,
            )
          : null;
        if (settlement && !settlement.feasible) {
          report.messages.push(
            `${t.id}: partner job ${order.partnerJob} has no mutually beneficial settlement within its freight quote.`,
          );
          partner = null;
          settlement = null;
        }
        const repositionKm = partner?.km ?? empty.km,
          repositionHours = partner?.hours ?? empty.hours;
        const used =
          repositionHours +
          loaded.hours +
          (partner ? 2 : 1) * (t.loadingHours + t.unloadingHours);
        if (used > hours + 1e-8) break;
        const demand = mill.demand[month(g)][order.product] ?? 0,
          delivered = g.deliveries[mill.id]?.[order.product] ?? 0,
          stock = stockAt(g, s.id)[order.product] ?? 0;
        const available=dispatchableStock(g,order,stock),restriction=reciprocalDispatchRestriction(g,order,Math.min(payload,available),report);
        if(restriction){
          serviceRestricted=true;
          const message=restriction.reason==='fixed'
            ? `${t.name}: agreement ${restriction.pair} fixes ${s.id} / ${order.product} to ordinary deliveries at ${restriction.ownMill} through turn ${restriction.deadline}.`
            : restriction.reason==='unknown'
              ? `${t.name}: agreement ${restriction.pair} has unverifiable own-mill service records; cross delivery is paused.`
              : `${t.name}: agreement ${restriction.pair} protects ${restriction.protectedM3.toFixed(1)} m³ at ${s.id} for own-mill service or reserve through turn ${restriction.deadline}; deliver ordinary supply to ${restriction.ownMill} first.`;
          if(!report.messages.includes(message))report.messages.push(message);
        }
        const volume = Math.min(
          payload,
          reciprocalDispatchableStock(g,order,available,report),
          contract && contractState ? Math.max(0,contract.volume-contractState.delivered) : (order.spot || order.process) ? stock : Math.max(0, demand - delivered),
        );
        if (volume < 0.001) break;
        for(const [id,n] of Object.entries(consumeReservation(g,order,volume))){report.reservationFulfillment??={};report.reservationFulfillment[id]=(report.reservationFulfillment[id]??0)+n;}
        let remaining = volume,
          weightedQuality = 0;
        for (const b of s.stock
          .filter((b) => b.product === order.product)
          .sort((a, b) => a.week - b.week)) {
          const amount = Math.min(remaining, b.volume);
          weightedQuality += amount * b.quality;
          b.volume -= amount;
          remaining -= amount;
          if (remaining < 0.00001) break;
        }
        s.stock = s.stock.filter((b) => b.volume > 1e-7);
        hours -= used;
        report.truckHours[t.id] += used;
        report.truckActivity![t.id].travel += repositionHours + loaded.hours;
        report.truckActivity![t.id].handling += (partner ? 2 : 1) * (t.loadingHours + t.unloadingHours);
        g.truckPositions[t.id] = mill.node;
        shipped += volume;
        report.shipments!.push({stand:s.id,mill:mill.id,product:order.product,volume,market:order.process?'processing':contract?'offtake':order.spot?'spot':'ordinary'});
        g.deliveries[mill.id] ??= {};
        report.millDeliveries[mill.id] ??= {};
        if (order.process) receiveProcessing(g,report,mill.id,order.product,volume);
        else if (contract && contractState) {
          contractState.delivered += volume;
          report.offtakeDeliveries ??= {};
          add(report.offtakeDeliveries,contract.id,volume);
        } else if (!order.spot) add(g.deliveries[mill.id], order.product, volume);
        add(report.millDeliveries[mill.id], order.product, volume);
        add(report.delivered, order.product, volume);
        if (!order.process) post(
          contract ? "offtake-sales" : order.spot ? "spot-sales" : "sales",
          `${contract ? contract.company + " / " + contract.id : mill.name} · ${order.product} · ${Math.round(volume)} m³`,
          weightedQuality * (contract?.priceM3 ?? (order.spot ? mill.spotPrices![order.product] : mill.prices[order.product])),
          s.id,
        );
        post(
          "haul",
          `${t.id}: ${Math.round(repositionKm + loaded.km)} km`,
          -(repositionKm + loaded.km) * t.costKm,
          s.id,
        );
        if (partner) {
          report.partnerSavings =
            (report.partnerSavings ?? 0) + settlement!.savings;
          g.partnerDelivered ??= {};
          report.partnerDeliveries ??= {};
          add(g.partnerDelivered, partner.job.id, partner.volume);
          add(report.partnerDeliveries, partner.job.id, partner.volume);
          report.partnerAvoidedKm =
            (report.partnerAvoidedKm ?? 0) +
            partner.standaloneKm -
            (repositionKm - empty.km);
          post(
            "cooperation",
            `${t.id} · ${partner.job.company} · ${messageM3(partner.volume)} m³ · ${partner.job.id}`,
            settlement!.payment,
          );
          report.messages.push(
            `${t.id}: carried ${messageM3(partner.volume)} m³ partner cargo on ${partner.job.id}; additional handling and travel consumed ${(repositionHours - empty.hours + t.loadingHours + t.unloadingHours).toFixed(1)} h.`,
          );
        }
        report.emissions += (repositionKm + loaded.km) * r.ecology.haulKgCO2Km;
        report.movements.push({
          resource: t.id,
          kind: "truck",
          path: [...(partner?.path ?? empty.path), ...loaded.path.slice(1)],
          km: repositionKm + loaded.km,
          hours: used,
          volume,
          from: empty.nodes[0],
          to: mill.node,
        });
      }
      if (!shipped && !serviceRestricted)
        report.messages.push(
          `${t.name}: no delivery for ${s.id} / ${order.product}; check stock, demand and time.`,
        );
    }
  }
  runReciprocal(g,report,post);
  runFacilityTransfers(g, report, post);
  runProcessing(g, report, post);
  for (const offer of r.offtakeOffers ?? []) {
    const state=g.offtake?.[offer.id];
    if(state && !state.settled && g.week===offer.deadline) {
      post("offtake-shortfall",`${offer.company} / ${offer.id} closing shortfall`, -Math.max(0,offer.volume-state.delivered)*offer.shortfallM3);
      state.settled=true;
      g.plan.reservations=g.plan.reservations?.filter(r=>r.offtake!==offer.id);
    }
  }
  // Auctions resolve after operations: a successful lot first appears in the
  // next planning week. Bids are paid only when won; ties favour the rival.
  for (const [id, bid] of Object.entries(g.plan.bids)) {
    if (bid <= 0) continue;
    const d = r.stands.find((s) => s.id === id)!,
      s = g.stands.find((s) => s.id === id)!,
      rival = d.askingPrice * (0.86 + random(g.seed, g.week, id) * 0.35) * marketSnapshot(g,g.week,false).bidIndex;
    if (bid > rival && ((!r.bcTenure && r.economy.timberPayment === "harvest-royalty") || g.cash + (r.economy.procurementCreditLimit ?? 0) >= bid)) {
      s.owned = true;
      s.purchaseWeek = g.week;
      s.purchasePaid = bid;
      lockAwardStumpage(g,id,r);
      if((!r.bcTenure && r.economy.timberPayment === "harvest-royalty"))s.royaltyM3=bid/d.volume;
      post("auction", `Won ${id}${r.bcTenure ? " (upfront teaching sale premium; stumpage additional)" : ""}; rival ${messageMoney(r, rival)}`, (!r.bcTenure && r.economy.timberPayment === "harvest-royalty") ? 0 : -bid, id);
      report.messages.push(
        `Won ${id} for ${messageMoney(r, bid)}. Available next week; refusal window lasts one week.`,
      );
    } else
      report.messages.push(
        `${id}: ${(!!r.bcTenure || r.economy.timberPayment !== "harvest-royalty") && g.cash + (r.economy.procurementCreditLimit ?? 0) < bid ? "insufficient cash and credit at settlement" : "rival bid " + messageMoney(r, rival) + " won"}.`,
      );
  }
  post("overhead", "Regional weekly operating costs", -r.economy.fixedWeekly);
  post(
    "storage",
    "Roadside inventory holding",
    -g.stands.reduce((n, s) => n + sum(stockAt(g, s.id)), 0) *
      r.economy.storageCostM3,
  );
  if (g.week % r.weeksPerMonth === 0 || g.week === r.weeks) {
    for (const m of r.mills) {
      report.fulfillment[m.id] = {};
      for (const [p, target] of Object.entries(g.plan.targets[m.id] ?? {})) {
        const delivered = g.deliveries[m.id]?.[p] ?? 0;
        report.fulfillment[m.id][p] = target ? delivered / target : 1;
        if (target <= 0) continue;
        report.targetChecks++;
        if (
          delivered >= target * (1 - r.economy.tolerance) &&
          delivered <= target * (1 + r.economy.tolerance)
        ) {
          report.targetHits++;
          post(
            "target",
            `${m.name} / ${p} commitment achieved`,
            Math.min(delivered, target) * r.economy.bonusPerM3,
          );
        } else {
          const short = Math.max(
            0,
            target * (1 - r.economy.tolerance) - delivered,
          );
          post(
            "target",
            `${m.name} / ${p} shortfall`,
            -short * r.economy.shortfallPerM3,
          );
        }
      }
    }
    g.deliveries = {};
  }
  if (g.week === r.weeks) {
    for (const e of settleObligationEntries(g)) post(e.category,e.description,e.amount,e.standId);
    post(
      "terminal",
      "Unused purchased standing timber",
      -Math.max(0, g.stands.reduce(
        (n, s) => n + (s.owned && s.purchasePaid > 0 ? s.remaining : 0),
        0,
      ) - (r.economy.terminalStandingAllowanceM3 ?? 0)) * r.economy.terminalStandingCostM3,
    );
    post(
      "terminal",
      "Closing roadside inventory",
      -Math.max(0, g.stands.reduce((n, s) => n + sum(stockAt(g, s.id)), 0) - (r.economy.terminalRoadsideAllowanceM3 ?? 0)) *
        r.economy.terminalRoadsideCostM3,
    );
    report.messages.push(
      "Campaign complete. Remaining timber and roadside stock are retained in the mass-balance report; terminal carrying charges have been settled.",
    );
  }
  if (g.cash < 0 && (r.economy.annualDebtRate ?? 0) > 0) {
    const weeklyRate = Math.expm1(Math.log1p(r.economy.annualDebtRate!) * (r.turnDurationWeeks ?? 1) / 52);
    post("interest", "Turn interest on closing operating debt", g.cash * weeklyRate);
  }
  report.snapshot = structuredClone({
    operationalRoadIds:r.roads.edges.map(e=>e.id),
    stands: g.stands,
    crewPositions: g.crewPositions,
    truckPositions: g.truckPositions,
    improvedRoads: g.improvedRoads,
  });
  report.cash = g.cash;
  g.history.push(report);
  g.week++;
  refreshAuthorizations(g);
  g.plan.bids = {};
  delete g.plan.bidComposition;
  for (const id of Object.keys(g.plan.trucks)) g.plan.trucks[id] = g.plan.trucks[id].filter(o=>!o.offtake || !g.offtake?.[o.offtake]?.settled);
  g.plan.ready = { purchase: false, production: false, transport: false };
  for (const c of r.crews)
    g.plan.crews[c.id] = g.plan.crews[c.id].filter((o) => {
      const s = g.stands.find((s) => s.id === o.stand)!,
        d = r.stands.find((s) => s.id === o.stand)!;
      return s.owned && s.remaining > d.volume * retainedFraction(g, o) + 0.001;
    });
  if ((g.week - 1) % r.weeksPerMonth === 0 && g.week <= r.weeks)
    g.plan.targets = blankPlan(effectiveMarketRegion(g), month(g)).targets;
  activateScheduledCrews(g);
  return g;
}
export interface DraftPlanOptions { harvestFraction?:number; bucking?:string; treatment?: string; commitmentAware?: boolean; salesPolicy?: "margin" | "contract-first" | "penalty-aware" }
export function draftPlan(input: Game, settings: DraftPlanOptions = {}): Game {
  if(settings.harvestFraction!==undefined&&(!Number.isFinite(settings.harvestFraction)||settings.harvestFraction<=0||settings.harvestFraction>1))throw Error("Choose harvest effort above zero and at most 100%.");
  buckingProfile(input.region,settings.bucking);
  if (settings.treatment && settings.treatment !== "final" && !input.region.treatments?.[settings.treatment]) throw Error("Unknown draft treatment.");
  const g = structuredClone(input),
    r = operatingRegion(g, true),
    w = weatherAt(g, true),
    reserved = new Set<string>();
  // Roads, forecast and improvements stay fixed during this draft. Reuse each
  // directed journey across products, markets and trucks, including closures.
  // Keep the cache local so the next draft observes changed access conditions.
  const journeys = new Map<string, ReturnType<typeof route>>();
  const journey = (from: string, to: string, request?: TravelRequest) => {
    const key = JSON.stringify([from, to, r.operations ? request : undefined]);
    if (!journeys.has(key)) journeys.set(key, route(r, from, to, w, g.improvedRoads, request));
    return journeys.get(key)!;
  };
  for (const c of r.crews) {
    if (c.hours <= 0) {
      g.plan.crews[c.id] = [];
      continue;
    }
    const candidates = r.stands
      .filter((s) => {
        const state = g.stands.find((t) => t.id === s.id)!;
        return (
          state.owned &&
          !harvestAuthorizationProblem(g, s.id) &&
          !standWorkProblems(g, s.id, c.id, settings.treatment, w[s.zone]).length &&
          state.remaining > s.volume * retainedFraction(g, { stand: s.id, hours: c.hours, treatment: settings.treatment }) + 1 &&
          canAccess(s.terrain, w[s.zone]) &&
          !reserved.has(s.id)
        );
      })
      .map((s) => ({
        s,
        path: journey(g.crewPositions[c.id], s.node, { kind: "crew", id: c.id }),
      }))
      .filter((x) => x.path)
      .sort((a, b) => a.path!.hours - b.path!.hours);
    const choice = candidates[0];
    g.plan.crews[c.id] = choice ? [{ stand: choice.s.id, hours: c.hours, ...(settings.bucking?{bucking:settings.bucking}:{}), ...(settings.treatment ? { treatment: settings.treatment } : {}) }] : [];
    if (choice) reserved.add(choice.s.id);
  }
  // Preview production on a copy, then allocate projected inventory and demand
  // across trucks. Forecast is used; actual weather can still invalidate a plan.
  // Reservation helpers only consume the private reservation list. Copy that
  // list rather than cloning the entire campaign history a second time.
  const reservationProjection: Game = {
    ...g,
    plan: { ...g.plan, reservations: structuredClone(g.plan.reservations) },
  };
  const projected: Record<string, Stock> = Object.fromEntries(
    g.stands.map((s) => {
      const stock: Stock = {};
      // Match advance's single aging pass without changing the saved batches.
      // A downgraded batch receives a fresh window; do not age its destination again.
      for (const batch of s.stock) {
        const product = r.products.find(p => p.id === batch.product)!;
        const expired = g.week - batch.week >= product.maxFreshWeeks;
        const destination = expired ? product.downgradeTo : product.id;
        if (destination && batch.volume > 1e-7) add(stock, destination, batch.volume);
      }
      return [s.id, stock];
    }),
  );
  for (const c of r.crews)
    for (const o of g.plan.crews[c.id]) {
      const d = r.stands.find((s) => s.id === o.stand)!,
        s = g.stands.find((s) => s.id === o.stand)!,
        path = journey(g.crewPositions[c.id], d.node, { kind: "crew", id: c.id })!;
      const relocationHours = r.operations ? Math.max(path.hours, path.km / c.relocationSpeed) : path.km / c.relocationSpeed;
      const rate = operatingProductionRate(r, c.id, d.id,
        d.productivity * buckingProfile(r,o.bucking).productivity * treatmentFor(g, o).productivity *
        c.productivityFactor * (w[d.zone] === "wet" ? .8 : w[d.zone] === "thaw" ? .65 : 1), w[d.zone]);
      const n = Math.min(
        s.remaining - d.volume * retainedFraction(g, o),
        Math.max(0, o.hours - relocationHours) * rate,
      );
      for (const [p, ratio] of Object.entries(recoveredMix(r,d.mix,o.bucking)))
        add(projected[d.id], p, n * ratio);
    }
  const markets = r.mills.map(m=>({...m,marketKey:m.id,offtake:undefined as string|undefined,spot:false}));
  for(const m of r.mills) {
    if(m.spotPrices) markets.push({...m,marketKey:`spot:${m.id}`,prices:m.spotPrices,offtake:undefined,spot:true});
    for(const o of r.offtakeOffers??[])if(o.mill===m.id&&g.offtake?.[o.id]&&!g.offtake[o.id].settled&&g.week<=o.deadline)
      markets.push({...m,marketKey:`offtake:${o.id}`,prices:{[o.product]:o.priceM3},offtake:o.id,spot:false});
  }
  const demand = Object.fromEntries(markets.map(m=>[m.marketKey,Object.fromEntries(Object.keys(m.prices).map(p=>{
    const offer=r.offtakeOffers?.find(o=>o.id===m.offtake);
    const n=offer ? Math.max(0,offer.volume-g.offtake![offer.id].delivered) : m.spot ? Number.MAX_SAFE_INTEGER : Math.max(0,Math.min(m.demand[month(g)][p]??0, settings.commitmentAware ? (g.plan.targets[m.id]?.[p]??0) : Infinity)-(g.deliveries[m.id]?.[p]??0));
    return [p,n];
  }))]));
  for (const t of r.trucks) {
    g.plan.trucks[t.id] = [];
    let hours = t.hours,
      position = g.truckPositions[t.id];
    for (let slot = 0; slot < 3; slot++) {
      const options = [];
      for (const s of r.stands)
        for (const [p, n] of Object.entries(projected[s.id]))
          if (n >= operatingPayload(r, t.id, p) / 2)
            for (const m of markets)
              if (
                reciprocalDispatchableStock(reservationProjection,{stand:s.id,mill:m.id,product:p,offtake:m.offtake,spot:m.spot},dispatchableStock(reservationProjection,{stand:s.id,mill:m.id,product:p,loads:1,offtake:m.offtake,spot:m.spot},n))>0 &&
                (demand[m.marketKey][p] ?? 0) > 0 &&
                !activeDisruptions(g).some(
                  (e) => e.kind === "mill" && e.target === m.id,
                )
              ) {
                const payload = operatingPayload(r, t.id, p);
                const empty = journey(position, s.node, { kind: "truck", id: t.id, product: p, payloadM3: 0 }),
                  loaded = journey(s.node, m.node, { kind: "truck", id: t.id, product: p, payloadM3: payload }),
                  returnEmpty = journey(m.node, s.node, { kind: "truck", id: t.id, product: p, payloadM3: 0 });
                if (empty && loaded && returnEmpty && payload > 0) {
                  const cycle =
                    returnEmpty.hours + loaded.hours + t.loadingHours + t.unloadingHours;
                  const first =
                    empty.hours +
                    loaded.hours +
                    t.loadingHours +
                    t.unloadingHours;
                  const loads = Math.min(
                    // The engine accepts partial loads. Include the final load
                    // so the half-payload candidate threshold can actually work.
                    Math.ceil(reciprocalDispatchableStock(reservationProjection,{stand:s.id,mill:m.id,product:p,offtake:m.offtake,spot:m.spot},dispatchableStock(reservationProjection,{stand:s.id,mill:m.id,product:p,loads:1,offtake:m.offtake,spot:m.spot},n)) / payload),
                    settings.commitmentAware ? Math.floor(demand[m.marketKey][p] / payload) : Math.ceil(demand[m.marketKey][p] / payload),
                    first > hours ? 0 : 1 + Math.floor((hours - first) / cycle),
                  );
                  if (loads > 0) {
                    const volume = Math.min(reciprocalDispatchableStock(reservationProjection,{stand:s.id,mill:m.id,product:p,offtake:m.offtake,spot:m.spot},dispatchableStock(reservationProjection,{stand:s.id,mill:m.id,product:p,loads,offtake:m.offtake,spot:m.spot},n)), loads*payload, demand[m.marketKey][p]);
                    const committed = m.offtake ? demand[m.marketKey][p] : m.spot ? 0 : Math.max(0, (g.plan.targets[m.id]?.[p] ?? 0) * (1-r.economy.tolerance)
                      - (g.deliveries[m.id]?.[p] ?? 0) - ((m.demand[month(g)][p] ?? 0)-demand[m.marketKey][p]));
                    const avoidedPenalty = settings.salesPolicy === "penalty-aware"
                      ? Math.min(volume,committed)*(m.offtake ? r.offtakeOffers!.find(o=>o.id===m.offtake)!.shortfallM3 : r.economy.shortfallPerM3) : 0;
                    const time = first + (loads-1)*cycle;
                    const transportCost = (empty.km + loaded.km + Math.max(0,loads-1)*(loaded.km+returnEmpty.km))*t.costKm;
                    options.push({s,p,m,loads,time,payload,
                      value: !settings.salesPolicy ? m.prices[p]/cycle : (m.prices[p]*volume+avoidedPenalty-transportCost)/time,
                      priority: settings.salesPolicy === "contract-first" && committed>0 ? 1 : 0,
                    });
                  }
                }
              }
      options.sort((a, b) => b.priority - a.priority || b.value - a.value);
      const best = options[0];
      if (!best) break;
      g.plan.trucks[t.id].push({
        stand: best.s.id,
        mill: best.m.id,
        ...(best.m.offtake ? {offtake:best.m.offtake} : {}),
        ...(best.m.spot ? {spot:true} : {}),
        product: best.p,
        loads: best.loads,
      });
      const volume = Math.min(
        best.loads * best.payload,
        reciprocalDispatchableStock(reservationProjection,g.plan.trucks[t.id].at(-1)!,dispatchableStock(reservationProjection,g.plan.trucks[t.id].at(-1)!,projected[best.s.id][best.p])),
        demand[best.m.marketKey][best.p],
      );
      consumeReservation(reservationProjection,g.plan.trucks[t.id].at(-1)!,volume);
      projected[best.s.id][best.p] -= volume;
      demand[best.m.marketKey][best.p] -= volume;
      hours -= best.time;
      position = best.m.node;
    }
  }
  // Explicit pacing choice: retain dispatch orders for review against the
  // reduced harvest in the forecast rehearsal, just as with manual hour edits.
  if(settings.harvestFraction!==undefined)for(const orders of Object.values(g.plan.crews))for(const order of orders)order.hours*=settings.harvestFraction;
  g.plan.ready = { purchase: false, production: false, transport: false };
  return g;
}
