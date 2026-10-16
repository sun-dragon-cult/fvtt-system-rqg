import { getRequiredDomDataset, localize } from "../system/util";
import { systemId } from "../system/config";
import { templatePaths } from "../system/load-handlebars-templates";
import { offersApply, skillBehaviorOf } from "../system/skill-behaviors/skill-behavior";
import { updateChatMessage } from "../sockets/socketable-requests";
import { AbilityRoll } from "../rolls/ability-roll/ability-roll";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { AbilityItem } from "@item-model/item-types.ts";

const appliedFlag = "skillBehaviorAppliedUuids";

function appliedTargetUuids(message: ChatMessage): string[] {
  return (message.getFlag(systemId as any, appliedFlag) as string[] | undefined) ?? [];
}

/** The roll and skill of an ability roll card whose skill offers Apply for the result. */
function applicableRoll(
  message: ChatMessage,
): { roll: AbilityRoll; skill: AbilityItem } | undefined {
  const roll = message.rolls[0];
  if (!(roll instanceof AbilityRoll) || !roll.options.abilityUuid) {
    return undefined;
  }
  const skill = fromUuidSync(roll.options.abilityUuid) as AbilityItem | null;
  return skill && offersApply(skillBehaviorOf(skill), roll.successLevel)
    ? { roll, skill }
    : undefined;
}

function isOwnedByUser(uuid: string): boolean {
  return !!(fromUuidSync(uuid) as { isOwner?: boolean } | null)?.isOwner;
}

/** The Apply rows below a skill roll, empty when the skill has no behavior for the result. */
export async function renderSkillBehaviorTargets(message: ChatMessage): Promise<string> {
  const applicable = applicableRoll(message);
  const targetUuids = applicable?.roll.options.targetUuids ?? [];
  if (!targetUuids.length) {
    return "";
  }
  const applied = appliedTargetUuids(message);
  const targets = targetUuids.map((uuid) => ({
    uuid: uuid,
    name:
      (fromUuidSync(uuid) as { name?: string } | null)?.name ??
      localize("RQG.ChatMessage.SpellCast.UnknownTarget"),
    applied: applied.includes(uuid),
    // Only the target's owner applies it, like spell effects
    canApply: isOwnedByUser(uuid),
  }));
  return foundry.applications.handlebars.renderTemplate(templatePaths.skillBehaviorTargets, {
    targets,
  });
}

export async function handleApplySkillBehavior(clickedButton: HTMLButtonElement): Promise<void> {
  const targetUuid = getRequiredDomDataset(clickedButton, "target-uuid");
  const message = game.messages?.get(getRequiredDomDataset(clickedButton, "message-id"));
  const applicable = message ? applicableRoll(message) : undefined;
  const behavior = applicable ? skillBehaviorOf(applicable.skill) : undefined;
  if (
    !message ||
    !applicable ||
    !behavior ||
    !applicable.roll.options.targetUuids?.includes(targetUuid) ||
    !isOwnedByUser(targetUuid)
  ) {
    return;
  }
  // A stale card can still show the button after someone else applied it.
  if (appliedTargetUuids(message).includes(targetUuid)) {
    ui.notifications?.warn(localize("RQG.ChatMessage.SkillBehavior.AlreadyApplied"));
    return;
  }

  const targetDoc = await fromUuid(targetUuid);
  const targetActor = (
    targetDoc instanceof TokenDocument ? targetDoc.actor : targetDoc
  ) as RqgActor | null;
  const actor = applicable.skill.actor as RqgActor | null;
  if (!targetActor || !actor) {
    return;
  }
  const result = await behavior.apply({
    skill: applicable.skill,
    actor: actor,
    targetActor: targetActor,
    targetName: (targetDoc as { name?: string } | null)?.name ?? targetActor.name ?? "",
    successLevel: applicable.roll.successLevel!,
    roll: applicable.roll,
  });
  if (!result) {
    return;
  }
  await updateChatMessage(message, {
    flags: { [systemId]: { [appliedFlag]: [...appliedTargetUuids(message), targetUuid] } },
  } as ChatMessage.UpdateData);
}
