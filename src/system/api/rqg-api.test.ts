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
        "SuccessLevel": {
          "Critical": 0,
          "Failure": 3,
          "Fumble": 4,
          "Special": 1,
          "Success": 2,
        },
        "migration": {
          "applyWorldMigrations": "function",
          "openDataModelRepairDialog": "function",
          "openRqidBatchEditor": "function",
        },
        "query": {
          "abilities": "function",
          "spells": "function",
          "weaponUsages": "function",
        },
        "rolls": {
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
          "castStrength": "function",
          "effectRemovalCost": "function",
          "list": "function",
          "removeSpellEffects": "function",
        },
      }
    `);
  });

  it("keeps rqid functions that call other Rqid statics working when called detached", async () => {
    const { fromRqidRegexBest } = createRqgApi().rqid;
    await expect(fromRqidRegexBest(undefined, "i")).resolves.toEqual([]);
  });
});
