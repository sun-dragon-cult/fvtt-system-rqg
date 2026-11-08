import { afterEach, describe, expect, it, vi } from "vitest";
import { Rqid } from "../../system/api/rqid-api";
import { RqidLink } from "./rqid-link";

const names: Record<string, string> = {
  "i.skill.jump": "Jump",
  "i.skill.swim": "Swim",
  "je..rules": "Rules",
};

describe("RqidLink", () => {
  afterEach(() => vi.restoreAllMocks());

  function mockNames() {
    vi.spyOn(Rqid, "nameFromRqid").mockImplementation((rqid) => (rqid ? names[rqid] : undefined));
  }

  describe("display", () => {
    it("shows the resolved name", () => {
      mockNames();
      expect(RqidLink.display("i.skill.jump")).toEqual({ name: "Jump", missing: false });
    });

    it("shows the slug, marked missing, when nothing matches", () => {
      mockNames();
      expect(RqidLink.display("i.skill.customs")).toEqual({ name: "customs", missing: true });
    });

    it("shows a page's slug, not missing, when its journal resolves but the page name isn't known", () => {
      mockNames();
      expect(RqidLink.display("je..rules.jp..combat")).toEqual({ name: "combat", missing: false });
      expect(RqidLink.display("je..gone.jp..combat")).toEqual({ name: "combat", missing: true });
    });

    it("shows nothing for an empty link", () => {
      expect(RqidLink.display("")).toEqual({ name: "", missing: false });
    });
  });

  describe("sortedByName", () => {
    it("sorts by shown name and keeps each link's index", () => {
      mockNames();
      const links = [
        { rqid: "i.skill.swim" },
        { rqid: "i.skill.customs" },
        { rqid: "i.skill.jump" },
      ];

      expect(RqidLink.sortedByName(links)).toEqual([
        { link: links[1], index: 1 },
        { link: links[2], index: 2 },
        { link: links[0], index: 0 },
      ]);
    });
  });
});
