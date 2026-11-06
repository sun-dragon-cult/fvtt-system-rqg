import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyWorldMigrations, openRqidBatchEditor } from "./maintenance-api";

function mockItem(name: string, source: Record<string, unknown>): any {
  return {
    name,
    uuid: `Item.${name}`,
    _source: { name, system: source },
    system: source,
    effects: [],
    update: vi.fn(),
  };
}

const renameLore = async (item: any) =>
  item.system.skillName === "Lore" ? { system: { skillName: "Local Lore" } } : undefined;

describe("game.system.api.maintenance", () => {
  const originalGame = { ...game };
  let item: any;

  beforeEach(() => {
    item = mockItem("Lore", { skillName: "Lore" });
    Object.assign(game, {
      user: { isGM: true },
      system: { version: "6.2.0" },
      actors: { contents: [] },
      items: { contents: [item] },
      scenes: { contents: [] },
      packs: { contents: [], has: () => false },
    });
  });

  afterEach(() => {
    Object.assign(game, originalGame);
    (game as any).user = undefined;
  });

  describe("applyWorldMigrations", () => {
    it("changes the world and reports what changed", async () => {
      const report = await applyWorldMigrations({ items: [renameLore], report: false });

      expect(item.update).toHaveBeenCalledTimes(1);
      expect(report.dryRun).toBe(false);
      expect(report.errorCount).toBe(0);
      expect(report.documents).toEqual([
        expect.objectContaining({
          kind: "Item",
          name: "Lore",
          migration: "renameLore",
          changes: [expect.objectContaining({ path: "system.skillName", to: "Local Lore" })],
        }),
      ]);
    });

    it("reports the same changes in a dry run without writing", async () => {
      const report = await applyWorldMigrations({
        items: [renameLore],
        dryRun: true,
        report: false,
      });

      expect(item.update).not.toHaveBeenCalled();
      expect(report.dryRun).toBe(true);
      expect(report.documents).toHaveLength(1);
    });

    it("runs nothing unless it is given migrations or system: true", async () => {
      const report = await applyWorldMigrations({ report: false });

      expect(item.update).not.toHaveBeenCalled();
      expect(report.documents).toEqual([]);
    });

    it("throws for a non-GM", async () => {
      (game as any).user = { isGM: false };

      await expect(applyWorldMigrations({ items: [renameLore] })).rejects.toThrow(
        "RQG.Notification.Error.GMOnlyOperation",
      );
      expect(item.update).not.toHaveBeenCalled();
    });

    it("throws for a compendium that does not exist", async () => {
      await expect(
        applyWorldMigrations({ items: [renameLore], scope: ["world.nope"] }),
      ).rejects.toThrow("world.nope");
      expect(item.update).not.toHaveBeenCalled();
    });
  });

  describe("openRqidBatchEditor", () => {
    it("throws for an item type that does not exist", async () => {
      await expect(openRqidBatchEditor("skil")).rejects.toThrow();
    });

    it("throws for a non-GM", async () => {
      (game as any).user = { isGM: false };

      await expect(openRqidBatchEditor("skill")).rejects.toThrow(
        "RQG.Notification.Error.GMOnlyOperation",
      );
    });
  });
});
