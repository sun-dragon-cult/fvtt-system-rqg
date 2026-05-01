import { afterEach, describe, expect, it, vi } from "vitest";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import {
  getItemLifecycleStrategy,
  handleActorOnCreateDescendantDocuments,
  handleActorOnDeleteDescendantDocumentsUpdates,
  handleActorPrepareDerivedData,
  handleActorPrepareEmbeddedDocuments,
  handleItemUpdateDocumentsPreUpdate,
} from "./itemLifecycleStrategy";
import { armorLifecycle } from "./armor-item/armorLifecycle";
import { cultLifecycle } from "./cult-item/cultLifecycle";
import { hitLocationLifecycle } from "./hit-location-item/hitLocationLifecycle";
import { skillLifecycle } from "./skill-item/skillLifecycle";

describe("item lifecycle strategy dispatch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a strategy for known item types", () => {
    const strategy = getItemLifecycleStrategy(ItemTypeEnum.Armor);

    expect(strategy).toBeDefined();
    expect(strategy?.handleItemUpdateDocumentsPreUpdate).toBe(
      armorLifecycle.handleItemUpdateDocumentsPreUpdate,
    );
  });

  it("dispatches preUpdate to armor strategy", () => {
    const actor = { items: { contents: [] } } as any;
    const armor = { type: ItemTypeEnum.Armor } as any;
    const updates: any[] = [{ _id: "a" }];
    const options = { diff: true };
    const preUpdateSpy = vi
      .spyOn(armorLifecycle, "handleItemUpdateDocumentsPreUpdate")
      .mockImplementation(() => undefined);

    handleItemUpdateDocumentsPreUpdate(actor, armor, updates, options);

    expect(preUpdateSpy).toHaveBeenCalledTimes(1);
    expect(preUpdateSpy).toHaveBeenCalledWith(actor, armor, updates, options);
  });

  it("dispatches Actor.prepareEmbeddedDocuments to hit location strategy", () => {
    const item = { type: ItemTypeEnum.HitLocation } as any;
    const prepareSpy = vi
      .spyOn(hitLocationLifecycle, "handleActorPrepareEmbeddedDocuments")
      .mockImplementation(() => item);

    handleActorPrepareEmbeddedDocuments(item);

    expect(prepareSpy).toHaveBeenCalledTimes(1);
    expect(prepareSpy).toHaveBeenCalledWith(item);
  });

  it("dispatches Actor.prepareDerivedData to skill strategy", () => {
    const item = { type: ItemTypeEnum.Skill } as any;
    const prepareSpy = vi
      .spyOn(skillLifecycle, "handleActorPrepareDerivedData")
      .mockImplementation(() => item);

    handleActorPrepareDerivedData(item);

    expect(prepareSpy).toHaveBeenCalledTimes(1);
    expect(prepareSpy).toHaveBeenCalledWith(item);
  });

  it("dispatches descendant create hook to item strategy", async () => {
    const actor = {} as any;
    const item = { type: ItemTypeEnum.Cult } as any;
    const options = { renderSheet: false };
    const userId = "user-1";
    const payload = { _id: "cult-1", name: "Merged Cult" };
    const createSpy = vi
      .spyOn(cultLifecycle, "handleActorOnCreateDescendantDocuments")
      .mockResolvedValue(payload);

    const result = await handleActorOnCreateDescendantDocuments(actor, item, options, userId);

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
    const deleteSpy = vi
      .spyOn(cultLifecycle, "handleActorOnDeleteDescendantDocuments")
      .mockReturnValue(updates as any);

    const result = handleActorOnDeleteDescendantDocumentsUpdates(actor, item, options, userId);

    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(deleteSpy).toHaveBeenCalledWith(actor, item, options, userId);
    expect(result).toEqual(updates);
  });

  it("ignores unknown item types", () => {
    const actor = {} as any;
    const item = { type: "unknown-type" } as any;
    const updates: any[] = [];

    expect(() => handleItemUpdateDocumentsPreUpdate(actor, item, updates, {})).not.toThrow();
    expect(getItemLifecycleStrategy("unknown-type" as any)).toBeUndefined();
  });
});
