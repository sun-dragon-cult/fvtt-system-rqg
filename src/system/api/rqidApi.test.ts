import { afterEach, describe, expect, it, vi } from "vitest";
import { Rqid } from "./rqidApi";
import { RqgError } from "../util";
import { systemId } from "../config";
import { documentRqidFlags } from "../../data-model/shared/rqgDocumentFlags";
import * as util from "../util";

type MockRqidDoc = {
  id?: string;
  documentName?: string;
  type?: string;
  name?: string;
  getFlag: ReturnType<typeof vi.fn>;
  setFlag?: ReturnType<typeof vi.fn>;
};

function mockDoc(rqid: string, priority: number, lang = "en"): MockRqidDoc {
  return {
    id: crypto.randomUUID(),
    getFlag: vi.fn().mockReturnValue({ id: rqid, priority, lang }),
  };
}

describe("Rqid", () => {
  const originalGame = game;

  afterEach(() => {
    game = originalGame;
    vi.restoreAllMocks();
  });

  describe("getDocumentName", () => {
    it("returns the foundry document name from rqid", () => {
      expect(Rqid.getDocumentName("i.skill.jump")).toBe("Item");
      expect(Rqid.getDocumentName("jp.rule.page")).toBe("JournalEntryPage");
    });

    it("throws for unsupported rqid document prefix", () => {
      expect(() => Rqid.getDocumentName("x.unknown.type")).toThrow(RqgError);
    });
  });

  describe("getDocumentType", () => {
    it("extracts the document subtype", () => {
      expect(Rqid.getDocumentType("i.skill.jump")).toBe("skill");
    });

    it("returns undefined when document subtype is missing", () => {
      expect(Rqid.getDocumentType("je..my-journal")).toBeUndefined();
    });

    it("returns undefined when rqid is undefined", () => {
      expect(Rqid.getDocumentType(undefined)).toBeUndefined();
    });
  });

  describe("compareRqidPrio and filterBestRqid", () => {
    it("sorts with highest priority first", () => {
      const docs = [
        mockDoc("i.skill.jump", 2),
        mockDoc("i.skill.jump", 10),
        mockDoc("i.skill.jump", 5),
      ];

      docs.sort((a, b) => Rqid.compareRqidPrio(a as any, b as any));

      expect(Rqid.getDocumentFlag(docs[0] as any)?.priority).toBe(10);
      expect(Rqid.getDocumentFlag(docs[1] as any)?.priority).toBe(5);
      expect(Rqid.getDocumentFlag(docs[2] as any)?.priority).toBe(2);
    });

    it("keeps only the best doc per rqid", () => {
      const docs = [
        mockDoc("i.skill.jump", 1),
        mockDoc("i.skill.jump", 6),
        mockDoc("i.skill.swim", 4),
        mockDoc("i.skill.swim", 2),
      ];

      const result = Rqid.filterBestRqid(docs as any);

      const bestJump = result.find((d) => Rqid.getDocumentFlag(d)?.id === "i.skill.jump");
      const bestSwim = result.find((d) => Rqid.getDocumentFlag(d)?.id === "i.skill.swim");

      expect(result).toHaveLength(2);
      expect(Rqid.getDocumentFlag(bestJump)?.priority).toBe(6);
      expect(Rqid.getDocumentFlag(bestSwim)?.priority).toBe(4);
    });
  });

  describe("fromRqidRegexBest", () => {
    it("returns only the highest priority match for each rqid", async () => {
      const docs = [mockDoc("i.skill.jump", 3), mockDoc("i.skill.swim", 2)];
      const allSpy = vi.spyOn(Rqid, "fromRqidRegex").mockResolvedValue(docs as any);

      const result = await Rqid.fromRqidRegexBest(/i\.skill\..*/, "i", "en");

      expect(allSpy).toHaveBeenCalledWith(/i\.skill\..*/, "i", "en", {
        source: "all",
        mode: "best",
      });
      expect(result).toHaveLength(2);
      expect(result.find((d) => Rqid.getDocumentFlag(d)?.id === "i.skill.jump")).toBeDefined();
      expect(
        Rqid.getDocumentFlag(result.find((d) => Rqid.getDocumentFlag(d)?.id === "i.skill.jump"))
          ?.priority,
      ).toBe(3);
    });
  });

  describe("fromRqid", () => {
    it("returns pack document when it has higher priority than world document", async () => {
      const worldDoc = mockDoc("i.skill.jump", 3, "en");
      const packDoc = mockDoc("i.skill.jump", 7, "en");
      vi.spyOn(Rqid as any, "documentFromWorld").mockResolvedValue(worldDoc as any);
      vi.spyOn(Rqid as any, "documentFromPacks").mockResolvedValue(packDoc as any);
      vi.spyOn(Rqid as any, "getMaxPackDocumentPriority").mockResolvedValue(7);

      const result = await Rqid.fromRqid("i.skill.jump", "en");

      expect(result).toBe(packDoc);
      expect(Rqid.getDocumentFlag(result as any)?.priority).toBe(7);
    });

    it("returns world document when it has higher priority than pack document", async () => {
      const worldDoc = mockDoc("i.skill.jump", 7, "en");
      const packDoc = mockDoc("i.skill.jump", 3, "en");
      vi.spyOn(Rqid as any, "documentFromWorld").mockResolvedValue(worldDoc as any);
      vi.spyOn(Rqid as any, "documentFromPacks").mockResolvedValue(packDoc as any);
      vi.spyOn(Rqid as any, "getMaxPackDocumentPriority").mockResolvedValue(3);

      const result = await Rqid.fromRqid("i.skill.jump", "en");

      expect(result).toBe(worldDoc);
      expect(Rqid.getDocumentFlag(result as any)?.priority).toBe(7);
    });

    it("returns world document when priorities are equal (world takes precedence)", async () => {
      const worldDoc = mockDoc("i.skill.jump", 5, "en");
      const packDoc = mockDoc("i.skill.jump", 5, "en");
      vi.spyOn(Rqid as any, "documentFromWorld").mockResolvedValue(worldDoc as any);
      vi.spyOn(Rqid as any, "documentFromPacks").mockResolvedValue(packDoc as any);
      vi.spyOn(Rqid as any, "getMaxPackDocumentPriority").mockResolvedValue(5);

      const result = await Rqid.fromRqid("i.skill.jump", "en");

      expect(result).toBe(worldDoc);
    });

    it("falls back to fallbackLanguage when requested language has no match", async () => {
      const foundDoc = mockDoc("i.skill.jump", 5, "en");
      const worldSpy = vi
        .spyOn(Rqid as any, "documentFromWorld")
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);
      // documentFromPacks is NOT called for "sv" (index scan shows no sv docs)
      // it is only called for "en" when the pack priority beats the world priority
      const packSpy = vi
        .spyOn(Rqid as any, "documentFromPacks")
        .mockResolvedValueOnce(foundDoc as any);
      vi.spyOn(Rqid as any, "getMaxPackDocumentPriority")
        .mockResolvedValueOnce(-Infinity) // no "sv" docs in packs
        .mockResolvedValueOnce(5); // "en" docs exist in packs with priority 5

      const result = await Rqid.fromRqid("i.skill.jump", "sv");

      expect(worldSpy).toHaveBeenNthCalledWith(1, "i.skill.jump", "sv");
      expect(worldSpy).toHaveBeenNthCalledWith(2, "i.skill.jump", "en");
      expect(packSpy).toHaveBeenCalledTimes(1);
      expect(packSpy).toHaveBeenCalledWith("i.skill.jump", "en");
      expect(result).toBe(foundDoc);
    });

    it("warns and returns undefined when no document exists in fallback language", async () => {
      vi.spyOn(Rqid as any, "documentFromWorld").mockResolvedValue(undefined);
      vi.spyOn(Rqid as any, "documentFromPacks").mockResolvedValue(undefined);
      vi.spyOn(Rqid as any, "getMaxPackDocumentPriority").mockResolvedValue(-Infinity);

      const warnSpy = vi.spyOn(ui.notifications!, "warn");
      const result = await Rqid.fromRqid("i.skill.missing", "en", false);

      expect(result).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("fromRqidRegex", () => {
    it("returns empty array when regex or document name is missing", async () => {
      await expect(Rqid.fromRqidRegex(undefined, "i")).resolves.toEqual([]);
      await expect(Rqid.fromRqidRegex(/.*/, undefined as any)).resolves.toEqual([]);
    });

    it("uses only world source", async () => {
      const worldDocs = [mockDoc("i.skill.jump", 2)];
      const worldSpy = vi
        .spyOn(Rqid as any, "documentsFromWorld")
        .mockResolvedValue(worldDocs as any);
      const packsSpy = vi
        .spyOn(Rqid as any, "documentsFromPacks")
        .mockResolvedValue([mockDoc("i.skill.swim", 1)] as any);

      const result = await Rqid.fromRqidRegex(/i\.skill\..*/, "i", "en", {
        source: "world",
        mode: "all",
      });

      expect(worldSpy).toHaveBeenCalledTimes(1);
      expect(packsSpy).not.toHaveBeenCalled();
      expect(result).toEqual(worldDocs);
    });

    it("uses only pack source", async () => {
      const packDocs = [mockDoc("i.skill.swim", 1)];
      const worldSpy = vi
        .spyOn(Rqid as any, "documentsFromWorld")
        .mockResolvedValue([mockDoc("i.skill.jump", 2)] as any);
      const packsSpy = vi
        .spyOn(Rqid as any, "documentsFromPacks")
        .mockResolvedValue(packDocs as any);

      const result = await Rqid.fromRqidRegex(/i\.skill\..*/, "i", "en", {
        source: "packs",
        mode: "all",
      });

      expect(worldSpy).not.toHaveBeenCalled();
      expect(packsSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(packDocs);
    });

    it("returns global priority sort for source=all mode=all", async () => {
      const worldDocs = [mockDoc("i.skill.jump", 5)];
      const packDocs = [mockDoc("i.skill.swim", 10)];

      vi.spyOn(Rqid as any, "documentsFromWorld").mockResolvedValue(worldDocs as any);
      vi.spyOn(Rqid as any, "documentsFromPacks").mockResolvedValue(packDocs as any);

      const result = await Rqid.fromRqidRegex(/i\.skill\..*/, "i", "en", {
        source: "all",
        mode: "all",
      });

      expect(result).toEqual([packDocs[0], worldDocs[0]]);
    });

    it("puts world document before pack document when priorities are equal for source=all mode=all", async () => {
      const worldDocs = [mockDoc("i.skill.low", 10)];
      const packDocs = [mockDoc("i.skill.high", 10)];

      vi.spyOn(Rqid as any, "documentsFromWorld").mockResolvedValue(worldDocs as any);
      vi.spyOn(Rqid as any, "documentsFromPacks").mockResolvedValue(packDocs as any);

      const result = await Rqid.fromRqidRegex(/i\.skill\..*/, "i", "en", {
        source: "all",
        mode: "all",
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(worldDocs[0]);
      expect(result[1]).toBe(packDocs[0]);
      expect(Rqid.getDocumentFlag(result[0])?.priority).toBe(10);
      expect(Rqid.getDocumentFlag(result[1])?.priority).toBe(10);
    });

    it("returns highest priority document per rqid for source=all mode=best (world wins when higher priority)", async () => {
      const worldDocs = [mockDoc("i.skill.jump", 5)];
      const packDocs = [mockDoc("i.skill.jump", 1), mockDoc("i.skill.swim", 3)];

      vi.spyOn(Rqid as any, "documentsFromWorld").mockResolvedValue(worldDocs as any);
      vi.spyOn(Rqid as any, "documentsFromPacks").mockResolvedValue(packDocs as any);

      const result = await Rqid.fromRqidRegex(/i\.skill\..*/, "i", "en", {
        source: "all",
        mode: "best",
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(worldDocs[0]);
      expect(Rqid.getDocumentFlag(result[1])?.id).toBe("i.skill.swim");
    });

    it("returns pack document when it has higher priority than world for source=all mode=best", async () => {
      const worldDocs = [mockDoc("i.skill.jump", 1)];
      const packDocs = [mockDoc("i.skill.jump", 5), mockDoc("i.skill.swim", 3)];

      vi.spyOn(Rqid as any, "documentsFromWorld").mockResolvedValue(worldDocs as any);
      vi.spyOn(Rqid as any, "documentsFromPacks").mockResolvedValue(packDocs as any);

      const result = await Rqid.fromRqidRegex(/i\.skill\..*/, "i", "en", {
        source: "all",
        mode: "best",
      });

      expect(result).toHaveLength(2);
      expect(Rqid.getDocumentFlag(result[0])?.priority).toBe(5);
      expect(Rqid.getDocumentFlag(result[1])?.id).toBe("i.skill.swim");
    });

    it("prefers world document when world and pack priorities are equal for source=all mode=best", async () => {
      const worldDoc = mockDoc("i.skill.jump", 5);
      const packDoc = mockDoc("i.skill.jump", 5);

      vi.spyOn(Rqid as any, "documentsFromWorld").mockResolvedValue([worldDoc] as any);
      vi.spyOn(Rqid as any, "documentsFromPacks").mockResolvedValue([packDoc] as any);

      const result = await Rqid.fromRqidRegex(/i\.skill\..*/, "i", "en", {
        source: "all",
        mode: "best",
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(worldDoc);
      expect(Rqid.getDocumentFlag(result[0])?.priority).toBe(5);
    });

    it("deduplicates within world when source=world mode=best", async () => {
      const worldDocs = [mockDoc("i.skill.jump", 1), mockDoc("i.skill.jump", 5)];

      vi.spyOn(Rqid as any, "documentsFromWorld").mockResolvedValue(worldDocs as any);
      vi.spyOn(Rqid as any, "documentsFromPacks").mockResolvedValue([] as any);

      const result = await Rqid.fromRqidRegex(/i\.skill\..*/, "i", "en", {
        source: "world",
        mode: "best",
      });

      expect(result).toHaveLength(1);
      expect(Rqid.getDocumentFlag(result[0])?.priority).toBe(5);
    });

    it("deduplicates within packs when source=packs mode=best", async () => {
      const packDocs = [mockDoc("i.skill.jump", 1), mockDoc("i.skill.jump", 5)];

      vi.spyOn(Rqid as any, "documentsFromWorld").mockResolvedValue([] as any);
      vi.spyOn(Rqid as any, "documentsFromPacks").mockResolvedValue(packDocs as any);

      const result = await Rqid.fromRqidRegex(/i\.skill\..*/, "i", "en", {
        source: "packs",
        mode: "best",
      });

      expect(result).toHaveLength(1);
      expect(Rqid.getDocumentFlag(result[0])?.priority).toBe(5);
    });
  });

  describe("fromRqidCount", () => {
    it("returns 0 for missing rqid", async () => {
      await expect(Rqid.fromRqidCount(undefined)).resolves.toBe(0);
    });

    it("counts matching world documents", async () => {
      const worldDocs = [
        mockDoc("i.skill.jump", 1, "en"),
        mockDoc("i.skill.jump", 3, "en"),
        mockDoc("i.skill.jump", 5, "sv"),
        mockDoc("i.skill.swim", 9, "en"),
      ];

      game = {
        ...originalGame,
        items: { contents: worldDocs },
      } as any;

      await expect(Rqid.fromRqidCount("i.skill.jump", "en", { source: "world" })).resolves.toBe(2);
    });

    it("counts matching pack index entries when world has no match", async () => {
      const itemPack = {
        documentClass: { documentName: "Item" },
        indexed: true,
        getIndex: vi.fn(),
        index: [
          { flags: { rqg: { documentRqidFlags: { id: "i.skill.jump", lang: "en" } } } },
          { flags: { rqg: { documentRqidFlags: { id: "i.skill.jump", lang: "en" } } } },
          { flags: { rqg: { documentRqidFlags: { id: "i.skill.jump", lang: "sv" } } } },
          { flags: { rqg: { documentRqidFlags: { id: "i.skill.swim", lang: "en" } } } },
        ],
      };

      game = {
        ...originalGame,
        items: { contents: [] },
        packs: [itemPack],
      } as any;

      await expect(Rqid.fromRqidCount("i.skill.jump", "en", { source: "all" })).resolves.toBe(2);
    });
  });

  describe("setRqid and setDefaultRqid", () => {
    it("sets rqid flag with provided values", async () => {
      const setFlag = vi.fn().mockResolvedValue(undefined);
      const doc = { setFlag } as any;

      const result = await Rqid.setRqid(doc, "i.skill.jump", "sv", 7);

      expect(setFlag).toHaveBeenCalledWith(systemId, documentRqidFlags, {
        id: "i.skill.jump",
        lang: "sv",
        priority: 7,
      });
      expect(result).toEqual({ id: "i.skill.jump", lang: "sv", priority: 7 });
    });

    it("creates and sets a default rqid for non-item documents", async () => {
      const originalItem = globalThis.Item;
      globalThis.Item = class {} as any;

      const setFlag = vi.fn().mockResolvedValue(undefined);
      const doc = {
        documentName: "Actor",
        type: "character",
        name: "Harmast Barefoot",
        setFlag,
      };

      const result = await Rqid.setDefaultRqid(doc as any, "en", 2);

      expect(setFlag).toHaveBeenCalledWith(systemId, documentRqidFlags, {
        id: "a.character.harmast-barefoot",
        lang: "en",
        priority: 2,
      });
      expect(result).toEqual({
        id: "a.character.harmast-barefoot",
        lang: "en",
        priority: 2,
      });

      globalThis.Item = originalItem;
    });

    it("returns undefined for default rqid when document has no name", async () => {
      const setFlag = vi.fn().mockResolvedValue(undefined);
      const doc = {
        documentName: "Actor",
        type: "character",
        name: "",
        setFlag,
      };

      await expect(Rqid.setDefaultRqid(doc as any, "en", 2)).resolves.toBeUndefined();
      expect(setFlag).not.toHaveBeenCalled();
    });
  });

  describe("getRqidIcon", () => {
    it("returns a configured default item icon for non-rune item rqid", () => {
      const settingsGet = vi.fn().mockReturnValue({
        skill: "icons/skill.svg",
      });
      game = {
        ...originalGame,
        settings: { get: settingsGet },
      } as any;

      expect(Rqid.getRqidIcon("i.skill.jump")).toBe('<img src="icons/skill.svg"/>');
      expect(settingsGet).toHaveBeenCalledWith(systemId, "defaultItemIconSettings");
    });

    it("returns rune image for rune rqid when available", () => {
      vi.spyOn(util, "getAvailableRunes").mockReturnValue([
        { rqid: "i.rune.fire", img: "icons/runes/fire.svg" } as any,
      ]);

      expect(Rqid.getRqidIcon("i.rune.fire")).toBe('<img src="icons/runes/fire.svg"/>');
    });

    it("returns foundry sidebar icon for non-item rqid", () => {
      (CONFIG as any).Actor = { sidebarIcon: "fas fa-user" };

      expect(Rqid.getRqidIcon("a.character.harmast")).toBe('<i class="fas fa-user"></i>');
    });

    it("returns undefined for unknown rqid prefix", () => {
      expect(Rqid.getRqidIcon("x.unknown.id")).toBeUndefined();
    });
  });
});
