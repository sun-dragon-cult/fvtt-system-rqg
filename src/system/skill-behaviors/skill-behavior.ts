import { systemId } from "../config";
import { localize } from "../util";
import { Rqid } from "../api/rqid-api";
import { callRqgHook } from "../fvtt-type-compat";
import {
  guardModuleCall,
  pickRegistration,
  type SpellBehaviorSource,
} from "../spell-effects/spell-behavior";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { AbilityItem } from "@item-model/item-types.ts";
import type { AbilityRoll } from "../../rolls/ability-roll/ability-roll";
import type { AbilitySuccessLevelEnum } from "../../rolls/ability-roll/ability-roll.defs";

/** What a skill behavior's `apply` runs with, on the client of the target's owner. */
export type SkillApplyScope = {
  skill: AbilityItem;
  /** Who rolled the skill */
  actor: RqgActor;
  targetActor: RqgActor;
  /** The token's own name when the target is a token */
  targetName: string;
  successLevel: AbilitySuccessLevelEnum;
  roll: AbilityRoll;
};

/**
 * What a skill does beyond the roll, registered by modules for a skill rqid. Part of the public
 * API.
 */
export type SkillBehavior = {
  /**
   * Runs when Apply is clicked for a target on the roll card. `{ outcome: "resolved" }` uses up
   * the Apply, undefined leaves it clickable (for example when the dialog was cancelled).
   */
  apply(scope: SkillApplyScope): Promise<{ outcome: "resolved" } | undefined>;
  /** The results Apply is offered for, by default all of them. */
  successLevels?: readonly AbilitySuccessLevelEnum[];
};

export type SkillBehaviorSource = SpellBehaviorSource;

/** What modules get from the `rqg.registerSkillBehaviors` hook. */
export type SkillBehaviorRegistry = {
  register(skillRqid: string, behavior: SkillBehavior, source: SkillBehaviorSource): void;
};

type Registration = SkillBehaviorSource & { behavior: SkillBehavior };

const registrations = new Map<string, Registration[]>();

function guardBehavior(behavior: SkillBehavior): SkillBehavior {
  return {
    apply: async (scope) => {
      const result = await guardModuleCall(
        () =>
          localize("RQG.Notification.Error.SkillBehaviorFailed", {
            skillName: scope.skill.name ?? "",
          }),
        () => behavior.apply(scope),
      );
      // Modules are plain JavaScript, so their results aren't type-checked
      return result?.outcome === "resolved" ? result : undefined;
    },
    successLevels: behavior.successLevels,
  };
}

const registry: SkillBehaviorRegistry = {
  register(skillRqid, behavior, source) {
    const list = registrations.get(skillRqid) ?? [];
    list.push({ ...source, behavior: guardBehavior(behavior) });
    registrations.set(skillRqid, list);
  },
};

/** Lets modules register their skill behaviors once every module has had its init. */
export function initSkillBehaviors(): void {
  Hooks.once("setup", () => {
    callRqgHook("rqg.registerSkillBehaviors", registry);
  });
}

/** The behavior registered for a skill rqid; its `apply` never throws. */
export function skillBehavior(
  skillRqid: string | undefined,
  lang?: string,
): SkillBehavior | undefined {
  const candidates = skillRqid ? registrations.get(skillRqid) : undefined;
  if (!candidates) {
    return undefined;
  }
  const worldLang =
    lang ?? game.settings?.get(systemId, "worldLanguage") ?? CONFIG.RQG.fallbackLanguage;
  return pickRegistration(candidates, worldLang, CONFIG.RQG.fallbackLanguage)?.behavior;
}

export function skillBehaviorOf(skill: AbilityItem): SkillBehavior | undefined {
  return skillBehavior(Rqid.getDocumentFlag(skill)?.id);
}

/** Whether Apply is offered for a result of a skill with this behavior. */
export function offersApply(
  behavior: SkillBehavior | undefined,
  successLevel: AbilitySuccessLevelEnum | undefined,
): boolean {
  return (
    !!behavior && successLevel != null && (behavior.successLevels?.includes(successLevel) ?? true)
  );
}

/** Who Apply is offered for: the user's targets, or else the actor that rolled. */
export function skillTargetUuids(skill: AbilityItem): string[] {
  const targets = [...(game.user?.targets ?? [])]
    .map((token) => token.document?.uuid)
    .filter((uuid): uuid is string => !!uuid);
  const ownUuid = skill.actor?.uuid;
  return targets.length ? targets : ownUuid ? [ownUuid] : [];
}
