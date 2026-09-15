import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RqgLogger } from "./rqg-logger";
import { RqgError } from "../rqg-error";
import type { RqgErrorEntry } from "../error-registry";

describe("RqgLogger coded errors", () => {
  let logger: RqgLogger;
  let consoleError: ReturnType<typeof vi.spyOn>;

  const bug: RqgErrorEntry = { code: "RQG-B0001", message: "developer only message" };
  const world: RqgErrorEntry = { code: "RQG-W0001", message: "RQG.Test.WorldFix" };

  beforeEach(() => {
    logger = new RqgLogger("TestNamespace");
    consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(ui.notifications!.error).mockClear();
    vi.mocked(ui.notifications!.warn).mockClear();
    // Active locale (e.g. Swedish) resolves the key; English lives in _fallback.
    vi.mocked(game.i18n!.localize).mockImplementation((key: string) =>
      key === "RQG.Test.WorldFix" ? "Åtgärda världen" : key,
    );
    (game.i18n as unknown as { _fallback: Record<string, string> })._fallback = {
      "RQG.Test.WorldFix": "Fix your world",
      "RQG.Notification.Error.Unexpected": "An unexpected error occurred.",
    };
  });

  afterEach(() => {
    consoleError.mockRestore();
    (game.i18n as unknown as { _fallback: Record<string, string> })._fallback = {};
  });

  describe("throw", () => {
    it("throws an RqgError carrying the code, English message, and caller site", () => {
      try {
        logger.throw(world);
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(RqgError);
        expect((e as RqgError).code).toBe("RQG-W0001");
        expect((e as RqgError).message).toBe("Fix your world");
        // Points at this test, not at rqg-logger.ts, and carries no line:col (see callerSite doc).
        expect((e as RqgError).site).toMatch(/rqg-logger\.test\.ts/);
        expect((e as RqgError).site).not.toMatch(/:\d+:\d+/);
      }
    });

    it("bug: generic localized notice + code", () => {
      expect(() => logger.throw(bug)).toThrow();
      expect(ui.notifications!.error).toHaveBeenCalledWith(
        "RQG.Notification.Error.Unexpected (RQG-B0001)",
        { console: false },
      );
    });

    it("world: console English + code + site, notification active locale + code", () => {
      expect(() => logger.throw(world, { some: "data" })).toThrow();
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringMatching(
          /^RQG \| TestNamespace \| RQG-W0001 \| Fix your world \| .*rqg-logger\.test\.ts/,
        ),
        { some: "data" },
      );
      expect(ui.notifications!.error).toHaveBeenCalledWith("Åtgärda världen (RQG-W0001)", {
        console: false,
      });
    });
  });

  describe("error(entry)", () => {
    it("does not throw", () => {
      expect(() => logger.error(bug)).not.toThrow();
      expect(() => logger.error(world)).not.toThrow();
    });

    it("bug: logs with code + site, no user notification (the code recovered)", () => {
      logger.error(bug, { some: "data" });
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringMatching(
          /^RQG \| TestNamespace \| RQG-B0001 \| developer only message \| .*rqg-logger\.test\.ts/,
        ),
        { some: "data" },
      );
      expect(ui.notifications!.error).not.toHaveBeenCalled();
      expect(ui.notifications!.warn).not.toHaveBeenCalled();
    });

    it("world: logs English + site, warns the user in their locale with the code", () => {
      logger.error(world);
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining("RQG | TestNamespace | RQG-W0001 | Fix your world | "),
      );
      expect(ui.notifications!.warn).toHaveBeenCalledWith("Åtgärda världen (RQG-W0001)", {
        console: false,
      });
      expect(ui.notifications!.error).not.toHaveBeenCalled();
    });
  });

  describe("error(string) — unchanged", () => {
    it("logs and shows an error notification by default, with no site suffix", () => {
      logger.error("plain problem");
      expect(consoleError).toHaveBeenCalledWith("RQG | TestNamespace | plain problem");
      expect(ui.notifications!.error).toHaveBeenCalledWith("plain problem", { console: false });
    });

    it("honours { notify: false }", () => {
      logger.error("quiet problem", { notify: false });
      expect(ui.notifications!.error).not.toHaveBeenCalled();
    });
  });
});
