import { it, expect, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RoomStore } from "./rooms";
it("persists deadlines, enforces instructor control and freezes expired or paused submissions without advancing", () => {
  const dir = mkdtempSync(join(tmpdir(), "forest-timer-"));
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-08T12:00:00Z"));
  try {
    let store = new RoomStore(dir); const owner = store.create();
    const act = (action: string, payload: unknown, token = owner.token) => store.mutate(owner.id, token, store.view(owner.id, token).revision, action, payload);
    const purchase = act("invite", { role: "purchase" }).credential!;
    expect(() => act("timer", { command: "start", minutes: 1 }, purchase)).toThrow("cannot perform");
    expect(() => act("timer", { command: "start", minutes: NaN })).toThrow("duration");
    act("timer", { command: "start", minutes: 1 });
    act("ready", { ready: true }, purchase);
    vi.advanceTimersByTime(60000);
    store = new RoomStore(dir);
    expect(store.summary(owner.id, owner.token).timer?.remainingMs).toBe(0);
    expect(store.view(owner.id, purchase).game.week).toBe(1);
    expect(() => act("ready", { ready: false }, purchase)).toThrow("deadline");
    act("timer", { command: "extend", minutes: 2 });
    act("ready", { ready: false }, purchase);
    act("timer", { command: "pause" });
    vi.advanceTimersByTime(60000);
    expect(new RoomStore(dir).summary(owner.id, owner.token).timer?.remainingMs).toBe(120000);
    expect(() => act("ready", { ready: true }, purchase)).toThrow("paused");
    expect(() => act("advance", {})).toThrow("paused");
    act("timer", { command: "resume" });
    act("ready", { ready: true }, purchase);
    act("timer", { command: "disable" });
    expect(store.summary(owner.id, owner.token).timer).toBeNull();
    for (const role of ["production", "transport"]) {
      const credential = act("invite", { role }).credential!;
      act("ready", { ready: true }, credential);
    }
    act("timer", { command: "start", minutes: 1 });
    act("advance", {});
    expect(store.summary(owner.id, owner.token).week).toBe(2);
    expect(store.summary(owner.id, owner.token).timer).toBeNull();
  } finally { vi.useRealTimers(); rmSync(dir, { recursive: true, force: true }); }
});
