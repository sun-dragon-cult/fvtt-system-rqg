import { expect, test } from "@playwright/test";
import { loginToConfiguredWorld } from "./utils/foundrySession";

test("NPC recovery, sheet pause control, and independent unlinked tokens", async ({
  page,
  baseURL,
}) => {
  test.slow();
  const config = await loginToConfiguredWorld(page, baseURL);

  const results = await page.evaluate(async (sourceName) => {
    const g = game as any;
    const data = g.actors.getName(sourceName).toObject();
    data.name = "E2E NPC recovery";
    data.ownership = { default: 0 };
    data.system.editMode = true;
    data.system.attributes.automaticRecoveryPaused = false;
    const actor = await (Actor as any).create(data);
    const now = g.time.worldTime;
    const week = 7 * 24 * 60 * 60;
    let scene: any;
    let app: any;
    const messages: string[] = [];
    const chatHook = Hooks.on("createChatMessage", (message: any) => messages.push(message.id));
    const location = (a: any) =>
      a.items.find(
        (item: any) => item.type === "hitLocation" && item.system.hitLocationType === "chest",
      );
    const state = (a: any) => ({
      mp: a.system.attributes.magicPoints.value,
      hp: a.system.attributes.hitPoints.value,
      wounds: [...location(a).system.wounds],
    });
    const out: Record<string, unknown> = {};

    try {
      const hpStart = actor.system.attributes.hitPoints.value;
      await actor.damage({ amount: 3, location: location(actor), armorPoints: 0 });
      await actor.update({
        "system.attributes.magicPoints.value": 0,
        "system.attributes.magicPointRecoverySettledWorldTime": now - week,
        "system.attributes.healingSettledWorldTime": now - week,
      });
      await actor.catchUpMagicPointRecovery();
      await actor.catchUpNaturalHealing();
      out.recovered = state(actor);
      out.expected = {
        mp: actor.system.attributes.magicPoints.max,
        hp: hpStart - Math.max(0, 3 - actor.system.attributes.healingRate),
        wounds: Math.max(0, 3 - actor.system.attributes.healingRate)
          ? [3 - actor.system.attributes.healingRate]
          : [],
      };

      const classes = (CONFIG as any).Actor.sheetClasses.character;
      const sheetClass = (name: string) =>
        (Object.values(classes).find((entry: any) => entry.id.endsWith(name)) as any).cls;
      const V2 = sheetClass("RqgActorSheetV2");
      app = new V2({ document: actor });
      await app.render(true);
      const checkbox = app.element.querySelector(
        'input[name="system.attributes.automaticRecoveryPaused"]',
      );
      const updated = new Promise<void>((resolve) => {
        const hook = Hooks.on("updateActor", (a: any, changes: any) => {
          if (a === actor && changes.system?.attributes?.automaticRecoveryPaused === true) {
            Hooks.off("updateActor", hook);
            resolve();
          }
        });
      });
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      await updated;
      out.pausedByCheckbox = actor.system.attributes.automaticRecoveryPaused;
      await app.close({ animate: false });
      app = undefined;

      await actor.damage({ amount: 1, location: location(actor), armorPoints: 0 });
      await actor.update({
        "system.attributes.magicPoints.value": 1,
        "system.attributes.magicPointRecoverySettledWorldTime": now - week,
        "system.attributes.healingSettledWorldTime": now - week,
        "system.editMode": false,
      });
      out.beforePauseCatchUp = state(actor);
      await actor.catchUpMagicPointRecovery();
      await actor.catchUpNaturalHealing();
      out.afterPauseCatchUp = state(actor);

      for (const name of ["RqgActorSheetV2", "RqgActorSheet"]) {
        const Sheet = sheetClass(name);
        app = name.endsWith("V2") ? new Sheet({ document: actor }) : new Sheet(actor);
        const root = await new Promise<HTMLElement>((resolve) => {
          const hook = Hooks.on(`render${Sheet.name}`, (rendered: any, html: any) => {
            if (rendered === app) {
              Hooks.off(`render${Sheet.name}`, hook);
              resolve(html instanceof HTMLElement ? html : html[0]);
            }
          });
          app.render(true);
        });
        out[`${name}Indicator`] = !!root.querySelector(".recovery-paused");
        await app.close({ animate: false });
        app = undefined;
      }

      await actor.update({ "system.attributes.automaticRecoveryPaused": false });
      out.resumeCheckpoints = {
        mp: actor.system.attributes.magicPointRecoverySettledWorldTime,
        hp: actor.system.attributes.healingSettledWorldTime,
      };
      await actor.catchUpMagicPointRecovery();
      await actor.catchUpNaturalHealing();
      out.afterResume = state(actor);
      out.now = now;

      scene = await (Scene as any).create({ name: "E2E NPC recovery off-scene", active: false });
      const tokenData = await actor.getTokenDocument();
      const tokens = await scene.createEmbeddedDocuments("Token", [
        { ...tokenData.toObject(), actorLink: false, x: 0 },
        { ...tokenData.toObject(), actorLink: false, x: 100 },
      ]);
      await tokens[0].actor.update({
        "system.attributes.magicPoints.value": 2,
        "system.attributes.magicPointRecoverySettledWorldTime": now - 24 * 60 * 60,
      });
      await tokens[1].actor.update({ "system.attributes.automaticRecoveryPaused": true });
      const firstRecovered = new Promise<void>((resolve) => {
        const hook = Hooks.on("updateActor", (a: any, changes: any) => {
          if (
            a.uuid === tokens[0].actor.uuid &&
            foundry.utils.hasProperty(changes, "system.attributes.magicPoints.value")
          ) {
            Hooks.off("updateActor", hook);
            resolve();
          }
        });
      });
      Hooks.callAll("updateWorldTime", now, 0, {});
      await firstRecovered;
      await tokens[0].actor.serializeMagicPointsWrite(async () => undefined);
      out.tokens = tokens.map((token: any) => token.actor.system.attributes.magicPoints.value);
      out.baseMp = actor.system.attributes.magicPoints.value;
      out.maxMp = actor.system.attributes.magicPoints.max;
    } finally {
      if (app) {
        await app.close({ animate: false });
      }
      if (scene) {
        await scene.delete();
      }
      await actor.delete();
      Hooks.off("createChatMessage", chatHook);
      await (ChatMessage as any).deleteDocuments(messages);
    }
    return out;
  }, config.rqgActorName);

  expect(results.recovered).toEqual(results.expected);
  expect(results.pausedByCheckbox).toBe(true);
  expect(results.afterPauseCatchUp).toEqual(results.beforePauseCatchUp);
  expect(results.RqgActorSheetV2Indicator).toBe(true);
  expect(results.RqgActorSheetIndicator).toBe(true);
  expect(results.resumeCheckpoints).toEqual({ mp: results.now, hp: results.now });
  expect(results.afterResume).toEqual(results.beforePauseCatchUp);
  expect(results.tokens).toEqual([results.maxMp, results.baseMp]);
  expect(results.baseMp).toBe(1);
});
