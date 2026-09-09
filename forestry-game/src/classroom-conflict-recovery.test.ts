import { expect, it, vi } from 'vitest';
vi.mock('./maps/LazyMap', () => ({ default: () => null }));
import { classroomConflictRecovered } from './Classroom';

it('only describes a rejected revision as refreshed after a newer room arrives with no unsent draft', () => {
  const conflict = 'Error: Room changed. Refresh before submitting your decision.';
  expect(classroomConflictRecovered(conflict, 8, 9, false)).toBe(true);
  expect(classroomConflictRecovered(conflict, 8, 8, false)).toBe(false);
  expect(classroomConflictRecovered(conflict, 8, 9, true)).toBe(false);
  expect(classroomConflictRecovered(conflict, null, 9, false)).toBe(false);
  expect(classroomConflictRecovered('Error: Invalid bid', 8, 9, false)).toBe(false);
});
