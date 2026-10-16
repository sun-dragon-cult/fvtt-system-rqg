import { afterEach, describe, expect, it, vi } from "vitest";
import {
  initSkillBehaviors,
  offersApply,
  skillBehavior,
  skillTargetUuids,
  type SkillApplyScope,
  type SkillBehaviorRegistry,
} from "./skill-behavior";
import { AbilitySuccessLevelEnum } from "../../rolls/ability-roll/ability-roll.defs";

const source = { lang: "en", priority: 0 };

function register(registrations: (registry: SkillBehaviorRegistry) => void): void {
  let fireSetup = () => {};
  vi.stubGlobal("Hooks", {
    once: vi.fn((hook: string, fn: () => void) => {
      if (hook === "setup") {
        fireSetup = fn;
      }
    }),
    callAll: vi.fn((_hook: string, registry: SkillBehaviorRegistry) => registrations(registry)),
  });
  initSkillBehaviors();
  fireSetup();
}

const scope = { skill: { name: "First Aid" } } as SkillApplyScope;

describe("skill behaviors", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("finds what modules registered for a skill rqid, in the world's language", async () => {
    const english = vi.fn().mockResolvedValue({ outcome: "resolved" });
    register((registry) => {
      registry.register("i.skill.first-aid", { apply: english }, source);
      registry.register("i.skill.first-aid", { apply: vi.fn() }, { lang: "sv", priority: 0 });
    });

    expect(await skillBehavior("i.skill.first-aid", "en")?.apply(scope)).toEqual({
      outcome: "resolved",
    });
    expect(english).toHaveBeenCalledWith(scope);
    expect(skillBehavior("i.skill.climb", "en")).toBeUndefined();
  });

  it("logs a failing apply and leaves Apply clickable", async () => {
    vi.stubGlobal("game", { i18n: { format: (key: string) => key } });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    register((registry) => {
      registry.register("i.skill.boom", { apply: () => Promise.reject(new Error("boom")) }, source);
      registry.register("i.skill.odd", { apply: async () => ({ outcome: "oops" }) as any }, source);
    });

    expect(await skillBehavior("i.skill.boom", "en")?.apply(scope)).toBeUndefined();
    expect(await skillBehavior("i.skill.odd", "en")?.apply(scope)).toBeUndefined();
    expect(error).toHaveBeenCalled();
  });

  it("offers Apply only for the listed results", () => {
    const behavior = {
      apply: vi.fn(),
      successLevels: [AbilitySuccessLevelEnum.Success, AbilitySuccessLevelEnum.Fumble],
    };
    expect(offersApply(behavior, AbilitySuccessLevelEnum.Fumble)).toBe(true);
    expect(offersApply(behavior, AbilitySuccessLevelEnum.Failure)).toBe(false);
    expect(offersApply({ apply: vi.fn() }, AbilitySuccessLevelEnum.Failure)).toBe(true);
    expect(offersApply(undefined, AbilitySuccessLevelEnum.Success)).toBe(false);
    expect(offersApply({ apply: vi.fn() }, undefined)).toBe(false);
  });

  it("targets the user's targets, or else the rolling actor", () => {
    const skill = { actor: { uuid: "Actor.healer" } } as any;
    vi.stubGlobal("game", {
      user: { targets: new Set([{ document: { uuid: "Scene.s.Token.a" } }]) },
    });
    expect(skillTargetUuids(skill)).toEqual(["Scene.s.Token.a"]);

    vi.stubGlobal("game", { user: { targets: new Set() } });
    expect(skillTargetUuids(skill)).toEqual(["Actor.healer"]);
  });
});
