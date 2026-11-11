import { afterEach, describe, expect, it, vi } from "vitest";
import { RqgActor } from "./rqg-actor";

const openAddSpellEffectDialog = vi.fn();
vi.mock("../foundry-ui/add-spell-effect-dialog", () => ({ openAddSpellEffectDialog }));

describe("RqgActor.addSpellEffect", () => {
  const addSpellEffect = (actor: object, options?: { token?: TokenDocument | null }) =>
    RqgActor.prototype.addSpellEffect.call(actor as RqgActor, options);

  afterEach(() => {
    openAddSpellEffectDialog.mockReset();
  });

  it("targets the given token and returns whether the effects changed", async () => {
    openAddSpellEffectDialog.mockResolvedValue(true);
    const actor = { name: "Vasana", token: null };
    const token = { name: "Vasana (mounted)" } as TokenDocument;

    await expect(addSpellEffect(actor, { token })).resolves.toBe(true);
    expect(openAddSpellEffectDialog).toHaveBeenCalledWith(actor, "Vasana (mounted)", token);
  });

  it("defaults to the actor's own token, then to no token", async () => {
    openAddSpellEffectDialog.mockResolvedValue(false);
    const token = { name: "Broo 2" } as TokenDocument;

    await expect(addSpellEffect({ name: "Broo", token })).resolves.toBe(false);
    expect(openAddSpellEffectDialog).toHaveBeenLastCalledWith(expect.anything(), "Broo 2", token);

    await addSpellEffect({ name: "Vasana", token: null });
    expect(openAddSpellEffectDialog).toHaveBeenLastCalledWith(
      expect.anything(),
      "Vasana",
      undefined,
    );
  });
});
