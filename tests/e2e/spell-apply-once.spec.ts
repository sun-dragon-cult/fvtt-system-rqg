import { expect, test, type Page } from "@playwright/test";

import { loginToConfiguredWorld } from "./utils/foundrySession";

const spellRqid = "i.spirit-magic.e2e-held-area";
const names = { scene: "E2E spell apply", actor: "E2E caster", user: "E2E player" };

// A spell whose Apply waits until the test lets it go, then makes a spell area around the caster.
// The registry is only handed out at `setup`, so it's caught as Foundry defines `Hooks`.
test.beforeEach(async ({ page }) => {
  await page.addInitScript((rqid) => {
    let hooks: any;
    Object.defineProperty(globalThis, "Hooks", {
      configurable: true,
      get: () => hooks,
      set: (value) => {
        hooks = value;
        value.once("rqg.registerSpellBehaviors", (registry: any) => {
          registry.register(
            rqid,
            {
              apply: async (scope: any) => {
                await (globalThis as any).e2eApplyGate;
                return (game as any).system.api.spellEffects.createArea(scope, {
                  shape: { kind: "circle", radius: 3 },
                  placement: "caster",
                  duration: { value: 10, units: "minutes" },
                });
              },
            },
            { lang: "en", priority: 0 },
          );
        });
      },
    });
  }, spellRqid);
});

async function removeTestDocuments(page: Page): Promise<void> {
  await page.evaluate(
    async ({ rqid, names }) => {
      const g = game as any;
      await g.scenes.getName(names.scene)?.delete();
      await g.actors.getName(names.actor)?.delete();
      await g.users.getName(names.user)?.delete();
      const messages = g.messages.filter((m: any) => m.system?.spellRqid === rqid);
      await (ChatMessage as any).deleteDocuments(messages.map((m: any) => m.id));
    },
    { rqid: spellRqid, names },
  );
}

/** A caster with a token and the spell, and two cast records each waiting for Apply on the caster. */
async function createCasts(page: Page) {
  return page.evaluate(
    async ({ rqid, names }) => {
      const scene = await (Scene as any).create({ name: names.scene, width: 2000, height: 2000 });
      await scene.view();
      const actor = await (Actor as any).create({ name: names.actor, type: "character" });
      const [token] = await scene.createEmbeddedDocuments("Token", [
        { name: actor.name, actorId: actor.id, actorLink: true, x: 500, y: 500 },
      ]);
      const [spell] = await actor.createEmbeddedDocuments("Item", [
        {
          name: "E2E Held Area",
          type: "spiritMagic",
          flags: { rqg: { documentRqidFlags: { id: rqid, lang: "en", priority: 0 } } },
        },
      ]);
      const caster = { actorUuid: actor.uuid, tokenUuid: token.uuid };
      const record = (entryId: string) => ({
        type: "spellCast",
        content: `<div class="rqg chat-card"><div data-spell-cast-targets></div></div>`,
        speaker: { actor: actor.id },
        system: {
          spellUuid: spell.uuid,
          spellRqid: rqid,
          caster: caster,
          casterPower: 12,
          castSuccessLevel: 2,
          resistedBy: "none",
          castRollMode: "public",
          castOptions: { levelUsed: 1, magicPointBoost: 0 },
          areaRoll: null,
          targets: [
            {
              id: entryId,
              ...caster,
              isCaster: true,
              stage: "affected",
              state: "affected",
              resolvedBy: "selfCast",
              casterSuccessLevel: null,
              effectUuids: [],
              effectBlockedReason: "",
              reflectedFromId: "",
              requestMessageId: "",
            },
          ],
        },
      });
      const [clicked, queried] = await (ChatMessage as any).create([
        record("e2eClickEntry00"),
        record("e2eQueryEntry00"),
      ]);
      return {
        sceneId: scene.id as string,
        actorId: actor.id as string,
        clickedId: clicked.id as string,
        queriedId: queried.id as string,
        spellUuid: spell.uuid as string,
        actorUuid: actor.uuid as string,
        tokenUuid: token.uuid as string,
        tokenCenter: token.getCenterPoint() as { x: number; y: number },
      };
    },
    { rqid: spellRqid, names },
  );
}

