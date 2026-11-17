import { expect, test } from "@playwright/test";

import { loginToConfiguredWorld } from "./utils/foundrySession";

// Absorption (#1347) soaks a spell cast at its target into magic points for its caster, above the
// maximum, and the excess dissipates when it ends. Its behavior comes from the content module.
test("Absorption soaks spells into magic points above the maximum", async ({ page, baseURL }) => {
  test.slow();
  const e2eConfig = await loginToConfiguredWorld(page, baseURL);

  const results = await page.evaluate(async (sourceActorName) => {
    const g = game as any;
    const out: Record<string, unknown> = {};
    out.hasBehavior =
      !!g.system.api.spellEffects &&
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
    const max = actor.system.attributes.magicPoints.max;
    await actor.update({ "system.attributes.magicPoints.value": max });
    out.max = max;

    const createdMessageIds: string[] = [];
    const hookId = Hooks.on("createChatMessage", (m: any) => createdMessageIds.push(m.id));
    const waitFor = async (predicate: () => boolean) => {
      for (let i = 0; i < 100 && !predicate(); i++) {
        await new Promise((r) => setTimeout(r, 100));
      }
    };
    // On the actor or its items: Bladesharp goes on a weapon
    const effectsNamed = (name: string) =>
      g.system.api.spellEffects.list(actor).filter((e: any) => e.name?.startsWith(name));

    // The token HUD's "Add a Spell Effect" dialog, which meets the target's protective spells
    const addSpellEffect = async (spellName: string, level: number, selfCast: boolean) => {
      const added = actor.addSpellEffect();
      let form: HTMLFormElement | null = null;
      await waitFor(() => {
        form = document
          .querySelector<HTMLFormElement>(".rqg-add-spell-effect-search")
          ?.closest("form") as HTMLFormElement | null;
        return !!form;
      });
      const f = form! as HTMLFormElement;
      const select = f.elements.namedItem("spellUuid") as HTMLSelectElement;
      const option = [...select.options].find((o) => o.text === spellName)!;
      select.value = option.value;
      (f.elements.namedItem("level") as HTMLInputElement).value = String(level);
      (f.elements.namedItem("selfCast") as HTMLInputElement).checked = selfCast;
      f.querySelector<HTMLButtonElement>("button[data-action=ok]")!.click();
      return added;
    };

    try {
      // Cast by the target itself, so it is also Absorption's caster
      await addSpellEffect("Absorption", 1, true);
      out.absorptionOn = effectsNamed("Absorption").length;

      // 2 spirit magic points: soaked whole, 2 magic points above the maximum
      out.firstAdded = await addSpellEffect("Bladesharp", 2, false);
      out.afterFirst = {
        magicPoints: actor.system.attributes.magicPoints.value,
        bladesharp: effectsNamed("Bladesharp").length,
      };

      const sheet = actor.sheet;
      await sheet.render(true);
      out.aboveMaxShown = sheet.element
        .querySelector(".mp-above-max")
        ?.textContent?.replace(/\s+/g, "");
      await sheet.close({ animate: false });

      // Absorption is full, so the next spell takes effect
      await addSpellEffect("Bladesharp", 1, false);
      out.afterSecond = {
        magicPoints: actor.system.attributes.magicPoints.value,
        bladesharp: effectsNamed("Bladesharp").length,
        absorptionOn: effectsNamed("Absorption").length,
      };

      // Ending it cuts the magic points to the maximum, on the active GM's client
      await effectsNamed("Absorption")[0].delete();
      await waitFor(() => actor.system.attributes.magicPoints.value === max);
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
  expect(results.afterFirst).toEqual({ magicPoints: max + 2, bladesharp: 0 });
  expect(results.aboveMaxShown).toBe("+2");
  expect(results.afterSecond).toEqual({ magicPoints: max + 2, bladesharp: 1, absorptionOn: 1 });
  expect(results.afterEnd).toBe(max);
});
