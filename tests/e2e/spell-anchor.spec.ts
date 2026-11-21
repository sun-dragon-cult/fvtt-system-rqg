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
    await expect.poll(() => exists(page, copy.uuid)).toBe(false);
    // The deleteRegion hook has asked for any effect deletion by now, and the server answers in
    // order, so once this later update is back, a deletion it asked for would be done too
    await page.evaluate(
      (uuid) => (fromUuidSync(uuid) as any).parent.update({ "flags.rqg.e2eBarrier": Date.now() }),
      first.regionUuid,
    );
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

/**
 * Summon an elemental from the wiki bestiary next to a caster's token, on a scene the GM isn't
 * viewing so it goes on the nearest free cell, and return the summoned token.
 */
async function summonFromCaster(page: Page, linked: boolean) {
  return page.evaluate(
    async ({ names, linked }) => {
      const g = game as any;
      const scene =
        g.scenes.getName(names.scene) ??
        (await (Scene as any).create({ name: names.scene, width: 2000, height: 2000 }));
      const actor = await (Actor as any).create({ name: names.actor, type: "character" });
      const [token] = await scene.createEmbeddedDocuments("Token", [
        { name: actor.name, actorId: actor.id, actorLink: linked, x: 500, y: 500 },
      ]);
      const casterActor = linked ? actor : token.actor;
      const [spell] = await casterActor.createEmbeddedDocuments("Item", [
        { name: "E2E Summon", type: "spiritMagic" },
      ]);
      const pack = g.packs.find((p: any) => p.metadata.name === "bestiary-elementals");
      const elementals = await pack.getDocuments();
      const rqid = elementals[0].getFlag("rqg", "documentRqidFlags").id;
      const applied = await g.system.api.spellEffects.summon(
        {
          spell: spell,
          targetActor: casterActor,
          targetName: token.name,
          cast: {
            spellRqid: "",
            caster: { actorUuid: casterActor.uuid, tokenUuid: token.uuid },
            castMessageId: "",
            level: 1,
            magicPointsSpent: 0,
            runePointsSpent: 1,
            casterSuccessLevel: undefined,
          },
          duration: { value: 15, units: "minutes" },
        },
        rqid,
      );
      const effect = fromUuidSync(applied?.effectUuids?.[0] ?? "") as any;
      return {
        actorId: actor.id as string,
        summonedUuid: (effect?.getFlag("rqg", "holds")?.[0]?.uuid as string) ?? "",
      };
    },
    { names, linked },
  );
}

// #1325 case 1: deleting the caster's actor ends the summoning, so the summoned token goes.
for (const linked of [true, false]) {
  test(`a summoning ends with its caster's ${linked ? "linked" : "unlinked"} actor`, async ({
    page,
    baseURL,
  }) => {
    test.slow();
    await loginToConfiguredWorld(page, baseURL);
    await removeTestDocuments(page);
    try {
      const summoned = await summonFromCaster(page, linked);
      expect(summoned.summonedUuid).toMatch(/\.Token\./);
      expect(await exists(page, summoned.summonedUuid)).toBe(true);

      await page.evaluate((id) => (game as any).actors.get(id).delete(), summoned.actorId);
      await expect.poll(() => exists(page, summoned.summonedUuid), { timeout: 30_000 }).toBe(false);
    } finally {
      await removeTestDocuments(page);
    }
  });
}

