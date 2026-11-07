import { afterEach, describe, expect, it, vi } from "vitest";
import { getTokenFromActor } from "./util";

describe("getTokenFromActor", () => {
  const originalCanvas = (globalThis as any).canvas;
  const originalScenes = (game as any).scenes;
  afterEach(() => {
    (globalThis as any).canvas = originalCanvas;
    (game as any).scenes = originalScenes;
  });

  const sceneWith = (tokens: any[]) => ({
    tokens: { get: (id: string) => tokens.find((t) => t.id === id) },
  });
  const actor = (tokens: any[], token: any = null) =>
    ({ id: "a", token, getDependentTokens: vi.fn(() => tokens) }) as any;

  it("gives a token actor its own token", () => {
    const token = { id: "t" };
    expect(getTokenFromActor(actor([], token), { linked: true })).toBe(token);
  });

  it("asks for linked tokens on the viewed scene, a selected one first", () => {
    const first = { id: "a", object: { controlled: false } };
    const selected = { id: "b", object: { controlled: true } };
    const scene = sceneWith([first, selected]);
    (globalThis as any).canvas = { ready: true, scene };
    const a = actor([first, selected]);

    expect(getTokenFromActor(a, { linked: true })).toBe(selected);
    expect(a.getDependentTokens).toHaveBeenCalledWith({ scenes: scene, linked: true });
  });

  it("skips a dependent token that is no longer on the scene", () => {
    const deleted = { id: "a", object: { controlled: true } };
    const live = { id: "b", object: { controlled: false } };
    (globalThis as any).canvas = { ready: true, scene: sceneWith([live]) };

    expect(getTokenFromActor(actor([deleted, live]))).toBe(live);
  });

  it("only takes a linked token from the active scene without a canvas", () => {
    (globalThis as any).canvas = undefined;
    const unlinked = { actorId: "a", actorLink: false };
    const linked = { actorId: "a", actorLink: true };
    (game as any).scenes = {
      current: { tokens: [unlinked, linked] },
    };

    expect(getTokenFromActor(actor([]))).toBe(unlinked);
    expect(getTokenFromActor(actor([]), { linked: true })).toBe(linked);
  });
});
