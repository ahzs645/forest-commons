import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RoomStore } from "./rooms";
const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});
function setup() {
  const dir = mkdtempSync(join(tmpdir(), "forest-room-"));
  dirs.push(dir);
  const store = new RoomStore(dir),
    owner = store.create();
  return { dir, store, owner };
}
function invite(
  store: RoomStore,
  owner: { id: string; token: string },
  role: string,
) {
  return store.mutate(
    owner.id,
    owner.token,
    store.view(owner.id, owner.token).revision,
    "invite",
    { role },
  ).credential!;
}
describe("Server-authoritative classroom rooms", () => {
  it("persists role-authenticated rooms across restart and rejects replaced credentials", () => {
    const { store, owner, dir } = setup(),
      token = invite(store, owner, "purchase");
    expect(new RoomStore(dir).view(owner.id, token).role).toBe("purchase");
    const fresh = invite(store, owner, "purchase");
    expect(() => store.view(owner.id, token)).toThrow("invalid");
    expect(store.view(owner.id, fresh).role).toBe("purchase");
  });
  it("enforces role ownership and revision checks atomically", () => {
    const { store, owner } = setup(),
      token = invite(store, owner, "production"),
      v = store.view(owner.id, token);
    expect(() =>
      store.mutate(owner.id, token, v.revision, "plan", { bids: { Q21: 100 } }),
    ).toThrow("another role");
    expect(() => store.mutate(owner.id, token, v.revision, "advance")).toThrow(
      "cannot",
    );
    store.mutate(owner.id, token, v.revision, "ready", { ready: true });
    expect(() =>
      store.mutate(owner.id, token, v.revision, "ready", { ready: false }),
    ).toThrow("changed");
    expect(store.view(owner.id, token).game.plan.ready.production).toBe(true);
  });
  it("keeps private bids and future actual weather off student snapshots", () => {
    const { store, owner } = setup(),
      purchase = invite(store, owner, "purchase"),
      transport = invite(store, owner, "transport");
    let v = store.view(owner.id, purchase);
    const lot = v.game.region.stands.find(
      (s) => s.supply === "auction" && s.auctionWeek === 1,
    )!;
    store.mutate(owner.id, purchase, v.revision, "plan", {
      bids: { [lot.id]: 100 },
    });
    expect(store.view(owner.id, transport).game.plan.bids).toEqual({});
    v = store.view(owner.id, purchase);
    expect(v.game.plan.bids[lot.id]).toBe(100);
    expect(v.game.seed).toBe(0);
    for (const w of Object.values(v.game.region.weather))
      expect(w.actual).toEqual(w.forecast);
  });
  it("requires the planning barrier, then advances everyone in one transaction", () => {
    const { store, owner } = setup();
    expect(() => store.mutate(owner.id, owner.token, 1, "advance")).toThrow(
      "roles",
    );
    for (const role of ["purchase", "production", "transport"]) {
      const token = invite(store, owner, role),
        v = store.view(owner.id, token);
      store.mutate(owner.id, token, v.revision, "ready", { ready: true });
    }
    const v = store.view(owner.id, owner.token),
      next = store.mutate(owner.id, owner.token, v.revision, "advance");
    expect(next.game.week).toBe(2);
    expect(Object.values(next.game.plan.ready)).toEqual([false, false, false]);
    expect(() =>
      store.mutate(owner.id, owner.token, v.revision, "advance"),
    ).toThrow("changed");
  });
  it("requires each authenticated company to accept its own proposal", () => {
    const { store, owner } = setup(),
      a = invite(store, owner, "company1"),
      b = invite(store, owner, "company2");
    let v = store.view(owner.id, owner.token);
    store.mutate(owner.id, owner.token, v.revision, "proposal", {
      groups: [1, 1, 1, 1, 1],
      phase: "open",
      method: "epm",
      custom: {},
    });
    v = store.view(owner.id, a);
    store.mutate(owner.id, a, v.revision, "respond", {
      id: 1,
      accept: true,
      company: "2",
    });
    const offer = store.view(owner.id, b).game.negotiation.offers![0];
    expect(offer.accepted).toEqual(["1"]);
    expect(offer.status).toBe("proposed");
  });
  it("rejects malformed patches without changing cash or revision", () => {
    const { store, owner } = setup(),
      token = invite(store, owner, "production"),
      v = store.view(owner.id, token);
    expect(() =>
      store.mutate(owner.id, token, v.revision, "plan", { crews: null }),
    ).toThrow();
    expect(store.view(owner.id, token)).toEqual(v);
  });
});
