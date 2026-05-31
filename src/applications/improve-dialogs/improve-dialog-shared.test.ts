import { describe, expect, it } from "vitest";

import { getSelectedImprovementSourceFromForm } from "./improve-dialog-shared";

function createElementStub(selectedValue?: string): HTMLElement {
  return {
    querySelector: () =>
      selectedValue === undefined
        ? null
        : ({ value: selectedValue } as unknown as HTMLInputElement),
  } as unknown as HTMLElement;
}

describe("getSelectedImprovementSourceFromForm", () => {
  it("returns fallback when no source radio is selected", () => {
    const element = createElementStub();

    const selected = getSelectedImprovementSourceFromForm(
      element,
      ["experience", "training"] as const,
      "training",
    );

    expect(selected).toBe("training");
  });

  it("returns null fallback when no source is selected and fallback is null", () => {
    const element = createElementStub();

    const selected = getSelectedImprovementSourceFromForm(
      element,
      ["experience", "training"] as const,
      null,
    );

    expect(selected).toBeNull();
  });

  it("returns selected source when it is allowed", () => {
    const element = createElementStub("experience");

    const selected = getSelectedImprovementSourceFromForm(
      element,
      ["experience", "training"] as const,
      "training",
    );

    expect(selected).toBe("experience");
  });

  it("returns fallback when selected source is not allowed", () => {
    const element = createElementStub("research");

    const selected = getSelectedImprovementSourceFromForm(
      element,
      ["experience", "training"] as const,
      "experience",
    );

    expect(selected).toBe("experience");
  });
});
