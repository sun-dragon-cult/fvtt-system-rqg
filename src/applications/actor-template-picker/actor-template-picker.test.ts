import { describe, expect, it } from "vitest";
import type { ActorTemplateEntry } from "../../system/api/actor-template-api";
import { buildFacets, computeAvailableFacetValues } from "./actor-template-picker";

function entry(...tags: string[]): ActorTemplateEntry {
  return { uuid: `Actor.${tags.join(",")}`, name: "Test", tags, source: "World" };
}

describe("buildFacets", () => {
  it("gives a colon-hierarchical tag a selectable row for every ancestor level", () => {
    const facets = buildFacets([entry("species:uz:dark-troll")]);
    const species = facets.find((f) => f.key === "species");
    expect(species?.options.map((o) => o.value)).toEqual(["species:uz", "species:uz:dark-troll"]);
  });

  it("does not duplicate an ancestor row already shared by multiple leaves", () => {
    const facets = buildFacets([entry("species:uz:dark-troll"), entry("species:uz:great-troll")]);
    const species = facets.find((f) => f.key === "species");
    expect(species?.options.map((o) => o.value)).toEqual([
      "species:uz",
      "species:uz:dark-troll",
      "species:uz:great-troll",
    ]);
  });

  it("indents a row's label by its depth, using only its own leaf segment", () => {
    const facets = buildFacets([entry("species:uz:dark-troll")]);
    const species = facets.find((f) => f.key === "species");
    expect(species?.options.map((o) => o.label)).toEqual(["uz", "  dark-troll"]);
  });

  it("leaves a flat (non-hierarchical) tag as a single row", () => {
    const facets = buildFacets([entry("species:human")]);
    const species = facets.find((f) => f.key === "species");
    expect(species?.options.map((o) => o.value)).toEqual(["species:human"]);
  });

  it("groups facets by namespace independently", () => {
    const facets = buildFacets([entry("role:adventurer", "species:uz:dark-troll")]);
    expect(facets.map((f) => f.key)).toEqual(["role", "species"]);
  });
});

describe("computeAvailableFacetValues", () => {
  const templates = [
    entry("role:adventurer", "species:uz:dark-troll"),
    entry("role:adventurer", "species:human"),
    entry("class:animal", "species:wolf"),
  ];

  it("excludes species only reachable through templates the other active filters rule out", () => {
    const available = computeAvailableFacetValues(templates, ["role:adventurer"], "species");
    expect(available).toEqual(new Set(["species:uz", "species:uz:dark-troll", "species:human"]));
    expect(available.has("species:wolf")).toBe(false);
  });

  it("ignores the facet's own active filter so it doesn't collapse to just the current selection", () => {
    const available = computeAvailableFacetValues(templates, ["species:human"], "species");
    expect(available).toEqual(
      new Set(["species:uz", "species:uz:dark-troll", "species:human", "species:wolf"]),
    );
  });

  it("with no active filters, every facet value across all templates is available", () => {
    const available = computeAvailableFacetValues(templates, [], "class");
    expect(available).toEqual(new Set(["class:animal"]));
  });
});
