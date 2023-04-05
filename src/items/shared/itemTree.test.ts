import { RqgItem } from "../rqgItem";
import { ItemTree } from "./ItemTree";
import { mockItems } from "../../mocks/mockLocationItems";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { testItems } from "./itemTree.testdata";
import { mockItemsWithLoop } from "../../mocks/mockItemsForLocationLoop";
import { mockItemsWithVirtualNode } from "../../mocks/mockItemsForVirtualNodes";

describe("ItemTree", () => {
  beforeEach(() => {});

  describe("constructor", () => {
    it("should create a correct itemLocationData - with data about each item", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItems));

      // --- Act ---
      const itemTree = new ItemTree(items);

      // --- Assert ---
      const itemLocationDataMap = itemTree["itemLocationData"];
      const physicalItemCount = items.filter(
        (item) =>
          item.system.physicalItemType &&
          !(item.type === ItemTypeEnum.Weapon && item.system.isNatural)
      ).length;
      const virtualNodeCount = 5; // "", "Belt", "armor", "backen" & "under Armor"
      expect(itemLocationDataMap.size).toBe(physicalItemCount + virtualNodeCount);

      const backenData = itemLocationDataMap.get("backen")?.toObject();
      expect(backenData).toEqual({
        attunedTo: "",
        contains: [
          {
            attunedTo: "Nisse",
            contains: [],
            description: "<h1>HEPP</h1>\n<p>Hubba bubba</p>\n<p>sq</p>",
            encumbrance: 2,
            equippedStatus: "carried",
            gmNotes: "",
            id: "b7KKpzicF7iiaWFQ",
            isContainer: true,
            isVirtual: false,
            location: "backen",
            name: "Shiny crystal",
            physicalItemType: "currency",
            price: {
              estimated: 20,
              real: 10,
            },
            quantity: 11,
          },
        ],
        description: "",
        encumbrance: 0,
        equippedStatus: "carried",
        gmNotes: "",
        id: "virtual:carried:backen",
        isContainer: true,
        isVirtual: true,
        location: "",
        name: "backen",
        physicalItemType: "unique",
        price: {
          estimated: 0,
          real: 0,
        },
        quantity: 1,
      });

      const daggerData = itemLocationDataMap.get("Dagger")?.toObject();
      expect(daggerData).toStrictEqual({
        attunedTo: "",
        contains: [],
        description:
          "<p>A short-bladed weapon no more than 40 cm&nbsp;long. Daggers can be sharp on one or both edges, or be&nbsp;triangular in their cross-section if intended only for stabbing.&nbsp;</p>\n<p>They are often decorated. Most adults in Dragon Pass&nbsp;carry a dagger or knife. If thrown, use the Throwing Dagger&nbsp;skill.</p>",
        encumbrance: 0.25,
        equippedStatus: "equipped",
        gmNotes: "",
        id: "W5bUaf9Hg61ZAM1y",
        isContainer: false,
        isVirtual: false,
        location: "",
        name: "Dagger",
        physicalItemType: "unique",
        price: {
          estimated: 0,
          real: 10,
        },
        quantity: 1,
      });

      const backpackData = itemLocationDataMap.get("Backpack")?.toObject();
      expect(backpackData?.name).toStrictEqual("Backpack");
      expect(backpackData?.contains.length).toEqual(12);
    });

    it("should create a correct itemGraph", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItems));

      // --- Act ---
      const itemTree = new ItemTree(items);

      // --- Assert ---
      expect(itemTree["itemGraph"]).toStrictEqual(
        new Map([
          [
            "",
            [
              "under Armor",
              "Belt",
              "armor",
              "backen",
              "Quarterstaff",
              "Dagger",
              "Broad-brimmed Hat  (Leather)",
              "Dragon Helm  (Dragon Hide and Scales)",
              "Silver armring",
              "Red Crystal 9mp",
              "Blue Crystal 9mp",
              "Riding Horse",
              "Light Crossbow.",
              "Barbed Bolts",
              "Crown (X20) /21 mp",
              "Torches, Wicker 2hrs",
              "Magic (Protection 1)",
              "Magic (Protection 2)",
              "Magic (Protection 3)",
              "Magic (Protection 4)",
              "Demo Sword",
              "Styrke",
            ],
          ],
          [
            "Backpack",
            [
              "Wood stauet",
              "Blanket (hide",
              "Fire Starter",
              "Lunars",
              "Scroll (X6)",
              "Juwlery (c3)",
              "Juwelery (c4)",
              "Jar with Rhino Fat",
              "Dress, Esrolian",
              "Wheels",
              "Clacks",
              "Sleeping Drog POT:15",
            ],
          ],
          [
            "Belt Pouch",
            [
              "Green Crystal (001)",
              "White stone",
              "Yellow stone",
              "Juwlery X25",
              "Juwlery x26",
              "Juwlery x27",
              "Red stone x28",
              "Blue stone x29",
              "Red stone x30",
              "Costume Jewelery",
            ],
          ],
          ["Belt", ["Belt Pouch"]],
          ["Riding Horse", ["Backpack", "Mechanic clock", "Small Keg  (liter)", "Armring"]],
          [
            "armor",
            [
              "Dragon Armor Greaves  (Dragon Hide and Scales)",
              "Dragon Armor Hauberk  (Dragon Hide and Bone)",
              "Dragon Armor Vambraces  (Dragon Hide and Scales)",
            ],
          ],
          ["backen", ["Shiny crystal"]],
          ["under Armor", ["Leather Vambraces  (Leather)", "Leather Greaves  (Leather)"]],
        ])
      );
    });

    it("should not complain if items are without loops", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItems));
      const itemGraph = new ItemTree(items);

      // --- Act ---
      const findLoop = itemGraph["findLoop"]();

      // --- Assert ---
      expect(findLoop.size).toBe(0);
      expect(itemGraph.loopMessage).toStrictEqual("");
    });

    // TODO figure out how to mock localize
    xit("should complain if items contain a simple loop", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItems));
      const horse = items.find((i) => i.name === "Riding Horse");
      if (!horse) {
        fail("Arrange error, could not find Riding Horse");
      }
      horse.system.location = "Backpack"; // Put the horse in the backpack to create a loop

      // --- Act ---
      const itemGraph = new ItemTree(items); // This tree has a loop;

      // --- Assert ---
      expect(itemGraph.loopMessage).toStrictEqual("Backpack and Riding Horse");
    });

    // TODO figure out how to mock localize
    xit("should complain if items contain a multi step loop", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItemsWithLoop));

      // --- Act ---
      const itemGraph = new ItemTree(items); // This tree has a loop A->B->C->D->A;

      // --- Assert ---
      expect(itemGraph.loopMessage).toStrictEqual("B, C, D, and A");
    });

    it("should create a correct list of locations", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItems));

      // --- Act ---
      const itemTree = new ItemTree(items);

      // --- Assert ---
      expect(itemTree.getPhysicalItemLocations()).toStrictEqual([
        "under Armor",
        "Belt",
        "armor",
        "backen",
        "Backpack",
        "Belt Pouch",
        "Lunars",
        "Riding Horse",
        "Costume Jewelery",
        "Shiny crystal",
      ]);
    });
  });

  describe("toSheetData", () => {
    it("should create correct sheet data", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItems));
      const itemGraph = new ItemTree(items);

      // --- Act ---
      const locationSheetData = itemGraph.toSheetData();

      // --- Assert ---
      expect(locationSheetData).toMatchObject(testItems);
    });

    it("should create correct sheet data from items with loop", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItemsWithLoop));
      const itemGraph = new ItemTree(items);

      // --- Act ---
      const locationSheetData = itemGraph.toSheetData();

      // --- Assert ---
      expect(locationSheetData).toMatchObject({
        name: "",
        id: "virtual:undefined:",
        contains: [],
        physicalItemType: "unique",
        quantity: 1,
        description: "",
        gmNotes: "",
        location: "",
        isVirtual: true,
        isContainer: true,
        attunedTo: "",
        encumbrance: 0,
        equippedStatus: "notCarried",
        price: {
          real: 0,
          estimated: 0,
        },
      });
    });
  });

  describe("getContainerNodeOfItem", () => {
    it("should return the container of an item", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItems));
      const itemTree = new ItemTree(items);

      // --- Act ---
      const container = itemTree.getContainerNodeOfItem(
        "Dragon Armor Hauberk  (Dragon Hide and Bone)"
      );

      // --- Assert ---
      expect(container).toEqual({
        attunedTo: "",
        contains: [
          {
            attunedTo: "",
            contains: [],
            description:
              "<p>These are plates molded to protect the lower leg.&nbsp;&nbsp;They either &ldquo;spring&rdquo; into shape or are strapped on. They are&nbsp;heavy and make sprinting difficult.</p>",
            encumbrance: 1,
            equippedStatus: "equipped",
            gmNotes: "",
            id: "ifk062JyG0wziIRs",
            isContainer: false,
            isVirtual: false,
            location: "armor",
            name: "Dragon Armor Greaves  (Dragon Hide and Scales)",
            physicalItemType: "unique",
            price: null,
            quantity: 1,
          },
          {
            attunedTo: "",
            contains: [],
            description:
              "<p>This armor covers the chest&nbsp;and abdomen and is made up of a cuirass and three or four&nbsp;sets of curved lower protection plates. The pieces are fastened&nbsp;together by thongs that allow movement.&nbsp;</p>",
            encumbrance: 3,
            equippedStatus: "equipped",
            gmNotes: "",
            id: "WfOQlBxEMTzKoQaN",
            isContainer: false,
            isVirtual: false,
            location: "armor",
            name: "Dragon Armor Hauberk  (Dragon Hide and Bone)",
            physicalItemType: "unique",
            price: null,
            quantity: 1,
          },
          {
            attunedTo: "",
            contains: [],
            description: "<p>These are like greaves, but protect the forearm.</p>",
            encumbrance: 1,
            equippedStatus: "equipped",
            gmNotes: "",
            id: "olzPns2WbDvtGEr5",
            isContainer: false,
            isVirtual: false,
            location: "armor",
            name: "Dragon Armor Vambraces  (Dragon Hide and Scales)",
            physicalItemType: "unique",
            price: null,
            quantity: 1,
          },
        ],
        description: "",
        encumbrance: 0,
        equippedStatus: "equipped",
        gmNotes: "",
        id: "virtual:equipped:armor",
        isContainer: true,
        isVirtual: true,
        location: "",
        name: "armor",
        physicalItemType: "unique",
        price: {
          estimated: 0,
          real: 0,
        },
        quantity: 1,
      });
    });

    it("should return undefined if item is not in a container", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItems));
      const itemTree = new ItemTree(items);

      // --- Act ---
      const container = itemTree.getContainerNodeOfItem("Quarterstaff");

      // --- Assert ---
      expect(container).toEqual(undefined);
    });

    it("should return the container node of a container", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItems));
      const itemTree = new ItemTree(items);

      // --- Act ---
      const container = itemTree.getContainerNodeOfItem("Backpack");

      // --- Assert ---
      expect(container?.name).toEqual("Riding Horse");
    });

    it("should work in a tree corrected for loops", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItemsWithLoop));
      const itemTree = new ItemTree(items);

      // --- Act ---
      const container = itemTree.getContainerNodeOfItem("D");

      // --- Assert ---
      expect(container?.name).toEqual("A");
    });
  });

  describe("getTopContainerNodeOfItem", () => {
    it("should return the topmost container of an item", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItems));
      const itemTree = new ItemTree(items);

      // --- Act ---
      const container = itemTree.getTopContainerNodeOfItem("Fire Starter");

      // --- Assert ---
      expect(container?.name).toEqual("Riding Horse");
    });

    it("should return undefined if it is not in a container", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItems));
      const itemTree = new ItemTree(items);

      // --- Act ---
      const container = itemTree.getTopContainerNodeOfItem("Quarterstaff");

      // --- Assert ---
      expect(container?.name).toEqual(undefined);
    });
  });

  // TODO should it include the item itself?
  describe("getOtherItemIdsInSameLocationTree", () => {
    it("should return other item ids that are in same location as an item", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItems));
      const itemTree = new ItemTree(items);

      // --- Act ---
      const otherItemNames = itemTree.getOtherItemIdsInSameLocationTree("Backpack");

      // --- Assert ---
      expect(otherItemNames).toStrictEqual([
        "UHP2sXZumDDjRY0f", // Riding Horse
        "TNR9fCbTgIXZaKol", // Backpack
        "vAaxEpgS2ANAfxet", // Wood stauet
        "gA6WIvluiRKy2aDX", // Blanket (hide
        "d4rnVSjAw9mFcf5n", // Fire Starter
        "eEqVuEQLtkY6Lfpm", // Lunars
        "EXiPEvCtCfjDP50I", // Scroll (X6)
        "EUbd4OxPBxzPkTNu", // Juwlery (c3)
        "Bx4UevFj87K7Sr0l", // Juwelery (c4)
        "SzgUep8142bt8eQs", // Jar with Rhino Fat
        "ckIxs5CYkhZ1R66P", // Dress, Esrolian
        "JDdR2V2pNhmFGQMF", // Wheels
        "SqQSIJij90aS5PMe", // Clacks
        "5nVuDD1MrqNuFakq", // Sleeping Drog POT:15
        "xW4gkaqtKj37FW9x", // "Mechanic clock
        "wpFe18rUbo15DD81", // Small Keg  (liter)
        "FUIi9O7oag36Lmgf", // Armring
      ]);
    });

    it("should return other item ids that are in same location for nested items", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItems));
      const itemTree = new ItemTree(items);

      // --- Act ---
      const otherItemNAmes = itemTree.getOtherItemIdsInSameLocationTree("Riding Horse");

      // --- Assert ---
      expect(otherItemNAmes).toStrictEqual([
        "UHP2sXZumDDjRY0f", // Riding Horse
        "TNR9fCbTgIXZaKol", // Backpack
        "vAaxEpgS2ANAfxet", // Wood stauet
        "gA6WIvluiRKy2aDX", // Blanket (hide
        "d4rnVSjAw9mFcf5n", // Fire Starter
        "eEqVuEQLtkY6Lfpm", // Lunars
        "EXiPEvCtCfjDP50I", // Scroll (X6)
        "EUbd4OxPBxzPkTNu", // Juwlery (c3)
        "Bx4UevFj87K7Sr0l", // Juwelery (c4)
        "SzgUep8142bt8eQs", // Jar with Rhino Fat
        "ckIxs5CYkhZ1R66P", // Dress, Esrolian
        "JDdR2V2pNhmFGQMF", // Wheels
        "SqQSIJij90aS5PMe", // Clacks
        "5nVuDD1MrqNuFakq", // Sleeping Drog POT:15
        "xW4gkaqtKj37FW9x", // "Mechanic clock
        "wpFe18rUbo15DD81", // Small Keg  (liter)
        "FUIi9O7oag36Lmgf", // Armring
      ]);
    });

    it("should return an empty array if the item does not have any parents", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItems));
      const itemTree = new ItemTree(items);

      // --- Act ---
      const otherItemNAmes = itemTree.getOtherItemIdsInSameLocationTree("Dagger");

      // --- Assert ---
      expect(otherItemNAmes).toStrictEqual([]);
    });

    it("should return work in a tree with corrected loops", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItemsWithLoop));
      const itemTree = new ItemTree(items);

      // --- Act ---
      const otherItemNAmes = itemTree.getOtherItemIdsInSameLocationTree("D");

      // --- Assert ---
      expect(otherItemNAmes).toStrictEqual([
        "26S23PgOC81KaUjp",
        "3h3f0lGUL10cyvnp",
        "U1P54zf785goQmVw",
        "IqgucFXHPsZ33g8Y",
      ]);
    });

    it("should not return ids of virtual items", () => {
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
      const otherItemNAmes = itemTree.getOtherItemIdsInSameLocationTree("D");

      // --- Assert ---
      expect(otherItemNAmes).toStrictEqual([
        "zvhAF1QDmmbQl505",
        "Ed3u5sauDqkPgczI",
        "h4aMb5lGfZ9H7j7W",
        "7bM8wF6iOi99JLpJ",
      ]);
    });
  });

  describe("getOtherItemIdsBelowSameLocationTree", () => {
    it("should return other item ids that are below the item in the tree", () => {
      // --- Arrange ---
      const items: RqgItem[] = JSON.parse(JSON.stringify(mockItems));
      const itemTree = new ItemTree(items);

      // --- Act ---
      const otherItemNames = itemTree.getItemIdsBelowNode("Backpack");

      // --- Assert ---
      expect(otherItemNames).toStrictEqual([
        "TNR9fCbTgIXZaKol", // Backpack
        "vAaxEpgS2ANAfxet", // Wood stauet
        "gA6WIvluiRKy2aDX", // Blanket (hide
        "d4rnVSjAw9mFcf5n", // Fire Starter
        "eEqVuEQLtkY6Lfpm", // Lunars
        "EXiPEvCtCfjDP50I", // Scroll (X6)
        "EUbd4OxPBxzPkTNu", // Juwlery (c3)
        "Bx4UevFj87K7Sr0l", // Juwelery (c4)
        "SzgUep8142bt8eQs", // Jar with Rhino Fat
        "ckIxs5CYkhZ1R66P", // Dress, Esrolian
        "JDdR2V2pNhmFGQMF", // Wheels
        "SqQSIJij90aS5PMe", // Clacks
        "5nVuDD1MrqNuFakq", // Sleeping Drog POT:15
      ]);
    });
  });
});
