import { describe, expect, it } from "vitest";
import { createRqgApi } from "./rqg-api";

function surface(value: unknown): unknown {
  if (typeof value === "function") {
    const statics = Object.getOwnPropertyNames(value).filter(
      (key) => !["length", "name", "prototype"].includes(key) && !key.startsWith("_"),
    );
    return statics.length
      ? Object.fromEntries(statics.sort().map((key) => [key, typeof (value as any)[key]]))
      : "function";
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, surface(v)]));
  }
  return value;
}

describe("game.system.api", () => {
  // A change here changes the public API - note breaking changes in the changelog.
  it("has the expected surface", () => {
    expect(surface(createRqgApi())).toMatchInlineSnapshot(`
      {
        "dialogs": {
          "chooseWounds": "function",
        },
        "migration": {
          "applyWorldMigrations": "function",
          "openDataModelRepairDialog": "function",
          "openRqidBatchEditor": "function",
        },
        "rolls": {
          "SuccessLevel": {
            "Critical": 0,
            "Failure": 3,
            "Fumble": 4,
            "Special": 1,
            "Success": 2,
          },
          "ability": "function",
          "attack": "function",
          "characteristic": "function",
          "reputation": "function",
          "runeMagic": "function",
          "spiritMagic": "function",
        },
        "rqid": {
          "fromRqid": "function",
          "fromRqidCount": "function",
          "fromRqidRegex": "function",
          "fromRqidRegexBest": "function",
          "getDefaultRqid": "function",
          "renderRqidDocument": "function",
          "setDefaultRqid": "function",
          "setRqid": "function",
        },
        "spellEffects": {
          "applyAreaEffect": "function",
          "barrierPriorities": {
            "area": 100,
            "countermagic": 200,
            "shield": 300,
          },
          "castPoints": "function",
          "createArea": "function",
          "dealDamage": "function",
          "effectRemovalCost": "function",
          "list": "function",
          "metersToPixels": "function",
          "moveTokenNear": "function",
          "pickLocation": "function",
          "postMagicMissiles": "function",
          "removeSpellEffects": "function",
          "summon": "function",
        },
      }
    `);
  });

  it("keeps rqid functions that call other Rqid statics working when called detached", async () => {
    const { fromRqidRegexBest } = createRqgApi().rqid;
    await expect(fromRqidRegexBest(undefined, "i")).resolves.toEqual([]);
  });
});

describe("RqgHooks", () => {
  // Every key of RqgHooks must be listed here and nothing else: the compiler checks it. A change
  // here changes the public API - update the Roll Hooks / Behaviors pages and note it in the changelog.
  const hooks = {
    "rqg.registerSpellBehaviors": true,
    "rqg.registerSkillBehaviors": true,
    "rqg.prepareAbilityRoll": true,
    "rqg.preAbilityRoll": true,
    "rqg.abilityRoll": true,
    "rqg.prepareCharacteristicRoll": true,
    "rqg.preCharacteristicRoll": true,
    "rqg.characteristicRoll": true,
    "rqg.prepareReputationRoll": true,
    "rqg.preReputationRoll": true,
    "rqg.reputationRoll": true,
    "rqg.prepareSpellCast": true,
    "rqg.preSpellCast": true,
    "rqg.spellCast": true,
    "rqg.prepareAttack": true,
    "rqg.preAttack": true,
    "rqg.attack": true,
    "rqg.prepareDefence": true,
    "rqg.preDefence": true,
    "rqg.defence": true,
  } as const satisfies Record<keyof RqgHooks, true>;

  it("has the expected hook names", () => {
    expect(Object.keys(hooks)).toHaveLength(20);
  });
});
