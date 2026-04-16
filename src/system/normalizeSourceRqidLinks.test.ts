import { normalizeSourceRqidLinks } from "./util";
import { describe, it, expect } from "vitest";

describe("normalizeSourceRqidLinks", () => {
  it("returns empty array for undefined input", () => {
    expect(normalizeSourceRqidLinks(undefined)).toStrictEqual([]);
  });

  it("returns empty array for null input", () => {
    expect(normalizeSourceRqidLinks(null)).toStrictEqual([]);
  });

  it("returns empty array for non-array input", () => {
    expect(normalizeSourceRqidLinks({})).toStrictEqual([]);
    expect(normalizeSourceRqidLinks("string")).toStrictEqual([]);
    expect(normalizeSourceRqidLinks(42)).toStrictEqual([]);
  });

  it("returns empty array for empty array input", () => {
    expect(normalizeSourceRqidLinks([])).toStrictEqual([]);
  });

  it("normalizes valid links", () => {
    const input = [{ rqid: "i.skill.dodge", name: "Dodge" }];
    expect(normalizeSourceRqidLinks(input)).toStrictEqual([
      { rqid: "i.skill.dodge", name: "Dodge" },
    ]);
  });

  it("filters out entries with empty rqid", () => {
    const input = [
      { rqid: "i.skill.dodge", name: "Dodge" },
      { rqid: "", name: "Invalid" },
      { rqid: "   ", name: "Whitespace" },
    ];
    expect(normalizeSourceRqidLinks(input)).toStrictEqual([
      { rqid: "i.skill.dodge", name: "Dodge" },
    ]);
  });

  it("trims whitespace from rqid and name", () => {
    const input = [{ rqid: "  i.skill.dodge  ", name: "  Dodge  " }];
    expect(normalizeSourceRqidLinks(input)).toStrictEqual([
      { rqid: "i.skill.dodge", name: "Dodge" },
    ]);
  });

  it("falls back name to rqid when name is empty", () => {
    const input = [{ rqid: "i.skill.dodge", name: "" }];
    expect(normalizeSourceRqidLinks(input)).toStrictEqual([
      { rqid: "i.skill.dodge", name: "i.skill.dodge" },
    ]);
  });

  it("falls back name to rqid when name is whitespace only", () => {
    const input = [{ rqid: "i.skill.dodge", name: "   " }];
    expect(normalizeSourceRqidLinks(input)).toStrictEqual([
      { rqid: "i.skill.dodge", name: "i.skill.dodge" },
    ]);
  });

  it("falls back name to rqid when name is undefined", () => {
    const input = [{ rqid: "i.skill.dodge" }];
    expect(normalizeSourceRqidLinks(input)).toStrictEqual([
      { rqid: "i.skill.dodge", name: "i.skill.dodge" },
    ]);
  });

  it("includes bonus when it is a valid number", () => {
    const input = [{ rqid: "i.skill.dodge", name: "Dodge", bonus: 10 }];
    expect(normalizeSourceRqidLinks(input)).toStrictEqual([
      { rqid: "i.skill.dodge", name: "Dodge", bonus: 10 },
    ]);
  });

  it("includes bonus of 0", () => {
    const input = [{ rqid: "i.skill.dodge", name: "Dodge", bonus: 0 }];
    expect(normalizeSourceRqidLinks(input)).toStrictEqual([
      { rqid: "i.skill.dodge", name: "Dodge", bonus: 0 },
    ]);
  });

  it("excludes bonus when undefined", () => {
    const input = [{ rqid: "i.skill.dodge", name: "Dodge", bonus: undefined }];
    const result = normalizeSourceRqidLinks(input);
    expect(result).toStrictEqual([{ rqid: "i.skill.dodge", name: "Dodge" }]);
    expect(result[0]).not.toHaveProperty("bonus");
  });

  it("excludes bonus when NaN", () => {
    const input = [{ rqid: "i.skill.dodge", name: "Dodge", bonus: "abc" }];
    const result = normalizeSourceRqidLinks(input);
    expect(result).toStrictEqual([{ rqid: "i.skill.dodge", name: "Dodge" }]);
    expect(result[0]).not.toHaveProperty("bonus");
  });

  it("excludes bonus when Infinity", () => {
    const input = [{ rqid: "i.skill.dodge", name: "Dodge", bonus: Infinity }];
    const result = normalizeSourceRqidLinks(input);
    expect(result).toStrictEqual([{ rqid: "i.skill.dodge", name: "Dodge" }]);
    expect(result[0]).not.toHaveProperty("bonus");
  });

  it("handles string bonus values", () => {
    const input = [{ rqid: "i.skill.dodge", name: "Dodge", bonus: "15" }];
    expect(normalizeSourceRqidLinks(input)).toStrictEqual([
      { rqid: "i.skill.dodge", name: "Dodge", bonus: 15 },
    ]);
  });

  it("handles negative bonus values", () => {
    const input = [{ rqid: "i.skill.dodge", name: "Dodge", bonus: -5 }];
    expect(normalizeSourceRqidLinks(input)).toStrictEqual([
      { rqid: "i.skill.dodge", name: "Dodge", bonus: -5 },
    ]);
  });

  it("handles multiple valid links", () => {
    const input = [
      { rqid: "i.skill.dodge", name: "Dodge" },
      { rqid: "i.skill.jump", name: "Jump", bonus: 5 },
    ];
    expect(normalizeSourceRqidLinks(input)).toStrictEqual([
      { rqid: "i.skill.dodge", name: "Dodge" },
      { rqid: "i.skill.jump", name: "Jump", bonus: 5 },
    ]);
  });
});
