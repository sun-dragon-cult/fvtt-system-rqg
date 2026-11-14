import { afterEach, describe, expect, it, vi } from "vitest";
import { allowedSpellCastData, castSpellOf } from "./spell-cast-runner";
import { Rqid } from "../api/rqid-api";
import type { SpellCastInput } from "../../data-model/shared/spell-cast-step";

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

  it("finds the spell by its rqid once its item is gone", async () => {
    const fromRqid = stub();
    const names = {
      spellUuid: "Scene.s.Token.gone.Actor.a.Item.s",
      spellRqid: "i.spirit-magic.demoralize",
    };
    expect(await castSpellOf(names)).toBe(compendiumCopy);
    expect(fromRqid).toHaveBeenCalledWith("i.spirit-magic.demoralize", undefined, true);
  });

  it("finds nothing for a hidden cast's request, or a gone spell without an rqid", async () => {
    const fromRqid = stub();
    expect(await castSpellOf({ spellUuid: "", spellRqid: "" })).toBeUndefined();
    expect(await castSpellOf({ spellUuid: "Actor.gone.Item.s", spellRqid: "" })).toBeUndefined();
    expect(fromRqid).not.toHaveBeenCalled();
  });
});

describe("allowedSpellCastData", () => {
  const record = {
    targets: [
      { id: "mine", requestMessageId: "request-mine" },
      { id: "theirs", requestMessageId: "request-theirs" },
    ] as any[],
  };
  const player = { isGM: false, ownsTarget: (entry: { id: string }) => entry.id === "mine" };
  const gm = { isGM: true, ownsTarget: () => false };
  const ruling: SpellCastInput = { kind: "ruling", entryId: "mine", state: "affected" };
  const assign: SpellCastInput = { kind: "assign", entryId: "mine", targets: [] };
  const resist = (entryId: string): SpellCastInput => ({
    kind: "resistance",
    entryId,
    result: "held",
  });
  const applied = (entryId: string): SpellCastInput => ({
    kind: "applied",
    entryId,
    effectUuids: [],
    blockedReason: "",
    applyId: "click",
  });
  const patch = (messageId: string) => ({ messageId, system: { state: "Resisted" } });

  it("takes rulings and assignments from a GM only", () => {
    const data = { messageId: "record", inputs: [ruling, assign] };
    expect(allowedSpellCastData(data, record, player).inputs).toEqual([]);
    expect(allowedSpellCastData(data, record, gm).inputs).toEqual([ruling, assign]);
  });

  it("takes answers and Apply results for the targets the sender owns", () => {
    const data = {
      messageId: "record",
      inputs: [resist("mine"), resist("theirs"), applied("mine"), applied("theirs")],
    };
    expect(allowedSpellCastData(data, record, player).inputs).toEqual([
      resist("mine"),
      applied("mine"),
    ]);
    expect(allowedSpellCastData(data, record, gm).inputs).toEqual(data.inputs);
  });

  it("drops inputs for entries the record doesn't have, or of an unknown kind", () => {
    const data = {
      messageId: "record",
      inputs: [resist("gone"), { kind: "unknown", entryId: "mine" } as any],
    };
    expect(allowedSpellCastData(data, record, gm).inputs).toEqual([]);
  });

  it("keeps the card patch only for the card of an entry the sender answers", () => {
    const answer = { messageId: "record", inputs: [resist("mine")] };
    expect(
      allowedSpellCastData({ ...answer, requestPatch: patch("request-mine") }, record, player)
        .requestPatch,
    ).toEqual(patch("request-mine"));
    expect(
      allowedSpellCastData({ ...answer, requestPatch: patch("request-theirs") }, record, player)
        .requestPatch,
    ).toBeUndefined();
    expect(
      allowedSpellCastData(
        { messageId: "record", inputs: [], requestPatch: patch("request-mine") },
        record,
        gm,
      ).requestPatch,
    ).toBeUndefined();
  });

  it("lets anyone ask the GM to move a cast on without input", () => {
    expect(allowedSpellCastData({ messageId: "record", inputs: [] }, record, player)).toEqual({
      messageId: "record",
      inputs: [],
      requestPatch: undefined,
    });
  });
});
