import type { RqgItem } from "../items/rqgItem";
import {
  assertItemType,
  getGame,
  getGameUser,
  getRequiredDomDataset,
  localize,
  logMisconfiguration,
  requireValue,
  RqgError,
} from "../system/util";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { DefenceType } from "./RqgChatMessage.types";
import { DefenceDialog } from "../applications/AttackFlow/defenceDialog";
import { systemId } from "../system/config";
import { templatePaths } from "../system/loadHandlebarsTemplates";
import { RqgActor } from "../actors/rqgActor";
import type { RqgChatMessage } from "./RqgChatMessage";
import { AbilitySuccessLevelEnum } from "../rolls/AbilityRoll/AbilityRoll.defs";
import { updateChatMessage } from "../sockets/SocketableRequests";

/**
 * Open the Defence Dialog to let someone defend against the attack
 */
export async function handleDefence(clickedButton: HTMLButtonElement): Promise<void> {
  const { chatMessageId, attackWeaponUuid } = await getChatMessageInfo(clickedButton);

  const attackingWeapon = (await fromUuid(attackWeaponUuid)) as RqgItem | undefined;
  assertItemType(attackingWeapon?.type, ItemTypeEnum.Weapon);
  const defence = getRequiredDomDataset(clickedButton, "defence") as DefenceType;
  await new DefenceDialog(attackingWeapon, {
    defenceType: defence,
    chatMessageId: chatMessageId,
  }).render(true);
}

/**
 * Roll Damage and hit location rolls and update AttackChat with new state
 */
export async function handleRollDamageAndHitLocation(
  clickedButton: HTMLButtonElement,
): Promise<void> {
  const { chatMessageId } = await getChatMessageInfo(clickedButton);

  const attackChatMessage = getGame().messages?.get(chatMessageId) as RqgChatMessage | undefined;
  if (!attackChatMessage) {
    // TODO Warn about missing chat message
    return;
  }
  const hitLocationRoll = Roll.fromData(
    attackChatMessage.getFlag(systemId, "chat.hitLocationRoll"),
  );

  await hitLocationRoll.evaluate();

  // @ts-expect-error dice3d
  if (game.dice3d) {
    // TODO figure out if it's attacker or defender that deals damage - hardcoded true now
    const defenderDamage = true;

    // @ts-expect-error author
    const userDealingDamage = defenderDamage ? getGameUser() : attackChatMessage.author;

    // DamageRoll is already evaluated in CombatOutcome to calc weaponDamage
    const damageRoll = Roll.fromData(attackChatMessage.getFlag(systemId, "chat.damageRoll"));
    // @ts-expect-error dice3d
    void game.dice3d.showForRoll(damageRoll, userDealingDamage, true, null, false);
    // @ts-expect-error dice3d
    await game.dice3d.showForRoll(hitLocationRoll, userDealingDamage, true, null, false);
  }

  const messageData = attackChatMessage.toObject();
  foundry.utils.mergeObject(
    messageData,
    {
      flags: {
        [systemId]: {
          chat: {
            attackState: `DamageRolled`,
            hitLocationRoll: hitLocationRoll.toJSON(),
          },
        },
      },
    },
    { overwrite: true },
  );

  messageData.content = await renderTemplate(
    templatePaths.attackChatMessage,
    messageData.flags.rqg!.chat!,
  );

  await updateChatMessage(attackChatMessage, messageData);
}

/**
 * Apply previously rolled damage to the actor pointed to by the actor-damage button
 */
