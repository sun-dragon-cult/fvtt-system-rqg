import { afterEach, describe, expect, it, vi } from "vitest";
import { castSpellOf } from "./spell-cast-runner";
import { Rqid } from "../api/rqid-api";

describe("castSpellOf", () => {
  const items: Record<string, unknown> = { "Actor.c.Item.s": { name: "Demoralize (own)" } };
  const compendiumCopy = { name: "Demoralize" };

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function stub() {
    vi.stubGlobal(
      "fromUuid",
      vi.fn(async (uuid: string) => items[uuid] ?? null),
    );
    return vi.spyOn(Rqid, "fromRqid").mockResolvedValue(compendiumCopy as any);
  }

  it("finds the cast spell's own item", async () => {
    const fromRqid = stub();
    const spell = await castSpellOf({ spellUuid: "Actor.c.Item.s", spellRqid: "i.spirit-magic.x" });
    expect(spell).toBe(items["Actor.c.Item.s"]);
    expect(fromRqid).not.toHaveBeenCalled();
  });

  it("finds the spell by its rqid once its item is gone, and looks it up only once", async () => {
    const fromRqid = stub();
    const names = {
      spellUuid: "Scene.s.Token.gone.Actor.a.Item.s",
      spellRqid: "i.spirit-magic.demoralize",
    };
    expect(await castSpellOf(names)).toBe(compendiumCopy);
    expect(await castSpellOf(names)).toBe(compendiumCopy);
    expect(fromRqid).toHaveBeenCalledOnce();
  });

  it("finds nothing for a hidden cast's request, or a gone spell without an rqid", async () => {
    const fromRqid = stub();
    expect(await castSpellOf({ spellUuid: "", spellRqid: "" })).toBeUndefined();
    expect(await castSpellOf({ spellUuid: "Actor.gone.Item.s", spellRqid: "" })).toBeUndefined();
    expect(fromRqid).not.toHaveBeenCalled();
  });
});
