import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgItemSheet } from "../RqgItemSheet";
import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import { DocumentSheetData } from "../shared/sheetInterfaces";
import {
  assertHtmlElement,
  getGameUser,
  AvailableItemCache,
  getSelectItemOptions,
  RqidTypeStart,
} from "../../system/util";
import { RqgItem } from "../rqgItem";
import { StandardOfLivingEnum } from "../../data-model/item-data/backgroundData";

export interface BackgroundSheetData {
  skillBonusOptions: AvailableItemCache[];
  incomeSkillOptions: AvailableItemCache[];
  cultSkillOptions: AvailableItemCache[];
  allRuneOptions: AvailableItemCache[];
  allRuneMagicOptions: AvailableItemCache[];
  allSpiritMagicOptions: AvailableItemCache[];
  allPassionOptions: AvailableItemCache[];
  allCultOptions: AvailableItemCache[];
  allOccupationOptions: AvailableItemCache[];
  allHomelandOptions: AvailableItemCache[];
  allTribeOptions: AvailableItemCache[];
  allClanOptions: AvailableItemCache[];
  standardOfLiving: string[];
}

export class BackgroundSheet extends RqgItemSheet<
  ItemSheet.Options,
  BackgroundSheetData | ItemSheet.Data
> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.Cult],
      template: templatePaths.itemBackgroundSheet,
      width: 850,
      height: 700,
      tabs: [
        {
          navSelector: ".item-sheet-nav-tabs",
          contentSelector: ".sheet-body",
          initial: "deity",
        },
      ],
    });
  }

  async getData(): Promise<BackgroundSheetData & DocumentSheetData> {
    // @ts-expect-error _source Read from the original data unaffected by any AEs
    const system = duplicate(this.document._source.system);
    console.log("Background getData returning system:", system);

    return {
      id: this.document.id ?? "",
      uuid: this.document.uuid,
      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isEditable: this.isEditable,
      isGM: getGameUser().isGM,
      system: system,
      skillBonusOptions: getSelectItemOptions(
        RqidTypeStart.Skill,
        "RQG.Item.Background.AddSkillBonusPlaceholder",
      ),
      incomeSkillOptions: getSelectItemOptions(
        RqidTypeStart.Skill,
        "RQG.Item.Background.AddIncomeSkillPlaceholder",
      ),
      cultSkillOptions: getSelectItemOptions(
        RqidTypeStart.Skill,
        "RQG.Item.Background.AddCultSkillPlaceholder",
      ),
      allRuneOptions: getSelectItemOptions(
        RqidTypeStart.Rune,
        "RQG.Item.Background.AddRunePlaceholder",
      ),
      allRuneMagicOptions: getSelectItemOptions(
        RqidTypeStart.RuneMagic,
        "RQG.Item.Background.AddRuneMagicPlaceholder",
      ),
      allSpiritMagicOptions: getSelectItemOptions(
        RqidTypeStart.SpiritMagic,
        "RQG.Item.Background.AddSpiritMagicPlaceholder",
      ),
      allPassionOptions: getSelectItemOptions(
        RqidTypeStart.Passion,
        "RQG.Item.Background.AddPassionPlaceholder",
      ),
      allCultOptions: getSelectItemOptions(
        RqidTypeStart.Cult,
        "RQG.Item.Background.AddSuggestedCultPlaceholder",
      ),
      allOccupationOptions: getSelectItemOptions(
        RqidTypeStart.Occupation,
        "RQG.Item.Background.AddSuggestedOccupationPlaceholder",
      ),
      allHomelandOptions: getSelectItemOptions(
        RqidTypeStart.Homeland,
        "RQG.Item.Background.AddSuggestedHomelandPlaceholder",
      ),
      allTribeOptions: getSelectItemOptions(
        RqidTypeStart.Tribe,
        "RQG.Item.Background.AddSuggestedTribePlaceholder",
      ),
      allClanOptions: getSelectItemOptions(
        RqidTypeStart.Clan,
        "RQG.Item.Background.AddSuggestedClanPlaceholder",
      ),
      standardOfLiving: Object.values(StandardOfLivingEnum),

      // @ts-expect-error async
      enrichedInstructions: await TextEditor.enrichHTML(system.instructions, { async: true }),

      enrichedMiscellaneousBonuses: await TextEditor.enrichHTML(system.miscellaneousBonuses, {
        // @ts-expect-error async
        async: true,
      }),
    };
  }

  protected _updateObject(event: Event, formData: any): Promise<any> {
    // Do Background Specific Stuff here
    console.log("BACKGROUND super._updateObject(event, formData)", event, formData);

    // Combine the background and the specialization to name the Background Item
    const specializationFormatted = formData["system.specialization"]
      ? ` (${formData["system.specialization"]})`
      : "";
    const newName = formData["system.background"] + specializationFormatted;
    if (newName) {
      // If there's nothing in the occupation or region, don't rename
      formData["name"] = newName;
    }

    return super._updateObject(event, formData);
  }

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);
  }

  private toggleBackgroundModifierEdit(forceEdit = false) {
    const form = this.form as HTMLFormElement;
    const displayBackgroundModifiers = form.querySelector(
      "#background-modifier-display-" + this.item.id,
    );
    assertHtmlElement(displayBackgroundModifiers);
    const editBackgroundModifiers = form.querySelector("#background-modifier-edit-" + this.item.id);
    assertHtmlElement(editBackgroundModifiers);
    const btnEdit = form.querySelector("#btn-edit-skill-background-modifiers-" + this.item.id);
    assertHtmlElement(btnEdit);
    if (!displayBackgroundModifiers || !editBackgroundModifiers || !btnEdit) {
      console.error(
        "RQG | Didn't find HtmlElements in toggleBackgroundModifierEdit",
        form,
        displayBackgroundModifiers,
        editBackgroundModifiers,
        btnEdit,
      );
      return;
    }
    if (displayBackgroundModifiers?.style.display === "block" || forceEdit) {
      displayBackgroundModifiers.style.display = "none";
      editBackgroundModifiers.style.display = "block";
      btnEdit.style.color = "gray";
    } else {
      displayBackgroundModifiers.style.display = "block";
      editBackgroundModifiers.style.display = "none";
      btnEdit.style.color = "black";
    }
  }

  async _onDropItem(
    event: DragEvent,
    data: { type: string; uuid: string },
  ): Promise<boolean | RqgItem[]> {
    // Do Background Specific Stuff Here
    return await super._onDropItem(event, data);
  }
}
