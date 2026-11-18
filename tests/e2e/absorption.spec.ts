import { expect, test } from "@playwright/test";

import { loginToConfiguredWorld } from "./utils/foundrySession";

// Absorption soaks a spell cast at its target into magic points for its caster, above the maximum,
// and the excess dissipates when it ends. Its behavior comes from the content module.
test("Absorption soaks spells into magic points above the maximum", async ({ page, baseURL }) => {
  test.slow();
  const e2eConfig = await loginToConfiguredWorld(page, baseURL);

  const results = await page.evaluate(async (sourceActorName) => {
    const g = game as any;
    const out: Record<string, unknown> = {};
    // The behavior registry isn't exposed, so look for an active module that ships the script
    out.hasBehavior =
      !!g.modules.get("wiki-en-rqg")?.active &&
      !!(await import(
        /* @vite-ignore */ "/modules/wiki-en-rqg/scripts/spells/absorption.mjs"
      ).catch(() => null));
    if (!out.hasBehavior) {
      return out;
    }

    const source =
      g.actors.getName(sourceActorName) ?? g.actors.find((a: any) => a.type === "character");
    const actorData = source.toObject();
    actorData.name = "E2E absorption";
    actorData.effects = [];
    const actor = await (Actor as any).create(actorData);

    const createdMessageIds: string[] = [];
    const hookId = Hooks.on("createChatMessage", (m: any) => createdMessageIds.push(m.id));
    const waitFor = async (what: string, predicate: () => boolean) => {
      for (let i = 0; i < 100; i++) {
        if (predicate()) {
          return;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      throw new Error(`Timed out waiting for ${what}`);
    };
    const effectsNamed = (name: string) =>
      g.system.api.spellEffects.list(actor).filter((e: any) => e.name?.startsWith(name));

    // The token HUD's "Add a Spell Effect" dialog, which meets the target's protective spells
    const dialogForms = () =>
      [...document.querySelectorAll(".rqg-add-spell-effect-search")].map(
        (search) => search.closest("form") as HTMLFormElement,
      );
    const addSpellEffect = async (spellName: string, level: number, selfCast: boolean) => {
      // The previous dialog can still be fading out, so wait for a new one
      const before = new Set(dialogForms());
      const added = actor.addSpellEffect();
      let form: HTMLFormElement | undefined;
      await waitFor(`the Add a Spell Effect dialog for ${spellName}`, () => {
        form = dialogForms().find((candidate) => !before.has(candidate));
        return !!form;
      });
      const f = form! as HTMLFormElement;
      const select = f.elements.namedItem("spellUuid") as HTMLSelectElement;
      const option = [...select.options].find((o) => o.text === spellName);
      if (!option) {
        throw new Error(`${spellName} isn't listed in the Add a Spell Effect dialog`);
      }
      select.value = option.value;
      (f.elements.namedItem("level") as HTMLInputElement).value = String(level);
      (f.elements.namedItem("selfCast") as HTMLInputElement).checked = selfCast;
      f.querySelector<HTMLButtonElement>("button[data-action=ok]")!.click();
      return added;
    };

    const sheetClasses = (CONFIG as any).Actor.sheetClasses.character;
    // AppV1's `element` looks the window up by id, which can still find a closing one
    const aboveMaxShown = async (sheetName: string) => {
      const SheetClass = (
        Object.values(sheetClasses).find((s: any) => s.id.endsWith(`.${sheetName}`)) as any
      ).cls;
      const app = sheetName.endsWith("V2")
        ? new SheetClass({ document: actor })
        : new SheetClass(actor);
      const root = await new Promise<HTMLElement>((resolve) => {
        const hookId = Hooks.on(`render${SheetClass.name}`, (rendered: any, html: any) => {
          if (rendered === app) {
            Hooks.off(`render${SheetClass.name}`, hookId);
            resolve(html instanceof HTMLElement ? html : html[0]);
          }
        });
        app.render(true);
      });
      const text = root.querySelector(".mp-above-max")?.textContent?.replace(/\s+/g, "");
      await app.close({ animate: false });
      return text;
    };

    try {
      // A maximum above POW, which is what the excess is cut to
      await actor.update({
        "system.attributes.magicPoints.baseMax": actor.system.characteristics.power.value + 3,
      });
      const max = actor.system.attributes.magicPoints.max;
      await actor.update({ "system.attributes.magicPoints.value": max });
      out.max = max;

      // Cast by the target itself, so it is also Absorption's caster
      await addSpellEffect("Absorption", 1, true);
      out.absorptionOn = effectsNamed("Absorption").length;

      // 2 spirit magic points: soaked whole, 2 magic points above the maximum
      out.firstAdded = await addSpellEffect("Protection", 2, false);
      out.afterFirst = {
        magicPoints: actor.system.attributes.magicPoints.value,
        protection: effectsNamed("Protection").length,
      };

      out.aboveMaxShown = {
        v2: await aboveMaxShown("RqgActorSheetV2"),
        v1: await aboveMaxShown("RqgActorSheet"),
      };

      // Absorption is full, so the next spell takes effect
      await addSpellEffect("Protection", 1, false);
      out.afterSecond = {
        magicPoints: actor.system.attributes.magicPoints.value,
        protection: effectsNamed("Protection").length,
        absorptionOn: effectsNamed("Absorption").length,
      };

      // Ending it cuts the magic points to the maximum, on the active GM's client
      await effectsNamed("Absorption")[0].delete();
      await waitFor(
        "the excess to dissipate",
        () => actor.system.attributes.magicPoints.value === max,
      );
      out.afterEnd = actor.system.attributes.magicPoints.value;
    } finally {
      Hooks.off("createChatMessage", hookId);
      await actor.delete();
      await (ChatMessage as any).deleteDocuments(
        createdMessageIds.filter((id) => g.messages.has(id)),
      );
    }
    return out;
  }, e2eConfig.rqgActorName);

  test.skip(!results.hasBehavior, "The content module has no Absorption behavior");
  const max = results.max as number;
  expect(results.absorptionOn).toBe(1);
  expect(results.firstAdded).toBe(true);
  expect(results.afterFirst).toEqual({ magicPoints: max + 2, protection: 0 });
  expect(results.aboveMaxShown).toEqual({ v2: "+2", v1: "+2" });
  expect(results.afterSecond).toEqual({ magicPoints: max + 2, protection: 1, absorptionOn: 1 });
  expect(results.afterEnd).toBe(max);
});
