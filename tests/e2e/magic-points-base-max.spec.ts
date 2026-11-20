import { expect, test } from "@playwright/test";

import { loginToConfiguredWorld } from "./utils/foundrySession";

// A POW-less creature with a stat-block magic point maximum (#1346), on both actor sheets.
test("magic points base max override", async ({ page, baseURL }) => {
  test.slow();
  const e2eConfig = await loginToConfiguredWorld(page, baseURL);

  const results = await page.evaluate(async (sourceActorName) => {
    const g = game as any;
    const source =
      g.actors.getName(sourceActorName) ?? g.actors.find((a: any) => a.type === "character");
    const actorData = source.toObject();
    actorData.name = "E2E magic points base max";
    // No player owner, so rendering the sheet doesn't run passive recovery's own write
    actorData.ownership = { default: 0 };
    actorData.system.editMode = true;
    actorData.system.characteristics.power.value = null;
    actorData.system.attributes.magicPoints = { value: 0, baseMax: null };
    const actor = await (Actor as any).create(actorData);

    const sheetClasses = (CONFIG as any).Actor.sheetClasses.character;
    const sheetClass = (name: string) =>
      Object.values(sheetClasses).find((s: any) => s.id.endsWith(name)) as any;

    const typeBaseMax = async (value: string) => {
      const app = new (sheetClass("RqgActorSheetV2").cls)({ document: actor });
      await app.render(true);
      const input = app.element.querySelector(
        'input[name="system.attributes.magicPoints.baseMax"]',
      );
      const updated = new Promise<void>((resolve) => {
        const hookId = Hooks.on("updateActor", (document: any, changes: any) => {
          if (
            document === actor &&
            foundry.utils.hasProperty(changes, "system.attributes.magicPoints.baseMax")
          ) {
            Hooks.off("updateActor", hookId);
            resolve();
          }
        });
      });
      input.value = value;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      await updated;
      await app.close({ animate: false });
      return actor.system.attributes.magicPoints.baseMax;
    };

    const inspect = async (sheetName: string) => {
      const SheetClass = sheetClass(sheetName).cls;
      const isV2 = sheetName.endsWith("V2");
      const app = isV2 ? new SheetClass({ document: actor }) : new SheetClass(actor);
      // AppV1's `element` looks the window up by id, which can still find a closing one.
      const root = await new Promise<HTMLElement>((resolve) => {
        const hookId = Hooks.on(`render${SheetClass.name}`, (rendered: any, html: any) => {
          if (rendered === app) {
            Hooks.off(`render${SheetClass.name}`, hookId);
            resolve(html instanceof HTMLElement ? html : html[0]);
          }
        });
        app.render(true);
      });
      const baseMaxInput = root.querySelector<HTMLInputElement>(
        'input[name="system.attributes.magicPoints.baseMax"]',
      );
      const valueInput = root.querySelector('input[name="system.attributes.magicPoints.value"]');
      const state = {
        baseMaxShown: !!baseMaxInput,
        baseMaxValue: baseMaxInput?.value ?? null,
        baseMaxPlaceholder: baseMaxInput?.placeholder ?? null,
        // In edit mode the base max input takes the place of the max on the Magic Points row
        baseMaxInMagicPointsRow:
          !!baseMaxInput && baseMaxInput.closest(".nowrap") === valueInput?.closest(".nowrap"),
        resetShown: !!root.querySelector(".mp-base-max-reset"),
        valueShown: !!valueInput,
        maxText: valueInput?.closest(".nowrap")?.textContent?.replace(/\s+/g, " ").trim() ?? null,
      };
      await app.close({ animate: false });
      return state;
    };

    const out: Record<string, unknown> = {};
    try {
      out.v2NoPowEdit = await inspect("RqgActorSheetV2");

      await actor.update({ "system.attributes.magicPoints": { value: 21, baseMax: 21 } });
      out.maxWithBaseMax = actor.system.attributes.magicPoints.max;
      // Recovery follows POW alone (Core p.54), so a creature without POW recovers nothing
      out.recoveryWithoutPow = actor.system.attributes.magicPointRecoveryPointsPerDay;
      out.v2WithBaseMaxEdit = await inspect("RqgActorSheetV2");
      out.v1WithBaseMaxEdit = await inspect("RqgActorSheet");

      await actor.update({ "system.editMode": false });
      out.v2Play = await inspect("RqgActorSheetV2");
      out.v1Play = await inspect("RqgActorSheet");

      await actor.update({
        "system.characteristics.power.value": 12,
        "system.attributes.magicPoints.baseMax": null,
      });
      out.maxFollowsPow = actor.system.attributes.magicPoints.max;

      await actor.update({ "system.attributes.magicPoints.value": 5 });
      await actor.gainMagicPoints(20);
      out.gainCappedAtPow = actor.system.attributes.magicPoints.value;

      await actor.update({ "system.editMode": true });
      out.v2FollowingPowEdit = await inspect("RqgActorSheetV2");
      out.typedBaseMax = await typeBaseMax("15");
      out.recoveryWithBaseMax = actor.system.attributes.magicPointRecoveryPointsPerDay;
      out.clearedBaseMax = await typeBaseMax("");
    } finally {
      await actor.delete();
    }
    return out;
  }, e2eConfig.rqgActorName);

  // Edit mode: the GM sees the base max input even with no POW and no magic points.
  expect(results.v2NoPowEdit).toMatchObject({
    baseMaxShown: true,
    baseMaxValue: "",
    baseMaxInMagicPointsRow: true,
    resetShown: false,
  });
  expect(results.maxWithBaseMax).toBe(21);
  expect(results.recoveryWithoutPow).toBe(0);
  expect(results.v2WithBaseMaxEdit).toMatchObject({
    baseMaxShown: true,
    baseMaxValue: "21",
    baseMaxInMagicPointsRow: true,
    resetShown: true,
    valueShown: true,
    maxText: "/",
  });
  expect(results.v1WithBaseMaxEdit).toMatchObject({
    baseMaxShown: true,
    baseMaxValue: "21",
    baseMaxInMagicPointsRow: true,
    resetShown: true,
    valueShown: true,
    maxText: "/",
  });
  // Play mode: magic points show, the override input does not.
  expect(results.v2Play).toMatchObject({ baseMaxShown: false, valueShown: true, maxText: "/ 21" });
  expect(results.v1Play).toMatchObject({ baseMaxShown: false, valueShown: true, maxText: "/ 21" });
  expect(results.maxFollowsPow).toBe(12);
  expect(results.gainCappedAtPow).toBe(12);
  // Empty base max follows POW, shown as the placeholder
  expect(results.v2FollowingPowEdit).toMatchObject({
    baseMaxValue: "",
    baseMaxPlaceholder: "12",
    resetShown: false,
  });
  expect(results.typedBaseMax).toBe(15);
  // With POW 12 and a base max of 15, recovery stays at POW per day
  expect(results.recoveryWithBaseMax).toBe(12);
  expect(results.clearedBaseMax).toBeNull();
});
