import { locationNodeTreeOfMockItems, mockItems } from "../../mocks/mockLocationItems";
import { createItemLocationTree, getOtherItemIdsInSameLocationTree } from "./locationNode";
import { RqgItem } from "../rqgItem";

describe("Location Tree calculations", () => {
  beforeEach(() => {
    (global as any).ui = {
      notifications: {
        info(_msg: string, _other?: any) {},
        error(_msg: string, _other?: any) {},
      },
    };
  });

  describe("createItemLocationTree", () => {
    it("should create a correct location tree", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItems));

      // --- Act ---
      const constructedItemTree = createItemLocationTree(items);

      // --- Assert ---
      expect(constructedItemTree).toStrictEqual(locationNodeTreeOfMockItems);
    });
  });

  describe("getOtherItemIdsInSameLocationTree", () => {
    it("should return all physical items in the same tree from virtual location", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItems));

      // --- Act ---
      const result = getOtherItemIdsInSameLocationTree("Belt", items);

      // --- Assert ---
      expect(result).toStrictEqual([
        "OLwQEIo1vhFdAWvg",
        "sYZQvfM8xUUB4SCK",
        "2iDIddO75JYf3pHO",
        "StPcfMyAsE5XBXvZ",
        "8bXE4wnw2x4k5xIZ",
        "yhaiwP709wdQCfqZ",
        "1gMonRQJ6QkQ1esw",
        "zXULpTSS29qm80KV",
        "HMjxQ1Hm6M4goGMs",
        "jMqa0tXFNF8lvELV",
        "NiGVLYhLusGq1YJh",
      ]);
    });

    it("should return all physical items in the same tree from item inside container", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItems));

      // --- Act ---
      const result = getOtherItemIdsInSameLocationTree("White stone", items);

      // --- Assert ---
      expect(result).toStrictEqual([
        "OLwQEIo1vhFdAWvg",
        "sYZQvfM8xUUB4SCK",
        "2iDIddO75JYf3pHO",
        "StPcfMyAsE5XBXvZ",
        "8bXE4wnw2x4k5xIZ",
        "yhaiwP709wdQCfqZ",
        "1gMonRQJ6QkQ1esw",
        "zXULpTSS29qm80KV",
        "HMjxQ1Hm6M4goGMs",
        "jMqa0tXFNF8lvELV",
        "NiGVLYhLusGq1YJh",
      ]);
    });

    it("should return itself only for items without location", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItems));

      // --- Act ---
      const result = getOtherItemIdsInSameLocationTree("Dagger", items);

      // --- Assert ---
      expect(result).toStrictEqual(["W5bUaf9Hg61ZAM1y"]);
    });
  });
});
