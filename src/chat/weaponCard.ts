import { Ability, ResultEnum } from "../data-model/shared/ability";
import { RqgActor } from "../actors/rqgActor";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import {
  activateChatTab,
  assertItemType,
  getActorFromIds,
  getGame,
  getGameUser,
  getSpeakerName,
  hasOwnProperty,
  localize,
  logMisconfiguration,
  moveCursorToEnd,
  requireValue,
  RqgError,
  usersThatOwnActor,
} from "../system/util";
import { DeepPartial } from "snowpack";
import {
  ItemDataProperties,
  ItemDataSource,
} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData";
import { ChatMessageDataConstructorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatMessageData";
import { CombatManeuver, DamageType, Usage } from "../data-model/item-data/weaponData";

type WeaponCardFlags = {
  actorId: string;
  tokenId: string | null;
  skillItemData: ItemDataProperties;
  weaponItemData: ItemDataProperties;
  usage: string; // oneHand | twoHand | offhand | missile
  result: ResultEnum | undefined;
  specialDamageTypeText: string | undefined;
  formData: {
    modifier: number | null; // Null is a placeholder instead of 0 to keep modifier in the object
    chance: number;
    combatManeuver: string | undefined;
  };
};

enum DamageRollTypeEnum {
  Normal = "normal",
  Special = "special",
  MaxSpecial = "maxSpecial",
}

export class WeaponCard extends ChatMessage {
  // TODO Should it extend ChatMessage?
  public static async show(
    weaponId: string,
    usage: string,
    skillId: string,
    actor: RqgActor,
    token: TokenDocument | null
  ): Promise<void> {
    requireValue(actor.id, "No id on actor");
    const skillItem = actor.items.get(skillId);
    if (!skillItem || skillItem.data.type !== ItemTypeEnum.Skill) {
      const msg = localize("RQG.Dialog.weaponCard.CantFindSkillError", {skillId: skillItem, actorName: actor.name});
      ui.notifications?.error(msg);
      throw new RqgError(msg);
    }
    const weaponItem = actor.items.get(weaponId);
    assertItemType(weaponItem?.data.type, ItemTypeEnum.Weapon);

    const flags: WeaponCardFlags = {
      actorId: actor.id,
      tokenId: token?.id ?? null,
      skillItemData: skillItem.data.toObject(false) as unknown as ItemDataProperties,
      weaponItemData: weaponItem.data.toObject(false) as unknown as ItemDataProperties,
      usage: usage,
      specialDamageTypeText: undefined,
      result: undefined,
      formData: {
        modifier: null,
        chance: skillItem.data.data.chance || 0,
        combatManeuver: undefined,
      },
    };

    await ChatMessage.create(await WeaponCard.renderContent(flags));
    activateChatTab();
  }

  public static async inputChangeHandler(ev: Event, messageId: string): Promise<void> {
    const chatMessage = getGame().messages?.get(messageId);
    const flags = chatMessage?.data.flags.rqg as WeaponCardFlags;
    const form = (ev.target as HTMLElement).closest("form") as HTMLFormElement;
    const formData = new FormData(form);
    // @ts-ignore formData.entries
    for (const [name, value] of formData.entries()) {
      if (name in flags.formData) {
        // @ts-ignore number/string mismatch
        flags.formData[name as keyof typeof flags.formData] = value;
      }
    }
    const chance: number =
      (hasOwnProperty(flags.skillItemData.data, "chance") &&
        Number(flags.skillItemData.data.chance)) ||
      0;
    const modifier: number = Number(flags.formData.modifier) || 0;
    flags.formData.chance = WeaponCard.calcRollChance(chance, modifier);

    const data = await WeaponCard.renderContent(flags);
    if (!chatMessage || !data || !flags.formData.modifier) {
      return; // Not ready to update chatmessages
    }
    const domChatMessages = document.querySelectorAll(`[data-message-id="${chatMessage.id}"]`);
    const domChatMessage = Array.from(domChatMessages).find((m) =>
      m.contains(ev.currentTarget as Node)
    );
    const isFromPopoutChat = !!domChatMessage?.closest(".chat-popout");
    await chatMessage.update(data); // Rerenders the dom chatmessages

    const newDomChatMessages = document.querySelectorAll(`[data-message-id="${chatMessage.id}"]`);
    const newDomChatMessage = Array.from(newDomChatMessages).find(
      (m) => !!m.closest(".chat-popout") === isFromPopoutChat
    );
    const inputElement = newDomChatMessage?.querySelector("input");
    inputElement && moveCursorToEnd(inputElement);
    // @ts-ignore is marked as private!?
    ui.chat?.scrollBottom(); // Fix that he weapon card gets bigger and pushes the rest of the chatlog down
  }

  public static async formSubmitHandler(
    ev: JQueryEventObject,
    messageId: string
  ): Promise<boolean> {
    ev.preventDefault();

    // @ts-ignore submitter
    const actionButton = ev.originalEvent.submitter as HTMLButtonElement;
    actionButton.disabled = true;
    setTimeout(() => (actionButton.disabled = false), 1000); // Prevent double clicks

    const chatMessage = getGame().messages?.get(messageId);
    const flags = chatMessage?.data.flags.rqg as WeaponCardFlags;

    const formData = new FormData(ev.target as HTMLFormElement);
    // @ts-ignore formData.entries
    for (const [name, value] of formData.entries()) {
      if (name in flags.formData) {
        // @ts-ignore number/string mismatch
        flags.formData[name as keyof typeof flags.formData] = value;
      }
    }
    const actor = getActorFromIds(flags.actorId, flags.tokenId);
    if (!actor) {
      ui.notifications?.warn(localize("RQG.Dialog.weaponCard.CantFindActorWarn"));
      return false;
    }

    switch (actionButton.name) {
      case "combatManeuver":
        flags.formData.combatManeuver = (ev as any).originalEvent.submitter.value;

        const weaponUsage: Usage = (flags.weaponItemData.data as any).usage[flags.usage];
        const combatManeuver = weaponUsage.combatManeuvers.find(
          (m) => m.name === flags.formData.combatManeuver
        );
        const damageType = combatManeuver?.damageType;
        const specialDamageTypeDescription =
          damageType === "special" ? combatManeuver?.description || undefined : undefined;

        flags.specialDamageTypeText =
          specialDamageTypeDescription ??
          CONFIG.RQG.combatManeuvers.get(combatManeuver?.name ?? "")?.specialDescriptionHtml;

        const projectileItemData =
          hasOwnProperty(flags.weaponItemData.data, "isProjectileWeapon") &&
          flags.weaponItemData.data.isProjectileWeapon
            ? actor.items.get(flags.weaponItemData.data.projectileId)?.data
            : flags.weaponItemData; // Thrown (or melee)

        let originalAmmoQty: number = 0;    

        // Decrease quantity of linked projectile if shooting
        if (
          projectileItemData?.type === ItemTypeEnum.Weapon &&
          projectileItemData.data.quantity &&
          projectileItemData.data.quantity > 0 &&
          flags.usage === "missile" &&
          !["parry", "special"].includes(damageType ?? "")
        ) {
          originalAmmoQty = projectileItemData.data.quantity;
          const updateData: DeepPartial<ItemDataSource> = {
            _id: projectileItemData._id,
            // TODO Update chatcard data as well !!!!! ***************
            data: { quantity: --projectileItemData.data.quantity },
          };
          await actor.updateEmbeddedDocuments("Item", [updateData]);
        }

        if (flags.usage === "missile" && !projectileItemData) {
          ui.notifications?.warn("Out of ammo!");
          return false;
        }

        // Prevent using weapons with projectile quantity 0
        if (
          projectileItemData?.type === ItemTypeEnum.Weapon &&
          projectileItemData.data.quantity != null &&
          projectileItemData.data.quantity <= 0
        ) {
          if (originalAmmoQty > 0) {
            ui.notifications?.warn(localize("RQG.Dialog.weaponCard.UsedLastOfAmmoWarn", {projectileName: projectileItemData.name}));
          } else {
            ui.notifications?.warn(localize("RQG.Dialog.weaponCard.OutOfAmmoWarn", {projectileName: projectileItemData.name, combatManeuverName: combatManeuver?.name}));
            return false;
          }
        }

        if (!chatMessage) {
          const msg = localize("RQG.Dialog.weaponCard.CantFindChatMessageError");
          ui.notifications?.error(msg);
          throw new RqgError(msg);
        }
        await WeaponCard.roll(flags, chatMessage);
        return false;

      case "damageRoll":
        // @ts-ignore submitter
        const damageRollType: DamageRollTypeEnum = ev.originalEvent.submitter.value;
        await WeaponCard.damageRoll(flags, damageRollType);
        return false;

      case "hitLocationRoll":
        const roll = new Roll("1d20");
        await roll.evaluate({ async: true });
        const speakerName = getSpeakerName(flags.actorId, flags.tokenId);
        await roll.toMessage({
          speaker: { alias: speakerName },
          type: CONST.CHAT_MESSAGE_TYPES.ROLL,
          flavor: localize("RQG.Dialog.weaponCard.HitLocationRollFlavor"),
        });
        return false;

      case "fumble":
        await WeaponCard.fumbleRoll(flags);
        return false;

      default:
        const msg = localize("RQG.Dialog.weaponCard.UnknownButtonInCardError", {actionButton: actionButton});
        ui.notifications?.error(msg);
        throw new RqgError(msg);
    }
  }

  public static async roll(flags: WeaponCardFlags, chatMessage: ChatMessage) {
    const modifier: number = Number(flags.formData.modifier) || 0;
    const chance: number =
      (hasOwnProperty(flags.skillItemData.data, "chance") &&
        Number(flags.skillItemData.data.chance)) ||
      0;
    const actor = getActorFromIds(flags.actorId, flags.tokenId);
    if (actor) {
      const speakerName = getSpeakerName(flags.actorId, flags.tokenId);
      const skillSpecialization = (flags.skillItemData.data as any).specialization
        ? ` (${(flags.skillItemData.data as any).specialization})`
        : "";
      const skillName = (flags.skillItemData.data as any).skillName + skillSpecialization;
      flags.result = await Ability.roll(
        flags.skillItemData.name + " " + flags.formData.combatManeuver,
        chance,
        modifier,
        speakerName
      );
      await WeaponCard.checkExperience(actor, flags.skillItemData, flags.result);
    } else {
      ui.notifications?.warn("Couldn't find world actor to do weapon roll");
    }

    const data = await WeaponCard.renderContent(flags);
    await chatMessage.update(data);
  }

  public static async checkExperience(
    actor: RqgActor,
    skillItemData: ItemDataProperties,
    result: ResultEnum
  ): Promise<void> {
    assertItemType(skillItemData.type, ItemTypeEnum.Skill);
    if (result <= ResultEnum.Success) {
      actor.AwardExperience(skillItemData._id);
    }
  }

  private static async renderContent(flags: WeaponCardFlags): Promise<object> {
    let html = await renderTemplate("systems/rqg/chat/weaponCard.hbs", flags);
    const speakerName = getSpeakerName(flags.actorId, flags.tokenId);
    return {
      flavor: localize("RQG.Dialog.weaponCard.WeaponCardFlavor", {weaponName: flags.weaponItemData.name}),
      user: getGameUser().id,
      speaker: { alias: speakerName },
      content: html,
      whisper: usersThatOwnActor(getActorFromIds(flags.actorId, flags.tokenId)),
      type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
      flags: {
        core: { canPopout: true },
        rqg: flags,
      },
    };
  }

  private static calcRollChance(value: number, modifier: number): number {
    return value + modifier;
  }

  private static async damageRoll(
    flags: WeaponCardFlags,
    damageRollType: DamageRollTypeEnum
  ): Promise<void> {
    requireValue(
      flags.formData.combatManeuver,
      localize("RQG.Dialog.weaponCard.NoCombatManeuverInDamageRollError"),
      flags,
      damageRollType
    );

    const actor = getActorFromIds(flags.actorId, flags.tokenId);
    if (!actor) {
      ui.notifications?.warn(localize("RQG.Dialog.weaponCard.CantFindActorToDoDamageRollWarn"));
      return;
    }
    let damageBonusFormula: string =
      actor.data.data.attributes.damageBonus !== "0"
        ? `${actor.data.data.attributes.damageBonus}`
        : "";

    assertItemType(flags.weaponItemData.type, ItemTypeEnum.Weapon);
    const weaponUsage: Usage = (flags.weaponItemData.data.usage as any)[flags.usage];
    const weaponDamageTag = localize("RQG.Dialog.weaponCard.WeaponDamageTag");
    const weaponDamage = hasOwnProperty(weaponUsage, "damage")
      ? Roll.parse(`(${weaponUsage.damage})[${weaponDamageTag}]`, {})
      : [];

    if (flags.usage === "missile") {
      const missileWeaponData = flags.weaponItemData;

      if (missileWeaponData.data.isThrownWeapon) {
        damageBonusFormula = "ceil(" + actor.data.data.attributes.damageBonus + "/2)";
      } else {
        damageBonusFormula = "";
      }
    }

    const damageRollTerms =
      hasOwnProperty(weaponUsage, "damage") && weaponUsage.damage ? weaponDamage : []; // Don't add 0 damage rollTerm

    const damageType = weaponUsage.combatManeuvers.find(
      (m) => m.name === flags.formData.combatManeuver
    )?.damageType;
    requireValue(damageType, localize("RQG.Dialog.weaponCard.WeaponDoesNotHaveCombatManeuverError"));

    if ([DamageRollTypeEnum.Special, DamageRollTypeEnum.MaxSpecial].includes(damageRollType)) {
      if (["slash", "impale"].includes(damageType)) {
        damageRollTerms.push(...WeaponCard.slashImpaleSpecialDamage(weaponUsage.damage));
      } else if (damageType === "crush") {
        damageRollTerms.push(...(await WeaponCard.crushSpecialDamage(damageBonusFormula)));
      } else if (damageType === "parry") {
        // Parry will use crush if existing or slash/impale if not, will work unless some weapon has both crush & slash
        // No weapon in the core rulebook has that though
        const usedParryingDamageType = WeaponCard.getDamageTypeString(
          damageType,
          weaponUsage.combatManeuvers
        );
        if (usedParryingDamageType === "crush") {
          damageRollTerms.push(...(await WeaponCard.crushSpecialDamage(damageBonusFormula)));
        } else if (["slash", "impale"].includes(usedParryingDamageType)) {
          damageRollTerms.push(...WeaponCard.slashImpaleSpecialDamage(weaponUsage.damage));
        } else {
          logMisconfiguration(
            localize("RQG.Dialog.weaponCard.WeaponDoesNotHaveCombatManeuverError", {weaponName: flags.weaponItemData.name}),
            true
          );
        }
      }
    }
    if (damageBonusFormula.length) {
      const damageBonusDamageTag = localize("RQG.Dialog.weaponCard.DamageBonusDamageTag");
      damageRollTerms.push(...Roll.parse(`+ ${damageBonusFormula}[${damageBonusDamageTag}]`, {}));
    }
    const maximise = damageRollType === DamageRollTypeEnum.MaxSpecial;
    const roll = Roll.fromTerms(damageRollTerms);
    await roll.evaluate({
      maximize: maximise,
      async: true,
    });
    const speakerName = getSpeakerName(flags.actorId, flags.tokenId);
    await roll.toMessage({
      speaker: { alias: speakerName },
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      flavor: `${localize("RQG.Dialog.weaponCard.Damage")}: ${WeaponCard.getDamageTypeString(damageType, weaponUsage.combatManeuvers)}`,
    });
  }

  private static getDamageTypeString(
    damageType: DamageType,
    combatManeuvers: CombatManeuver[]
  ): string {
    if (damageType === "parry") {
      if (combatManeuvers.some((cm) => cm.damageType === "crush")) {
        damageType = "crush";
      } else if (combatManeuvers.some((cm) => cm.damageType === "slash")) {
        damageType = "slash";
      } else if (combatManeuvers.some((cm) => cm.damageType === "impale")) {
        damageType = "impale";
      }
    }
    return damageType;
  }

  private static async fumbleRoll(flags: WeaponCardFlags) {
    const fumbleTableName = getGame().settings.get("rqg", "fumbleRollTable");
    const fumbleTable = getGame().tables?.getName(fumbleTableName);
    if (!fumbleTable) {
      logMisconfiguration(localize("RQG.Dialog.weaponCard.FumbleTableMissingWarn", {fumbleTableName: fumbleTableName}), true);
      return;
    }
    // @ts-ignore TODO draw StoredDocument<RollTable>
    const draw = await fumbleTable.draw({ displayChat: false });
    // Construct chat data
    const numberOfResults = draw.results.length > 1 ? 
        localize("RQG.Dialog.weaponCard.PluralResults", {numberOfResults: draw.results.length}) 
        : localize("RQG.Dialog.weaponCard.SingularResult");
    const speakerName = getSpeakerName(flags.actorId, flags.tokenId);
    const messageData: ChatMessageDataConstructorData = {
      flavor: localize("RQG.Dialog.weaponCard.DamageBonusDamageTag", {numberOfResults: numberOfResults, fumbleTableName: fumbleTableName}),
      user: getGameUser().id,
      speaker: { alias: speakerName },
      whisper: usersThatOwnActor(getActorFromIds(flags.actorId, flags.tokenId)),
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: draw.roll,
      sound: draw.roll ? CONFIG.sounds.dice : null,
      flags: { "core.RollTable": fumbleTable.id },
    };

    // Render the chat card which combines the dice roll with the drawn results
    messageData.content = await renderTemplate(CONFIG.RollTable.resultTemplate, {
      // @ts-ignore entities TODO check definitions
      description: TextEditor.enrichHTML(fumbleTable.data.description, { entities: true }),
      results: draw.results.map((r: any) => {
        // TODO fix typing
        r.text = r.getChatText();
        return r;
      }),
      rollHTML: fumbleTable.data.displayRoll ? await draw.roll.render() : null,
      table: fumbleTable,
    });

    // Create the chat message
    await ChatMessage.create(messageData);
  }

  private static async crushSpecialDamage(damageBonus: string): Promise<any[]> {
    if (damageBonus.length) {
      const specialDamage = Roll.parse(damageBonus, {});
      const roll = Roll.fromTerms(specialDamage);
      await roll.evaluate({ maximize: true, async: true });
      const crushSpecialDamageTag = localize("RQG.Dialog.weaponCard.CrushSpecialDamageTag");
      return Roll.parse(`+ ${roll.result}[${crushSpecialDamageTag}]`, {});
    }
    return [];
  }

  private static slashImpaleSpecialDamage(weaponDamage: string): any[] {
    const impaleSpecialDamageTag = localize("RQG.Dialog.weaponCard.ImpaleSpecialDamageTag");
    return Roll.parse(`+ (${weaponDamage})[${impaleSpecialDamageTag}]`, {});
  }
}
