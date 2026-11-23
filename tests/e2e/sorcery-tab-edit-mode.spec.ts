import { expect, test } from "@playwright/test";

import { loginToConfiguredWorld } from "./utils/foundrySession";

// The edit mode gained chance input must not wrap sorcery spell rows on the V2 sheet (#1215).
test("sorcery tab spell rows stay on one line in edit mode", async ({ page, baseURL }) => {
  test.slow();
  const e2eConfig = await loginToConfiguredWorld(page, baseURL);

  const rows = await page.evaluate(async (sourceActorName) => {
    const g = game as any;
    const source =
      g.actors.getName(sourceActorName) ?? g.actors.find((a: any) => a.type === "character");
    const actorData = source.toObject();
    actorData.name = "E2E sorcery tab edit mode";
    actorData.ownership = { default: 0 };
    actorData.system.editMode = true;
    actorData.flags = { ...actorData.flags, core: { sheetClass: "rqg.RqgActorSheetV2" } };

    const rune = actorData.items.find((i: any) => i.type === "rune");
    rune.system.isMastered = true;
    const runeRqid = rune.flags.rqg.documentRqidFlags.id;
    actorData.items = actorData.items.filter((i: any) => i.type !== "skill");
    for (const name of ["Spell One", "Spell With A Rather Long Name"]) {
      actorData.items.push({
        name,
        type: "skill",
        system: {
          skillName: name,
          category: "magic",
          runeRqidLinks: [{ rqid: runeRqid, name: rune.name }],
        },
      });
    }
    const actor = await (Actor as any).create(actorData);

    try {
      const sheet = actor.sheet;
      sheet.tabGroups.primary = "sorcery";
      await sheet.render({ force: true });
      const rowElements = [
        ...sheet.element.querySelectorAll(".sorcery-tab-v2 .grid.skill > .skill-row"),
      ];
      const result = rowElements.map((row: any) => {
        const cells = [...row.children] as HTMLElement[];
        return {
          cellCount: cells.length,
          distinctTops: new Set(cells.map((c) => Math.round(c.getBoundingClientRect().top))).size,
        };
      });
      await sheet.close({ animate: false });
      return result;
    } finally {
      await actor.delete();
    }
  }, e2eConfig.rqgActorName);

  expect(rows).toHaveLength(2);
  for (const row of rows) {
    // Icon, name, gained chance input and chance
    expect(row.cellCount).toBe(4);
    expect(row.distinctTops).toBe(1);
  }
});
