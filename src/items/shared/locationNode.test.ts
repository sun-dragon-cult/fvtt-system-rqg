import { locationNodeTreeOfMockItems, mockItems } from "../../mocks/mockLocationItems";
import { createItemLocationTree, getOtherItemIdsInSameLocationTree } from "./locationNode";
// import { mockModulePartially } from "../../test/helpers";

describe("Location Tree calculations", () => {
  beforeEach(() => {
    (global as any).ui = {
      notifications: {
        info(_msg: string, _other?: any) {},
        error(_msg: string, _other?: any) {},
      },
    };

    // (global as any).localize = () => "Mockityy";

    // const utilModul: any = jest.createMockFromModule("util");
    // utilModul.localize = () => "Makadam";

    // , () => ({
    //   __esModule: true,
    //   localize: jest.fn(() => "Mocito"),
    // }));

    // import { localize } from "util";
    //
    // localize.mockImplementation(() => "it's mocked");

    // mockModulePartially("../../system/util", () => ({
    //   localize: jest.fn().mockImplementation(() => "mocked translation"),
    // }));

    // jest.mock("../../system/util", () => {
    //   const originalUtil = jest.requireActual("../../system/util");
    //   return {
    //     __esModule: true,
    //     ...originalUtil,
    //     localize: jest.fn((key: string, data: any) => "mocked translation"),
    //   };
    // });
  });

  describe("createItemLocationTree", () => {
    it("should create a correct location tree", () => {
      // --- Arrange ---

      // --- Act ---
      const constructedItemTree = createItemLocationTree(JSON.parse(JSON.stringify(mockItems)));

      // --- Assert ---
      expect(constructedItemTree).toStrictEqual(locationNodeTreeOfMockItems);
    });

    // it("should handle item loops", () => {
    //   // --- Arrange ---
    //   // const utilSpy = jest.spyOn(util, "localize");
    //   // utilSpy.mockReturnValue("mocked localization");
    //
    //   const mockItemsWithLoop = JSON.parse(JSON.stringify(mockItems));
    //   const container = mockItemsWithLoop.find((i: RqgItem) => i.name === "Belt Pouch");
    //   container.system.location = "White stone"; // set location to an item inside itself
    //   // --- Act ---
    //   const constructedItemTree = createItemLocationTree(mockItemsWithLoop);
    //
    //   // --- Assert ---
    //   expect(constructedItemTree).toStrictEqual(locationNodeTreeOfMockItems);
    // });
  });

  describe("getOtherItemIdsInSameLocationTree", () => {
    it("should return all physical items in the same tree from virtual location", () => {
      // --- Arrange ---

      // --- Act ---
      const result = getOtherItemIdsInSameLocationTree(
        "Belt",
        JSON.parse(JSON.stringify(mockItems))
      );

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

      // --- Act ---
      const result = getOtherItemIdsInSameLocationTree("White stone", mockItems);

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

      // --- Act ---
      const result = getOtherItemIdsInSameLocationTree("Dagger", mockItems);

      // --- Assert ---
      expect(result).toStrictEqual(["W5bUaf9Hg61ZAM1y"]);
    });
  });
});
