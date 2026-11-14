import { expect, test, type Page } from "@playwright/test";

import { loginToConfiguredWorld } from "./utils/foundrySession";

// Reach warnings for spells cast at tokens (#1329, RBM p.6): marks in the cast dialog's target
// picker and on the cast card, and none when the caster has no token (theater of the mind).
// Scene: 1 m grid squares of 100 px. The caster stands at x 1, "Adjacent" at x 2, a wall at x 3.5,
// "Behind wall" at x 5 (in range) and "Far" at x 60 (beyond the 50 m of spirit magic).

const prefix = "E2E reach";
const names = {
  caster: `${prefix} caster`,
  adjacent: `${prefix} adjacent`,
  behindWall: `${prefix} behind wall`,
  far: `${prefix} far`,
  ranged: `${prefix} ranged spell`,
  touch: `${prefix} touch spell`,
};

type Setup = { sceneId: string; actorIds: string[]; casterTokenId: string; tokenIds: string[] };

async function setUp(page: Page, sourceActorName: string): Promise<Setup> {
  return page.evaluate(
    async ({ sourceActorName, names }) => {
      const g = game as any;
      const source =
        g.actors.getName(sourceActorName) ?? g.actors.find((a: any) => a.type === "character");
      // Linked, as a player character's token is, so the caster's token is found from its actor
      const copy = async (name: string) => {
        const data = source.toObject();
        return (Actor as any).create({
          ...data,
          name,
          prototypeToken: { ...data.prototypeToken, name, actorLink: true },
        });
      };
      const caster = await copy(names.caster);
      const targets = [
        await copy(names.adjacent),
        await copy(names.behindWall),
        await copy(names.far),
      ];
      await caster.createEmbeddedDocuments("Item", [
        {
          name: names.ranged,
          type: "spiritMagic",
          system: { points: 1, castingRange: "ranged", targetKind: "creature", resistedBy: "none" },
        },
        {
          name: names.touch,
          type: "spiritMagic",
          system: { points: 1, castingRange: "touch", targetKind: "creature", resistedBy: "none" },
        },
      ]);

      const scene = await (Scene as any).create({
        name: names.caster,
        width: 7000,
        height: 1000,
        padding: 0,
        grid: { type: 1, size: 100, distance: 1, units: "m" },
        tokenVision: false,
      });
      await scene.createEmbeddedDocuments("Wall", [{ c: [350, 0, 350, 1000] }]);
      const tokenData = async (actor: any, col: number) =>
        (await actor.getTokenDocument({ x: col * 100, y: 400, name: actor.name })).toObject();
      const [casterToken, ...tokens] = await scene.createEmbeddedDocuments("Token", [
        await tokenData(caster, 1),
        await tokenData(targets[0], 2),
        await tokenData(targets[1], 5),
        await tokenData(targets[2], 60),
      ]);
      await scene.view();
      return {
        sceneId: scene.id,
        actorIds: [caster.id, ...targets.map((a: any) => a.id)],
        casterTokenId: casterToken.id,
        tokenIds: tokens.map((t: any) => t.id),
      };
    },
    { sourceActorName, names },
  );
}

async function waitForScene(page: Page, sceneId: string, tokenCount: number): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(
          ({ sceneId, tokenCount }) => {
            const c = canvas as any;
            return (
              !!c?.ready &&
              c.scene?.id === sceneId &&
              (c.tokens?.placeables ?? []).filter((t: any) =>
                t.document.name.startsWith("E2E reach"),
              ).length === tokenCount
            );
          },
          { sceneId, tokenCount },
        ),
      { message: "Expected the test scene to be viewed with its tokens drawn", timeout: 30000 },
    )
    .toBe(true);
}

/** Opens the cast dialog of one of the caster's spells and returns its target picker's labels. */
async function pickerLabels(page: Page, spellName: string): Promise<string[]> {
  await page.evaluate(
    async ({ casterName, spellName }) => {
      const g = game as any;
      (canvas as any).tokens.setTargets([], { mode: "replace" });
      await g.actors.getName(casterName).items.getName(spellName).cast();
    },
    { casterName: names.caster, spellName },
  );
  const select = page.locator("select[data-target-select]").last();
  await expect(select).toBeAttached({ timeout: 15000 });
  const labels = (await select.locator("option").allTextContents()).map((l) => l.trim());
  await page.evaluate(async () => {
    for (const app of (foundry as any).applications.instances.values()) {
      if (app.constructor?.name === "SpiritMagicRollDialogV2") {
        await app.close();
      }
    }
  });
  await expect(page.locator("select[data-target-select]")).toHaveCount(0);
  return labels;
}

function labelOf(labels: string[], tokenName: string): string {
  return labels.find((l) => l.startsWith(tokenName)) ?? `<no option for ${tokenName}>`;
}

