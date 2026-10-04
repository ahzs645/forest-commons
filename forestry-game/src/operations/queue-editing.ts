import type { Game, Plan } from '../simulation/types';

export type QueueKind = 'crew' | 'truck';
export type QueueAction = 'earlier' | 'later' | 'remove' | number;
export type QueueSnapshot = Pick<Plan, 'crews' | 'trucks'>;

/** A blank or incomplete numeric draft never becomes an operating order. */
export function parseQueueAmount(raw: string, kind: QueueKind, maximum: number): number | null {
  if (!raw.trim()) return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0 || amount > maximum || (kind === 'truck' && !Number.isInteger(amount))) return null;
  return amount;
}

/** Keep order metadata (offtake, recovery, treatment, etc.) when editing a stop. */
export function editQueue(game: Game, kind: QueueKind, id: string, index: number, action: QueueAction): Game {
  if (game.week > game.region.weeks) return game;
  const source = kind === 'crew' ? game.plan.crews[id] : game.plan.trucks[id];
  if (!source || !Number.isInteger(index) || index < 0 || index >= source.length) return game;
  const destination = action === 'earlier' ? index - 1 : index + 1;
  if ((action === 'earlier' || action === 'later') && (destination < 0 || destination >= source.length)) return game;
  if (typeof action === 'number') {
    if (!Number.isFinite(action) || action <= 0) return game;
    if (kind === 'truck' && (!Number.isInteger(action) || action > 1000)) return game;
    if (kind === 'crew') {
      const capacity = game.region.crews.find(crew => crew.id === id)?.hours ?? 0;
      const otherHours = game.plan.crews[id].reduce((total, order, i) => total + (i === index ? 0 : order.hours), 0);
      if (action + otherHours > capacity) return game;
    }
  }
  const next = structuredClone(game);
  const queue = kind === 'crew' ? next.plan.crews[id] : next.plan.trucks[id];
  if (action === 'remove') queue.splice(index, 1);
  else if (typeof action === 'number') {
    if (kind === 'crew') next.plan.crews[id][index].hours = action;
    else next.plan.trucks[id][index].loads = action;
  } else [queue[index], queue[destination]] = [queue[destination], queue[index]];
  next.plan.ready = { purchase: false, production: false, transport: false };
  return next;
}

const snapshot = (game: Game): QueueSnapshot => structuredClone({ crews: game.plan.crews, trucks: game.plan.trucks });
const outsideQueues = (game: Game) => JSON.stringify({
  ...game, plan: { ...game.plan, crews: undefined, trucks: undefined, ready: undefined },
});

/** Undo belongs to this map session. Any externally replaced game expires it,
 * including a restore of an otherwise identical campaign. Only queues are saved. */
export class MapQueueHistory {
  private expected: Game;
  private frames: QueueSnapshot[] = [];
  constructor(game: Game) { this.expected = game; }
  observe(game: Game) {
    if (game !== this.expected) { this.frames = []; this.expected = game; }
  }
  get count() { return this.frames.length; }
  record(previous: Game, next: Game) {
    this.observe(previous);
    if (previous === next) return;
    if (previous.week > previous.region.weeks || outsideQueues(previous) !== outsideQueues(next)) {
      this.frames = [];
    } else if (JSON.stringify(snapshot(previous)) !== JSON.stringify(snapshot(next))) {
      this.frames.push(snapshot(previous));
      if (this.frames.length > 20) this.frames.shift();
    }
    this.expected = next;
  }
  undo(game: Game): Game {
    this.observe(game);
    if (game.week > game.region.weeks) { this.frames = []; return game; }
    const frame = this.frames.pop();
    if (!frame) return game;
    const next = { ...game, plan: { ...game.plan, ...structuredClone(frame), ready: { purchase: false, production: false, transport: false } } };
    this.expected = next;
    return next;
  }
}
