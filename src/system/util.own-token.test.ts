import { afterEach, describe, expect, it, vi } from "vitest";
import { getOwnToken } from "./util";

describe("getOwnToken", () => {
  const originalCanvas = (globalThis as any).canvas;
  const scene = { id: "scene" };
  afterEach(() => {
    (globalThis as any).canvas = originalCanvas;
  });

  const actor = (tokens: any[], token: any = null) =>
    ({ token, getDependentTokens: vi.fn(() => tokens) }) as any;

  it("gives a token actor its own token", () => {
    const token = { id: "t" };
    expect(getOwnToken(actor([], token))).toBe(token);
  });

  it("asks only for linked tokens on the viewed scene, a selected one first", () => {
    (globalThis as any).canvas = { ready: true, scene };
    const first = { id: "a", object: { controlled: false } };
    const selected = { id: "b", object: { controlled: true } };
    const a = actor([first, selected]);

    expect(getOwnToken(a)).toBe(selected);
    expect(a.getDependentTokens).toHaveBeenCalledWith({ scenes: scene, linked: true });
  });

  it("gives nothing without a scene", () => {
    (globalThis as any).canvas = undefined;
    expect(getOwnToken(actor([{ id: "a" }]))).toBeUndefined();
  });
});
