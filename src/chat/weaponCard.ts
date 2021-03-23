import { Ability, ResultEnum } from "../data-model/shared/ability";
import { RqgActor } from "../actors/rqgActor";
import { SkillData } from "../data-model/item-data/skillData";
import { CombatManeuver, MeleeWeaponData } from "../data-model/item-data/meleeWeaponData";
import { MissileWeaponData } from "../data-model/item-data/missileWeaponData";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";

type WeaponCardFlags = {
  actorId: string;
  skillItemData: Item.Data<SkillData>;
  weaponItemData: Item.Data<MeleeWeaponData> | Item.Data<MissileWeaponData>;
  result: ResultEnum;
  formData: {
    modifier: number;
    chance: number;
    combatManeuver: string;
  };
};

export class WeaponCard extends ChatMessage {
  public static async show(actor: RqgActor, skillId: string, weaponId: string): Promise<void> {
    const defaultModifier = 0;
    const skillItem = actor.getOwnedItem(skillId) as Item<SkillData>;

    const flags: WeaponCardFlags = {
      actorId: actor.id,
      skillItemData: skillItem.data,
      weaponItemData: actor.getOwnedItem(weaponId).data as
        | Item.Data<MeleeWeaponData>
        | Item.Data<MissileWeaponData>,
      result: undefined,
      formData: {
        modifier: defaultModifier,
        chance: skillItem.data.data.chance,
        combatManeuver: undefined,
      },
    };
    await ChatMessage.create(await WeaponCard.renderContent(flags, actor));
  }

  public static async inputChangeHandler(ev, messageId: string) {
    const chatMessage = game.messages.get(messageId);
    const flags: WeaponCardFlags = chatMessage.data.flags.rqg;
    const actor = (game.actors.get(flags.actorId) as unknown) as RqgActor;
    const form: HTMLFormElement = ev.target.closest("form");
    const formData = new FormData(form);
    // @ts-ignore
    for (const [name, value] of formData) {
      flags.formData[name] = value;
    }

    const chance: number = Number(flags.skillItemData.data.chance) || 0;
    const modifier: number = Number(flags.formData.modifier) || 0;

    flags.formData.chance = WeaponCard.calcRollChance(chance, modifier);

    const data = await WeaponCard.renderContent(flags, actor);
    await chatMessage.update(data);
  }

