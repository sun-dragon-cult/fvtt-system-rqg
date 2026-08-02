import { describe, expect, it } from "vitest";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { ActorTypeEnum } from "../../data-model/actor-data/rqg-actor-data";
import { systemId } from "../../system/config";
import { runeLifecycle } from "./rune-lifecycle";

function makeRune({
  id,
  rqid,
  chance = 50,
  opposingRqid,
}: {
  id: string;
  rqid?: string;
  chance?: number;
  opposingRqid?: string;
}): any {
  return {
    type: ItemTypeEnum.Rune,
    id,
    system: { chance, opposingRuneRqidLink: opposingRqid ? { rqid: opposingRqid } : undefined },
    getFlag: (scope: string, key: string) =>
      scope === systemId && key === "documentRqidFlags" && rqid ? { id: rqid } : undefined,
  };
}

function makeActor({ items = [] as any[] }: { items?: any[] } = {}): any {
  return {
    type: ActorTypeEnum.Character,
    items,
    getBestEmbeddedDocumentByRqid: (rqid: string) =>
      items.find((i: any) => i.getFlag?.(systemId, "documentRqidFlags")?.id === rqid),
  };
}

describe("runeLifecycle.handleItemUpdateDocumentsPreUpdate", () => {
  it("adds an update to balance the opposing rune's chance to 100% when reciprocally linked", () => {
    const opposingRune = makeRune({
      id: "opposing-id",
      rqid: "i.rune.death-power",
      chance: 40,
      opposingRqid: "i.rune.fertility-power",
    });
    const rune = makeRune({
      id: "rune-id",
      rqid: "i.rune.fertility-power",
      chance: 60,
      opposingRqid: "i.rune.death-power",
    });
    const actor = makeActor({ items: [rune, opposingRune] });
    const updates = [{ _id: "rune-id", "system.chance": 70 }];

    runeLifecycle.handleItemUpdateDocumentsPreUpdate(actor, rune, updates, {});

    expect(updates).toHaveLength(2);
    expect(updates[1]).toEqual({ _id: "opposing-id", system: { chance: 30 } });
  });

  it("balances regardless of which reciprocally-linked rune is edited", () => {
    const opposingRune = makeRune({
      id: "opposing-id",
      rqid: "i.rune.death-power",
      chance: 40,
      opposingRqid: "i.rune.fertility-power",
    });
    const rune = makeRune({
      id: "rune-id",
      rqid: "i.rune.fertility-power",
      chance: 60,
      opposingRqid: "i.rune.death-power",
    });
    const actor = makeActor({ items: [rune, opposingRune] });
    const updates = [{ _id: "opposing-id", "system.chance": 30 }];

    runeLifecycle.handleItemUpdateDocumentsPreUpdate(actor, opposingRune, updates, {});

    expect(updates).toHaveLength(2);
    expect(updates[1]).toEqual({ _id: "rune-id", system: { chance: 70 } });
  });

  it("does not balance when the link is one-sided (not reciprocal)", () => {
    // Fertility declares the link, but Death doesn't declare one back — not a connected
    // pair, so editing either rune must not silently force the other's chance.
    const opposingRune = makeRune({ id: "opposing-id", rqid: "i.rune.death-power", chance: 40 });
    const rune = makeRune({
      id: "rune-id",
      rqid: "i.rune.fertility-power",
      chance: 60,
      opposingRqid: "i.rune.death-power",
    });
    const actor = makeActor({ items: [rune, opposingRune] });
    const updates = [{ _id: "rune-id", "system.chance": 70 }];

    runeLifecycle.handleItemUpdateDocumentsPreUpdate(actor, rune, updates, {});

    expect(updates).toHaveLength(1); // no balancing update was added
  });

  it("does not balance once a previously-linked rune has its link cleared, even editing the still-linked partner", () => {
    // Mirrors the manual-disconnect workflow: the player cleared Fertility's link, but
    // Death still declares one back to Fertility. Editing Death must not resurrect the pair.
    const opposingRune = makeRune({
      id: "opposing-id",
      rqid: "i.rune.death-power",
      chance: 40,
      opposingRqid: "i.rune.fertility-power",
    });
    const rune = makeRune({ id: "rune-id", rqid: "i.rune.fertility-power", chance: 60 });
    const actor = makeActor({ items: [rune, opposingRune] });
    const updates = [{ _id: "opposing-id", "system.chance": 30 }];

    runeLifecycle.handleItemUpdateDocumentsPreUpdate(actor, opposingRune, updates, {});

    expect(updates).toHaveLength(1); // no balancing update was added
  });

  it("does nothing when the update doesn't touch chance", () => {
    const opposingRune = makeRune({
      id: "opposing-id",
      rqid: "i.rune.death-power",
      chance: 40,
      opposingRqid: "i.rune.fertility-power",
    });
    const rune = makeRune({
      id: "rune-id",
      rqid: "i.rune.fertility-power",
      chance: 60,
      opposingRqid: "i.rune.death-power",
    });
    const actor = makeActor({ items: [rune, opposingRune] });
    const updates = [{ _id: "rune-id", "system.rune": "Fertility" }];

    runeLifecycle.handleItemUpdateDocumentsPreUpdate(actor, rune, updates, {});

    expect(updates).toHaveLength(1);
  });
});
