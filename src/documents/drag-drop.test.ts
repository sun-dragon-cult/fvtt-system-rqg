import { afterEach, describe, expect, it, vi } from "vitest";
import { getDroppedDocumentRqidLink } from "./drag-drop";
import { Rqid } from "../system/api/rqid-api";

describe("getDroppedDocumentRqidLink", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the canonical rqid for non-page documents", () => {
    vi.spyOn(Rqid, "getDocumentFlag").mockReturnValue({ id: "i.skill.jump" } as any);

    const result = getDroppedDocumentRqidLink({
      documentName: "Item",
      name: "Jump",
    } as any);

    expect(result).toEqual({ rqid: "i.skill.jump", name: "Jump" });
  });

  it("prefixes journal pages with their parent journal rqid", () => {
    vi.spyOn(Rqid, "getDocumentFlag")
      .mockImplementationOnce(() => ({ id: "jp.rule.page" }) as any)
      .mockImplementationOnce(() => ({ id: "je.rulebook" }) as any);

    const result = getDroppedDocumentRqidLink({
      documentName: "JournalEntryPage",
      name: "Page",
      parent: {},
    } as any);

    expect(result).toEqual({ rqid: "je.rulebook.jp.rule.page", name: "Page" });
  });

  it("returns undefined for journal pages without a parent rqid", () => {
    vi.spyOn(Rqid, "getDocumentFlag")
      .mockImplementationOnce(() => ({ id: "jp.rule.page" }) as any)
      .mockImplementationOnce(() => undefined);

    const result = getDroppedDocumentRqidLink({
      documentName: "JournalEntryPage",
      name: "Page",
      parent: {},
    } as any);

    expect(result).toBeUndefined();
  });
});