  public static async formSubmitHandler(ev, messageId: string) {
    ev.preventDefault();

    const chatMessage = game.messages.get(messageId);
    const flags: WeaponCardFlags = chatMessage.data.flags.rqg;

    const formData = new FormData(ev.target);
    // @ts-ignore
    for (const [name, value] of formData) {
      flags.formData[name] = value;
    }

    const button = ev.currentTarget;
    button.disabled = true; // TODO Doesn't work, points to form !!!

    const actor = (game.actors.get(flags.actorId) as unknown) as RqgActor;
    const action = ev.originalEvent.submitter.name; // combatManeuver | DamageRoll | HitLocationRoll

    if (action === "combatManeuver") {
      flags.formData.combatManeuver = ev.originalEvent.submitter.value; // slash | crush | impale | special | parry
      const projectileItemData: Item.Data<any> = (flags.weaponItemData.data as MissileWeaponData)
        .isProjectileWeapon
        ? actor.items.get((flags.weaponItemData.data as MissileWeaponData).projectileId).data
        : flags.weaponItemData;
      if (
        flags.weaponItemData.type === ItemTypeEnum.MissileWeapon &&
        projectileItemData.data.quantity > 0
      ) {
        await actor.updateOwnedItem({
          // @ts-ignore
          _id: projectileItemData._id,
          "data.quantity": --projectileItemData.data.quantity,
        });
      } else if (flags.weaponItemData.type === ItemTypeEnum.MissileWeapon) {
        ui.notifications.warn("Out of ammo!");
        return;
      }
      await WeaponCard.roll(flags, chatMessage);
    } else if (action === "damageRoll") {
      const damageType = ev.originalEvent.submitter.value; // Normal | Special | Max Special);  damageSeverity ??
      await WeaponCard.damageRoll(flags, damageType);
    } else if (action === "hitLocationRoll") {
      // @ts-ignore
      const roll = Roll.create("1D20").evaluate();
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker(),
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        flavor: `Hitlocation`,
      });
    } else if (action === "fumble") {
      await WeaponCard.fumbleRoll(flags);
    } else {
      ui.notifications.error(
        `Oops you shouldn't see this - unknown button "${action}" in weapon chat card`,
        { permanent: true }
      );
    }

    button.disabled = false;
    return false;
  }

  public static async roll(flags: WeaponCardFlags, chatMessage: ChatMessage) {
    const modifier: number = Number(flags.formData.modifier) || 0;
    const chance: number = Number(flags.skillItemData.data.chance) || 0;
    const actor = (game.actors.get(flags.actorId) as unknown) as RqgActor;
    flags.result = await Ability.roll(actor, chance, modifier, flags.skillItemData.name + " check");
    await WeaponCard.checkExperience(actor as any, flags.skillItemData, flags.result);
    const data = await WeaponCard.renderContent(flags, actor as any);
    await chatMessage.update(data);
  }

  public static async checkExperience(
    actor: RqgActor,
    skillItemData: Item.Data<SkillData>,
    result: ResultEnum
  ): Promise<void> {
    if (result <= ResultEnum.Success && !skillItemData.data.hasExperience) {
      // @ts-ignore
      await actor.updateOwnedItem({ _id: skillItemData._id, data: { hasExperience: true } });
      ui.notifications.info("Yey, you got an experience check on " + skillItemData.name + "!");
    }
  }

  private static async renderContent(flags: WeaponCardFlags, actor: RqgActor) {
    let html = await renderTemplate("systems/rqg/chat/weaponCard.html", flags);
    let whisperRecipients = game.users.filter((u) => u.isGM && u.active);
    // @ts-ignore
    whisperRecipients.push(game.user._id);
    return {
      flavor: "Weapon: " + flags.weaponItemData.name,
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: actor as any }),
      content: html,
      whisper: whisperRecipients,
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
    const actor = (game.actors.get(flags.actorId) as unknown) as RqgActor;
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
          console.error(
            `This weapon (${flags.weaponItemData.name}) does not have an attack Combat Manuever`
          );
          ui.notifications.error(
            `This weapon (${flags.weaponItemData.name}) does not have an attack Combat Manuever`
          );
        }
      }
    }
    const maximise = damageType === "Max Special";

    // @ts-ignore
    const roll = Roll.create(`${weaponDamage} ${damageBonus}`).evaluate({
      maximize: maximise,
    });
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker(),
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      flavor: `damage`,
    });
  }

  private static async fumbleRoll(flags: WeaponCardFlags) {
    const fumbleTableName = game.settings.get("rqg", "fumbleRollTable");
    const fumbleTable = game.tables.getName(fumbleTableName);
    if (!fumbleTable) {
      ui.notifications.error(`Misconfiguration, the fumble table "${fumbleTableName}" is missing`, {
        permanent: true,
      });
      return;
    }
    const draw = await fumbleTable.draw({ displayChat: false });
    const actor = (game.actors.get(flags.actorId) as unknown) as RqgActor;

    // Construct chat data
    const nr = draw.results.length > 1 ? `${draw.results.length} results` : "a result";

    // Hide GM fumble rolls from all but other GMs
    let whisperRecipients = game.user.isGM ? game.users.filter((u) => u.isGM) : undefined;

    const messageData = {
      flavor: `Draws ${nr} from the ${fumbleTable.name} table.`,
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: actor as any }),
      whisper: whisperRecipients,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: draw.roll,
      sound: draw.roll ? CONFIG.sounds.dice : null,
      flags: { "core.RollTable": fumbleTable.id },
      content: undefined,
    };

    // Render the chat card which combines the dice roll with the drawn results
    // @ts-ignore
    messageData.content = await renderTemplate(CONFIG.RollTable.resultTemplate, {
      // @ts-ignore
      description: TextEditor.enrichHTML(fumbleTable.data.description, { entities: true }),
      results: draw.results.map((r) => {
        r = duplicate(r);
        // @ts-ignore
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
    // @ts-ignore
    const maxDamageBonus = Roll.create(damageBonus).evaluate({ maximize: true }).total;
    return damageBonus + " + " + maxDamageBonus;
  }

  private static slashImpaleSpecialDamage(weaponDamage: string): string {
    return weaponDamage + " + " + weaponDamage;
  }
}
