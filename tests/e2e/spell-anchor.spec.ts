import { expect, test, type Page } from "@playwright/test";

import { loginToConfiguredWorld } from "./utils/foundrySession";

const names = { scene: "E2E spell anchor", actor: "E2E anchor caster" };

async function removeTestDocuments(page: Page): Promise<void> {
  await page.evaluate(async (names) => {
    const g = game as any;
    await g.scenes.getName(names.scene)?.delete();
    await g.actors.getName(names.actor)?.delete();
  }, names);
}

/**
 * Make a spell area around an unlinked NPC token with `createArea`, as Apply does, and return where
 * its Region and the effect keeping it alive are.
 */
async function createAreaFromToken(page: Page) {
  return page.evaluate(async (names) => {
    const g = game as any;
    const scene =
      g.scenes.getName(names.scene) ??
      (await (Scene as any).create({ name: names.scene, width: 2000, height: 2000 }));
    const actor =
      g.actors.getName(names.actor) ??
      (await (Actor as any).create({ name: names.actor, type: "character" }));
    const [token] = await scene.createEmbeddedDocuments("Token", [
      { name: actor.name, actorId: actor.id, actorLink: false, x: 500, y: 500 },
    ]);
    const tokenActor = token.actor;
    const [spell] = await tokenActor.createEmbeddedDocuments("Item", [
      { name: "E2E Anchored Area", type: "spiritMagic" },
    ]);
    const applied = await g.system.api.spellEffects.createArea(
      {
        spell: spell,
        targetActor: tokenActor,
        targetName: token.name,
        cast: {
          spellRqid: "",
          caster: { actorUuid: tokenActor.uuid, tokenUuid: token.uuid },
          castMessageId: "",
          level: 1,
          magicPointsSpent: 1,
          runePointsSpent: 0,
          casterSuccessLevel: undefined,
        },
        duration: undefined,
      },
      {
        shape: { kind: "circle", radius: 3 },
        placement: "caster",
        duration: { value: 10, units: "minutes" },
      },
    );
    const effectUuid = applied?.effectUuids?.[0] ?? "";
    const effect = fromUuidSync(effectUuid) as any;
    const regionUuid = effect?.getFlag("rqg", "holds")?.[0]?.uuid ?? "";
    const region = fromUuidSync(regionUuid) as any;
    return {
      sceneId: scene.id as string,
      tokenUuid: token.uuid as string,
      effectUuid,
      regionUuid,
      regionHeldBy: (region?.getFlag("rqg", "heldBy") as string) ?? "",
    };
  }, names);
}

const exists = (page: Page, uuid: string) => page.evaluate((uuid) => !!fromUuidSync(uuid), uuid);

// #1325: a spell area's Region and the effect that keeps it alive go together.
test("spell areas end with their anchor", async ({ page, baseURL }) => {
  test.slow();
  await loginToConfiguredWorld(page, baseURL);
  await removeTestDocuments(page);

  try {
    // The effect records the Region it holds, and the Region names its effect
    const first = await createAreaFromToken(page);
    expect(first.regionUuid).toMatch(/\.Region\./);
    expect(first.regionHeldBy).toBe(first.effectUuid);

    // A pasted copy of the Region isn't held: deleting it leaves the spell alone
    const copy = await page.evaluate(async (uuid) => {
      const region = fromUuidSync(uuid) as any;
      const [created] = await region.parent.createEmbeddedDocuments("Region", [region.toObject()]);
      return { uuid: created.uuid as string, heldBy: created.getFlag("rqg", "heldBy") ?? "" };
    }, first.regionUuid);
    expect(copy.heldBy).toBe("");
    await page.evaluate((uuid) => (fromUuidSync(uuid) as any).delete(), copy.uuid);
    await page.waitForTimeout(500);
    expect(await exists(page, first.effectUuid)).toBe(true);

    // Deleting the caster's token takes the effect with it, and so the area
    await page.evaluate((uuid) => (fromUuidSync(uuid) as any).delete(), first.tokenUuid);
    await expect.poll(() => exists(page, first.regionUuid)).toBe(false);

    // Deleting the Region ends the effect that held it
    const second = await createAreaFromToken(page);
    await page.evaluate((uuid) => (fromUuidSync(uuid) as any).delete(), second.regionUuid);
    await expect.poll(() => exists(page, second.effectUuid)).toBe(false);

    // A Region whose effect went while the GM's cleanup couldn't run is removed on the GM's next
    // ready: here its effect is made to look gone by pointing the Region elsewhere
    const third = await createAreaFromToken(page);
    await page.evaluate(
      (uuid) =>
        (fromUuidSync(uuid) as any).setFlag(
          "rqg",
          "heldBy",
          "Actor.e2eGoneCaster00.ActiveEffect.e2eGoneEffect000",
        ),
      third.regionUuid,
    );
    await page.reload();
    await page.waitForFunction(() => (game as any).ready, undefined, { timeout: 120_000 });
    // The world is still loading its caches meanwhile, so this can take a while
    await expect.poll(() => exists(page, third.regionUuid), { timeout: 60_000 }).toBe(false);
    // The effect left without its Region ends too
    await expect.poll(() => exists(page, third.effectUuid), { timeout: 60_000 }).toBe(false);
  } finally {
    await removeTestDocuments(page);
  }
});
