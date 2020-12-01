import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { CombatManeuver, MeleeWeaponData } from "../../data-model/item-data/meleeWeaponData";
import { SkillCategoryEnum, SkillData } from "../../data-model/item-data/skillData";
import { RqgItemSheet } from "../RqgItemSheet";
import { RqgActorData } from "../../data-model/actor-data/rqgActorData";
import { RqgItem } from "../rqgItem";

export class MeleeWeaponSheet extends RqgItemSheet<RqgActorData, RqgItem> {
  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.MeleeWeapon],
      template: "systems/rqg/items/melee-weapon-item/meleeWeaponSheet.html",
      width: 520,
      height: 250,
    });
  }

  // @ts-ignore
  async getData() {
    const sheetData: any = super.getData(); // Don't use directly - not reliably typed
    const data: MeleeWeaponData = sheetData.item.data;
    data.allCombatManeuvers = Object.values(CombatManeuver).reduce((acc, m) => {
      const v = data.combatManeuvers.includes(m);
      acc[m] = { name: m, value: v };
      return acc;
    }, {});

    if (this.actor) {
      data.meleeWeaponSkills = this.actor
        .getEmbeddedCollection("OwnedItem")
        .filter(
          (i: ItemData<SkillData>) =>
            i.type === ItemTypeEnum.Skill &&
            (i.data.category === SkillCategoryEnum.MeleeWeapons ||
              i.data.category === SkillCategoryEnum.Shields ||
              i.data.category === SkillCategoryEnum.NaturalWeapons)
        );
    } else {
      data.allCompendiums = Array.from(game.packs.keys());
      if (data.skillSourceCompendium) {
        const pack = game.packs.get(data.skillSourceCompendium);
        const index = await pack.getIndex();
        data.compendiumEntries = index;
      }
    }
    return sheetData;
  }

  protected async _updateObject(event: Event | JQuery.Event, formData: any): Promise<any> {
    const combatManeuvers = [];
    Object.values(CombatManeuver).forEach((m) => {
      if (formData[`data.allCombatManeuvers.${m}.value`]) {
        combatManeuvers.push(m);
      }
    });

    formData["data.combatManeuvers"] = combatManeuvers;
    Object.values(CombatManeuver).forEach(
      (cm) => delete formData[`data.allCombatManeuvers.${cm}.value`]
    );
    if (formData["data.selectedCompendiumEntryId"]) {
      const pack = game.packs.get(formData["data.skillSourceCompendium"]);
      const skill = await pack.getEntity(formData["data.selectedCompendiumEntryId"]);

      const entry = pack.index.find((e) => e._id === skill._id);
      formData["data.skillSourceId"] = skill.data.flags?.core?.sourceId || skill?._id;
    }

    delete formData["data.selectedCompendiumEntryId"]; // Don't persist this
    return super._updateObject(event, formData);
  }
}
