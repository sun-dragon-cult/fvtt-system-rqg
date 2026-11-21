import { describe, expect, it, vi } from "vitest";
import { RqgActor } from "./rqg-actor";
import { ActorTypeEnum } from "../data-model/actor-data/rqg-actor-data";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { RQG_CONFIG } from "../system/config";

function createActor(dodgeItem: any, jumpItem: any): any {
  const actor = new RqgActor({ name: "Test Actor", type: ActorTypeEnum.Character }) as any;
  actor.type = ActorTypeEnum.Character;
  actor.system = { characteristics: { dexterity: { value: 15 } } };
  actor.getBestEmbeddedDocumentByRqid = vi.fn((rqid: string) =>
    rqid === RQG_CONFIG.skillRqid.dodge ? dodgeItem : jumpItem,
  );
  return actor;
}

function skill(): any {
  return { type: ItemTypeEnum.Skill, system: { baseChance: -1 }, update: vi.fn() };
}

describe("RqgActor.updateDexBasedSkills", () => {
  it.each([
    ["Dodge", undefined, skill()],
    ["Jump", skill(), undefined],
    ["both", undefined, undefined],
  ])("skips missing %s skills", async (_label, dodgeItem, jumpItem) => {
    const actor = createActor(dodgeItem, jumpItem);

    await expect(actor.updateDexBasedSkills()).resolves.toBeUndefined();
    if (dodgeItem) {
      expect(dodgeItem.update).toHaveBeenCalledOnce();
    }
    if (jumpItem) {
      expect(jumpItem.update).toHaveBeenCalledOnce();
    }
  });
});
