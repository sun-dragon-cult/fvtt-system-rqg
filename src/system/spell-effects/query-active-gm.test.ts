import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryActiveGm } from "./query-active-gm";

vi.mock("../util", () => ({
  hasActiveGm: () => true,
  localize: (key: string, data?: Record<string, string>) =>
    `${key} ${Object.values(data ?? {}).join(" ")}`,
}));

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
    vi.stubGlobal("game", {
      users: { activeGM: gm },
      user: { can: vi.fn(() => true) },
      i18n: { localize: (key: string) => key },
    });
    vi.stubGlobal("CONST", { USER_PERMISSIONS: { QUERY_USER: { label: "PERMISSION.QueryUser" } } });
    vi.stubGlobal("ui", { notifications: { warn: vi.fn() } });
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

  it("tells a player without the query permission so, without querying", async () => {
    query = vi.fn(async () => "done");
    (game as any).user.can = vi.fn((permission: string) => permission !== "QUERY_USER");
    expect(await queryActiveGm("rqg.continueSpellCast", data, "Mobility")).toBeUndefined();
    expect(query).not.toHaveBeenCalled();
    const message = vi.mocked(ui.notifications!.warn).mock.calls[0]![0] as string;
    expect(message).toContain("QueryNotPermitted");
    expect(message).toContain("PERMISSION.QueryUser");
  });

  it("reports a failed query as a failure, not as a missing GM", async () => {
    query = vi.fn(async () => {
      throw new Error("no");
    });
    expect(await queryActiveGm("rqg.continueSpellCast", data, "Mobility")).toBeUndefined();
    const message = vi.mocked(ui.notifications!.warn).mock.calls[0]![0] as string;
    expect(message).toContain("QueryFailed");
    expect(message).not.toContain("NeedsActiveGm");
  });
});
