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
        "names": {
          "Generate": "function",
          "GenerateFromNameBase": "function",
          "GenerateFromRollTable": "function",
          "GetNameBase": "function",
          "GetNameBases": "function",
          "ResolveTableResult": "function",
          "defaultConstraints": "object",
        },
        "query": {
          "abilities": "function",
          "attributes": "function",
          "characteristics": "function",
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
          "compareCandidatesPrio": "function",
          "compareRqidPrio": "function",
          "compareTaggedByPriorityAndSource": "function",
          "documentFromPacks": "function",
          "documentFromWorld": "function",
          "documentLinkIconsConfigName": "object",
          "documentNameLookup": "object",
          "documentRqid": "function",
          "documentsFromPacks": "function",
          "documentsFromWorld": "function",
          "embeddedRqid": "function",
          "filterBestRqid": "function",
          "filterBestTaggedRqid": "function",
          "fromRqid": "function",
          "fromRqidCount": "function",
          "fromRqidRegex": "function",
          "fromRqidRegexBest": "function",
          "gamePropertyLookup": "object",
          "getDefaultRqid": "function",
          "getDefaultRqidSlug": "function",
          "getDocumentFlag": "function",
          "getDocumentName": "function",
          "getDocumentType": "function",
          "getEmbeddedOrProvidedDocument": "function",
          "getGameCollection": "function",
          "getGameProperty": "function",
          "getKind": "function",
          "getMaxPackDocumentPriority": "function",
          "getRqidIcon": "function",
          "init": "function",
          "kindLookup": "object",
          "renderRqidDocument": "function",
          "setDefaultRqid": "function",
          "setRqid": "function",
        },
        "spellEffects": {
          "removeSpellEffects": "function",
        },
      }
    `);
  });
});
