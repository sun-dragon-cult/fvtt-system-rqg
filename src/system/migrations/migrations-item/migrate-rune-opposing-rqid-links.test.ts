import { describe, expect, it } from "vitest";
import type { RqgItem } from "@items/rqg-item.ts";
import type { RqgActor } from "@actors/rqg-actor.ts";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { migrateRuneOpposingRqidLinks } from "./migrate-rune-opposing-rqid-links";

function getRuneNameFromRqid(rqid: string): string {
  const baseName = rqid.match(/\.([^.]+)$/)?.[1];
  if (!baseName) {
    return rqid;
  }
  return baseName
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function makeRuneItem(rqid: string, opposingRqid?: string): RqgItem {
  return {
    type: ItemTypeEnum.Rune,
    name: getRuneNameFromRqid(rqid),
    system: {
      opposingRuneRqidLink: opposingRqid
        ? { rqid: opposingRqid, name: getRuneNameFromRqid(opposingRqid) }
        : undefined,
    },
    flags: { rqg: { documentRqidFlags: { id: rqid } } },
  } as unknown as RqgItem;
}

describe("migrateRuneOpposingRqidLinks", () => {
  it("backfills missing canonical power opposing rune rqid and name", async () => {
    const item = makeRuneItem("i.rune.truth-power");

    const update = await migrateRuneOpposingRqidLinks(item);

    expect((update.system as any)?.opposingRuneRqidLink?.rqid).toBe("i.rune.illusion-power");
    expect((update.system as any)?.opposingRuneRqidLink?.name).toBe("Illusion Power");
  });

  it("fixes incorrect canonical power opposing rune rqid and name", async () => {
    const item = makeRuneItem("i.rune.truth-power", "i.rune.stasis-power");

    const update = await migrateRuneOpposingRqidLinks(item);

    expect((update.system as any)?.opposingRuneRqidLink?.rqid).toBe("i.rune.illusion-power");
    expect((update.system as any)?.opposingRuneRqidLink?.name).toBe("Illusion Power");
  });

  it("sets canonical power opposing rune even when actor lacks opposite rune", async () => {
    const truth = makeRuneItem("i.rune.truth-power");
    const actor = {
      items: { contents: [truth] },
    } as unknown as RqgActor;

    const update = await migrateRuneOpposingRqidLinks(truth, actor);

    expect((update.system as any)?.opposingRuneRqidLink?.rqid).toBe("i.rune.illusion-power");
    expect((update.system as any)?.opposingRuneRqidLink?.name).toBe("Illusion Power");
  });

  it("uses opposing rune item name when actor contains the opposing rune", async () => {
    const truth = makeRuneItem("i.rune.truth-power");
    const illusion = { ...makeRuneItem("i.rune.illusion-power"), name: "Illusion" };
    const actor = {
      items: { contents: [truth, illusion] },
    } as unknown as RqgActor;

    const update = await migrateRuneOpposingRqidLinks(truth, actor);

    expect((update.system as any)?.opposingRuneRqidLink?.rqid).toBe("i.rune.illusion-power");
    expect((update.system as any)?.opposingRuneRqidLink?.name).toBe("Illusion");
  });

  it("does nothing when rqid and name are already correct", async () => {
    const item = makeRuneItem("i.rune.truth-power", "i.rune.illusion-power");
    // Patch the name to be already correct
    (item.system as any).opposingRuneRqidLink.name = "Illusion Power";

    const update = await migrateRuneOpposingRqidLinks(item);

    expect(update).toEqual({});
  });

  it("fixes empty name when rqid is already correct", async () => {
    const item = makeRuneItem("i.rune.truth-power", "i.rune.illusion-power");
    // Name left empty (as in the screenshot)
    (item.system as any).opposingRuneRqidLink.name = "";

    const update = await migrateRuneOpposingRqidLinks(item);

    expect((update.system as any)?.opposingRuneRqidLink?.name).toBe("Illusion Power");
  });

  it("uses reciprocal actor rune link for non-power runes", async () => {
    const man = makeRuneItem("i.rune.man-form");
    const beast = makeRuneItem("i.rune.beast-form", "i.rune.man-form");
    const actor = {
      items: { contents: [man, beast] },
    } as unknown as RqgActor;

    const update = await migrateRuneOpposingRqidLinks(man, actor);

    expect((update.system as any)?.opposingRuneRqidLink?.rqid).toBe("i.rune.beast-form");
    expect((update.system as any)?.opposingRuneRqidLink?.name).toBe("Beast Form");
  });

  it("pairs man and beast form runes when both exist but are unlinked", async () => {
    const man = makeRuneItem("i.rune.man-form");
    const beast = makeRuneItem("i.rune.beast-form");
    const actor = {
      items: { contents: [man, beast] },
    } as unknown as RqgActor;

    const manUpdate = await migrateRuneOpposingRqidLinks(man, actor);
    const beastUpdate = await migrateRuneOpposingRqidLinks(beast, actor);

    expect((manUpdate.system as any)?.opposingRuneRqidLink?.rqid).toBe("i.rune.beast-form");
    expect((manUpdate.system as any)?.opposingRuneRqidLink?.name).toBe("Beast Form");
    expect((beastUpdate.system as any)?.opposingRuneRqidLink?.rqid).toBe("i.rune.man-form");
    expect((beastUpdate.system as any)?.opposingRuneRqidLink?.name).toBe("Man Form");
  });

  it("does nothing when rune has no rqid", async () => {
    const item = {
      type: ItemTypeEnum.Rune,
      system: {},
      flags: { rqg: {} },
    } as unknown as RqgItem;

    const update = await migrateRuneOpposingRqidLinks(item);

    expect(update).toEqual({});
  });
});
