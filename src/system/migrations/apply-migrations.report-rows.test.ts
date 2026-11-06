import { describe, expect, it } from "vitest";
import { buildMigrationChangeRows } from "./apply-migrations";

describe("buildMigrationChangeRows for embedded effects", () => {
  const item = {
    name: "Gown",
    effects: [
      { _id: "e1", name: "Bladesharp", duration: { combat: null, rounds: 3 } },
      { _id: "e2", name: "Protection", duration: {} },
    ],
  };
  const update = {
    effects: [
      { _id: "e1", duration: { combat: _del, rounds: _del, startTime: _del } },
      { _id: "e2", duration: { combat: _del } },
    ],
  };

  it("labels rows with the effect name and skips deleting values that were null or unset", () => {
    const keys = buildMigrationChangeRows(item, update, "Gown :: ").map((row) => row.key);
    expect(keys).toEqual(["Gown :: effects[Bladesharp] :: duration.rounds"]);
  });
});
