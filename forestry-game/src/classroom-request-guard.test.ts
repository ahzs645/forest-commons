import {it,expect} from 'vitest';
import {ClassroomRequestGuard} from './classroom-request-guard';
it('blocks duplicate writes and rejects polls begun before or during a write even after completion',()=>{
 const g=new ClassroomRequestGuard(),before=g.generation;expect(g.begin()).toBe(true);expect(g.begin()).toBe(false);
 const during=g.generation;expect(g.canApplyPoll(before)).toBe(false);expect(g.canApplyPoll(during)).toBe(false);
 g.finish();expect(g.canApplyPoll(before)).toBe(false);expect(g.canApplyPoll(during)).toBe(false);expect(g.canApplyPoll(g.generation)).toBe(true);expect(g.begin()).toBe(true);
});
it('an unsent plan or schedule edit invalidates an already-started poll immediately',()=>{
 const g=new ClassroomRequestGuard(),before=g.generation;g.edited();expect(g.canApplyPoll(before)).toBe(false);expect(g.busy).toBe(false);expect(g.unsent).toBe(true);g.accepted();expect(g.unsent).toBe(false);
});

it('rejects an older overlapping poll response after a newer response is applied',()=>{
 const g=new ClassroomRequestGuard(),generation=g.generation;
 const older=g.startPoll(),newer=g.startPoll();
 expect(g.canApplyPoll(generation,older)).toBe(true); // Slow requests do not starve updates.
 expect(g.canApplyPoll(generation,newer)).toBe(true);g.applied(newer);
 expect(g.canApplyPoll(generation,older)).toBe(false);
 g.edited();expect(g.canApplyPoll(generation,newer)).toBe(false);
});