// Copies of held documents aren't held, so the GM's reconcile at `ready` leaves them alone.
test("copies of held documents survive a GM reload", async ({ page, baseURL }) => {
  test.slow();
  await loginToConfiguredWorld(page, baseURL);
  await removeTestDocuments(page);
  const copyName = `${names.scene} (copy)`;
  try {
    const area = await createAreaFromToken(page);
    const copies = await page.evaluate(
      async ({ regionUuid, copyName }) => {
        const region = fromUuidSync(regionUuid) as any;
        const [pasted] = await region.parent.createEmbeddedDocuments("Region", [region.toObject()]);
        const sceneCopy = await region.parent.clone({ name: copyName }, { save: true });
        const regionInCopy = sceneCopy.regions.contents[0];
        return {
          pasted: pasted.uuid as string,
          regionInCopy: regionInCopy?.uuid as string,
          heldBy: [pasted, regionInCopy].map((r: any) => r?.getFlag("rqg", "heldBy") ?? ""),
        };
      },
      { regionUuid: area.regionUuid, copyName },
    );
    expect(copies.heldBy).toEqual(["", ""]);

    await page.reload();
    await page.waitForFunction(() => (game as any).ready, undefined, { timeout: 120_000 });
    // Give the reconcile its time, then check against something it does remove
    await page.evaluate(
      (uuid) =>
        (fromUuidSync(uuid) as any).setFlag(
          "rqg",
          "heldBy",
          "Actor.e2eGone00000.ActiveEffect.e2eGone0000000",
        ),
      area.regionUuid,
    );
    await page.reload();
    await page.waitForFunction(() => (game as any).ready, undefined, { timeout: 120_000 });
    await expect.poll(() => exists(page, area.regionUuid), { timeout: 60_000 }).toBe(false);
    expect(await exists(page, copies.pasted)).toBe(true);
    expect(await exists(page, copies.regionInCopy)).toBe(true);
  } finally {
    await page.evaluate((copyName) => (game as any).scenes.getName(copyName)?.delete(), copyName);
    await removeTestDocuments(page);
  }
});

const controlNames = {
  scene: "E2E spell control",
  caster: "E2E commander",
  spirit: "E2E cult spirit",
  user: "E2E command player",
};
const spiritRqid = "a.character.e2e-cult-spirit";
// The world's default ownership level, which a player without one of their own has
const CONST_NONE = 0;

async function removeControlDocuments(page: Page): Promise<void> {
  await page.evaluate(async (names) => {
    const g = game as any;
    await g.scenes.getName(names.scene)?.delete();
    // The summoned spirit is imported, so it can be there more than once
    const actors = g.actors.filter((a: any) => [names.caster, names.spirit].includes(a.name));
    await (Actor as any).deleteDocuments(actors.map((a: any) => a.id));
    await g.users.getName(names.user)?.delete();
  }, controlNames);
}

