import { teachingWeatherCharts } from "./weather-charts";
import network from "../data/quebec-road-network.json";
import type {
  RegionDefinition,
  Position,
  Weather,
  Stock,
} from "../simulation/types";
const products: RegionDefinition["products"] = [
  {
    id: "soft-pulp",
    symbol: "pulp",
    name: "Softwood pulp",
    color: "#8a9e6b",
    maxFreshWeeks: 4,
  },
  {
    id: "hard-pulp",
    symbol: "pulp",
    name: "Hardwood pulp",
    color: "#c7a878",
    maxFreshWeeks: 4,
  },
  {
    id: "poplar",
    symbol: "logs",
    name: "Poplar",
    color: "#d6b742",
    maxFreshWeeks: 3,
    downgradeTo: "hard-pulp",
  },
  {
    id: "soft-saw",
    symbol: "boards",
    name: "Softwood sawlogs",
    color: "#287557",
    maxFreshWeeks: 3,
    downgradeTo: "soft-pulp",
  },
  {
    id: "hard-saw",
    symbol: "boards",
    name: "Hardwood sawlogs",
    color: "#98644e",
    maxFreshWeeks: 3,
    downgradeTo: "hard-pulp",
  },
];
const roads = structuredClone(network) as RegionDefinition["roads"];
roads.edges.forEach(e => { e.roadClass = "public"; });
// Training supply areas lie outside the lake. Public trunk geometry is real;
// these short access roads and stand boundaries are scenario constructions.
const anchors: Position[] = [
  [-72.23, 48.97],
  [-72.5, 48.94],
  [-72.58, 48.73],
  [-72.34, 48.44],
  [-71.77, 48.47],
  [-71.56, 48.79],
  [-71.83, 48.98],
];
const stands: RegionDefinition["stands"] = Array.from(
  { length: 32 },
  (_, i) => {
    const a = i % 7,
      band = Math.floor(i / 7),
      base = anchors[a];
    const position: Position = [
      base[0] + (band % 2 ? -0.028 : 0.018) * band,
      base[1] + (a < 3 || a === 6 ? 1 : -1) * band * 0.014,
    ];
    const id = `Q${String(i + 1).padStart(2, "0")}`,
      node = `stand-${id}`,
      zone = a < 3 || a === 6 ? "north" : "south";
    roads.nodes.push({ id: node, position });
    const trunk = roads.nodes[a].position;
    const dx = (position[0] - trunk[0]) * 73,
      dy = (position[1] - trunk[1]) * 111;
    roads.edges.push({
      id: `access-${id}`,
      roadClass: "forest",
      from: `t${a}`,
      to: node,
      km: Math.hypot(dx, dy) * 1.18,
      speed: 28,
      bearing: i % 5 === 0 ? 3 : i % 3 === 0 ? 2 : 1,
      zone,
      geometry: [
        trunk,
        [trunk[0] + (position[0] - trunk[0]) * 0.5, position[1] - 0.006],
        position,
      ],
      name: `Training access ${id}`,
    });
    const mix: Stock = {
      "soft-pulp": 0.2,
      "hard-pulp": 0.12,
      poplar: 0.08,
      "soft-saw": 0.48,
      "hard-saw": 0.12,
    };
    if (i % 3 === 0) {
      mix["soft-saw"] = 0.3;
      mix["hard-saw"] = 0.2;
      mix["poplar"] = 0.18;
    }
    return {
      id,
      name: `${["Mistassini", "Ashuapmushuan", "La Doré", "Roberval", "Chambord", "Péribonka", "Albanel"][a]} ${band + 1}`,
      position,
      polygon: [
        [position[0] - 0.007, position[1] - 0.004],
        [position[0] + 0.009, position[1] - 0.003],
        [position[0] + 0.006, position[1] + 0.005],
        [position[0] - 0.006, position[1] + 0.006],
        [position[0] - 0.007, position[1] - 0.004],
      ] as Position[],
      node,
      zone,
      terrain: i % 7 === 0 ? 3 : i % 3 === 0 ? 2 : 1,
      volume: 4600 + (i % 6) * 650,
      mix,
      productivity: 5 + (i % 4) * 0.65,
      harvestCost: 13 + (i % 4),
      askingPrice: (4600 + (i % 6) * 650) * (8 + (i % 4)),
      supply:
        i === 31
          ? "protected"
          : i < 10
            ? "guaranteed"
            : i < 19
              ? "private"
              : "auction",
      auctionWeek: 1 + (i % 5) * 2,
      hectares: 30 + (i % 6) * 4,
    };
  },
);
const millNames = [
  "Dolbeau sawmill",
  "Girardville training mill",
  "La Doré training mill",
  "Roberval training mill",
  "Alma training mill",
  "Norbord training mill",
  "Dolbeau pulp mill",
];
const accepted = [
  ["soft-saw"],
  ["soft-saw", "hard-saw"],
  ["soft-saw"],
  ["hard-saw"],
  ["soft-pulp", "hard-pulp"],
  ["poplar"],
  ["soft-pulp", "hard-pulp"],
];
const mills = millNames.map((name, i) => ({
  id: `M${i + 1}`,
  name,
  position: roads.nodes[i].position,
  node: `t${i}`,
  prices: Object.fromEntries(
    accepted[i].map((p) => [
      p,
      p.endsWith("saw") ? 105 : p === "poplar" ? 68 : 58,
    ]),
  ),
  demand: Array.from({ length: 3 }, (_, m) =>
    Object.fromEntries(
      accepted[i].map((p) => [
        p,
        Math.round(
          (p.endsWith("saw") ? 3500 : p === "poplar" ? 2200 : 2300) *
            (m === 1 ? 1.1 : m === 2 ? 0.9 : 1),
        ),
      ]),
    ),
  ),
}));
const seasons: Record<
  string,
  {
    name: string;
    actual: Record<string, Weather[]>;
    forecast: Record<string, Weather[]>;
  }
