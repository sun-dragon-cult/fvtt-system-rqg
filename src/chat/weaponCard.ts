import { Ability, ResultEnum } from "../data-model/shared/ability";
import { RqgActor } from "../actors/rqgActor";
import { SkillData, SkillItemData } from "../data-model/item-data/skillData";
import { CombatManeuver, MeleeWeaponData } from "../data-model/item-data/meleeWeaponData";
import { MissileWeaponData } from "../data-model/item-data/missileWeaponData";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { getActorFromIds, getSpeakerName, logMisconfiguration, RqgError } from "../system/util";
import { RqgActorData } from "../data-model/actor-data/rqgActorData";

type WeaponCardFlags = {
  actorId: string;
  tokenId?: string;
  skillItemData: Item.Data<SkillData>;
  weaponItemData: Item.Data<MeleeWeaponData> | Item.Data<MissileWeaponData>;
  result: ResultEnum | undefined;
  formData: {
    modifier: number;
    chance: number;
    combatManeuver: string;
  };
};

export class WeaponCard extends ChatMessage {
  // TODO Should it extend ChatMessage?
  public static async show(
    weaponId: string,
    skillId: string,
    actor: RqgActor,
    token?: Token | null
  ): Promise<void> {
    const defaultModifier = 0;
    const skillItem = actor.getOwnedItem(skillId) as Item<SkillItemData>;

    const flags: WeaponCardFlags = {
      actorId: actor.id,
      tokenId: token?.id,
      skillItemData: skillItem.data,
      weaponItemData: actor.getOwnedItem(weaponId)?.data as
        | Item.Data<MeleeWeaponData>
        | Item.Data<MissileWeaponData>,
      result: undefined,
      formData: {
        modifier: defaultModifier,
        chance: skillItem.data.data.chance || 0,
        combatManeuver: "",
      },
    };
    await ChatMessage.create(await WeaponCard.renderContent(flags));
  }

  public static async inputChangeHandler(ev: Event, messageId: string): Promise<void> {
    const chatMessage = game.messages?.get(messageId);
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
    const chance: number = Number(flags.skillItemData.data.chance) || 0;
    const modifier: number = Number(flags.formData.modifier) || 0;
    flags.formData.chance = WeaponCard.calcRollChance(chance, modifier);

    const data = await WeaponCard.renderContent(flags);
    if (chatMessage && data) {
      await chatMessage.update(data);
    }
  }

