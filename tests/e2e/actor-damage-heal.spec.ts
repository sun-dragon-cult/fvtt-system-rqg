import { expect, test } from "@playwright/test";

import { loginToConfiguredWorld } from "./utils/foundrySession";

// Runs actor.damage / actor.heal (#1171) on a temporary copy of the configured actor.
test("actor damage and heal methods", async ({ page, baseURL }) => {
  test.slow();
  const e2eConfig = await loginToConfiguredWorld(page, baseURL);
  await page.waitForFunction(() => (globalThis as any).game?.ready, null, { timeout: 30000 });

  const results = await page.evaluate(async (sourceActorName) => {
    const g = game as any;
    const hasHitLocations = (a: any) => a.items.some((i: any) => i.type === "hitLocation");
    const source =
      g.actors.getName(sourceActorName) ?? g.actors.find((a: any) => hasHitLocations(a));
    const actorData = source.toObject();
    actorData.name = "E2E damage-heal";
    const actor = await (Actor as any).create(actorData);
    const createdMessageIds: string[] = [];
    const hookId = Hooks.on("createChatMessage", (m: any) => createdMessageIds.push(m.id));

    const location = (type: string) =>
      actor.items.find((i: any) => i.type === "hitLocation" && i.system.hitLocationType === type);
    const hp = () => actor.system.attributes.hitPoints.value;
    const out: Record<string, unknown> = {};

    try {
      const chest = location("chest");
      const hpStart = hp();

      out.ignoreArmor = await actor.damage({ amount: 3, location: chest, ignoreArmor: true });
      out.afterIgnoreArmor = { wounds: [...chest.system.wounds], hpLost: hpStart - hp() };

      const ap = chest.system.armorPoints;
      out.ap = ap;
      out.withArmor = await actor.damage({ amount: ap + 2, location: chest });
      out.afterWithArmor = { wounds: [...chest.system.wounds], hpLost: hpStart - hp() };

      out.stopped = await actor.damage({ amount: ap, location: chest });

      out.healLargestFirst = await actor.heal({ location: chest, points: 2 });
      out.healAll = await actor.heal({ location: chest, points: "all" });
      out.hpRestored = hp() === hpStart;

      await Promise.all([
        actor.damage({ amount: 1, location: chest, ignoreArmor: true }),
        actor.damage({ amount: 1, location: chest, ignoreArmor: true }),
      ]);
      out.parallel = { wounds: [...chest.system.wounds], hpLost: hpStart - hp() };
      await actor.heal({ location: chest, points: "all" });

      const random = await actor.damage({ amount: 1, location: "random", ignoreArmor: true });
      out.randomOnActor = random.location.parent === actor;
      await actor.heal({ location: random.location, points: "all" });

      const leg = actor.items.find(
        (i: any) => i.type === "hitLocation" && i.system.hitLocationType === "limb",
      );
      await actor.damage({ amount: 99, location: leg, ignoreArmor: true });
      out.legAfterDamage = leg.system.hitLocationHealthState;
      await actor.heal({ location: leg, points: "all" });
      out.legAfterHealAll = leg.system.hitLocationHealthState;
      await actor.heal({ location: leg, points: 0, restoreSevered: true });
      out.legAfterRestore = leg.system.hitLocationHealthState;

      try {
        actor.getHitLocationByRoll(999);
        out.noLocationThrows = false;
      } catch {
        out.noLocationThrows = true;
      }

      const otherActor = g.actors.find((a: any) => a !== actor && hasHitLocations(a));
      const foreignLocation = otherActor?.items.find((i: any) => i.type === "hitLocation");
      out.foreignLocationRejected = await actor
        .damage({ amount: 1, location: foreignLocation })
        .then(() => false)
        .catch(() => true);
    } finally {
      Hooks.off("createChatMessage", hookId);
      await actor.delete();
      await (ChatMessage as any).deleteDocuments(createdMessageIds);
    }
    return out;
  }, e2eConfig.rqgActorName);

  const ap = results.ap as number;
  expect(results.ignoreArmor).toMatchObject({ damage: 3, absorbed: 0 });
  expect(results.afterIgnoreArmor).toEqual({ wounds: [3], hpLost: 3 });
  expect(results.withArmor).toMatchObject({ damage: 2, absorbed: ap });
  expect(results.afterWithArmor).toEqual({ wounds: [3, 2], hpLost: 5 });
  expect(results.stopped).toMatchObject({ damage: 0, absorbed: ap });
  expect(results.healLargestFirst).toMatchObject({ healed: 2, remainingWounds: [1, 2] });
  expect(results.healAll).toMatchObject({ healed: 3, remainingWounds: [] });
  expect(results.hpRestored).toBe(true);
  expect(results.parallel).toEqual({ wounds: [1, 1], hpLost: 2 });
  expect(results.randomOnActor).toBe(true);
  expect(results.legAfterDamage).toBe("severed");
  expect(results.legAfterHealAll).toBe("severed");
  expect(results.legAfterRestore).toBe("healthy");
  expect(results.noLocationThrows).toBe(true);
  expect(results.foreignLocationRejected).toBe(true);
});

