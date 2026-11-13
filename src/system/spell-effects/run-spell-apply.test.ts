import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryActiveGm } from "./run-spell-apply";

describe("queryActiveGm", () => {
  const originalUser = game.user;
  const originalUsers = game.users;
  let gm: { query: ReturnType<typeof vi.fn> };
  let consoleWarn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    gm = { query: vi.fn(async () => ({ outcome: "applied" })) };
    (game as any).users = { activeGM: gm };
    (game as any).user = { isGM: false, can: vi.fn(() => true) };
    vi.stubGlobal("CONST", { USER_PERMISSIONS: { QUERY_USER: { label: "PERMISSION.QueryUser" } } });
    consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(ui.notifications!.warn).mockClear();
  });
  afterEach(() => {
    (game as any).user = originalUser;
    (game as any).users = originalUsers;
    vi.unstubAllGlobals();
    consoleWarn.mockRestore();
  });

  const query = () => queryActiveGm("rqg.applySpellBehavior", {} as any, "Summon Small Salamander");

  it("returns the GM's answer", async () => {
    expect(await query()).toEqual({ outcome: "applied" });
  });

  it("tells a player without the query permission so, without querying", async () => {
    (game as any).user.can = vi.fn((permission: string) => permission !== "QUERY_USER");

    expect(await query()).toBeUndefined();

    expect(gm.query).not.toHaveBeenCalled();
    const message = vi.mocked(ui.notifications!.warn).mock.calls[0]![0] as string;
    expect(message).toContain("QueryNotPermitted");
    expect(message).toContain("PERMISSION.QueryUser");
  });

  it("reports a failed query as a failure, not as a missing GM", async () => {
    gm.query.mockRejectedValue(new Error("timed out"));

    expect(await query()).toBeUndefined();

    const message = vi.mocked(ui.notifications!.warn).mock.calls[0]![0] as string;
    expect(message).toContain("QueryFailed");
    expect(message).not.toContain("NeedsActiveGm");
  });
});