// #1231: the summoner's players observe a summoned token, and Command (cult spirit) makes them its
// owners while it lasts.
test("summoned tokens are observed, and Command gives control while it lasts", async ({
  page,
  baseURL,
}) => {
  test.slow();
  await loginToConfiguredWorld(page, baseURL);
  await removeControlDocuments(page);

  try {
    const result = await page.evaluate(
      async ({ names, spiritRqid }) => {
        const g = game as any;
        const api = g.system.api;
        const OBSERVER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
        const OWNER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
        const player = await (User as any).create({ name: names.user, role: 1 });
        // Not viewed, so the summon goes next to the caster without placement
        const scene = await (Scene as any).create({ name: names.scene, width: 2000, height: 2000 });
        const caster = await (Actor as any).create({
          name: names.caster,
          type: "character",
          ownership: { [player.id]: OWNER },
        });
        await (Actor as any).create({
          name: names.spirit,
          type: "character",
          flags: { rqg: { documentRqidFlags: { id: spiritRqid, lang: "en", priority: 0 } } },
        });
        const [casterToken] = await scene.createEmbeddedDocuments("Token", [
          { name: caster.name, actorId: caster.id, actorLink: true, x: 500, y: 500 },
        ]);
        const command = await api.rqid.fromRqid("i.rune-magic.command-cult-spirit");
        // A rune spell would need a cult; only its effect template matters here
        const [spell] = await caster.createEmbeddedDocuments("Item", [
          {
            name: command.name,
            type: "spiritMagic",
            system: { effectRqidLink: { rqid: "ae..command-cult-spirit", name: command.name } },
          },
        ]);
        const cast = {
          spellRqid: "i.rune-magic.command-cult-spirit",
          caster: { actorUuid: caster.uuid, tokenUuid: casterToken.uuid },
          castMessageId: "",
          level: 1,
          magicPointsSpent: 0,
          runePointsSpent: 1,
          casterSuccessLevel: undefined,
        };
        const scope = (targetActor: any) => ({
          spell,
          targetActor,
          targetName: targetActor.name,
          cast,
          duration: undefined,
        });

        const summoned = await api.spellEffects.summon(scope(caster), spiritRqid);
        const token = scene.tokens.find((t: any) => t.actorId !== caster.id);
        const level = () => token.actor.getUserLevel(player);
        const afterSummon = level();

        const applied = await api.spellEffects.giveControl(scope(token.actor));
        const commandEffect = fromUuidSync(applied?.effectUuids?.[0] ?? "") as any;
        const whileCommanded = level();
        await commandEffect?.delete();
        // The GM's deleteActiveEffect hook gives it back
        for (let i = 0; i < 50 && level() !== OBSERVER; i++) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // A linked spirit's own actor changes, and gets its ownership back
        const linked = await (Actor as any).create({ name: names.spirit, type: "character" });
        await scene.createEmbeddedDocuments("Token", [
          { name: linked.name, actorId: linked.id, actorLink: true, x: 900, y: 900 },
        ]);
        const linkedCommand = await api.spellEffects.giveControl(scope(linked));
        const linkedWhileCommanded = linked.getUserLevel(player);
        await (fromUuidSync(linkedCommand?.effectUuids?.[0] ?? "") as any)?.delete();
        for (let i = 0; i < 50 && linked.getUserLevel(player) === OWNER; i++) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // An unlinked spirit token without ownership of its own inherits its actor's, default too,
        // while commanded, and goes back to inheriting it after
        const other = "e2eOtherUser0000";
        const inheriting = await (Actor as any).create({
          name: names.spirit,
          type: "character",
          ownership: { default: OBSERVER, [other]: OWNER },
        });
        const [free] = await scene.createEmbeddedDocuments("Token", [
          { name: inheriting.name, actorId: inheriting.id, actorLink: false, x: 1300, y: 900 },
        ]);
        const freeCommand = await api.spellEffects.giveControl(scope(free.actor));
        const freeWhileCommanded = { ...free.actor.ownership };
        await (fromUuidSync(freeCommand?.effectUuids?.[0] ?? "") as any)?.delete();
        for (let i = 0; i < 50 && free.delta._source.ownership !== null; i++) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        return {
          freeWhileCommanded: {
            player: freeWhileCommanded[player.id],
            other: freeWhileCommanded[other],
            default: freeWhileCommanded.default,
          },
          freeDeltaAfter: free.delta._source.ownership,
          freePlayerAfter: free.actor.getUserLevel(player),
          freeBaseLeft: free.actor.getFlag("rqg", "ownershipBase") ?? null,
          linkedBaseLeft: linked.getFlag("rqg", "ownershipBase") ?? null,
          linkedWhileCommanded,
          linkedAfterCommand: linked.getUserLevel(player),
          linkedOwnership: linked._source.ownership[player.id] ?? null,
          summoned: summoned?.outcome ?? null,
          applied: applied?.outcome ?? null,
          afterSummon,
          whileCommanded,
          afterCommand: level(),
          holdsLeft: token.actor.getFlag("rqg", "ownershipBase") ?? null,
          OBSERVER,
          OWNER,
        };
      },
      { names: controlNames, spiritRqid },
    );
    expect(result).toMatchObject({
      summoned: "applied",
      applied: "applied",
      afterSummon: result.OBSERVER,
      whileCommanded: result.OWNER,
      afterCommand: result.OBSERVER,
      holdsLeft: null,
      linkedWhileCommanded: result.OWNER,
      linkedAfterCommand: CONST_NONE,
      linkedOwnership: null,
      linkedBaseLeft: null,
      freeWhileCommanded: { player: result.OWNER, other: result.OWNER, default: result.OBSERVER },
      freeDeltaAfter: null,
      freePlayerAfter: result.OBSERVER,
      freeBaseLeft: null,
    });
  } finally {
    await removeControlDocuments(page);
  }
});
