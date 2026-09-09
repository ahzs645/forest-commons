import { operatingRegion } from "./disruptions";
import type { Game, Weather, Route } from "./types";
import { route } from "./routing";
export function partnerTrip(
  game: Game,
  jobId: string | undefined,
  position: string,
  destination: string,
  weather: Record<string, Weather>,
  payload: number,
) {
  const job = game.region.partnerJobs?.find((j) => j.id === jobId);
  if (
    !game.cooperation.pooling ||
    !job ||
    game.week < job.week ||
    game.week > job.deadline
  )
    return null;
  const volume = Math.min(
    payload,
    job.volume - (game.partnerDelivered?.[job.id] ?? 0),
  );
  if (volume < 0.001) return null;
  const region = operatingRegion(game, false);
  const segments = [
    route(region, position, job.from, weather, game.improvedRoads),
    route(region, job.from, job.to, weather, game.improvedRoads),
    route(region, job.to, destination, weather, game.improvedRoads),
  ];
  if (segments.some((s) => !s)) return null;
  const paths = segments as Route[];
  return {
    job,
    volume,
    km: paths.reduce((n, p) => n + p.km, 0),
    hours: paths.reduce((n, p) => n + p.hours, 0),
    path: paths.flatMap((p, i) => (i ? p.path.slice(1) : p.path)),
    standaloneKm: 2 * paths[1].km,
  };
}

export function freightSettlement(
  trip: NonNullable<ReturnType<typeof partnerTrip>>,
  emptyKm: number,
  costKm: number,
  share: number,
) {
  const additionalCost = (trip.km - emptyKm) * costKm,
    savings = (trip.standaloneKm - (trip.km - emptyKm)) * costKm;
  const payment = Math.min(
    trip.volume * trip.job.paymentPerM3,
    Math.max(0, additionalCost + Math.max(0, savings) * share),
  );
  return {
    additionalCost,
    savings,
    payment,
    ownSaving: payment - additionalCost,
    partnerSaving: trip.standaloneKm * costKm - payment,
    feasible: savings >= -1e-8 && payment >= additionalCost - 1e-8,
  };
}
