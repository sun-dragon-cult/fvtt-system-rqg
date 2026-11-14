import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryActiveGm } from "./query-active-gm";

vi.mock("../util", () => ({ hasActiveGm: () => true, localize: (key: string) => key }));

describe("queryActiveGm", () => {
  let hooks: Record<number, (user: unknown, connected: boolean) => void>;
  let query: (...args: unknown[]) => Promise<unknown>;
  const gm = { id: "gm", query: (...args: unknown[]) => query(...args) };

  beforeEach(() => {
    hooks = {};
    let next = 0;
    vi.stubGlobal("Hooks", {
      on: (_name: string, fn: (user: unknown, connected: boolean) => void) => {
        hooks[++next] = fn;
        return next;
      },
      off: (_name: string, id: number) => delete hooks[id],
    });
    vi.stubGlobal("game", { users: { activeGM: gm } });
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const data = { messageId: "m", inputs: [] };

  it("waits for a GM who is only slow", async () => {
    query = vi.fn(() => new Promise((resolve) => setTimeout(() => resolve("done"), 20)));
    expect(await queryActiveGm("rqg.continueSpellCast", data, "Mobility")).toBe("done");
    expect(Object.keys(hooks)).toEqual([]);
  });

  it("stops waiting when the GM logs out", async () => {
    query = vi.fn(() => new Promise(() => {}));
    const answer = queryActiveGm("rqg.continueSpellCast", data, "Mobility");
    Object.values(hooks).forEach((hook) => hook({ id: "player" }, false));
    Object.values(hooks).forEach((hook) => hook({ id: "gm" }, false));
    expect(await answer).toBeUndefined();
    expect(Object.keys(hooks)).toEqual([]);
  });

  it("warns and gives nothing when the query fails", async () => {
    query = vi.fn(async () => {
      throw new Error("no");
    });
    expect(await queryActiveGm("rqg.continueSpellCast", data, "Mobility")).toBeUndefined();
  });
});
