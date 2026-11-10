import { afterEach, describe, expect, it, vi } from "vitest";
import { Rqid } from "./rqid-api";
import { RqgError } from "../util";
import { systemId } from "../config";
import { documentRqidFlags } from "../../data-model/shared/rqg-document-flags";
import * as util from "../util";
import { RqgItem } from "../../items/rqg-item";

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
      // documentFromPacks is called for "sv" (returns undefined - no sv docs)
      // and then for "en" when the pack priority beats the world priority
      const packSpy = vi
        .spyOn(Rqid as any, "documentFromPacks")
        .mockResolvedValueOnce(undefined) // "sv" - no docs in packs
        .mockResolvedValueOnce(foundDoc as any); // "en" - found
      vi.spyOn(Rqid as any, "getMaxPackDocumentPriority")
        .mockResolvedValueOnce(-Infinity) // no "sv" docs in pack index
        .mockResolvedValueOnce(5); // "en" docs exist in packs with priority 5

      const result = await Rqid.fromRqid("i.skill.jump", "sv");

      expect(worldSpy).toHaveBeenNthCalledWith(1, "i.skill.jump", "sv");
      expect(worldSpy).toHaveBeenNthCalledWith(2, "i.skill.jump", "en");
      expect(packSpy).toHaveBeenCalledTimes(2);
      expect(packSpy).toHaveBeenNthCalledWith(1, "i.skill.jump", "sv");
      expect(packSpy).toHaveBeenNthCalledWith(2, "i.skill.jump", "en");
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

    it("finds ActiveEffects in packs only, since they have no world collection", async () => {
      const effectPack = {
        documentClass: { documentName: "ActiveEffect" },
        indexed: true,
        getIndex: vi.fn(),
        index: [{ flags: { rqg: { documentRqidFlags: { id: "ae..bladesharp", lang: "en" } } } }],
      };

      game = { ...originalGame, packs: [effectPack] } as any;

      await expect(Rqid.fromRqidCount("ae..bladesharp", "en", { source: "all" })).resolves.toBe(1);
    });
  });

  describe("embedded rqids", () => {
    it("resolves an item's embedded Active Effect, highest priority first", () => {
      const low = mockDoc("ae..bladesharp", 0);
      const high = mockDoc("ae..bladesharp", 5);
      const item = {
        effects: [mockDoc("ae..other", 9), low, high],
        getBestEmbeddedDocumentByRqid: RqgItem.prototype.getBestEmbeddedDocumentByRqid,
        getEmbeddedDocumentsByRqid: RqgItem.prototype.getEmbeddedDocumentsByRqid,
      };

      expect((Rqid as any).getEmbeddedOrProvidedDocument(item, "ae..bladesharp")).toBe(high);
      expect((Rqid as any).getEmbeddedOrProvidedDocument(item, "")).toBe(item);
    });
  });

  describe("getDefaultRqid", () => {
    afterEach(() => {
      globalThis.Item = originalItem;
    });

    const originalItem = globalThis.Item;

    it("leaves the default subtype out, so an Active Effect gets ae..<slug>", () => {
      globalThis.Item = class {} as any;
      const effect = { documentName: "ActiveEffect", type: "base", name: "Bladesharp" };

      expect(Rqid.getDefaultRqid(effect as any)).toBe("ae..bladesharp");
    });

    it("derives a cult identifier from the full item name, keeping subcults of the same deity distinct", () => {
      // Subcults (e.g. Orlanth Adventurous, Orlanth Thunderous) share a deity but must not share
      // an rqid - Allied Spirit rune point sharing (rune-point-source.ts) matches cults by their
      // exact rqid, and subcults are deliberately NOT interchangeable for that purpose even though
      // they share a deity (see cult-lifecycle.ts, which only merges same-deity cults on one actor).
      globalThis.Item = class {} as any;
      const doc = {
        documentName: "Item",
        type: "cult",
        name: "Orlanth Adventurous (Orlanth)",
        system: { deity: "Orlanth" },
      };
      Object.setPrototypeOf(doc, globalThis.Item.prototype);

      expect(Rqid.getDefaultRqid(doc as any)).toBe("i.cult.orlanth-adventurous-orlanth");
    });

    it("derives the same cult identifier as the base deity when there is no subcult", () => {
      globalThis.Item = class {} as any;
      const doc = {
        documentName: "Item",
        type: "cult",
        name: "Ernalda",
        system: { deity: "Ernalda" },
      };
      Object.setPrototypeOf(doc, globalThis.Item.prototype);

      expect(Rqid.getDefaultRqid(doc as any)).toBe("i.cult.ernalda");
    });

    it("derives a skill identifier from skillName and specialization", () => {
      globalThis.Item = class {} as any;
      const doc = {
        documentName: "Item",
        type: "skill",
        name: "Sword (Broadsword)",
        system: { skillName: "Sword", specialization: "Broadsword" },
      };
      Object.setPrototypeOf(doc, globalThis.Item.prototype);

      expect(Rqid.getDefaultRqid(doc as any)).toBe("i.skill.sword-broadsword");
    });

    it("uses the plain document name for non-special-cased item types", () => {
      globalThis.Item = class {} as any;
      const doc = {
        documentName: "Item",
        type: "gear",
        name: "Sturdy Rope",
        system: {},
      };
      Object.setPrototypeOf(doc, globalThis.Item.prototype);

      expect(Rqid.getDefaultRqid(doc as any)).toBe("i.gear.sturdy-rope");
    });
  });

  describe("getDefaultRqidSlug", () => {
    it("derives a cult slug from the full name regardless of system data", () => {
      expect(
        Rqid.getDefaultRqidSlug("Orlanth Adventurous (Orlanth)", "cult", {
          deity: "Orlanth",
        }),
      ).toBe("orlanth-adventurous-orlanth");
    });

    it("falls back to the name when no system data is available (e.g. batch editor without a matched document)", () => {
      expect(Rqid.getDefaultRqidSlug("Ernalda", "cult", undefined)).toBe("ernalda");
    });

    it("derives an armor slug from namePrefix and the English armorType and material", () => {
      const i18n = game.i18n as unknown as { _fallback: object };
      const fallback = i18n._fallback;
      i18n._fallback = {
        RQG: { Item: { Armor: { ArmorType: { PantsTrews: "Pants" } } } },
      };
      try {
        expect(
          Rqid.getDefaultRqidSlug("Fine Bronze Pants", "armor", {
            namePrefix: "Fine",
            armorType: "PantsTrews",
            material: "Bronze",
          }),
        ).toBe("fine-pants-bronze");
      } finally {
        i18n._fallback = fallback;
      }
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
  describe("nameFromRqid", () => {
    function worldDoc(rqid: string, name: string, priority: number, lang = "en", pages?: any[]) {
      return {
        name,
        getFlag: vi.fn().mockReturnValue({ id: rqid, priority, lang }),
        ...(pages && {
          getBestEmbeddedDocumentByRqid: (embedded: string) =>
            pages.find((p: any) => p.getFlag().id === embedded),
        }),
      };
    }
    function pack(documentName: string, entries: [string, string, number, string?][]) {
      return {
        documentClass: { documentName },
        indexed: true,
        getIndex: vi.fn(),
        index: entries.map(([id, name, priority, lang]) => ({
          _id: name,
          name,
          flags: { rqg: { documentRqidFlags: { id, priority, lang: lang ?? "en" } } },
        })),
      };
    }
    function setGame(
      items: unknown[],
      packs: unknown[],
      worldLanguage?: string,
      journal: unknown[] = [],
    ) {
      game = {
        ...originalGame,
        settings: { get: () => worldLanguage },
        items: { contents: items },
        journal: { contents: journal },
        packs,
      } as any;
      (Rqid as any).nameCandidatesByDocumentName.clear();
    }

    it("uses the highest priority pack entry", () => {
      setGame(
        [],
        [
          pack("Item", [
            ["i.skill.jump", "Low", 1],
            ["i.skill.jump", "High", 5],
          ]),
        ],
      );
      expect(Rqid.nameFromRqid("i.skill.jump")).toBe("High");
    });

    it("prefers a world document over packs at the same priority, as fromRqid does", () => {
      setGame(
        [worldDoc("i.skill.jump", "World", 5)],
        [pack("Item", [["i.skill.jump", "Pack", 5]])],
      );
      expect(Rqid.nameFromRqid("i.skill.jump")).toBe("World");
    });

    it("prefers a pack entry with a higher priority than the world document", () => {
      setGame(
        [worldDoc("i.skill.jump", "World", 1)],
        [pack("Item", [["i.skill.jump", "Pack", 5]])],
      );
      expect(Rqid.nameFromRqid("i.skill.jump")).toBe("Pack");
    });

    it("uses the world language, falling back to English", () => {
      setGame(
        [],
        [
          pack("Item", [
            ["i.skill.jump", "Hoppa", 1, "sv"],
            ["i.skill.jump", "Jump", 9],
            ["i.skill.swim", "Swim", 1],
          ]),
        ],
        "sv",
      );
      expect(Rqid.nameFromRqid("i.skill.jump")).toBe("Hoppa");
      expect(Rqid.nameFromRqid("i.skill.swim")).toBe("Swim");
    });

    it("finds ActiveEffects in packs", () => {
      setGame([], [pack("ActiveEffect", [["ae..bladesharp", "Bladesharp", 1]])]);
      expect(Rqid.nameFromRqid("ae..bladesharp")).toBe("Bladesharp");
    });

    it("returns undefined when nothing matches", () => {
      setGame([], [pack("Item", [["i.skill.jump", "Jump", 1]])]);
      expect(Rqid.nameFromRqid("i.skill.missing")).toBeUndefined();
      expect(Rqid.nameFromRqid(undefined)).toBeUndefined();
    });

    it("names a page of a world journal, but not one in a pack", () => {
      const page = worldDoc("jp..rule", "The Rule", 0);
      setGame([], [pack("JournalEntry", [["je..pack-rules", "Pack Rules", 1]])], undefined, [
        worldDoc("je..rules", "Rules", 1, "en", [page]),
      ]);
      expect(Rqid.nameFromRqid("je..rules.jp..rule")).toBe("The Rule");
      expect(Rqid.nameFromRqid("je..pack-rules.jp..rule")).toBeUndefined();
    });

    it("shows the slug, marked missing, only when the link can't be resolved", () => {
      const page = worldDoc("jp..rule", "The Rule", 0);
      setGame(
        [worldDoc("i.skill.jump", "Jump", 1)],
        [pack("JournalEntry", [["je..pack-rules", "Pack Rules", 1]])],
        undefined,
        [worldDoc("je..rules", "Rules", 1, "en", [page])],
      );
      expect(Rqid.displayFromRqid("i.skill.jump")).toEqual({ name: "Jump", missing: false });
      expect(Rqid.displayFromRqid("i.skill.gone")).toEqual({ name: "gone", missing: true });
      expect(Rqid.displayFromRqid("je..rules.jp..rule")).toEqual({
        name: "The Rule",
        missing: false,
      });
      // A pack journal's pages can't be named, a world journal's can
      expect(Rqid.displayFromRqid("je..pack-rules.jp..rule")).toEqual({
        name: "rule",
        missing: false,
        pending: true,
      });
      expect(Rqid.displayFromRqid("je..rules.jp..gone")).toEqual({ name: "gone", missing: true });
      expect(Rqid.displayFromRqid("je..gone.jp..rule")).toEqual({ name: "rule", missing: true });
      expect(Rqid.displayFromRqid("")).toEqual({ name: "", missing: false });
    });

    it("loads a pack journal page's name, keeping it while it loads again", async () => {
      setGame([], [pack("JournalEntry", [["je..pack-rules", "Pack Rules", 1]])]);
      (Rqid as any).forgetNames();
      (Rqid as any).previousLoadedNames.clear();
      const fromRqid = vi
        .spyOn(Rqid, "fromRqid")
        .mockResolvedValue({ name: "The Pack Rule" } as any);
      const listener = vi.fn();
      const controller = new AbortController();
      Rqid.onNamesChanged(listener, controller.signal);
      const rqid = "je..pack-rules.jp..rule";

      expect(Rqid.displayFromRqid(rqid)).toEqual({ name: "rule", missing: false, pending: true });
      Rqid.displayFromRqid(rqid);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(fromRqid).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalled();
      expect(Rqid.displayFromRqid(rqid)).toEqual({ name: "The Pack Rule", missing: false });

      (Rqid as any).forgetNames("JournalEntry");
      expect(Rqid.displayFromRqid(rqid)).toEqual({
        name: "The Pack Rule",
        missing: false,
        pending: true,
      });

      fromRqid.mockRejectedValue(new Error("pack unavailable"));
      (Rqid as any).forgetNames("JournalEntry");
      Rqid.displayFromRqid(rqid);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(Rqid.displayFromRqid(rqid)).toEqual({ name: "rule", missing: true });
      controller.abort();
    });

    it("names a link nothing else resolves from the owning actor's items", () => {
      setGame([worldDoc("i.skill.jump", "Jump", 1)], []);
      const tailLash = { name: "Tail Lash" };
      const actor = {
        getBestEmbeddedDocumentByRqid: (rqid: string) =>
          rqid === "i.skill.tail-lash" ? tailLash : undefined,
      } as any;
      expect(Rqid.displayFromRqid("i.skill.tail-lash", actor)).toEqual({
        name: "Tail Lash",
        missing: false,
        actorItem: tailLash,
      });
      expect(Rqid.displayFromRqid("i.skill.jump", actor)).toEqual({ name: "Jump", missing: false });
      expect(Rqid.displayFromRqid("i.skill.gone", actor)).toEqual({ name: "gone", missing: true });
    });

    it("indexes an unindexed pack once and survives a failing one", async () => {
      let resolveIndex!: () => void;
      const slow = {
        ...pack("Item", [["i.skill.jump", "Jump", 1]]),
        collection: "slow",
        indexed: false,
        getIndex: vi.fn(() => new Promise<void>((r) => (resolveIndex = r))),
      };
      const broken = {
        ...pack("Item", []),
        collection: "broken",
        indexed: false,
        getIndex: vi.fn().mockRejectedValue(new Error("boom")),
      };
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      setGame([], [slow, broken]);

      expect(Rqid.nameFromRqid("i.skill.jump")).toBeUndefined();
      (Rqid as any).nameCandidatesByDocumentName.clear();
      expect(Rqid.nameFromRqid("i.skill.jump")).toBeUndefined();
      expect(slow.getIndex).toHaveBeenCalledTimes(1);

      const ready = Rqid.indexPacksForNames();
      slow.indexed = true;
      resolveIndex();
      await expect(ready).resolves.toBeUndefined();
      expect(slow.getIndex).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalled();
      expect(Rqid.nameFromRqid("i.skill.jump")).toBe("Jump");
      warn.mockRestore();
    });

    it("tells listeners once when names may have changed", async () => {
      setGame([], []);
      const listener = vi.fn();
      const controller = new AbortController();
      Rqid.onNamesChanged(listener, controller.signal);
      (Rqid as any).forgetNames("Item");
      (Rqid as any).forgetNames();
      await Promise.resolve();
      expect(listener).toHaveBeenCalledTimes(1);
      controller.abort();
      (Rqid as any).forgetNames();
      await Promise.resolve();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("reads the candidates again after the cache is cleared", () => {
      const items = [worldDoc("i.skill.jump", "Old", 1)];
      setGame(items, []);
      expect(Rqid.nameFromRqid("i.skill.jump")).toBe("Old");
      items[0] = worldDoc("i.skill.jump", "New", 1);
      expect(Rqid.nameFromRqid("i.skill.jump")).toBe("Old");
      (Rqid as any).nameCandidatesByDocumentName.clear();
      expect(Rqid.nameFromRqid("i.skill.jump")).toBe("New");
    });
  });
});
