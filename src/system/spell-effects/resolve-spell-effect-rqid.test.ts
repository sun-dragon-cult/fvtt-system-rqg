import { describe, expect, it } from "vitest";
import { resolveSpellEffectRqid } from "./resolve-spell-effect-rqid";

const spell = (rqid: string | undefined, effectRqid = "") => ({
  system: { effectRqidLink: { rqid: effectRqid } },
  flags: { rqg: { documentRqidFlags: { id: rqid } } },
});

describe("resolveSpellEffectRqid", () => {
  it("names the effect after the spell by default", () => {
    expect(resolveSpellEffectRqid(spell("i.spirit-magic.bladesharp"))).toBe("ae..bladesharp");
  });

  it("prefers an explicit link", () => {
    expect(resolveSpellEffectRqid(spell("i.spirit-magic.bladesharp", "ae..sharp-blade"))).toBe(
      "ae..sharp-blade",
    );
  });

  it("has no effect for a spell without an rqid", () => {
    expect(resolveSpellEffectRqid(spell(undefined))).toBeUndefined();
  });
});
