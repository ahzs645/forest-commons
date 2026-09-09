import { harvestAuthorizationProblem, stumpageCost } from "./tenure";
import { operatingRegion } from "./disruptions";
import type { Game, RegionDefinition, Stock } from "./types";
export interface StewardshipParameters {
  years: number;
  annualGrowthM3Ha: number;
  carryingCapacityM3Ha: number;
  naturalRegenerationYears: number;
  plantedRegenerationYears: number;
  plantingCostHa: number;
  thinningFraction: number;
  finalRetention: number;
  thinningNetM3: number;
  finalNetM3: number;
  habitatRecoveryPerYear: number;
  initialHabitat: number;
  startingBudget: number;
  note: string;
}
export type StewardshipAction = "rest" | "thin" | "final" | "plant";
export interface StewardshipStand {
  id: string;
  managed: boolean;
  /** Opening authorization snapshot for the annual abstraction. */
  harvestAuthorizationProblem?: string | null;
  /** Published operating rates frozen at exercise opening, not a 30-year forecast. */
  stumpageRates?: Stock;
  volume: number;
  habitat: number;
  regenerationAge: number;
  planted: boolean;
  yearsSinceTreatment: number;
}
export interface StewardshipState {
  /** Explicit opening balance when linked to operating cash. */
  openingBudget?: number;
  year: number;
  cash: number;
  stands: StewardshipStand[];
  history: {
    year: number;
    opening: number;
    growth: number;
    harvest: number;
    closing: number;
    cashChange: number;
    stumpageCost?: number;
    postHarvestCost?: number;
    postHarvestAccrued?: number;
    habitat: number;
    managedHabitat?: number | null;
    operatingSeason?: {startCalendarWeek:number;weeks:number;roadsideWriteOff:number};
    actions: Record<string, StewardshipAction>;
  }[];
}
export function startStewardship(game: Game): StewardshipState {
  const p = game.region.stewardship;
  if (!p) throw Error("This region has no stewardship parameters.");
  const market = operatingRegion(game);
  return {
    year: 1,
    cash: p.startingBudget,
    stands: game.region.stands.map((s) => ({
      id: s.id,
      managed:
        game.stands.find((x) => x.id === s.id)!.owned &&
        s.supply !== "protected",
      ...(game.region.bcTenure ? {harvestAuthorizationProblem: harvestAuthorizationProblem(game, s.id), stumpageRates: structuredClone(market.bcTenure!.stands[s.id].stumpage.rates)} : {}),
      volume: game.stands.find((x) => x.id === s.id)!.remaining,
      habitat:
        p.initialHabitat *
        ((s.volume ? game.stands.find((x) => x.id === s.id)!.remaining / s.volume : 0)),
      regenerationAge: 0,
      planted: false,
      yearsSinceTreatment: 0,
    })),
    history: [],
  };
}
export function stewardshipYear(
  region: RegionDefinition,
  state: StewardshipState,
  actions: Record<string, StewardshipAction>,
): StewardshipState {
  const p = region.stewardship;
  if (!p || state.year > p.years)
    throw Error("The stewardship horizon is complete.");
  const g = structuredClone(state),
    report = {
      year: g.year,
      opening: g.stands.reduce((n, s) => n + s.volume, 0),
      growth: 0,
      harvest: 0,
      closing: 0,
      cashChange: 0,
      ...(region.bcTenure ? {stumpageCost: 0, postHarvestCost: 0, postHarvestAccrued: 0} : {}),
      habitat: 0,
      managedHabitat: null as number | null,
      actions: structuredClone(actions),
    };
  for (const [id, action] of Object.entries(actions))
    if (
      !region.stands.some((s) => s.id === id) ||
      !["rest", "thin", "final", "plant"].includes(action)
    )
      throw Error("Unknown stewardship action or stand.");
  let plantingCost = 0;
  for (const s of g.stands) {
    const d = region.stands.find((d) => d.id === s.id)!,
      a = actions[s.id] ?? "rest";
    if (d.supply === "protected" && a !== "rest")
      throw Error(`${s.id} is protected.`);
    if (!s.managed && a !== "rest")
      throw Error(`${s.id} was not secured when this exercise began.`);
    const authorizationProblem = s.harvestAuthorizationProblem === undefined
      ? (region.bcTenure?.stands[s.id]?.harvest.initialStatus === 'required' ? 'authorization application required before starting the annual exercise' : null)
      : s.harvestAuthorizationProblem;
    if ((a === "thin" || a === "final") && authorizationProblem)
      throw Error(`${s.id}: ${authorizationProblem}`);
    if (a === "plant") {
      if (s.planted) throw Error(`${s.id} is already planted.`);
      if (s.volume > d.hectares * p.carryingCapacityM3Ha * 0.5)
        throw Error(`${s.id} has insufficient regeneration space.`);
      plantingCost += d.hectares * p.plantingCostHa;
    }
  }
  if (plantingCost > 0 && plantingCost > g.cash)
    throw Error("The stewardship budget cannot cover planting.");
  g.cash -= plantingCost;
  report.cashChange -= plantingCost;
  for (const s of g.stands) {
    const d = region.stands.find((d) => d.id === s.id)!,
      a = actions[s.id] ?? "rest",
      capacity = Math.max(d.volume, d.hectares * p.carryingCapacityM3Ha);
    if (a === "thin" || a === "final") {
      if (
        s.yearsSinceTreatment < 5 &&
        g.history.some((h) => ["thin", "final"].includes(h.actions[s.id] ?? ""))
      )
        throw Error(`${s.id} needs five years between harvest treatments.`);
      const fraction = a === "thin" ? p.thinningFraction : 1 - p.finalRetention,
        harvest = s.volume * fraction;
      s.volume -= harvest;
      s.habitat *= 1 - fraction;
      s.yearsSinceTreatment = 0;
      if (a === "final") {
        s.regenerationAge = 0;
        s.planted = false;
      }
      report.harvest += harvest;
      // BC annual net margins exclude Crown stumpage and the explicit obligation provision.
      // Linked settlement calls this with rest, so operating costs are never charged twice.
      const products = Object.fromEntries(Object.entries(d.mix).map(([id, share]) => [id, share * harvest]));
      const stumpage = s.stumpageRates ? Object.entries(products).reduce((n,[id,volume])=>n+volume*(s.stumpageRates![id]??0),0) : stumpageCost(region, s.id, products);
      const duties = region.bcTenure?.stands[s.id]?.obligations ?? [];
      const provision = duties.filter(o => o.responsibleParty === 'operator').reduce((n, o) => n + o.costPerM3 * harvest, 0);
      if (region.bcTenure) {
        report.stumpageCost! += stumpage;
        report.postHarvestCost! += provision;
        report.postHarvestAccrued! += duties.reduce((n, o) => n + o.costPerM3 * harvest, 0);
      }
      const revenue = harvest * (a === "thin" ? p.thinningNetM3 : p.finalNetM3) - stumpage - provision;
      g.cash += revenue;
      report.cashChange += revenue;
    } else if (a === "plant") {
      s.planted = true;
      s.regenerationAge = 0;
    }
    const lag = s.planted
      ? p.plantedRegenerationYears
      : p.naturalRegenerationYears;
    // A canopy near capacity can continue growing; sparsely stocked areas wait for regeneration establishment.
    const established = s.volume >= capacity * 0.5 || s.regenerationAge >= lag;
    const growth = established
      ? Math.max(
          0,
          Math.min(capacity - s.volume, d.hectares * p.annualGrowthM3Ha),
        )
      : 0;
    s.volume += growth;
    report.growth += growth;
    s.regenerationAge++;
    s.yearsSinceTreatment++;
    if (a === "rest" || a === "plant")
      s.habitat = Math.min(1, s.habitat + p.habitatRecoveryPerYear);
  }
  report.closing = g.stands.reduce((n, s) => n + s.volume, 0);
  report.habitat =
    g.stands.reduce(
      (n, s) =>
        n + s.habitat * region.stands.find((d) => d.id === s.id)!.hectares,
      0,
    ) / region.stands.reduce((n, s) => n + s.hectares, 0);
  report.managedHabitat = stewardshipHabitat(region, g).managed;
  g.history.push(report);
  g.year++;
  return g;
}
export function validateStewardship(
  region: RegionDefinition,
  s: StewardshipState,
) {
  const p = region.stewardship,
    num = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0;
  if (
    !p ||
    !Number.isInteger(s.year) ||
    s.year < 1 ||
    s.year > p.years + 1 ||
    !Number.isFinite(s.cash) ||
    (s.openingBudget === undefined && s.cash < 0) ||
    (s.openingBudget !== undefined && !Number.isFinite(s.openingBudget)) ||
    !Array.isArray(s.stands) ||
    s.stands.length !== region.stands.length ||
    new Set(s.stands.map((s) => s.id)).size !== s.stands.length ||
    !Array.isArray(s.history) ||
    s.history.length !== s.year - 1
  )
    throw Error("Invalid stewardship save.");
  for (const t of s.stands) {
    const d = region.stands.find((d) => d.id === t.id);
    if (
      !d ||
      typeof t.managed !== "boolean" ||
      (t.harvestAuthorizationProblem !== undefined && t.harvestAuthorizationProblem !== null && typeof t.harvestAuthorizationProblem !== "string") ||
      (d.supply === "protected" && t.managed) ||
      (t.stumpageRates !== undefined && (!t.stumpageRates || Object.entries(t.stumpageRates).some(([id,v]) => !region.products.some(p=>p.id===id) || !num(v)))) ||
      !num(t.volume) ||
      t.volume >
        Math.max(d.volume, d.hectares * p.carryingCapacityM3Ha) + 0.001 ||
      !num(t.habitat) ||
      t.habitat > 1 ||
      !Number.isInteger(t.regenerationAge) ||
      t.regenerationAge < 0 ||
      typeof t.planted !== "boolean" ||
      !Number.isInteger(t.yearsSinceTreatment) ||
      t.yearsSinceTreatment < 0
    )
      throw Error("Invalid stewardship stand.");
  }
  if (
    Math.abs(
      (s.openingBudget ?? p.startingBudget) +
        s.history.reduce((n, h) => n + h.cashChange, 0) -
        s.cash,
    ) > 0.01
  )
    throw Error("Invalid stewardship cash balance.");
  for (const [i, h] of s.history.entries())
    if (
      !h.actions ||
      Object.entries(h.actions).some(
        ([id, a]) =>
          !region.stands.some((d) => d.id === id) ||
          !["rest", "thin", "final", "plant"].includes(a),
      ) ||
      (i > 0 && Math.abs(h.opening - s.history[i - 1].closing) > 0.01) ||
      (h.operatingSeason !== undefined && (!Number.isInteger(h.operatingSeason.startCalendarWeek) || h.operatingSeason.startCalendarWeek<1 || h.operatingSeason.startCalendarWeek>52 || h.operatingSeason.weeks!==12 || !num(h.operatingSeason.roadsideWriteOff))) ||
      h.year !== i + 1 ||
      ![h.opening, h.growth, h.harvest, h.closing, h.habitat].every(num) ||
      h.habitat > 1 ||
      (h.managedHabitat !== undefined && h.managedHabitat !== null && (!num(h.managedHabitat) || h.managedHabitat > 1)) ||
      !Number.isFinite(h.cashChange) ||
      [h.stumpageCost,h.postHarvestCost,h.postHarvestAccrued].some(v => v !== undefined && !num(v)) ||
      Math.abs(h.opening + h.growth - h.harvest - h.closing) > 0.01
    )
      throw Error("Invalid stewardship history.");
  if (
    s.history.length &&
    Math.abs(
      s.stands.reduce((n, t) => n + t.volume, 0) - s.history.at(-1)!.closing,
    ) > 0.01
  )
    throw Error("Invalid stewardship closing inventory.");
}

/** Area-weighted teaching indicators; managed subset is frozen when exercise starts. */
export function stewardshipHabitat(region: RegionDefinition, state: StewardshipState) {
  let total = 0, landscape = 0, managedArea = 0, managed = 0;
  for (const stand of state.stands) {
    const area = region.stands.find(d => d.id === stand.id)!.hectares;
    total += area; landscape += area * stand.habitat;
    if (stand.managed) { managedArea += area; managed += area * stand.habitat; }
  }
  return { landscape: total ? landscape / total : 0, managed: managedArea ? managed / managedArea : null, managedArea };
}
