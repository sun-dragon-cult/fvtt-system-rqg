import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { resyncSpellFieldsFromCompendium } from "./resync-spell-fields-from-compendium";
import { Rqid } from "../../api/rqid-api";
import type { RqgItem } from "@items/rqg-item.ts";

const spell = (
  rqid: string | undefined,
  system: Record<string, unknown>,
  uuid = "Actor.a.Item.copy",
  type = "spiritMagic",
  lang = "en",
) =>
  ({
    uuid,
    type,
    system: {
      effectRqidLink: { rqid: "", name: "" },
      targetKind: "none",
      effectTier: "none",
      resistedBy: "none",
      ...system,
    },
    flags: rqid ? { rqg: { documentRqidFlags: { id: rqid, lang } } } : {},
  }) as unknown as RqgItem;

const compendium = (rqid: string, system: Record<string, unknown>, lang = "en") =>
  spell(
    rqid,
    system,
    `Compendium.wiki-${lang}-rqg.spirit-magic-spells.Item.x`,
    "spiritMagic",
    lang,
  );

function packsContain(...docs: RqgItem[]) {
  return vi
    .spyOn(Rqid, "fromRqidRegex")
    .mockImplementation(
      async (regex, _kind, lang) =>
        docs.filter(
          (d) =>
            regex!.test((d.flags as any).rqg.documentRqidFlags.id) &&
            (d.flags as any).rqg.documentRqidFlags.lang === lang,
        ) as any,
    );
}

describe("resyncSpellFieldsFromCompendium", () => {
  beforeAll(() => {
    (CONFIG as any).RQG = { ...(CONFIG as any).RQG, fallbackLanguage: "en" };
  });
  afterEach(() => vi.restoreAllMocks());

  it("fills an unset link, target kind, effect tier and resistedBy from the compendium spell", async () => {
    const lookup = packsContain(
      compendium("i.spirit-magic.fill-all", {
        effectRqidLink: { rqid: "ae..fill-all", name: "Fill All" },
        targetKind: "weapon",
        effectTier: "declarative",
        resistedBy: "resistanceRoll",
      }),
    );

    expect(await resyncSpellFieldsFromCompendium(spell("i.spirit-magic.fill-all", {}))).toEqual({
      system: {
        effectRqidLink: { rqid: "ae..fill-all", name: "Fill All" },
        targetKind: "weapon",
        effectTier: "declarative",
        resistedBy: "resistanceRoll",
      },
    });
    expect(lookup).toHaveBeenCalledWith(expect.any(RegExp), "i", "en", {
      source: "packs",
      mode: "best",
    });
  });

  it("never overwrites what the copy already has", async () => {
    packsContain(
      compendium("i.spirit-magic.keep", {
        effectRqidLink: { rqid: "ae..keep", name: "Keep" },
        targetKind: "weapon",
        effectTier: "declarative",
        resistedBy: "resistanceRoll",
      }),
    );
    const copy = spell("i.spirit-magic.keep", {
      effectRqidLink: { rqid: "ae..homebrew", name: "Homebrew" },
      targetKind: "creature",
      resistedBy: "resistanceRollArea",
    });

    expect(await resyncSpellFieldsFromCompendium(copy)).toEqual({
      system: { effectTier: "declarative" },
    });
  });

  it("falls back to the English pack for fields its own language's pack lacks", async () => {
    packsContain(
      compendium("i.spirit-magic.swedish", { targetKind: "weapon" }, "sv"),
      compendium("i.spirit-magic.swedish", {
        effectRqidLink: { rqid: "ae..swedish", name: "Swedish" },
        targetKind: "creature",
        effectTier: "declarative",
      }),
    );
    const copy = spell("i.spirit-magic.swedish", {}, "Actor.a.Item.copy", "spiritMagic", "sv");

    expect(await resyncSpellFieldsFromCompendium(copy)).toEqual({
      system: {
        effectRqidLink: { rqid: "ae..swedish", name: "Swedish" },
        targetKind: "weapon",
        effectTier: "declarative",
      },
    });
  });

  it("copies nothing the compendium spell doesn't have either", async () => {
    packsContain(compendium("i.spirit-magic.unclassified", {}));

    expect(await resyncSpellFieldsFromCompendium(spell("i.spirit-magic.unclassified", {}))).toEqual(
      {},
    );
  });

  it("leaves spells without an rqid, other items, and the compendium spell itself alone", async () => {
    const source = compendium("i.spirit-magic.self", { targetKind: "weapon" });
    const lookup = packsContain(source);

    expect(await resyncSpellFieldsFromCompendium(spell(undefined, {}))).toEqual({});
    expect(
      await resyncSpellFieldsFromCompendium(spell("i.skill.jump", {}, "Actor.a.Item.s", "skill")),
    ).toEqual({});
    expect(await resyncSpellFieldsFromCompendium(source)).toEqual({});
    expect(lookup).toHaveBeenCalledTimes(1);
  });
});
