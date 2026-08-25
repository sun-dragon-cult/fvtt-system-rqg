import { describe, expect, it } from "vitest";
import { RQG_CONFIG } from "../config";
import {
  actorTagsMatchFilter,
  compareTemplates,
  isActorTemplate,
  tagMatchesFilter,
  type ActorTemplateEntry,
} from "./actor-template-api";

const { actorTemplateGateTag } = RQG_CONFIG;

function entry(
  name: string,
  source: string,
  rqid?: ActorTemplateEntry["rqid"],
): ActorTemplateEntry {
  return { uuid: `Actor.${name}`, name, tags: [], source, rqid };
}

describe("tagMatchesFilter", () => {
  it("matches an exact tag", () => {
    expect(tagMatchesFilter("role:adventurer", "role:adventurer")).toBe(true);
  });

  it("matches a colon-hierarchical child of the filter tag", () => {
    expect(tagMatchesFilter("class:elder-race:troll", "class:elder-race")).toBe(true);
  });

  it("does not match an unrelated tag", () => {
    expect(tagMatchesFilter("role:mount", "class:elder-race")).toBe(false);
  });

  it("does not match a tag that merely shares a prefix without the colon boundary", () => {
    expect(tagMatchesFilter("class:elder-racehorse", "class:elder-race")).toBe(false);
  });
});

describe("actorTagsMatchFilter", () => {
  it("matches if any tag equals or is a child of the filter", () => {
    expect(actorTagsMatchFilter(["role:mount", "class:elder-race:troll"], "class:elder-race")).toBe(
      true,
    );
  });

  it("is false when no tag matches", () => {
    expect(actorTagsMatchFilter(["role:mount"], "class:elder-race")).toBe(false);
  });

  it("is false for undefined tags", () => {
    expect(actorTagsMatchFilter(undefined, "class:elder-race")).toBe(false);
  });
});

describe("isActorTemplate", () => {
  it("requires the reserved gate tag", () => {
    expect(isActorTemplate([actorTemplateGateTag, "class:elder-race:troll"])).toBe(true);
  });

  it("is false when only descriptive tags are present", () => {
    expect(isActorTemplate(["class:elder-race:troll", "role:adventurer"])).toBe(false);
  });

  it("is false for undefined or empty tags", () => {
    expect(isActorTemplate(undefined)).toBe(false);
    expect(isActorTemplate([])).toBe(false);
  });
});

describe("compareTemplates", () => {
  const sort = (templates: ActorTemplateEntry[], worldLanguage = "en") =>
    [...templates].sort((a, b) => compareTemplates(a, b, worldLanguage));

  it("prefers entries matching the world language over others, regardless of name", () => {
    const templates = [
      entry("Zorro", "World", { lang: "en" }),
      entry("Arimaxilus", "World", { lang: "es" }),
    ];
    expect(sort(templates, "es").map((t) => t.name)).toEqual(["Arimaxilus", "Zorro"]);
  });

  it("treats an actor with no rqid as not matching any world language", () => {
    const templates = [entry("Zorro", "World"), entry("Arimaxilus", "World", { lang: "es" })];
    expect(sort(templates, "es").map((t) => t.name)).toEqual(["Arimaxilus", "Zorro"]);
  });

  it("breaks a language tie by rqid priority, higher first", () => {
    const templates = [
      entry("Human (Base)", "World", { lang: "en", priority: 0 }),
      entry("Human (Base)", "wiki-en-rqg — Bestiary", { lang: "en", priority: 5 }),
    ];
    expect(sort(templates).map((t) => t.source)).toEqual(["wiki-en-rqg — Bestiary", "World"]);
  });

  it("treats a missing priority as lower than an explicit priority of 0", () => {
    const templates = [
      entry("Human (Base)", "No priority", { lang: "en" }),
      entry("Human (Base)", "Priority zero", { lang: "en", priority: 0 }),
    ];
    expect(sort(templates).map((t) => t.source)).toEqual(["Priority zero", "No priority"]);
  });

  it("falls back to name when language and priority tie", () => {
    const templates = [entry("Vasana", "World"), entry("Arimaxilus", "World")];
    expect(sort(templates).map((t) => t.name)).toEqual(["Arimaxilus", "Vasana"]);
  });

  it("falls back to source as the final tiebreak", () => {
    const templates = [entry("Human (Base)", "B source"), entry("Human (Base)", "A source")];
    expect(sort(templates).map((t) => t.source)).toEqual(["A source", "B source"]);
  });
});