export async function handleApplyActorDamage(clickedButton: HTMLButtonElement): Promise<void> {
  const { chatMessageId } = await getChatMessageInfo(clickedButton);

  const attackChatMessage = getGame().messages?.get(chatMessageId);
  if (!attackChatMessage) {
    // TODO Warn about missing chat message
    return;
  }

  const hitLocationRoll = Roll.fromData(
    attackChatMessage.getFlag(systemId, "chat.hitLocationRoll"),
  );
  requireValue(
    hitLocationRoll.total,
    "HitLocation roll was not evaluated before applying to actor",
  );

  const defenderHitLocationDamage: number | undefined = attackChatMessage.getFlag(
    systemId,
    "chat.defenderHitLocationDamage",
  );
  requireValue(
    defenderHitLocationDamage,
    "No defenderHitLocationDamage was calculated before applying to actor",
  );

  const ignoreDefenderAp = attackChatMessage.getFlag(systemId, "chat.ignoreDefenderAp");
  requireValue(ignoreDefenderAp, "Damage roll was not evaluated before applying to actor");

  const damagedActorUuid = attackChatMessage.getFlag(systemId, "chat.defendingActorUuid") as string;
  const damagedActor = (await fromUuid(damagedActorUuid)) as RqgActor | undefined;
  if (!damagedActor) {
    // TODO Warn about missing token
    return;
  }
  await damagedActor.applyDamage(
    defenderHitLocationDamage,
    hitLocationRoll.total,
    ignoreDefenderAp,
  );

  const messageData = attackChatMessage.toObject();
  const messageDataUpdate = {
    flags: {
      [systemId]: {
        chat: {
          actorDamagedApplied: true,
        },
      },
    },
  };
  foundry.utils.mergeObject(messageData, messageDataUpdate, { overwrite: true });

  messageData.content = await renderTemplate(
    templatePaths.attackChatMessage,
    messageData.flags[systemId]!.chat!,
  );

  await updateChatMessage(attackChatMessage, messageData);
}

/**
 * Reduce weapon HP by the number of points specified by the data-weapon-damage dataset on the button
 * or by looking at the flag data?
 */
export async function handleApplyWeaponDamage(clickedButton: HTMLButtonElement): Promise<void> {
  const { chatMessageId } = await getChatMessageInfo(clickedButton);

  const attackChatMessage = getGame().messages?.get(chatMessageId);
  if (!attackChatMessage) {
    // TODO Warn about missing chat message
    return;
  }

  const weaponDamage: number | undefined = attackChatMessage.getFlag(systemId, "chat.weaponDamage");
  const damagedWeaponUuid: string = attackChatMessage.getFlag(systemId, "chat.damagedWeaponUuid");
  const damagedWeapon = (await fromUuid(damagedWeaponUuid)) as RqgItem | undefined;

  const currentWeaponHp = damagedWeapon?.system.hitPoints.value;
  const newWeaponHp = currentWeaponHp - weaponDamage;

  await damagedWeapon?.update({ system: { hitPoints: { value: newWeaponHp } } });

  const messageData = attackChatMessage.toObject();

  const messageDataUpdate = {
    flags: {
      [systemId]: {
        chat: {
          weaponDamageApplied: true,
        },
      },
    },
  };
  foundry.utils.mergeObject(messageData, messageDataUpdate, { overwrite: true });

  messageData.content = await renderTemplate(
    templatePaths.attackChatMessage,
    messageData.flags[systemId]!.chat!,
  );
  await updateChatMessage(attackChatMessage, messageData);
}

/**
 * Roll the fumble rolltable and put the result in fumbleOutcome
 */
export async function handleRollFumble(clickedButton: HTMLButtonElement): Promise<void> {
  const chatMessageId = getRequiredDomDataset(clickedButton, "message-id");
  const fumblingActor = getRequiredDomDataset(clickedButton, "fumble");
  const attackChatMessage = getGame().messages?.get(chatMessageId) as RqgChatMessage | undefined;
  if (!attackChatMessage) {
    throw new RqgError("Couldn't find attack chat message");
  }

  const fumbleOutcome = await fumbleRoll();

  const messageData = attackChatMessage.toObject();
  let messageDataUpdate;

  if (fumblingActor === "attacker") {
    messageDataUpdate = {
      flags: {
        [systemId]: {
          chat: {
            attackerFumbled: false,
            attackerFumbleOutcome: fumbleOutcome,
          },
        },
      },
    };
  } else if (fumblingActor === "defender") {
    messageDataUpdate = {
      flags: {
        [systemId]: {
          chat: {
            defenderFumbled: false,
            defenderFumbleOutcome: fumbleOutcome,
          },
        },
      },
    };
  } else {
    throw new RqgError("Got unknown value in fumble button");
  }
  foundry.utils.mergeObject(messageData, messageDataUpdate, { overwrite: true });
  messageData.content = await renderTemplate(
    templatePaths.attackChatMessage,
    messageData.flags[systemId]!.chat!,
  );

  await updateChatMessage(attackChatMessage, messageData);
}

