import { describe, it, expect } from "vitest";
import { inventoryTimeline } from "./InventoryCharts";
import { createGame } from "./simulation/engine";
import { quebec } from "./scenarios/quebec";
describe("inventory hold timeline", () => {
  it("resets each downgrade clock and preserves input for an overdue batch", () => {
    const game = createGame(quebec);
    game.week = 5;
    game.region.products = [
      { id: "saw", name: "Saw", color: "#000", maxFreshWeeks: 2, downgradeTo: "pulp" },
      { id: "pulp", name: "Pulp", color: "#111", maxFreshWeeks: 3, downgradeTo: "fuel" },
      { id: "fuel", name: "Fuel", color: "#222", maxFreshWeeks: 2 },
    ];
    game.stands[0].stock = [{ product: "saw", week: 1, volume: 10, quality: 1 }];
    const original = structuredClone(game);
    const row = inventoryTimeline(game)[0];
    expect(row.transitions.map(t => [t.week, t.to])).toEqual([[5, "pulp"], [8, "fuel"], [10, null]]);
    expect(row.transitions[1].quality).toBeCloseTo(.81);
    expect(game).toEqual(original);
  });
});
