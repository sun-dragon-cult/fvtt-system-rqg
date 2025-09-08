import { RqgItem } from "../rqgItem";
import { mockItems } from "../../mocks/mockLocationItems";
import { getLocationRelatedUpdates } from "./physicalItemUtil";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { mockItemsWithVirtualNode } from "../../mocks/mockItemsForVirtualNodes";
import { ItemTree } from "./ItemTree";
import { isDocumentSubType, mergeArraysById } from "../../system/util";
import type { WeaponItem } from "@item-model/weaponData.ts";

describe("getLocationRelatedUpdates", () => {
  describe("equipped status change", () => {
    it("should only change equipped status on a single item", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItems));
      const changedItem = items.find((i) => i.name === "Broad-brimmed Hat  (Leather)") as RqgItem;
      const updates = [
        {
          "system.equippedStatus": "equipped",
          _id: changedItem.id,
        },
      ];

      // --- Act ---
      const relatedUpdates = getLocationRelatedUpdates(items, changedItem, updates);
      mergeArraysById(updates, relatedUpdates);

      // --- Assert ---
      expect(JSON.parse(JSON.stringify(updates))).toStrictEqual([
        {
          _id: changedItem.id,
          "system.equippedStatus": "equipped",
        },
      ]);
    });

    it("should change all items contained in the same container tree", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItems));
      const changedItem = items.find((i) => i.name === "Yellow stone") as RqgItem;
      const updates = [
        {
          "system.equippedStatus": "equipped",
          _id: changedItem.id,
        },
      ];

      // --- Act ---
      const relatedUpdates = getLocationRelatedUpdates(items, changedItem, updates);
      mergeArraysById(updates, relatedUpdates);

      // --- Assert ---
      expect(JSON.parse(JSON.stringify(updates))).toStrictEqual([
        {
          _id: "StPcfMyAsE5XBXvZ", // Yellow stone
          "system.equippedStatus": "equipped",
        },
        {
          _id: "OLwQEIo1vhFdAWvg", // Belt Pouch
          "system.equippedStatus": "equipped",
        },
        {
          _id: "sYZQvfM8xUUB4SCK", // Green Crystal (001)
          "system.equippedStatus": "equipped",
        },
        {
          _id: "2iDIddO75JYf3pHO", // White stone
          "system.equippedStatus": "equipped",
        },
        {
          _id: "8bXE4wnw2x4k5xIZ", // Juwlery X25
          "system.equippedStatus": "equipped",
        },
        {
          _id: "yhaiwP709wdQCfqZ", // Juwlery x26
          "system.equippedStatus": "equipped",
        },
        {
          _id: "1gMonRQJ6QkQ1esw", // Juwlery x27
          "system.equippedStatus": "equipped",
        },
        {
          _id: "zXULpTSS29qm80KV", // Red stone x28
          "system.equippedStatus": "equipped",
        },
        {
          _id: "HMjxQ1Hm6M4goGMs", // Blue stone x29
          "system.equippedStatus": "equipped",
        },
        {
          _id: "jMqa0tXFNF8lvELV", // Red stone x30
          "system.equippedStatus": "equipped",
        },
        {
          _id: "NiGVLYhLusGq1YJh", // Costume Jewelery
          "system.equippedStatus": "equipped",
        },
      ]);
    });

    it("should change all items contained in the same virtual container tree", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItemsWithVirtualNode));
      const nestedItems = items.map((i) => {
        // virtual <- A <- B <- C <-  D
        if (i.name === "B") {
          i.system.location = "A";
        }
        if (i.name === "C") {
          i.system.location = "B";
        }
        return i;
      });
      const changedItem = nestedItems.find((i) => i.name === "B") as RqgItem;
      const updates = [
        {
          "system.equippedStatus": "carried",
          _id: changedItem.id,
        },
      ];

      // --- Act ---
      const relatedUpdates = getLocationRelatedUpdates(items, changedItem, updates);
      mergeArraysById(updates, relatedUpdates);

      // --- Assert ---
      expect(JSON.parse(JSON.stringify(updates))).toStrictEqual([
        {
          _id: changedItem.id, // B
          "system.equippedStatus": "carried",
        },
        {
          _id: "zvhAF1QDmmbQl505", // A
          "system.equippedStatus": "carried",
        },
        {
          _id: "h4aMb5lGfZ9H7j7W", // C
          "system.equippedStatus": "carried",
        },
        {
          _id: "7bM8wF6iOi99JLpJ", // D
          "system.equippedStatus": "carried",
        },
      ]);
    });
  });

  describe("location change", () => {
    it("should change a single location to a virtual item", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItems));
      const changedItem = items.find((i) => i.name === "Broad-brimmed Hat  (Leather)") as RqgItem;
      const updates = [
        {
          _id: changedItem.id,
          "system.location": "Virtual",
        },
      ];

      // --- Act ---
      const relatedUpdates = getLocationRelatedUpdates(items, changedItem, updates);
      const test = mergeArraysById(updates, relatedUpdates);

      // --- Assert ---
      expect(test).toStrictEqual([
        {
          _id: changedItem.id,
          // gets the changedItems equippedStatus instead of the virtual item default "notCarried"
          "system.equippedStatus": changedItem.system.equippedStatus,
          "system.location": "Virtual",
        },
      ]);
      // @ts-expect-error any types
      expect(updates[0]["system.equippedStatus"]).toStrictEqual(changedItem.system.equippedStatus); // Should not change
    });

    it("should change equippedStatus to match container item", () => {
      // --- Arrange ---
      const targetContainerName = "Riding Horse";
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItems));
      const changedItem = items.find(
        (i) => i.name === "Dagger" && isDocumentSubType<WeaponItem>(i, ItemTypeEnum.Weapon),
      ) as RqgItem;
      const targetContainer = items.find((i) => i.name === targetContainerName);
      const updates = [
        {
          "system.location": targetContainerName,
          _id: changedItem.id,
        },
      ];
      expect(
        changedItem.system.equippedStatus === targetContainer?.system.equippedStatus,
      ).toBeFalsy();

      // --- Act ---
      const relatedUpdates = getLocationRelatedUpdates(items, changedItem, updates);
      mergeArraysById(updates, relatedUpdates);

      // --- Assert ---
      expect(updates).toContainEqual({
        _id: changedItem.id,
        "system.equippedStatus": targetContainer?.system.equippedStatus,
        "system.location": targetContainerName,
      });

      expect(updates.length).toBe(18);
      expect(updates.every((u: any) => u["system.equippedStatus"] === "notCarried")).toBe(true);
    });

    it("should remove an item from a virtual container", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItems));
      const changedItem = items.find(
        (i) => i.name === "Dragon Armor Greaves  (Dragon Hide and Scales)",
      ) as RqgItem;
      const updates = [
        {
          "system.location": "",
          _id: changedItem.id,
        },
      ];

      // --- Act ---
      const relatedUpdates = getLocationRelatedUpdates(items, changedItem, updates);
      mergeArraysById(updates, relatedUpdates);

      // --- Assert ---
      expect(updates).toStrictEqual([
        {
          _id: changedItem.id,
          "system.location": "",
        },
      ]);
    });

    it("should assign correct equippedStatus to the changed item put in a virtual node with other items", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItemsWithVirtualNode));
      const changedItem = items.find((i) => i.name === "C") as RqgItem;
      const updates = [
        {
          "system.location": "virtual",
          _id: changedItem.id,
        },
      ];

      // --- Act ---
      const relatedUpdates = getLocationRelatedUpdates(items, changedItem, updates);
      mergeArraysById(updates, relatedUpdates);

      // --- Assert ---
      expect(JSON.parse(JSON.stringify(updates))).toStrictEqual([
        {
          _id: changedItem.id, // Item C in B
          "system.location": "virtual",
          "system.equippedStatus": "notCarried",
        },
        {
          _id: "zvhAF1QDmmbQl505", // Item A in virtual
          "system.equippedStatus": "notCarried",
        },
        {
          _id: "Ed3u5sauDqkPgczI", // Item B in A
          "system.equippedStatus": "notCarried",
        },
        {
          _id: "7bM8wF6iOi99JLpJ", // Item D in item C
          "system.equippedStatus": "notCarried",
        },
      ]);
    });

    it("should assign correct equippedStatus to the virtual node if it is new", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItemsWithVirtualNode));
      const changedItem = items.find((i) => i.name === "C") as RqgItem;
      const updates = [
        {
          "system.location": "nonExistent",
          _id: changedItem.id,
        },
      ];

      // Prepare an updatedItem with the expected updated data
      const updatedItems = items.map((i) => {
        if (i.id === changedItem.id) {
          i.system.location = "nonExistent";
        }
        return i;
      });
      const itemTree = new ItemTree(updatedItems);

      // --- Act ---
      const relatedUpdates = getLocationRelatedUpdates(items, changedItem, updates);
      mergeArraysById(updates, relatedUpdates);

      // Get the node of a tree as it would be after the update
      const virtualNode = itemTree.getContainerNodeOfItem("C");

      // --- Assert ---
      expect(updates).toStrictEqual([
        {
          _id: changedItem.id,
          "system.equippedStatus": "carried",
          "system.location": "nonExistent",
        },
        {
          _id: "7bM8wF6iOi99JLpJ", // Item D in item C
          "system.equippedStatus": "carried",
        },
      ]);

      expect(virtualNode?.equippedStatus).toStrictEqual("carried");
      expect(virtualNode?.equippedStatus).toStrictEqual(virtualNode?.contains[0].equippedStatus);
    });

    it("should return other item ids that are in same virtual location for nested items", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItemsWithVirtualNode));
      const nestedItems = items.map((i) => {
        if (i.name === "B") {
          i.system.location = "A";
        }
        if (i.name === "C") {
          i.system.location = "B";
        }
        return i;
      });

      const itemTree = new ItemTree(nestedItems);

      // --- Act ---
      const otherItemNAmes = itemTree.getOtherItemIdsInSameLocationTree("B");

      // --- Assert ---
      expect(otherItemNAmes).toStrictEqual([
        "zvhAF1QDmmbQl505",
        "Ed3u5sauDqkPgczI",
        "h4aMb5lGfZ9H7j7W",
        "7bM8wF6iOi99JLpJ",
      ]);
    });

    it("should work with multiple updates as well (from the itemSheet)", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItemsWithVirtualNode));
      const changedItem = items.find((i) => i.name === "B") as RqgItem;

      const updates = [
        {
          name: "B",
          "system.isContainer": true,
          "system.physicalItemType": "currency",
          "system.quantity": 1,
          "system.encumbrance": 1,
          "system.equippedStatus": "notCarried",
          "system.price.real": 1,
          "system.price.estimated": 0,
          "system.location": "virtual",
          "system.attunedTo": "Nisse",
          img: "icons/containers/bags/pack-leather-white-tan.webp",
          _id: "Ed3u5sauDqkPgczI",
        },
      ];

      // --- Act ---
      const relatedUpdates = getLocationRelatedUpdates(items, changedItem, updates);
      mergeArraysById(updates, relatedUpdates);

      // --- Assert ---
      expect(updates).toStrictEqual([
        {
          _id: "Ed3u5sauDqkPgczI",
          img: "icons/containers/bags/pack-leather-white-tan.webp",
          name: "B",
          "system.attunedTo": "Nisse",
          "system.encumbrance": 1,
          "system.equippedStatus": "notCarried",
          "system.isContainer": true,
          "system.location": "virtual",
          "system.physicalItemType": "currency",
          "system.price.estimated": 0,
          "system.price.real": 1,
          "system.quantity": 1,
        },
        {
          _id: "zvhAF1QDmmbQl505",
          "system.equippedStatus": "notCarried",
        },
      ]);
    });
  });
});