async function fumbleRoll(): Promise<string> {
  const fumbleTableName = getGame().settings.get(systemId, "fumbleRollTable");
  const fumbleTable = getGame().tables?.getName(fumbleTableName);
  if (!fumbleTable) {
    logMisconfiguration(
      localize("RQG.Dialog.weaponChat.FumbleTableMissingWarn", {
        fumbleTableName: fumbleTableName,
      }),
      true,
    );
    return "";
  }
  // @ts-expect-error draw
  const draw = await fumbleTable.draw({ displayChat: false });
  const text = draw.results.map((r: any) => `${r.text}<br>`); // TODO is TableResult

  return await TextEditor.enrichHTML(text);
}

/**
 * Utility function to extract data from the AttackChat html.
 * TODO How to decide what should be in html and what should be in flags?
 */
async function getChatMessageInfo(button: HTMLElement): Promise<{
  chatMessageId: string;
  attackWeaponUuid: string;
  defenceWeaponUuid: string | undefined;
}> {
  const chatMessageId = getRequiredDomDataset(button, "message-id");
  const chatMessage = getGame().messages?.get(chatMessageId) as RqgChatMessage | undefined;

  const attackWeaponUuid = chatMessage?.getFlag(systemId, "chat.attackWeaponUuid") as
    | string
    | undefined;
  if (!attackWeaponUuid) {
    throw new RqgError("No attackWeapon in chatFlags", chatMessage);
  }
  const defenceWeaponUuid = chatMessage?.getFlag(systemId, "chat.defenceWeaponUuid") as
    | string
    | undefined;
  return {
    chatMessageId: chatMessageId,
    attackWeaponUuid: attackWeaponUuid,
    defenceWeaponUuid: defenceWeaponUuid,
  };
}

export function getBasicOutcomeDescription(
  defence: string | undefined,
  attackSuccessLevel: AbilitySuccessLevelEnum,
  defenceSuccessLevel: AbilitySuccessLevelEnum | undefined,
): string {
  switch (defence) {
    case "dodge": {
      return localize(`RQG.Game.DodgeResults.${attackSuccessLevel}-${defenceSuccessLevel ?? 5}`);
    }

    case "parry":
    default: {
      // Ignore (undefined defenceSuccessLevel) is handled like a failed parry (5)
      return localize(
        `RQG.Game.AttackParryResults.${attackSuccessLevel}-${defenceSuccessLevel ?? 5}`,
      );
    }
  }
}

/**
 * Optionally hide the display of chat card elements which should not be shown to user
 */
export const hideChatActionButtons = function (html: HTMLElement | undefined): void {
  if (getGameUser().isGM) {
    return; // Do not hide anything from GM
  }

  // Otherwise conceal elements for unrelated actors/players
  const maybeHideElements = html?.querySelectorAll(".rqg.chat-card [data-visible-actor-uuid]");

  maybeHideElements?.forEach((el: Element) => {
    if (!(el instanceof HTMLElement)) {
      return;
    }
    // @ts-expect-error fromUuidSync
    const actor = fromUuidSync(el.dataset.visibleActorUuid);
    if (actor && !actor?.isOwner) {
      el.style.display = "none";
    }
  });
};