// The add and heal wound dialogs on the actor sheet go through actor.damage / actor.heal.
test("add and heal wound dialogs", async ({ page, baseURL }) => {
  test.slow();
  const e2eConfig = await loginToConfiguredWorld(page, baseURL);
  await page.waitForFunction(() => (globalThis as any).game?.ready, null, { timeout: 30000 });

  const { actorId, chestId, sheetId } = await page.evaluate(async (sourceActorName) => {
    const g = game as any;
    const source =
      g.actors.getName(sourceActorName) ??
      g.actors.find((a: any) => a.items.some((i: any) => i.type === "hitLocation"));
    const actorData = source.toObject();
    actorData.name = "E2E wound dialogs";
    const actor = await (Actor as any).create(actorData);
    const chest = actor.items.find(
      (i: any) => i.type === "hitLocation" && i.system.hitLocationType === "chest",
    );
    await actor.sheet.render({ force: true });
    return { actorId: actor.id, chestId: chest.id, sheetId: actor.sheet.id };
  }, e2eConfig.rqgActorName);

  const chestState = () =>
    page.evaluate(
      ({ actorId, chestId }) => {
        const actor = (game as any).actors.get(actorId);
        const chest = actor.items.get(chestId);
        const hp = actor.system.attributes.hitPoints;
        return { wounds: [...chest.system.wounds], hpLost: hp.max - hp.value };
      },
      { actorId, chestId },
    );

  try {
    const sheet = page.locator(`#${sheetId}`);
    const chestRow = sheet.locator(`[data-item-id="${chestId}"]`).filter({
      has: page.locator('[data-action="addWound"]:visible'),
    });

    await chestRow.locator('[data-action="addWound"]').first().click();
    const addDialog = page.locator(".application.add-wound");
    await addDialog.locator("#inflictDamagePoints").fill("4");
    await addDialog.locator('input[name="subtractAP"]').uncheck();
    await addDialog.locator('button[data-action="submit"]').click();
    await expect.poll(chestState).toEqual({ wounds: [4], hpLost: 4 });

    await chestRow.locator('[data-action="healWound"]').first().click();
    const healDialog = page.locator(".application.heal-wound");
    await healDialog.locator('range-picker[name="heal"] input[type="number"]').fill("3");
    await healDialog.locator('button[data-action="submit"]').click();
    await expect.poll(chestState).toEqual({ wounds: [1], hpLost: 1 });

    await healDialog.locator('label[for^="heal-mode-all-"]').click();
    await healDialog.locator('button[data-action="submit"]').click();
    await expect.poll(chestState).toEqual({ wounds: [], hpLost: 0 });
    await expect(healDialog).toHaveCount(0);
  } finally {
    await page.evaluate(async (actorId) => {
      const actor = (game as any).actors.get(actorId);
      const messageIds = (game as any).messages
        .filter((m: any) => m.speaker?.actor === actorId)
        .map((m: any) => m.id);
      await actor?.sheet?.close();
      await actor?.delete();
      await (ChatMessage as any).deleteDocuments(messageIds);
    }, actorId);
  }
});
