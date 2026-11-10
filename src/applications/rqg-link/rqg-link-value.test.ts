import { describe, expect, it } from "vitest";
import { entryFor, parseLinks, rqidOf, toLinks } from "./rqg-link-value";

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

  it("reads the link under a link key", () => {
    const skill = { skillRqidLink: { rqid: "i.skill.dodge" }, bonus: 10, incomeSkill: true };
    expect(rqidOf(skill, "skillRqidLink")).toBe("i.skill.dodge");
    expect(rqidOf(skill)).toBe("");
    expect(
      toLinks(
        [skill, { skillRqidLink: { rqid: "" } }, { skillRqidLink: null }, { rqid: "i.skill.jump" }],
        "skillRqidLink",
      ),
    ).toEqual([skill]);
    expect(parseLinks(JSON.stringify([skill]), "skillRqidLink")).toEqual([skill]);
  });

  it("makes a new entry, under the link key when there is one", () => {
    expect(entryFor({ rqid: "i.skill.jump" })).toEqual({ rqid: "i.skill.jump" });
    expect(entryFor({ rqid: "i.spirit-magic.befuddle" }, "spellRqidLink")).toEqual({
      spellRqidLink: { rqid: "i.spirit-magic.befuddle" },
    });
  });
});
