import type { CrewOrder, Game } from './types';
/** Sparse overrides: missing crew repeats its queue; [] explicitly rests that crew. */
export function validateScheduledCrews(game: Game): void {
  const scheduled = game.scheduledCrews;
  if (scheduled === undefined) return;
  const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
  if (!object(scheduled)) throw Error('Invalid future crew schedule.');
  for (const [key, crews] of Object.entries(scheduled)) {
    const week = Number(key);
    if (!Number.isInteger(week) || String(week) !== key || week <= game.week || week > game.region.weeks || !object(crews)) throw Error('Schedule weeks must be future weeks within this season.');
    for (const [id, orders] of Object.entries(crews)) {
      const crew = game.region.crews.find(c => c.id === id);
      if (!crew || !Array.isArray(orders) || orders.length > 100 || !orders.every((o: CrewOrder) => object(o) && typeof o.stand === 'string' && game.region.stands.some(s => s.id === o.stand && s.supply !== 'protected') && typeof o.hours === 'number' && Number.isFinite(o.hours) && o.hours > 0 && o.hours <= crew.hours && (o.bucking === undefined || o.bucking === "standard" || !!game.region.buckingProfiles?.[o.bucking]) && (o.treatment === undefined || !!game.region.treatments?.[o.treatment] || (o.treatment === 'final' && !game.region.treatments)))) throw Error('Invalid scheduled crew order.');
      if (orders.reduce((n, o) => n + o.hours, 0) > crew.hours + 0.001) throw Error('Scheduled orders exceed crew weekly hours.');
    }
  }
}
export function scheduleCrew(game: Game, week: number, crew: string, orders: CrewOrder[] | null): Game {
  const g = structuredClone(game);
  g.scheduledCrews ??= {};
  if (orders === null) {
    delete g.scheduledCrews[week]?.[crew];
    if (g.scheduledCrews[week] && !Object.keys(g.scheduledCrews[week]).length) delete g.scheduledCrews[week];
  } else {
    g.scheduledCrews[week] ??= {};
    g.scheduledCrews[week][crew] = structuredClone(orders);
  }
  validateScheduledCrews(g);
  g.plan.ready.production = false;
  return g;
}
/** Called only after advancing the clock; due overrides are consumed into the editable plan. */
export function activateScheduledCrews(game: Game): void {
  const due = game.scheduledCrews?.[game.week];
  if (due) {
    for (const [crew, orders] of Object.entries(due)) game.plan.crews[crew] = structuredClone(orders);
    delete game.scheduledCrews![game.week];
  }
}
