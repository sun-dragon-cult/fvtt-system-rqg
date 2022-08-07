import { AbstractEmbeddedItem } from "./abstractEmbeddedItem";
import { RqgItem } from "../../items/rqgItem";
import { RqgActor } from "../rqgActor";
import { assertItemType, localize, logMisconfiguration } from "../../system/util";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { getSameLocationUpdates } from "./shared/physicalItemUtil";
import { WeaponChatHandler } from "../../chat/weaponChatHandler";
import { WeaponChatFlags } from "../../data-model/shared/rqgDocumentFlags";

export class Weapon extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", WeaponSheet, {
  //     types: [ItemTypeEnum.Weapon],
  //     makeDefault: true,
  //   });
  // }

  static async toChat(weapon: RqgItem): Promise<void> {
    assertItemType(weapon.data.type, ItemTypeEnum.Weapon);
    const usage = WeaponChatHandler.getDefaultUsage(weapon);
    if (!usage) {
      return; // There is no way to use this weapon - it could be arrows for example
    }
    const flags: WeaponChatFlags = {
      type: "weaponChat",
      chat: {
        actorUuid: weapon.actor!.uuid,
        tokenUuid: weapon.actor!.token?.uuid,
        chatImage: weapon.img ?? undefined,
        weaponUuid: weapon.uuid,
        specialDamageTypeText: undefined,
        result: undefined,
      },
      formData: {
        otherModifiers: "",
        actionName: "",
        actionValue: "",
        combatManeuverName: "",
        usage: usage,
      },
    };

    await ChatMessage.create(await WeaponChatHandler.renderContent(flags));
  }

  static preUpdateItem(actor: RqgActor, weapon: RqgItem, updates: object[], options: any): void {
    if (weapon.data.type === ItemTypeEnum.Weapon) {
      updates.push(...getSameLocationUpdates(actor, weapon, updates));
    }
  }

  /*
   * Add the skills specified in the weapon to the actor (if not already there)
   * and connect the weapons with the embedded item skill id.
   */
  static async onEmbedItem(
    actor: RqgActor,
    child: RqgItem,
    options: any,
    userId: string
  ): Promise<any> {
    assertItemType(child.data.type, ItemTypeEnum.Weapon);
    const oneHandSkillId = await Weapon.embedLinkedSkill(
      child.data.data.usage.oneHand.skillId,
      child.data.data.usage.oneHand.skillOrigin,
      actor
    );
    const offHandSkillId = await Weapon.embedLinkedSkill(
      child.data.data.usage.offHand.skillId,
      child.data.data.usage.offHand.skillOrigin,
      actor
    );
    const twoHandSkillId = await Weapon.embedLinkedSkill(
      child.data.data.usage.twoHand.skillId,
      child.data.data.usage.twoHand.skillOrigin,
      actor
    );
    const missileSkillId = await Weapon.embedLinkedSkill(
      child.data.data.usage.missile.skillId,
      child.data.data.usage.missile.skillOrigin,
      actor
    );
    if (!oneHandSkillId || !offHandSkillId || !twoHandSkillId || !missileSkillId) {
      // Didn't find the weapon skill - open the item sheet to let the user select one
      // TODO how to handle this?
      options.renderSheet = true;
    }
    // Thrown weapons should decrease quantity of themselves
    const projectileId = child.data.data.isThrownWeapon ? child.id : child.data.data.projectileId;

    return {
      _id: child.id,
      data: {
        projectileId: projectileId,
        usage: {
          oneHand: { skillId: oneHandSkillId },
          offHand: { skillId: offHandSkillId },
          twoHand: { skillId: twoHandSkillId },
          missile: { skillId: missileSkillId },
        },
      },
    };
  }

  /**
   * Checks if the specified skill is already owned by the actor.
   * If not it embeds the referenced skill.
   * Returns the id of the skill on the actor.
   */
  public static async embedLinkedSkill(
    embeddedSkillId: string,
    skillOrigin: string, // Linked skill item origin (uuid)
    actor: RqgActor // The actor that should have the skill
  ): Promise<string> {
    // If the weapon has the aspect (ie one hand, or missile):
    // embeddedSkillId will be null when dragging from sidebar or directly from compendium
    // embeddedSkillId will have a value when dragged from one actor to another
    if (skillOrigin) {
      try {
        // Add the specified skill if found
        const skill = await fromUuid(skillOrigin).catch((e) => {
          logMisconfiguration(
            localize("RQG.Item.Notification.CantFindWeaponSkillWarning"),
            true,
            embeddedSkillId,
            e
          );
        });
        if (!skill) {
          logMisconfiguration(
            localize("RQG.Item.Notification.NoWeaponSkillFromSkillOriginWarning", {
              skillOrigin: skillOrigin,
            }),
            true
          );
        } else {
          const sameSkillAlreadyOnActor = actor.items.find((i: RqgItem) => i.name === skill.name);
          const embeddedWeaponSkill = sameSkillAlreadyOnActor
            ? [sameSkillAlreadyOnActor]
            : await actor.createEmbeddedDocuments("Item", [skill.data]);
          embeddedSkillId = embeddedWeaponSkill[0].id ?? "";
        }
      } catch (e) {
        logMisconfiguration(
          localize("RQG.Item.Notification.CantFindSkillAssociatedWithWeaponWarning"),
          true,
          e
        );
      }
    }
    return embeddedSkillId;
  }
}
