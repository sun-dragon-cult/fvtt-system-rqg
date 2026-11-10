import { describe, expect, it } from "vitest";
import { parseLinks, toLinks } from "./rqg-link-value";

describe("rqg-link field value", () => {
  it("reads an array, one link or nothing", () => {
    expect(toLinks([{ rqid: "i.skill.jump" }])).toEqual([{ rqid: "i.skill.jump" }]);
    expect(toLinks({ rqid: "i.skill.jump", bonus: 5 })).toEqual([
      { rqid: "i.skill.jump", bonus: 5 },
    ]);
    expect(toLinks(null)).toEqual([]);
    expect(toLinks(undefined)).toEqual([]);
  });

  it("drops entries without an rqid and keeps other properties", () => {
    expect(
      toLinks([
        { rqid: "" },
        null,
        { name: "No rqid" },
        { rqid: 3 },
        { rqid: "je..sartar", choice: { homelandCultureChosen: true } },
      ]),
    ).toEqual([{ rqid: "je..sartar", choice: { homelandCultureChosen: true } }]);
  });

  it("parses the value attribute and ignores invalid JSON", () => {
    expect(parseLinks('[{"rqid":"i.rune.air-element"}]')).toEqual([{ rqid: "i.rune.air-element" }]);
    expect(parseLinks('{"rqid":"i.rune.air-element"}')).toEqual([{ rqid: "i.rune.air-element" }]);
    expect(parseLinks("null")).toEqual([]);
    expect(parseLinks("")).toEqual([]);
    expect(parseLinks(null)).toEqual([]);
    expect(parseLinks("[{")).toEqual([]);
  });
});
