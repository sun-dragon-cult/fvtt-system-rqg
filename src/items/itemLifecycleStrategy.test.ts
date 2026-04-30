import { afterEach, describe, expect, it, vi } from "vitest";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import {
  applyActorCreateDescendantDocuments,
  applyActorPrepareDerivedData,
  applyActorPrepareEmbeddedEntities,
  applyItemPreUpdate,
  buildActorDeleteDescendantDocumentsUpdates,
  getItemLifecycleStrategy,
} from "./itemLifecycleStrategy";
import { Armor } from "./armor-item/armor";
import { Cult } from "./cult-item/cult";
import { HitLocation } from "./hit-location-item/hitLocation";
import { Skill } from "./skill-item/skill";

describe("item lifecycle strategy dispatch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a strategy for known item types", () => {
    const strategy = getItemLifecycleStrategy(ItemTypeEnum.Armor);

    expect(strategy).toBeDefined();
    expect(strategy?.preUpdateItem).toBe(Armor.preUpdateItem);
  });

  it("dispatches preUpdate to armor strategy", () => {
    const actor = { items: { contents: [] } } as any;
    const armor = { type: ItemTypeEnum.Armor } as any;
    const updates: any[] = [{ _id: "a" }];
    const options = { diff: true };
    const preUpdateSpy = vi.spyOn(Armor, "preUpdateItem").mockImplementation(() => undefined);

    applyItemPreUpdate(actor, armor, updates, options);

    expect(preUpdateSpy).toHaveBeenCalledTimes(1);
    expect(preUpdateSpy).toHaveBeenCalledWith(actor, armor, updates, options);
  });

  it("dispatches Actor.prepareEmbeddedDocuments to hit location strategy", () => {
    const item = { type: ItemTypeEnum.HitLocation } as any;
    const prepareSpy = vi
      .spyOn(HitLocation, "onActorPrepareEmbeddedEntities")
      .mockImplementation(() => item);

    applyActorPrepareEmbeddedEntities(item);

    expect(prepareSpy).toHaveBeenCalledTimes(1);
    expect(prepareSpy).toHaveBeenCalledWith(item);
  });

  it("dispatches Actor.prepareDerivedData to skill strategy", () => {
    const item = { type: ItemTypeEnum.Skill } as any;
    const prepareSpy = vi.spyOn(Skill, "onActorPrepareDerivedData").mockImplementation(() => item);

    applyActorPrepareDerivedData(item);

    expect(prepareSpy).toHaveBeenCalledTimes(1);
    expect(prepareSpy).toHaveBeenCalledWith(item);
  });

  it("dispatches descendant create hook to item strategy", async () => {
    const actor = {} as any;
    const item = { type: ItemTypeEnum.Cult } as any;
    const options = { renderSheet: false };
    const userId = "user-1";
    const payload = { _id: "cult-1", name: "Merged Cult" };
    const createSpy = vi.spyOn(Cult, "onEmbedItem").mockResolvedValue(payload);

    const result = await applyActorCreateDescendantDocuments(actor, item, options, userId);

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith(actor, item, options, userId);
    expect(result).toEqual(payload);
  });

  it("dispatches descendant delete hook to item strategy", () => {
    const actor = {} as any;
    const item = { type: ItemTypeEnum.Cult } as any;
    const options = {};
    const userId = "user-1";
    const updates = [{ _id: "rm-1", "system.cultId": "" }];
    const deleteSpy = vi.spyOn(Cult, "onDeleteItem").mockReturnValue(updates as any);

    const result = buildActorDeleteDescendantDocumentsUpdates(actor, item, options, userId);

    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(deleteSpy).toHaveBeenCalledWith(actor, item, options, userId);
    expect(result).toEqual(updates);
  });

  it("ignores unknown item types", () => {
    const actor = {} as any;
    const item = { type: "unknown-type" } as any;
    const updates: any[] = [];

    expect(() => applyItemPreUpdate(actor, item, updates, {})).not.toThrow();
    expect(getItemLifecycleStrategy("unknown-type" as any)).toBeUndefined();
  });
});
