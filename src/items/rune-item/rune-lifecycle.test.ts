import { describe, expect, it } from "vitest";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { ActorTypeEnum } from "../../data-model/actor-data/rqg-actor-data";
import { RQG_CONFIG, systemId } from "../../system/config";
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

function makeActor({
  illuminated = false,
  items = [] as any[],
}: {
  illuminated?: boolean;
  items?: any[];
} = {}): any {
  return {
    type: ActorTypeEnum.Character,
    items,
    getBestEmbeddedDocumentByRqid: (rqid: string) => {
      if (rqid === RQG_CONFIG.runeRqid.infinity) {
        return illuminated ? { id: "infinity-rune-id" } : undefined;
      }
      return items.find((i: any) => i.getFlag?.(systemId, "documentRqidFlags")?.id === rqid);
    },
  };
}

describe("runeLifecycle.handleItemUpdateDocumentsPreUpdate", () => {
  it("adds an update to balance the opposing rune's chance to 100%", () => {
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

    expect(updates).toHaveLength(2);
    expect(updates[1]).toEqual({ _id: "opposing-id", system: { chance: 30 } });
  });

  it("balances the opposing rune even when only the other rune declares the link (one-sided)", () => {
    // Fertility has no opposingRuneRqidLink of its own, but Death links to Fertility.
    const rune = makeRune({ id: "rune-id", rqid: "i.rune.fertility-power", chance: 60 });
    const opposingRune = makeRune({
      id: "opposing-id",
      rqid: "i.rune.death-power",
      chance: 40,
      opposingRqid: "i.rune.fertility-power",
    });
    const actor = makeActor({ items: [rune, opposingRune] });
    const updates = [{ _id: "rune-id", "system.chance": 70 }];

    runeLifecycle.handleItemUpdateDocumentsPreUpdate(actor, rune, updates, {});

    expect(updates).toHaveLength(2);
    expect(updates[1]).toEqual({ _id: "opposing-id", system: { chance: 30 } });
  });

  it("skips balancing entirely when the actor is Illuminated", () => {
    const opposingRune = makeRune({ id: "opposing-id", rqid: "i.rune.death-power", chance: 40 });
    const rune = makeRune({
      id: "rune-id",
      rqid: "i.rune.fertility-power",
      chance: 60,
      opposingRqid: "i.rune.death-power",
    });
    const actor = makeActor({ illuminated: true, items: [rune, opposingRune] });
    const updates = [{ _id: "rune-id", "system.chance": 70 }];

    runeLifecycle.handleItemUpdateDocumentsPreUpdate(actor, rune, updates, {});

    expect(updates).toHaveLength(1); // no balancing update was added
  });

  it("does nothing when the update doesn't touch chance", () => {
    const opposingRune = makeRune({ id: "opposing-id", rqid: "i.rune.death-power", chance: 40 });
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
