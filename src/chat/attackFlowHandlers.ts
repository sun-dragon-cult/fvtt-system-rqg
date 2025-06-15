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
import { DefenceDialogV2 } from "../applications/AttackFlow/defenceDialogV2";
import { systemId } from "../system/config";
import { templatePaths } from "../system/loadHandlebarsTemplates";
import type { RqgActor } from "../actors/rqgActor";
import type { RqgChatMessage } from "./RqgChatMessage";
import { AbilitySuccessLevelEnum } from "../rolls/AbilityRoll/AbilityRoll.defs";
import { updateChatMessage } from "../sockets/SocketableRequests";
import { HitLocationRoll } from "../rolls/HitLocationRoll/HitLocationRoll";
import { DamageRoll } from "../rolls/DamageRoll/DamageRoll";
import { AbilityRoll } from "../rolls/AbilityRoll/AbilityRoll";

/**
 * Open the Defence Dialog to let someone defend against the attack
 */
export async function handleDefence(clickedButton: HTMLButtonElement): Promise<void> {
  const { chatMessageId, attackWeaponUuid } = await getChatMessageInfo(clickedButton);

  const attackingWeapon = (await fromUuid(attackWeaponUuid)) as RqgItem | undefined;
  assertItemType(attackingWeapon?.type, ItemTypeEnum.Weapon);
  await new DefenceDialogV2({
    chatMessageId: chatMessageId,
    // @ts-expect-error render
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
  const hitLocationRoll = HitLocationRoll.fromData(attackChatMessage.system.hitLocationRoll);

  const shouldRollHitLocation = attackChatMessage.system.weaponDoingDamage === "attackingWeapon";

  if (shouldRollHitLocation) {
    await hitLocationRoll.evaluate();
  }

  // @ts-expect-error dice3d
  if (game.dice3d) {
    // TODO figure out if it's attacker or defender that deals damage - hardcoded true now
    const defenderDamage = true;

    // @ts-expect-error author
    const userDealingDamage = defenderDamage ? getGameUser() : attackChatMessage.author;

    // DamageRoll is already evaluated in CombatOutcome to calc weaponDamage
    const damageRoll = DamageRoll.fromData(attackChatMessage.system.damageRoll);
    // @ts-expect-error dice3d
    void game.dice3d.showForRoll(damageRoll, userDealingDamage, true, null, false);
    if (shouldRollHitLocation) {
      // @ts-expect-error dice3d
      await game.dice3d.showForRoll(hitLocationRoll, userDealingDamage, true, null, false);
    }
  }

  const messageData = attackChatMessage.toObject();
  foundry.utils.mergeObject(
    messageData,
    {
      system: {
        attackState: `DamageRolled`,
        hitLocationRoll: shouldRollHitLocation ? hitLocationRoll.toJSON() : null,
      },
    },
    { overwrite: true },
  );

  // @ts-expect-error system
  messageData.content = await renderTemplate(templatePaths.attackChatMessage, messageData.system);

  await updateChatMessage(attackChatMessage, messageData);
}

/**
 * Apply previously rolled damage to the actor pointed to by the actor-damage button
 */
export async function handleApplyActorDamage(clickedButton: HTMLButtonElement): Promise<void> {
  const { chatMessageId } = await getChatMessageInfo(clickedButton);

  const attackChatMessage = getGame().messages?.get(chatMessageId) as
    | StoredDocument<RqgChatMessage>
    | undefined;
  if (!attackChatMessage) {
    // TODO Warn about missing chat message
    return;
  }

  const hitLocationRoll = HitLocationRoll.fromData(attackChatMessage.system.hitLocationRoll);
  requireValue(
    hitLocationRoll.total,
    "HitLocation roll was not evaluated before applying to actor",
  );

  const defenderHitLocationDamage: number | undefined =
    attackChatMessage.system.defenderHitLocationDamage;
  requireValue(
    defenderHitLocationDamage,
    "No defenderHitLocationDamage was calculated before applying to actor",
  );

  const ignoreDefenderAp = attackChatMessage.system.ignoreDefenderAp;
  requireValue(ignoreDefenderAp, "Damage roll was not evaluated before applying to actor");

  const damagedTokenOrActorUuid = attackChatMessage.system.defendingTokenOrActorUuid as string;
  const damagedTokenOrActor = (await fromUuid(damagedTokenOrActorUuid)) as
    | RqgActor
    | TokenDocument
    | undefined;

  const damagedActor =
    damagedTokenOrActor instanceof TokenDocument ? damagedTokenOrActor.actor : damagedTokenOrActor;
  if (
    !damagedActor ||
    (damagedTokenOrActor instanceof Actor && !damagedTokenOrActor?.prototypeToken.actorLink)
  ) {
    ui.notifications?.info("RQG.ChatMessage.Combat.CannotApplyDamageToUnlinkedActor", {
      localize: true,
    });
    return;
  }
  const wasDamagedReducedByParry = !!attackChatMessage.system.damagedWeaponUuid;

  const attackRoll = AbilityRoll.fromData(attackChatMessage.system.attackRoll);

  await damagedActor.applyDamage(
    defenderHitLocationDamage,
    hitLocationRoll.total,
    ignoreDefenderAp,
    true,
    attackChatMessage.system.attackCombatManeuver.damageType,
    wasDamagedReducedByParry,
    attackRoll.successLevel,
  );

  const messageData = attackChatMessage.toObject();
  const messageDataUpdate = {
    system: {
      actorDamagedApplied: true,
    },
  };
  foundry.utils.mergeObject(messageData, messageDataUpdate, { overwrite: true });

  // @ts-expect-error system
  messageData.content = await renderTemplate(templatePaths.attackChatMessage, messageData.system);

  await updateChatMessage(attackChatMessage, messageData);
}

/**
 * Reduce weapon HP by the number of points specified by the data-weapon-damage dataset on the button
 * or by looking at the system data?
 */
export async function handleApplyWeaponDamage(clickedButton: HTMLButtonElement): Promise<void> {
  const { chatMessageId } = await getChatMessageInfo(clickedButton);

  const attackChatMessage = getGame().messages?.get(chatMessageId);
  if (!attackChatMessage) {
    // TODO Warn about missing chat message
    return;
  }

  // @ts-expect-error system
  const weaponDamage: number | undefined = attackChatMessage.system.weaponDamage;
  // @ts-expect-error system
  const damagedWeaponUuid: string = attackChatMessage.system.damagedWeaponUuid;
  const damagedWeapon = (await fromUuid(damagedWeaponUuid)) as RqgItem | undefined;

  if (damagedWeapon?.system.isNatural) {
    const msg = localize("RQG.ChatMessage.Combat.ApplyNaturalWeaponDamageNotImplemented", {
      weaponDamage: weaponDamage,
    });
    // TODO inflict damage to the correct hit location - how to know where?
    // @ts-expect-error console
    ui.notifications?.info(msg, { permanent: true, console: false });
  } else {
    const currentWeaponHp = damagedWeapon?.system.hitPoints.value;
    const newWeaponHp = currentWeaponHp - (weaponDamage ?? 0);

    await damagedWeapon?.update({ system: { hitPoints: { value: newWeaponHp } } });
  }

  const messageData = attackChatMessage.toObject();

  const messageDataUpdate = {
    system: {
      weaponDamageApplied: true,
    },
  };
  foundry.utils.mergeObject(messageData, messageDataUpdate, { overwrite: true });

  // @ts-expect-error system
  messageData.content = await renderTemplate(templatePaths.attackChatMessage, messageData.system);
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
      system: {
        attackerFumbled: false,
        attackerFumbleOutcome: fumbleOutcome,
      },
    };
  } else if (fumblingActor === "defender") {
    messageDataUpdate = {
      system: {
        defenderFumbled: false,
        defenderFumbleOutcome: fumbleOutcome,
      },
    };
  } else {
    throw new RqgError("Got unknown value in fumble button");
  }
  foundry.utils.mergeObject(messageData, messageDataUpdate, { overwrite: true });
  // @ts-expect-error system
  messageData.content = await renderTemplate(templatePaths.attackChatMessage, messageData.system);

  await updateChatMessage(attackChatMessage, messageData);
}

