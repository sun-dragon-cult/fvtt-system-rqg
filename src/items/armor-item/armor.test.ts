import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../shared/physicalItemUtil", () => ({
  getLocationRelatedUpdates: vi.fn(),
}));

vi.mock("../../system/util.ts", () => ({
  isDocumentSubType: vi.fn(),
}));

import { armorLifecycle } from "./armorLifecycle";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { getLocationRelatedUpdates } from "../shared/physicalItemUtil";
import { isDocumentSubType } from "../../system/util.ts";

describe("Armor.preUpdateItem", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("adds location-related updates for armor items", () => {
    const actor = { items: { contents: [{ id: "armor-1" }] } } as any;
    const armor = { id: "armor-1", type: ItemTypeEnum.Armor } as any;
    const updates: any[] = [{ _id: "armor-1", "system.equippedStatus": "equipped" }];
    const relatedUpdates = [{ _id: "gear-1", "system.equippedStatus": "equipped" }];

    vi.mocked(isDocumentSubType).mockReturnValue(true as any);
    vi.mocked(getLocationRelatedUpdates).mockReturnValue(relatedUpdates as any);

    armorLifecycle.preUpdateItem(actor, armor, updates);

    expect(isDocumentSubType).toHaveBeenCalledWith(armor, ItemTypeEnum.Armor);
    expect(getLocationRelatedUpdates).toHaveBeenCalledWith(actor.items.contents, armor, updates);
    expect(updates).toEqual([
      { _id: "armor-1", "system.equippedStatus": "equipped" },
      { _id: "gear-1", "system.equippedStatus": "equipped" },
    ]);
  });

  it("does nothing when the item is not armor", () => {
    const actor = { items: { contents: [] } } as any;
    const item = { id: "item-1", type: ItemTypeEnum.Gear } as any;
    const updates: any[] = [{ _id: "item-1" }];

    vi.mocked(isDocumentSubType).mockReturnValue(false as any);

    armorLifecycle.preUpdateItem(actor, item, updates);

    expect(getLocationRelatedUpdates).not.toHaveBeenCalled();
    expect(updates).toEqual([{ _id: "item-1" }]);
  });
});
