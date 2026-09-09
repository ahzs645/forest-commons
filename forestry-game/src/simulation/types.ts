import type {BCMarketDefinition, BCMarketState, BCMarketSnapshot} from './bc-market';
import type { BCTenureRegion, BCTenureState } from './tenure';
import type {ReciprocalPair,ReciprocalAgreement} from './reciprocal';
import type {DestinationReservation} from "./reservations";
import type { CalibrationManifest } from "./regional-calibration";
import type { SeasonCalendar, LinkedSeason } from "./season-calendar";
import type { StewardshipParameters, StewardshipState } from "./stewardship";
export type Position = [number, number];
export type Weather = "thaw" | "wet" | "normal" | "frozen";
export type Stock = Record<string, number>;
export interface Product {
  symbol?: "logs" | "boards" | "pulp" | "chips";
  id: string;
  name: string;
  color: string;
  downgradeTo?: string;
  maxFreshWeeks: number;
}
export interface RoadNode {
  id: string;
  position: Position;
}
export interface WeatherPoint { temperatureC: number; snowCm: number; precipitationMm: number }
export interface WeatherCharts { model?: "category-illustration"; startCalendarWeek: number; provenance: string; scenarios: Record<string, {forecast: Record<string, WeatherPoint[]>; actual: Record<string, WeatherPoint[]>}> }
export interface RoadEdge {
  roadClass?: "public" | "forest";
  id: string;
  from: string;
  to: string;
  km: number;
  speed: number;
  bearing: number;
  zone: string;
  geometry: Position[];
  name: string;
}
export interface StandDefinition {
  sourceNote?: string;
  id: string;
  name: string;
  position: Position;
  polygon: Position[];
  node: string;
  zone: string;
  terrain: number;
  volume: number;
  mix: Stock;
  productivity: number;
  harvestCost: number;
  askingPrice: number;
  supply: "guaranteed" | "private" | "auction" | "protected";
  auctionWeek: number;
  hectares: number;
}
export interface ProcessingDefinition {
  inputs: string[]; capacityM3: number; costM3: number;
  outputs: {id:string; name:string; yield:number; price:number; weeklyDemand:number}[];
}
export interface FacilityTransfer { id: string; source: string; output: string; target: string; input: string; inputEquivalentRatio: 1 }
export interface ProcessingState { transferred?: Stock; input: Stock; output: Stock; received: number; processed: number; sold: Stock; residue: number }
export interface MillDefinition {
  processing?: ProcessingDefinition;
  spotPrices?: Stock;
  id: string;
  name: string;
  position: Position;
  node: string;
  demand: Stock[];
  prices: Stock;
}
export interface CrewDefinition {
  id: string;
  name: string;
  node: string;
  hours: number;
  productivityFactor: number;
  hourlyCost: number;
  relocationSpeed: number;
  relocationCostKm: number;
}
export interface TruckDefinition {
  id: string;
  name: string;
  node: string;
  hours: number;
  payload: number;
  loadingHours: number;
  unloadingHours: number;
  costKm: number;
  fixedWeekly: number;
}
export interface Disruption {
  id: string;
  title: string;
  description: string;
  kind: "road" | "crew" | "truck" | "mill";
  target: string;
  week: number;
  endWeek: number;
  revealWeek: number;
  repairCost: number;
  repairWeeks: number;
}
export interface OfftakeOffer {
  agreement?: string;
  id: string; company: string; mill: string; product: string; volume: number;
  opens: number; acceptBy: number; deadline: number; priceM3: number; shortfallM3: number;
}
export interface OfftakeState { acceptedWeek: number; delivered: number; settled: boolean }
export interface RegionDefinition {
  bcMarket?: BCMarketDefinition;
  bcTenure?: BCTenureRegion;
  reciprocalPairs?:ReciprocalPair[];
  /** Omitted means legacy weekly turns. Explicit subdivisions support two, four or seven turns per week. */
  turnDurationWeeks?: number;
  mobilization?: {allowedNodes:string[];maxHoursPerResource:number;feePerMove:number};
  buckingProfiles?: Record<string,{name:string;productivity:number;cost:number;recovery:Record<string,Stock>}>;
  offtakeOffers?: OfftakeOffer[];
  calibration?: CalibrationManifest;
  seasonCalendar?: SeasonCalendar;
  weatherCharts?: WeatherCharts;
  stewardship?: StewardshipParameters;
  partnerJobs?: {
    id: string;
    company: string;
    from: string;
    to: string;
    product: string;
    volume: number;
    week: number;
    deadline: number;
    paymentPerM3: number;
  }[];
  disruptions?: Disruption[];
  treatments?: Record<
    string,
    {
      name: string;
      retention: number;
      productivity: number;
      cost: number;
      disturbance: number;
    }
  >;
  objectives?: {
    id: string;
    title: string;
    description: string;
    metric: "delivered" | "service" | "waste" | "emissions" | "profit";
    direction: "at-least" | "at-most";
    target: number;
    unit: string;
  }[];
  auctionDisclosure?: { mode: "release-week"; volumeMultiplier: [number, number]; priceMultiplier: [number, number] };
  schemaVersion: 1;
  id: string;
  name: string;
  description: string;
  currency: string;
  center: Position;
  zoom: number;
  weeks: number;
  weeksPerMonth: number;
  products: Product[];
  zones: { id: string; name: string }[];
  stands: StandDefinition[];
  mills: MillDefinition[];
  crews: CrewDefinition[];
  facilityTransfers?: FacilityTransfer[];
  trucks: TruckDefinition[];
  roads: { nodes: RoadNode[]; edges: RoadEdge[] };
  weather: Record<
    string,
    {
      name: string;
      actual: Record<string, Weather[]>;
      forecast: Record<string, Weather[]>;
    }
  >;
  economy: {
    timberPayment?: "upfront" | "harvest-royalty";
    procurementCreditLimit?: number;
    annualDebtRate?: number;
    terminalStandingAllowanceM3?: number;
    terminalRoadsideAllowanceM3?: number;
    startingCash: number;
    fixedWeekly: number;
    bonusPerM3: number;
    shortfallPerM3: number;
    tolerance: number;
    roadUpgradePerKm: number;
    refusalPercent: number;
    storageCostM3: number;
    terminalStandingCostM3: number;
    terminalRoadsideCostM3: number;
  };
  ecology: {
    minimumRetention: number;
    harvestKgCO2M3: number;
    haulKgCO2Km: number;
    disturbance: Record<Weather, number>;
  };
  sources: { title: string; url: string; note: string }[];
}
export interface Batch {
  product: string;
  volume: number;
  week: number;
  quality: number;
}
export interface StandState {
  id: string;
  remaining: number;
  owned: boolean;
  purchaseWeek: number | null;
  purchasePaid: number;
  royaltyM3?: number;
  refused: boolean;
  stock: Batch[];
  harvested: number;
}
export interface CrewOrder {
  bucking?: string;
  treatment?: string;
  stand: string;
  hours: number;
}
export interface HaulOrder {
  offtake?: string;
  spot?: boolean;
  process?: boolean;
  partnerJob?: string;
  stand: string;
  mill: string;
  product: string;
  loads: number;
}
export interface Plan {
  reciprocal?:{pair:string;truckA:string;truckB:string;loads:number}[];
  reservations?: DestinationReservation[];
  facilityTransfers?: {link:string; truck:string; loads:number}[];
  processing?: Record<string, {volume:number; sell:boolean}>;
  crews: Record<string, CrewOrder[]>;
  trucks: Record<string, HaulOrder[]>;
  bids: Record<string, number>;
  /** Explanatory currency contributions; inactive when bid no longer matches. */
  bidComposition?: Record<string, {bid:number; contributions:Stock}>;
  retention: number;
  targets: Record<string, Stock>;
  ready: Record<"purchase" | "production" | "transport", boolean>;
}
export interface LedgerEntry {
  /** Recorded source lot; absent on shared costs or legacy records. */
  standId?: string;
  category: string;
  description: string;
  amount: number;
}
export interface Movement {
  resource: string;
  kind: "crew" | "truck";
  path: Position[];
  km: number;
  hours: number;
  volume: number;
  from: string;
  to: string;
}
export interface WeekResult {
  market?: BCMarketSnapshot;
  /** Actual forest loads; absent in legacy reports whose source attribution is unknown. */
  shipments?: {stand:string;mill:string;product:string;volume:number;market:'ordinary'|'spot'|'offtake'|'processing'|'reciprocal';reciprocalPair?:string}[];
  reciprocal?:{pair:string;volumeEach:number;savings:number;shareA:number;shareB:number;transferToA:number}[];
  facilityTransfers?: {link:string; truck:string; volume:number}[];
  processing?: Record<string, {received:number; processed:number; sold:Stock; residue:number}>;
  offtakeDeliveries?: Record<string, number>;
  truckActivity?: Record<string, {travel: number; handling: number}>;
  production?: {bucking?:string;stand: string; crew: string; treatment: string; startHour: number; endHour: number; relocationHours: number; products: Stock; roadClass: "public" | "forest" | "unknown"}[];
  partnerDeliveries?: Record<string, number>;
  partnerAvoidedKm?: number;
  partnerSavings?: number;
  reservationFulfillment?: Record<string, number>;
  snapshot?: {
    operationalRoadIds?: string[];
    stands: StandState[];
    crewPositions: Record<string, string>;
    truckPositions: Record<string, string>;
    improvedRoads: string[];
  };
  week: number;
  weather: Record<string, Weather>;
  harvested: Stock;
  delivered: Stock;
  millDeliveries: Record<string, Stock>;
  ledger: LedgerEntry[];
  cash: number;
  messages: string[];
  movements: Movement[];
  crewHours: Record<string, number>;
  truckHours: Record<string, number>;
  emissions: number;
  disturbance: number;
  degraded: number;
  waste: number;
  fulfillment: Record<string, Stock>;
  targetChecks: number;
  targetHits: number;
  plan: Plan;
}
export interface NegotiationOffer {
  phase?: "pairs" | "open";
  id: number;
  count: 4 | 5;
  groups: number[];
  shares: Record<string, number>;
  accepted: string[];
  status: "proposed" | "agreed" | "rejected" | "superseded";
}
export interface Negotiation {
  offers?: NegotiationOffer[];
  count: 4 | 5;
  groups: number[];
  method: "equal" | "proportional" | "shapley" | "epm" | "volume" | "nucleolus";
  custom: Record<string, number>;
  phase: "pairs" | "open";
}
export interface Game {
  bcMarket?: BCMarketState;
  bcTenure?: BCTenureState;
  authoredReciprocal?: {ids:string[];originallyAbsent:boolean};
  reciprocal?:Record<string,ReciprocalAgreement>;
  mobilization?: {locked:boolean;moves:{kind:"crew"|"truck";resource:string;from:string;to:string;km:number;hours:number;cost:number}[]};
  processingOpening?: Record<string, ProcessingState>;
  processing?: Record<string, ProcessingState>;
  offtake?: Record<string, OfftakeState>;
  scheduledCrews?: Record<string, Record<string, CrewOrder[]>>;
  stewardship?: StewardshipState;
  linkedSeason?: LinkedSeason;
  partnerDelivered?: Record<string, number>;
  eventResponses?: {
    event: string;
    action: "repair" | "wait";
    week: number;
    restoredWeek: number;
  }[];
  previousCampaign?: {
    region: string;
    seed: number;
    cash: number;
    delivered: number;
    emissions: number;
  };
  negotiation: Negotiation;
  version: 2;
  region: RegionDefinition;
  weatherId: string;
  seed: number;
  week: number;
  cash: number;
  stands: StandState[];
  crewPositions: Record<string, string>;
  truckPositions: Record<string, string>;
  improvedRoads: string[];
  deliveries: Record<string, Stock>;
  plan: Plan;
  history: WeekResult[];
  instantLedger: LedgerEntry[];
  roleMode: boolean;
  cooperation: { pooling: boolean; partnerShare: number };
}
export interface Route {
  nodes: string[];
  edges: string[];
  path: Position[];
  km: number;
  hours: number;
}