async function fumbleRoll(): Promise<string> {
  const fumbleTableName = getGame().settings.get(systemId, "fumbleRollTable");
  const fumbleTable = getGame().tables?.getName(fumbleTableName);
  if (!fumbleTable) {
    logMisconfiguration(
      localize("RQG.RQGSystem.Error.FumbleTableMissing", {
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
 * TODO How to decide what should be in html and what should be in system data?
 */
async function getChatMessageInfo(button: HTMLElement): Promise<{
  chatMessageId: string;
  attackWeaponUuid: string;
}> {
  const chatMessageId = getRequiredDomDataset(button, "message-id");
  const chatMessage = getGame().messages?.get(chatMessageId) as RqgChatMessage | undefined;

  const attackWeaponUuid = chatMessage?.system.attackWeaponUuid as string | undefined;
  if (!attackWeaponUuid) {
    throw new RqgError("No attackWeapon in chat system data", chatMessage);
  }
  return {
    chatMessageId: chatMessageId,
    attackWeaponUuid: attackWeaponUuid,
  };
}

export function getBasicOutcomeDescription(
  defence: string | undefined,
  attackSuccessLevel: AbilitySuccessLevelEnum,
  defenceSuccessLevel: AbilitySuccessLevelEnum | undefined,
): string {
  switch (defence) {
    case "dodge": {
      return localize(
        `RQG.Game.DodgeResults.${attackSuccessLevel}-${defenceSuccessLevel ?? AbilitySuccessLevelEnum.Failure}`,
      );
    }

    case "parry":
    default: {
      // Ignore (undefined defenceSuccessLevel) is handled like a failed parry
      return localize(
        `RQG.Game.AttackParryResults.${attackSuccessLevel}-${defenceSuccessLevel ?? AbilitySuccessLevelEnum.Failure}`,
      );
    }
  }
}