// #1326: Apply runs once per target, and the GM checks who asks for spell work.
test("spell Apply runs once, and the GM checks spell requests", async ({ page, baseURL }) => {
  test.slow();
  await loginToConfiguredWorld(page, baseURL);
  await removeTestDocuments(page);

  try {
    const setup = await createCasts(page);

    // Apply clicked again while the first is still waiting makes one area
    await page.evaluate(() => {
      const g = globalThis as any;
      g.ui.sidebar.expand();
      g.ui.sidebar.changeTab("chat", "primary");
      g.e2eApplyGate = new Promise((resolve) => (g.e2eReleaseApply = resolve));
    });
    const apply = page.locator(
      `#chat [data-message-id="${setup.clickedId}"] button[data-apply-spell-effect]`,
    );
    await apply.click({ timeout: 10_000 });
    await page.waitForTimeout(1200);
    await apply.click();
    await page.evaluate(() => (globalThis as any).e2eReleaseApply());
    await expect
      .poll(() =>
        page.evaluate(
          (id) => (game as any).messages.get(id).system.targets[0].stage,
          setup.clickedId,
        ),
      )
      .toBe("applied");

    const afterClicks = await page.evaluate((s) => {
      const g = game as any;
      return {
        regions: g.scenes.get(s.sceneId).regions.size,
        anchors: g.actors.get(s.actorId).effects.filter((e: any) => e.getFlag("rqg", "spellArea"))
          .length,
      };
    }, setup);
    expect(afterClicks).toEqual({ regions: 1, anchors: 1 });

    const queries = await page.evaluate(
      async ({ s, playerName }) => {
        const g = game as any;
        const createArea = CONFIG.queries["rqg.createSpellArea"] as any;
        const continueCast = CONFIG.queries["rqg.continueSpellCast"] as any;
        const scene = g.scenes.get(s.sceneId);
        const player = await (User as any).create({ name: playerName, role: 1 });
        const data = (applyId: string) => ({
          request: { castMessageId: s.queriedId, entryId: "e2eQueryEntry00", applyId },
          spellUuid: s.spellUuid,
          targetActorUuid: s.actorUuid,
          targetName: "",
          cast: {},
          casterTokenUuid: s.tokenUuid,
          shape: { type: "circle", ...s.tokenCenter, radius: 100, gridBased: true },
          duration: { value: 10, units: "minutes" },
          visible: false,
        });
        const regionsBefore = scene.regions.size;

        // A player who doesn't own the caster can neither make the area nor rule on the cast
        const notOwner = await createArea(data("player"), { user: player });
        await continueCast(
          {
            messageId: s.queriedId,
            inputs: [{ kind: "ruling", entryId: "e2eQueryEntry00", state: "dismissed" }],
          },
          { user: player },
        );
        const stateAfterPlayerRuling = g.messages.get(s.queriedId).system.targets[0].state;

        // Two Applies of one entry at once: the GM does the first, and refuses the second
        const both = await Promise.all([
          createArea(data("first"), { user: g.user }),
          createArea(data("second"), { user: g.user }),
        ]);
        return {
          notOwner: notOwner ?? null,
          stateAfterPlayerRuling,
          outcomes: both.map((result: any) => result?.outcome ?? null),
          newRegions: scene.regions.size - regionsBefore,
        };
      },
      { s: setup, playerName: names.user },
    );
    expect(queries).toEqual({
      notOwner: null,
      stateAfterPlayerRuling: "affected",
      outcomes: ["applied", null],
      newRegions: 1,
    });
  } finally {
    await removeTestDocuments(page);
  }
});
