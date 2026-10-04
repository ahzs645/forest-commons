import type {Movement, Position} from '../simulation/types';

/** A route is replayable only when its complete recorded geometry is usable. */
export function recordedMovements(movements: Movement[] | undefined): Movement[] {
  return (movements ?? []).filter(movement => movement.path.length > 0 && movement.path.every(position =>
    position.length === 2 && position.every(Number.isFinite) && Math.abs(position[0]) <= 180 && Math.abs(position[1]) <= 90));
}

// Geographic distance weights progression; authored kilometres may include
// handling/repositioning details and cannot locate a point on the geometry.
function distance(a: Position, b: Position): number {
  const radians = Math.PI / 180;
  const lat = (b[1] - a[1]) * radians, lon = (b[0] - a[0]) * radians;
  const haversine = Math.sin(lat / 2) ** 2 + Math.cos(a[1] * radians) * Math.cos(b[1] * radians) * Math.sin(lon / 2) ** 2;
  return 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, haversine))));
}

function lengths(path: Position[]): number[] {
  return path.slice(1).map((position, index) => distance(path[index], position));
}

export interface ReplayFrame {
  position: Position;
  /** Separate polylines preserve disconnected movement records. */
  travelled: Position[][];
  movement: Movement;
  movementIndex: number;
  movementCount: number;
}

export interface ReplaySegment {
  movement: Movement;
  movementIndex: number;
  startProgress: number;
  endProgress: number;
  /** Zero-length records remain inspectable without inventing travel. */
  stationary: boolean;
}

function replaySequence(movements: Movement[] | undefined, resource: string) {
  const sequence = recordedMovements(movements).filter(movement => movement.resource === resource);
  const segments = sequence.map(movement => lengths(movement.path));
  const distances = segments.map(segment => segment.reduce((total, length) => total + length, 0));
  // Only an entirely stationary sequence uses record order as its fallback.
  const weights = distances.some(length => length > 0) ? distances : distances.map(() => 1);
  const total = weights.reduce((sum, length) => sum + length, 0);
  return {sequence, segments, distances, weights, total};
}

/** Tour boundaries share the playback's geographic-distance denominator. */
export function routeReplaySegments(movements: Movement[] | undefined, resource: string): ReplaySegment[] {
  const {sequence, distances, weights, total} = replaySequence(movements, resource);
  let travelled = 0;
  return sequence.map((movement, movementIndex) => {
    const startProgress = travelled / total;
    travelled += weights[movementIndex];
    return {movement, movementIndex, startProgress, endProgress: travelled / total, stationary: distances[movementIndex] === 0};
  });
}

/** Normalized distance through one resource's recorded movement sequence.
 * This is deliberately not an operating clock: records lack departure times.
 */
export function routeReplayFrame(movements: Movement[] | undefined, resource: string, progress: number, inspectMovementIndex?: number): ReplayFrame | null {
  const {sequence, segments, distances, weights, total} = replaySequence(movements, resource);
  if (!sequence.length) return null;
  // Stationary records get no fabricated travel distance. An entirely
  // stationary sequence still remains inspectable in its recorded order.
  const fraction = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  let remaining = fraction * total, index = 0;
  while (index < sequence.length - 1 && remaining >= weights[index]) {
    remaining -= weights[index];
    index++;
  }
  const inspecting = inspectMovementIndex !== undefined && Number.isInteger(inspectMovementIndex)
    && inspectMovementIndex >= 0 && inspectMovementIndex < sequence.length;
  if (inspecting) { index = inspectMovementIndex; remaining = 0; }
  const movement = sequence[index], travelled = sequence.slice(0, index).map(record => record.path.map(position => [...position] as Position));
  const path = movement.path;
  let point: Position = [...path[0]], partial: Position[] = [point];
  if ((!inspecting && fraction === 1) || remaining >= distances[index]) {
    point = [...path[path.length - 1]];
    partial = path.map(position => [...position] as Position);
  } else {
    for (let segment = 0; segment < segments[index].length; segment++) {
      const length = segments[index][segment], next = path[segment + 1];
      if (remaining >= length) {
        remaining -= length;
        point = [...next];
        partial.push(point);
      } else {
        const ratio = length > 0 ? remaining / length : 0, from = path[segment];
        point = [from[0] + (next[0] - from[0]) * ratio, from[1] + (next[1] - from[1]) * ratio];
        partial.push(point);
        break;
      }
    }
  }
  travelled.push(partial);
  return {position: point, travelled, movement, movementIndex: index, movementCount: sequence.length};
}
