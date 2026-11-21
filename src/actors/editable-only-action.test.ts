import { describe, expect, it, vi } from "vitest";
import { editableOnlyAction } from "./editable-only-action";

describe("editableOnlyAction", () => {
  it("runs the action for an editable sheet, with the sheet as this and the original arguments", () => {
    const handler = vi.fn(function (this: unknown, _event: string, _target: string) {
      return "done";
    });
    const sheet = { isEditable: true };

    const result = editableOnlyAction(handler).call(sheet, "event", "target");

    expect(result).toBe("done");
    expect(handler).toHaveBeenCalledWith("event", "target");
    expect(handler.mock.contexts[0]).toBe(sheet);
  });

  it("does nothing when the sheet is not editable (Observer or below, locked pack)", () => {
    const handler = vi.fn();
    const sheet = { isEditable: false };

    const result = editableOnlyAction(handler).call(sheet, "event", "target");

    expect(result).toBeUndefined();
    expect(handler).not.toHaveBeenCalled();
  });

  it("checks editability at click time, so a permission change while the sheet is open applies", () => {
    const handler = vi.fn();
    const sheet = { isEditable: false };
    const action = editableOnlyAction(handler);

    action.call(sheet);
    sheet.isEditable = true;
    action.call(sheet);

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
