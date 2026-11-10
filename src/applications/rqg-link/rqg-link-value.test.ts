import { describe, expect, it } from "vitest";
import { entryFor, parseJson, rqidOf, toLinks, toUuidEntries } from "./rqg-link-value";

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
    expect(toLinks(parseJson('[{"rqid":"i.rune.air-element"}]'))).toEqual([
      { rqid: "i.rune.air-element" },
    ]);
    expect(toLinks(parseJson('{"rqid":"i.rune.air-element"}'))).toEqual([
      { rqid: "i.rune.air-element" },
    ]);
    expect(toLinks(parseJson("null"))).toEqual([]);
    expect(toLinks(parseJson(""))).toEqual([]);
    expect(toLinks(parseJson(null))).toEqual([]);
    expect(toLinks(parseJson("[{"))).toEqual([]);
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
    expect(toLinks(parseJson(JSON.stringify([skill])), "skillRqidLink")).toEqual([skill]);
  });

  it("makes a new entry, under the link key when there is one", () => {
    expect(entryFor({ rqid: "i.skill.jump" })).toEqual({ rqid: "i.skill.jump" });
    expect(entryFor({ rqid: "i.spirit-magic.befuddle" }, "spellRqidLink")).toEqual({
      spellRqidLink: { rqid: "i.spirit-magic.befuddle" },
    });
  });

  it("reads uuids as { uuid } entries", () => {
    expect(toUuidEntries(["Actor.a", "", 3, "Actor.b"])).toEqual([
      { uuid: "Actor.a" },
      { uuid: "Actor.b" },
    ]);
    expect(toUuidEntries("Actor.a")).toEqual([{ uuid: "Actor.a" }]);
    expect(toUuidEntries([{ uuid: "Actor.a" }, { uuid: "" }, null])).toEqual([{ uuid: "Actor.a" }]);
    expect(toUuidEntries(null)).toEqual([]);
    expect(toUuidEntries(parseJson('["Actor.a"]'))).toEqual([{ uuid: "Actor.a" }]);
    expect(toUuidEntries(parseJson('"Actor.a"'))).toEqual([{ uuid: "Actor.a" }]);
    expect(toUuidEntries(parseJson("["))).toEqual([]);
  });
});
