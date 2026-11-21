import { describe, expect, it } from "vitest";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { RqgError } from "./rqg-error";
import { assertDocumentSubType } from "./util";

describe("assertDocumentSubType", () => {
  it("throws RqgError when the document is missing", () => {
    expect(() => assertDocumentSubType<Item>(undefined, ItemTypeEnum.Skill)).toThrow(RqgError);
  });
});