/** Casts a spell without its dialog at one target and returns the cast card's recorded warning. */
async function castAt(
  page: Page,
  spellName: string,
  targetName: string,
): Promise<{ messageId: string; reachWarning: string | undefined }> {
  return page.evaluate(
    async ({ casterName, spellName, targetName }) => {
      const g = game as any;
      const c = canvas as any;
      const target = c.tokens.placeables.find((t: any) => t.document.name === targetName);
      c.tokens.setTargets([target.id], { mode: "replace" });
      const created: any[] = [];
      const hookId = Hooks.on("createChatMessage", (m: any) => created.push(m));
      try {
        const caster = g.actors.getName(casterName);
        const casterToken = c.tokens.placeables.find((t: any) => t.document.name === casterName);
        await caster.items
          .getName(spellName)
          .cast({ skipDialog: true, token: casterToken?.document, magicPointSource: "self" });
      } finally {
        Hooks.off("createChatMessage", hookId);
      }
      const card = created.find((m) => m.type === "spellCast");
      return {
        messageId: card?.id ?? "",
        reachWarning: card?.system.targets?.[0]?.reachWarning,
      };
    },
    { casterName: names.caster, spellName, targetName },
  );
}

async function cardReachText(page: Page, messageId: string): Promise<string> {
  const row = page.locator(`#chat [data-message-id="${messageId}"] .spell-cast-target`).first();
  await expect(row).toBeAttached({ timeout: 15000 });
  const reach = row.locator(".spell-cast-target-reach");
  return (await reach.count()) ? ((await reach.textContent()) ?? "").trim() : "";
}

test("spells cast at tokens warn about targets beyond their reach", async ({ page, baseURL }) => {
  test.slow();
  const e2eConfig = await loginToConfiguredWorld(page, baseURL);
  const setup = await setUp(page, e2eConfig.rqgActorName);
  const messageIds: string[] = [];

  try {
    await waitForScene(page, setup.sceneId, 4);

    const ranged = await pickerLabels(page, names.ranged);
    expect(labelOf(ranged, names.adjacent)).toBe(`${names.adjacent} (1 m)`);
    expect(labelOf(ranged, names.behindWall)).toBe(`${names.behindWall} (4 m) ⚠ out of sight`);
    expect(labelOf(ranged, names.far)).toBe(`${names.far} (59 m) ⚠ out of range`);

    const touch = await pickerLabels(page, names.touch);
    expect(labelOf(touch, names.adjacent)).toBe(`${names.adjacent} (1 m)`);
    expect(labelOf(touch, names.behindWall)).toBe(`${names.behindWall} (4 m) ⚠ not in touch`);
    expect(labelOf(touch, names.far)).toBe(`${names.far} (59 m) ⚠ not in touch`);

    // A warning never blocks: the cast goes through and its card carries the mark
    const far = await castAt(page, names.ranged, names.far);
    messageIds.push(far.messageId);
    expect(far.messageId).not.toBe("");
    expect(far.reachWarning).toBe("outOfRange");
    expect(await cardReachText(page, far.messageId)).toBe("out of range");

    const wall = await castAt(page, names.ranged, names.behindWall);
    messageIds.push(wall.messageId);
    expect(wall.reachWarning).toBe("outOfSight");
    expect(await cardReachText(page, wall.messageId)).toBe("out of sight");

    const adjacent = await castAt(page, names.touch, names.adjacent);
    messageIds.push(adjacent.messageId);
    expect(adjacent.reachWarning).toBe("");
    expect(await cardReachText(page, adjacent.messageId)).toBe("");

    // Theater of the mind: without a caster token nothing is measured, so nothing is marked
    await page.evaluate(
      async ({ sceneId, tokenId }) =>
        (game as any).scenes.get(sceneId).deleteEmbeddedDocuments("Token", [tokenId]),
      { sceneId: setup.sceneId, tokenId: setup.casterTokenId },
    );
    await waitForScene(page, setup.sceneId, 3);

    const noToken = await pickerLabels(page, names.ranged);
    expect(labelOf(noToken, names.far)).toBe(names.far);
    expect(noToken.some((l) => l.includes("⚠"))).toBe(false);

    const untracked = await castAt(page, names.touch, names.far);
    messageIds.push(untracked.messageId);
    expect(untracked.reachWarning).toBe("");
    expect(await cardReachText(page, untracked.messageId)).toBe("");
  } finally {
    await page.evaluate(
      async ({ setup, messageIds }) => {
        const g = game as any;
        (canvas as any).tokens?.setTargets([], { mode: "replace" });
        await g.scenes.get(setup.sceneId)?.delete();
        await (Actor as any).deleteDocuments(
          setup.actorIds.filter((id: string) => g.actors.get(id)),
        );
        const ids = messageIds.filter((id: string) => id && g.messages.get(id));
        await (ChatMessage as any).deleteDocuments(ids);
      },
      { setup, messageIds },
    );
  }
});
