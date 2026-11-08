import { afterEach, describe, expect, it, vi } from "vitest";
import { Rqid } from "../../system/api/rqid-api";
import { RqidLink } from "./rqid-link";

const names: Record<string, string> = {
  "i.skill.jump": "Jump",
  "i.skill.swim": "Swim",
};

describe("RqidLink", () => {
  afterEach(() => vi.restoreAllMocks());

  describe("sortedByName", () => {
    it("sorts by shown name and keeps each link's index", () => {
      vi.spyOn(Rqid, "displayFromRqid").mockImplementation((rqid) =>
        rqid && names[rqid]
          ? { name: names[rqid], missing: false }
          : { name: rqid?.split(".").at(-1) ?? "", missing: true },
      );
      const links = [
        { rqid: "i.skill.swim" },
        { rqid: "i.skill.customs" },
        { rqid: "i.skill.jump" },
      ];

      expect(RqidLink.sortedByName(links)).toEqual([
        { link: links[1], index: 1, name: "customs", missing: true },
        { link: links[2], index: 2, name: "Jump", missing: false },
        { link: links[0], index: 0, name: "Swim", missing: false },
      ]);
    });
  });
});
