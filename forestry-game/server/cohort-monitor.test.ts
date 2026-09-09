import { it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RoomStore } from "./rooms";
it("isolates instructor summaries across rooms, persists readiness and rejects replaced credentials", () => {
  const dir = mkdtempSync(join(tmpdir(), "forest-monitor-"));
  try {
    const store = new RoomStore(dir), a = store.create(), b = store.create();
    expect(() => store.summary(b.id, a.token)).toThrow("invalid");
    const purchase = store.mutate(a.id, a.token, 1, "invite", { role: "purchase" }).credential!;
    expect(() => store.summary(a.id, purchase)).toThrow("Instructor access");
    store.mutate(a.id, purchase, 2, "ready", { ready: true });
    const reopened = new RoomStore(dir);
    expect(reopened.summary(a.id, a.token).ready.purchase).toBe(true);
    expect(reopened.summary(b.id, b.token).ready.purchase).toBe(false);
    const summary = reopened.summary(a.id, a.token);
    expect(summary.issuedRoles).toEqual(["instructor", "purchase"]);
    expect(summary.delivered).toBe(0);
    const text = JSON.stringify(summary);
    for (const secret of [a.token, purchase, a.recoveryToken, '"game"', '"plan"', '"seed"', '"weather"', '"tokens"']) expect(text).not.toContain(secret);
    const replacement = reopened.recover(a.id, a.recoveryToken);
    expect(() => reopened.summary(a.id, a.token)).toThrow("invalid");
    expect(new RoomStore(dir).summary(a.id, replacement.token).revision).toBe(4);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
