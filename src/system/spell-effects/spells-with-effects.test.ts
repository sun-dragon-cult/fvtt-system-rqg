import { describe, expect, it } from "vitest";
import { pickSpellsWithEffects, type SpellIndexEntry } from "./spells-with-effects";

const spell = (
  name: string,
  rqid: string,
  extra: { lang?: string; priority?: number; effectRqid?: string; type?: string } = {},
): SpellIndexEntry => ({
  type: extra.type ?? "spiritMagic",
  name,
  system: { effectRqidLink: { rqid: extra.effectRqid ?? `ae..${rqid.split(".").pop()}` } },
  flags: {
    rqg: {
      documentRqidFlags: { id: rqid, lang: extra.lang ?? "en", priority: extra.priority ?? 0 },
    },
  },
});

describe("pickSpellsWithEffects", () => {
  it("keeps only spells with an effect link, sorted by name", () => {
    const picked = pickSpellsWithEffects(
      [
        spell("Sleep", "i.spirit-magic.sleep"),
        spell("Heal", "i.spirit-magic.heal", { effectRqid: "" }),
        spell("Soul Sight", "i.rune-magic.soul-sight", { type: "runeMagic" }),
        spell("Broadsword", "i.weapon.broadsword", { type: "weapon" }),
        spell("Bladesharp", "i.spirit-magic.bladesharp"),
      ],
      "en",
      "en",
    );
    expect(picked.map((entry) => entry.name)).toEqual(["Bladesharp", "Sleep", "Soul Sight"]);
  });

  it("keeps spells without an effect link whose behaviour applies itself", () => {
    const picked = pickSpellsWithEffects(
      [
        spell("Summon Earth Elemental", "i.rune-magic.summon-earth-elemental", { effectRqid: "" }),
        spell("Heal", "i.spirit-magic.heal", { effectRqid: "" }),
      ],
      "en",
      "en",
      (spellRqid) => spellRqid === "i.rune-magic.summon-earth-elemental",
    );
    expect(picked.map((s) => s.name)).toEqual(["Summon Earth Elemental"]);
  });

  it("takes the highest priority copy of each spell", () => {
    const picked = pickSpellsWithEffects(
      [
        spell("Sleep", "i.spirit-magic.sleep", { priority: 0 }),
        spell("Sleep (RBM)", "i.spirit-magic.sleep", { priority: 10 }),
      ],
      "en",
      "en",
    );
    expect(picked.map((entry) => entry.name)).toEqual(["Sleep (RBM)"]);
  });

  it("prefers the world's language and falls back per spell", () => {
    const picked = pickSpellsWithEffects(
      [
        spell("Sleep", "i.spirit-magic.sleep", { priority: 10 }),
        spell("Sömn", "i.spirit-magic.sleep", { lang: "sv" }),
        spell("Farsee", "i.spirit-magic.farsee"),
        spell("Befuddle", "i.spirit-magic.befuddle", { lang: "es" }),
      ],
      "sv",
      "en",
    );
    expect(picked.map((entry) => entry.name)).toEqual(["Farsee", "Sömn"]);
  });
});