  public static async formSubmitHandler(
    ev: JQueryEventObject,
    messageId: string
  ): Promise<boolean> {
    ev.preventDefault();
    const chatMessage = game.messages?.get(messageId);
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
    const button = ev.currentTarget;
    // button.disabled = true; // TODO Doesn't work, points to form !!!

    // @ts-ignore submitter
    const action = (ev.originalEvent.submitter as HTMLButtonElement).name; // combatManeuver | DamageRoll | HitLocationRoll

    if (action === "combatManeuver") {
      flags.formData.combatManeuver = (ev as any).originalEvent.submitter.value; // slash | crush | impale | special | parry
      const projectileItemData = (flags.weaponItemData.data as MissileWeaponData).isProjectileWeapon
        ? (actor.getOwnedItem((flags.weaponItemData.data as MissileWeaponData).projectileId)
            ?.data as Item.Data<MissileWeaponData>)
        : flags.weaponItemData;
      if (
        flags.weaponItemData.type === ItemTypeEnum.MissileWeapon &&
        projectileItemData.data.quantity &&
        projectileItemData.data.quantity > 0
      ) {
        const updateData: DeepPartial<Actor.OwnedItemData<RqgActorData>> = {
          _id: projectileItemData._id,
          data: { quantity: --projectileItemData.data.quantity },
        };
        await actor.updateOwnedItem(updateData);
      } else if (flags.weaponItemData.type === ItemTypeEnum.MissileWeapon) {
        ui.notifications?.warn("Out of ammo!");
        return false;
      }

      if (!chatMessage) {
        const msg = "Couldn't find Chatmessage";
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      await WeaponCard.roll(flags, chatMessage);
    } else if (action === "damageRoll") {
      const damageType = (ev as any).originalEvent.submitter.value; // Normal | Special | Max Special);  damageSeverity ??
      await WeaponCard.damageRoll(flags, damageType);
    } else if (action === "hitLocationRoll") {
      const roll = Roll.create("1D20").evaluate();
      const speakerName = getSpeakerName(flags.actorId, flags.tokenId);
      await roll.toMessage({
        speaker: { alias: speakerName },
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        flavor: `Hitlocation`,
      });
    } else if (action === "fumble") {
      await WeaponCard.fumbleRoll(flags);
    } else {
      const msg = `Unknown button "${action}" in weapon chat card`;
      ui.notifications?.error(msg);
      throw new RqgError(msg);
    }

    // button.disabled = false;
    return false;
  }

  public static async roll(flags: WeaponCardFlags, chatMessage: ChatMessage) {
    const modifier: number = Number(flags.formData.modifier) || 0;
    const chance: number = Number(flags.skillItemData.data.chance) || 0;
    const actor = getActorFromIds(flags.actorId, flags.tokenId);
    const speakerName = getSpeakerName(flags.actorId, flags.tokenId);
    flags.result = await Ability.roll(
      flags.skillItemData.name + " check",
      chance,
      modifier,
      speakerName
    );
    await WeaponCard.checkExperience(actor, flags.skillItemData, flags.result);
    const data = await WeaponCard.renderContent(flags);
    await chatMessage.update(data);
  }

  public static async checkExperience(
    actor: RqgActor,
    skillItemData: Item.Data<SkillData>,
    result: ResultEnum
  ): Promise<void> {
    if (result <= ResultEnum.Success && !skillItemData.data.hasExperience) {
      await actor.updateOwnedItem({ _id: skillItemData._id, data: { hasExperience: true } });
      ui.notifications?.info("Yey, you got an experience check on " + skillItemData.name + "!");
    }
  }

  private static async renderContent(flags: WeaponCardFlags): Promise<object> {
    let html = await renderTemplate("systems/rqg/chat/weaponCard.html", flags);
    const speakerName = getSpeakerName(flags.actorId, flags.tokenId);
    return {
      flavor: "Weapon: " + flags.weaponItemData.name,
      user: game.user?.id,
      speaker: { alias: speakerName },
      content: html,
      whisper: game.users?.filter((u) => (u.isGM && u.active) || u._id === game.user?._id),
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

  private static async damageRoll(flags: WeaponCardFlags, damageType: string): Promise<void> {
    const actor = getActorFromIds(flags.actorId, flags.tokenId);
    let damageBonus =
      actor.data.data.attributes.damageBonus !== "0"
        ? `+ ${actor.data.data.attributes.damageBonus}[Damage Bonus]`
        : "";

    if (flags.weaponItemData.type === ItemTypeEnum.MissileWeapon) {
      const missileWeaponData: Item.Data<MissileWeaponData> = (flags.weaponItemData as unknown) as Item.Data<MissileWeaponData>;

      if (missileWeaponData.data.isThrownWeapon) {
        damageBonus = " + ceil(" + actor.data.data.attributes.damageBonus + "/2)";
      } else if (missileWeaponData.data.isProjectileWeapon) {
        damageBonus = "";
      }
    }

    let weaponDamage = flags.weaponItemData.data.damage;
    if (["Special", "Max Special"].includes(damageType)) {
      if (
        [CombatManeuver.Slash, CombatManeuver.Impale].includes(
          flags.formData.combatManeuver as CombatManeuver
        )
      ) {
        weaponDamage = WeaponCard.slashImpaleSpecialDamage(weaponDamage);
      } else if (flags.formData.combatManeuver === CombatManeuver.Crush) {
        damageBonus = WeaponCard.crushSpecialDamage(damageBonus);
      } else if (flags.formData.combatManeuver === CombatManeuver.Parry) {
        if (flags.weaponItemData.data.combatManeuvers.includes(CombatManeuver.Crush)) {
          damageBonus = WeaponCard.crushSpecialDamage(damageBonus);
        } else if (
          flags.weaponItemData.data.combatManeuvers.some((m) =>
            [CombatManeuver.Slash, CombatManeuver.Impale].includes(m)
          )
        ) {
          weaponDamage = WeaponCard.slashImpaleSpecialDamage(weaponDamage);
        } else {
          logMisconfiguration(
            `This weapon (${flags.weaponItemData.name}) does not have an attack Combat Manuever`,
            true
          );
        }
      }
    }
    const maximise = damageType === "Max Special";
    const roll = Roll.create(`${weaponDamage} ${damageBonus}`).evaluate({
      maximize: maximise,
    });
    const speakerName = getSpeakerName(flags.actorId, flags.tokenId);
    await roll.toMessage({
      speaker: { alias: speakerName },
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      flavor: `damage`,
    });
  }

  private static async fumbleRoll(flags: WeaponCardFlags) {
    const fumbleTableName = game.settings.get("rqg", "fumbleRollTable") as string;
    const fumbleTable = game.tables?.getName(fumbleTableName);
    if (!fumbleTable) {
      logMisconfiguration(`The fumble table "${fumbleTableName}" is missing`, true);
      return;
    }
    const actor = getActorFromIds(flags.actorId, flags.tokenId);
    const draw = await fumbleTable.draw({ displayChat: false });
    // Construct chat data
    const nr = draw.results.length > 1 ? `${draw.results.length} results` : "a result";

    // Hide GM fumble rolls from all but other GMs
    let whisperRecipients = game.user?.isGM
      ? game.users!.filter((u) => u.isGM).map((u) => u.id)
      : [];
    const speakerName = getSpeakerName(flags.actorId, flags.tokenId);
    const messageData: DeepPartial<ChatMessage.Data> = {
      flavor: `Draws ${nr} from the ${fumbleTable.name} table.`,
      user: game.user?.id,
      speaker: { alias: speakerName },
      whisper: whisperRecipients,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      sound: draw.roll ? CONFIG.sounds.dice : undefined,
      flags: { "core.RollTable": fumbleTable.id },
    };

    // Render the chat card which combines the dice roll with the drawn results
    messageData.content = await renderTemplate(CONFIG.RollTable.resultTemplate, {
      description: TextEditor.enrichHTML(fumbleTable.data.description, { entities: true } as any),
      results: draw.results.map((r) => {
        r = duplicate(r);
        // @ts-ignore TODO redo without the protected method
        r.text = fumbleTable._getResultChatText(r);
        r.icon = r.img || CONFIG.RollTable.resultIcon;
        return r;
      }),
      table: fumbleTable,
    });

    // Create the chat message
    await ChatMessage.create(messageData);
  }

  private static crushSpecialDamage(damageBonus: string): string {
    const maxDamageBonus = Roll.create(damageBonus).evaluate({ maximize: true }).total;
    return damageBonus + " + " + maxDamageBonus;
  }

  private static slashImpaleSpecialDamage(weaponDamage: string): string {
    return weaponDamage + " + " + weaponDamage;
  }
}