> = {};
for (const [id, name, sequence] of [
  [
    "normal",
    "Typical spring",
    [
      "frozen",
      "frozen",
      "normal",
      "wet",
      "thaw",
      "thaw",
      "wet",
      "normal",
      "normal",
      "normal",
      "wet",
      "normal",
    ],
  ],
  [
    "long-thaw",
    "Extended thaw",
    [
      "frozen",
      "normal",
      "wet",
      "thaw",
      "thaw",
      "thaw",
      "wet",
      "wet",
      "normal",
      "wet",
      "normal",
      "normal",
    ],
  ],
  [
    "dry",
    "Dry operating window",
    [
      "frozen",
      "frozen",
      "normal",
      "normal",
      "thaw",
      "wet",
      "normal",
      "normal",
      "normal",
      "normal",
      "normal",
      "normal",
    ],
  ],
] as const) {
  const south = [...sequence] as Weather[],
    north = sequence.map((_, i) => sequence[Math.max(0, i - 1)]) as Weather[];
  seasons[id] = {
    name,
    actual: { north, south },
    forecast: {
      north: north.map((w, i) => (i === 6 ? "normal" : w)),
      south: south.map((w, i) => (i === 4 ? "wet" : w)),
    },
  };
}
export const quebec: RegionDefinition = {
  mobilization:{allowedNodes:Array.from({length:7},(_,i)=>`t${i}`),maxHoursPerResource:16,feePerMove:100},
  buckingProfiles:{'pulp-priority':{name:'Pulp priority (illustrative)',productivity:1.1,cost:0.95,recovery:{'soft-saw':{'soft-saw':0.6,'soft-pulp':0.4},'hard-saw':{'hard-saw':0.6,'hard-pulp':0.4}}}},
  schemaVersion: 1,
  stewardship:{years:30,annualGrowthM3Ha:3,carryingCapacityM3Ha:250,naturalRegenerationYears:8,plantedRegenerationYears:3,plantingCostHa:1200,thinningFraction:.25,finalRetention:.2,thinningNetM3:10,finalNetM3:20,habitatRecoveryPerYear:.025,initialHabitat:.8,startingBudget:200000,note:"Illustrative teaching coefficients, not Québec yield curves or habitat assessments. This simplified annual model omits species, age classes, mortality, climate, spatial habitat connectivity, tenure and regulation. Review local parameters before regional use."},
 partnerJobs:Array.from({length:7},(_,i)=>({id:`P${i+1}`,company:`Partner ${i+1}`,from:`stand-Q${String(11+i).padStart(2,"0")}`,to:`t${(i+1)%7}`,product:"soft-saw",volume:800,week:1,deadline:12,paymentPerM3:18})),
  disruptions:[
    {id:"spring-washout",title:"Spring access washout",description:"Runoff has damaged access Q04. Wait for the district crew or pay for an immediate contractor repair.",kind:"road",target:"access-Q04",week:5,endWeek:7,revealWeek:4,repairCost:18000,repairWeeks:0},
    {id:"truck-service",title:"Truck 3 transmission failure",description:"Truck 3 cannot dispatch. A replacement transmission restores service next week; waiting keeps it unavailable for two weeks.",kind:"truck",target:"T3",week:7,endWeek:8,revealWeek:7,repairCost:9500,repairWeeks:1},
    {id:"mill-stop",title:"Dolbeau intake shutdown",description:"The sawmill has stopped intake. Reroute eligible logs or pay for contracted emergency intake capacity this week.",kind:"mill",target:"M1",week:10,endWeek:10,revealWeek:9,repairCost:12000,repairWeeks:0},
  ],
  treatments: {
    final: {
      name: "Final harvest",
      retention: 0,
      productivity: 1,
      cost: 1,
      disturbance: 1,
    },
    thinning: {
      name: "Commercial thinning",
      retention: 0.65,
      productivity: 0.72,
      cost: 1.12,
      disturbance: 0.55,
    },
  },
  objectives: [
    {
      id: "supply",
      title: "Keep the chain moving",
      description:
        "Deliver 50,000 m³ of the assortments mills actually accept across the season.",
      metric: "delivered",
      direction: "at-least",
      target: 50000,
      unit: "m³",
    },
    {
      id: "service",
      title: "Deliver on your promises",
      description:
        "Meet at least 60% of nonzero monthly assortment commitments within the agreed tolerance.",
      metric: "service",
      direction: "at-least",
      target: 60,
      unit: "%",
    },
    {
      id: "freshness",
      title: "Protect timber value",
      description:
        "Keep expired inventory below 8% of harvested volume. Downgrades still lose value even when they do not become waste.",
      metric: "waste",
      direction: "at-most",
      target: 8,
      unit: "%",
    },
    {
      id: "viability",
      title: "A viable operation",
      description:
        "Finish with nonnegative profit after acquisition, operation and terminal charges.",
      metric: "profit",
      direction: "at-least",
      target: 0,
      unit: "CAD",
    },
  ],

  id: "quebec-lac-saint-jean",
  name: "Lac-Saint-Jean, Québec",
  description:
    "A twelve-week supply-chain teaching scenario around Lac-Saint-Jean. Real public-road geometry; fictional forest parcels, mill placements, access roads, capacities and prices. Inspired by the supplied FORAC teaching materials.",
  currency: "CAD",
  center: [-72.08, 48.74],
  zoom: 8.7,
  weeks: 12,
  weeksPerMonth: 4,
  products,
  zones: [
    { id: "north", name: "Northern sector" },
    { id: "south", name: "Southern sector" },
  ],
  stands,
  mills,
  crews: Array.from({ length: 10 }, (_, i) => ({
    id: `C${i + 1}`,
    name: `Crew ${i + 1}`,
    node: `t${i % 7}`,
    hours: 160,
    productivityFactor: 1 + (i % 3) * 0.05,
    hourlyCost: 55,
    relocationSpeed: 40,
    relocationCostKm: 8,
  })),
  trucks: Array.from({ length: 10 }, (_, i) => ({
    id: `T${i + 1}`,
    name: `Truck ${i + 1}`,
    node: `t${i % 7}`,
    hours: 60,
    payload: 40,
    loadingHours: 0.6,
    unloadingHours: 0.4,
    costKm: 1.85,
    fixedWeekly: 600,
  })),
  roads,
  weather: seasons,
  weatherCharts: teachingWeatherCharts(seasons),
  economy: {
    startingCash: 650000,
    fixedWeekly: 7500,
    bonusPerM3: 3,
    shortfallPerM3: 12,
    tolerance: 0.1,
    roadUpgradePerKm: 1250,
    refusalPercent: 0.1,
    storageCostM3: 0.3,
    terminalStandingCostM3: 2,
    terminalRoadsideCostM3: 8,
  },
  ecology: {
    minimumRetention: 0.1,
    harvestKgCO2M3: 5,
    haulKgCO2Km: 1.05,
    disturbance: { frozen: 0.15, normal: 0.35, wet: 0.8, thaw: 1.2 },
  },
  sources: [
    {
      title: "FORAC Virtual Wood Supply Arena",
      url: "https://apps.forac.ulaval.ca/VirtualWoodSupplyArena/",
      note: "Teaching structure: 12 weeks, 10 crews/trucks, five assortments, monthly commitments and seasonal accessibility. Scenario coefficients are educational assumptions.",
    },
    {
      title: "OpenStreetMap / OSRM",
      url: "https://www.openstreetmap.org/copyright",
      note: "Public trunk roads from OSRM routing snapshot 2026-09-07, OSM ODbL. Car-route geometry is not certified for heavy trucks. Access spurs and parcels are simulated.",
    },
    {
      title: "PGMaps",
      url: "https://github.com/ahmadjalil/PGMaps",
      note: "MapLibre and deck.gl map architecture; MIT attribution in PGMAPS-LICENSE.txt.",
    },
  ],
};
