import { describe, expect, it } from "vitest";
import { barrierPriorities, walkBarriers } from "./spell-barriers";

const layer = (
  name: string,
  priority: number,
  strength: number,
  usedUp: "never" | "countermagic" = "never",
) => ({ name, priority, strength, usedUp });
const names = (layers: { name: string }[]) => layers.map((l) => l.name);

describe("walkBarriers", () => {
  const ward = layer("ward", barrierPriorities.area, 4);
  const countermagic = layer("countermagic", barrierPriorities.countermagic, 4, "countermagic");
  const shield = layer("shield", barrierPriorities.shield, 4);

  it("lets a spell through when there are no layers", () => {
    expect(walkBarriers([], 3)).toEqual({ usedUp: [] });
  });

  it("meets the layers from the lowest priority up, whatever order they come in", () => {
    const walk = walkBarriers([shield, countermagic, ward], 4);
    expect(walk.stoppedBy?.name).toBe("ward");
    expect(walk.usedUp).toEqual([]);
  });

  it("stops a spell at most as strong as a layer that is never used up", () => {
    expect(walkBarriers([shield], 4).stoppedBy?.name).toBe("shield");
    expect(walkBarriers([shield], 5).stoppedBy).toBeUndefined();
  });

  it("stops a spell 2+ points weaker than Countermagic and keeps it", () => {
    const walk = walkBarriers([countermagic], 2);
    expect(walk.stoppedBy?.name).toBe("countermagic");
    expect(walk.usedUp).toEqual([]);
  });

  it("uses up Countermagic within 1 point of the spell, which it stops", () => {
    for (const points of [3, 4, 5]) {
      const walk = walkBarriers([countermagic], points);
      expect(walk.stoppedBy?.name).toBe("countermagic");
      expect(names(walk.usedUp)).toEqual(["countermagic"]);
    }
  });

  it("breaks Countermagic 2+ points weaker and goes on at full strength to the Shield", () => {
    const walk = walkBarriers([countermagic, shield], 6);
    expect(walk.stoppedBy).toBeUndefined();
    expect(names(walk.usedUp)).toEqual(["countermagic"]);
    expect(walkBarriers([countermagic, shield], 6).usedUp).toHaveLength(1);
  });

  it("lets Countermagic survive when an outer layer stops the spell first", () => {
    const walk = walkBarriers([countermagic, ward], 4);
    expect(walk.stoppedBy?.name).toBe("ward");
    expect(walk.usedUp).toEqual([]);
  });

  it("counts only the strongest of layers with equal priority", () => {
    const berserker = layer("berserker", barrierPriorities.countermagic, 2, "countermagic");
    const walk = walkBarriers([berserker, countermagic], 6);
    expect(names(walk.usedUp)).toEqual(["countermagic"]);
  });

  it("puts a module's layer between the system's by its priority", () => {
    const module = layer("module", 250, 9);
    const walk = walkBarriers([shield, countermagic, module], 6);
    expect(walk.stoppedBy?.name).toBe("module");
    expect(names(walk.usedUp)).toEqual(["countermagic"]);
  });
});
