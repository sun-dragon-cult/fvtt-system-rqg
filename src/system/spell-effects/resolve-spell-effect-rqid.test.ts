import { describe, expect, it } from "vitest";
import { resolveSpellEffectRqid } from "./resolve-spell-effect-rqid";

const spell = (effectRqid: string) => ({ system: { effectRqidLink: { rqid: effectRqid } } });

describe("resolveSpellEffectRqid", () => {
  it("uses the spell's effect link", () => {
    expect(resolveSpellEffectRqid(spell("ae..bladesharp"))).toBe("ae..bladesharp");
  });

  it("has no effect without a link, whatever the spell is called", () => {
    expect(resolveSpellEffectRqid(spell(""))).toBeUndefined();
  });
});
