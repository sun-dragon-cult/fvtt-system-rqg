import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgItemSheet } from "../RqgItemSheet";
import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import { DocumentSheetData } from "../shared/sheetInterfaces";
import {
  assertHtmlElement,
  getDomDataset,
  getGameUser,
  localize,
  getSelectRuneOptions,
  AvailableItemCache,
  getSelectPassionOptions,
} from "../../system/util";
import { RqgItem } from "../rqgItem";
import { getAllowedDropDocumentTypes, isAllowedDocumentType } from "../../documents/dragDrop";
import { documentRqidFlags } from "../../data-model/shared/rqgDocumentFlags";
import {
  BackgroundDataSourceData,
  BackgroundModifier,
  SkillBackgroundModifier,
} from "../../data-model/item-data/backgroundData";
import { RqidLink } from "../../data-model/shared/rqidLink";

export interface BackgroundSheetData {
  backgroundSkillModifiersJoined: string;
  allRuneOptions: AvailableItemCache[];
  allPassionOptions: AvailableItemCache[];
}

export class BackgroundSheet extends RqgItemSheet<
  ItemSheet.Options,
  BackgroundSheetData | ItemSheet.Data
> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.Cult],
      template: templatePaths.itemBackgroundSheet,
      width: 650,
      height: 500,
      tabs: [
        {
          navSelector: ".item-sheet-nav-tabs",
          contentSelector: ".sheet-body",
          initial: "deity",
        },
      ],
    });
  }

  getData(): BackgroundSheetData & DocumentSheetData {
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
      allRuneOptions: getSelectRuneOptions("RQG.Item.Background.AddRunePlaceholder"),
      allPassionOptions: getSelectPassionOptions("RQG.Item.Background.AddPassionPlaceholder"),

      backgroundSkillModifiersJoined: system.backgroundModifiers
        .map((modifier: BackgroundModifier) => {
          if (modifier.modifierType === "skill") {
            const skillMod = modifier as SkillBackgroundModifier;
            const bonus = skillMod.bonus || 0;
            const bonusValueText = `${bonus >= 0 ? "+" : "-"}${bonus}%`;
            const spanClasses = [];
            const spanTooltips = [];
            if (!skillMod.enabled) {
              spanClasses.push("disabled-skill-text");
              spanTooltips.push(localize("RQG.Item.Background.DisabledSkill"));
            }
            if (skillMod.incomeSkill) {
              spanClasses.push("income-skill-text");
              spanTooltips.push(localize("RQG.Item.Background.IncomeSkill"));
            }
            if (skillMod.cultStartingSkill) {
              spanClasses.push("cult-starting-skill-text");
              spanTooltips.push(localize("RQG.Item.Background.CultStartingSkill"));
            }
            if (skillMod.cultStartingSkill) {
              spanClasses.push("cult-skill-text");
              spanTooltips.push(localize("RQG.Item.Background.CultSkill"));
            }

            return `<span class="${spanClasses.join(" ")}" data-tooltip="${spanTooltips.join(
              "<br>",
            )}">${skillMod.modifiedSkillRqidLink?.name} ${bonusValueText}</span>`;
          }
        })
        .join(", "),
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

    // Background Skills
    this.backgroundModifierUpdate("background-modifier-enabled-", "skill", "enabled", event);
    this.backgroundModifierUpdate("skill-bonus-", "skill", "bonus", event);
    this.backgroundModifierUpdate("income-skill-", "skill", "incomeSkill", event);
    this.backgroundModifierUpdate("cult-starting-skill-", "skill", "cultStartingSkill", event);
    this.backgroundModifierUpdate("cult-skill-", "skill", "cultSkill", event);

    return super._updateObject(event, formData);
  }

  private backgroundModifierUpdate(
    idStartsWith: string,
    expectedModifierType: string,
    updatePropertyName: string,
    event: Event,
  ) {
    //@ts-expect-error id can be null
    if (event?.currentTarget?.id?.startsWith(idStartsWith)) {
      //@ts-expect-error dataset
      const targetRqid = event.currentTarget.dataset.skillRqid;
      if (targetRqid) {
        const backgroundModifiers = (this.item.system as BackgroundDataSourceData)
          .backgroundModifiers;
        for (const backgroundModifier of backgroundModifiers) {
          if (backgroundModifier.modifierType === expectedModifierType) {
            const skillBackgroundModifier = backgroundModifier as SkillBackgroundModifier;
            const targetInput = event.currentTarget as HTMLInputElement;
            if (skillBackgroundModifier.modifiedSkillRqidLink?.rqid === targetRqid) {
              if (targetInput.type === "number") {
                //@ts-expect-error updatePropertyName
                skillBackgroundModifier[updatePropertyName] = parseInt(targetInput.value);
              }
              if (targetInput.type === "checkbox") {
                //@ts-expect-error updatePropertyName
                skillBackgroundModifier[updatePropertyName] = !!targetInput.checked;
              }
            }
          }
        }
        if (this.item.isEmbedded) {
          this.item.actor?.updateEmbeddedDocuments("Item", [
            {
              _id: this.item.id,
              "system.backgroundModifiers": backgroundModifiers,
            },
          ]);
        } else {
          this.item.update({
            "system.backgroundModifiers": backgroundModifiers,
          });
        }
      }
    }
  }

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);

    const form = this.form as HTMLFormElement;

    form
      .querySelector("#btn-edit-skill-background-modifiers-" + this.item.id)
      ?.addEventListener("click", () => {
        this.toggleBackgroundModifierEdit(false);
      });

    $(this.form!)
      .find("[data-delete-background-modifier-rqid]")
      .each((i: number, el: HTMLElement) => {
        el.addEventListener("click", async (ev: MouseEvent) => {
          const rqidToDelete = getDomDataset(ev, "delete-background-modifier-rqid");
          const thisBackground = this.item.system as BackgroundDataSourceData;
          const backgroundSkills = thisBackground.backgroundModifiers.filter(function (mod) {
            return (mod as SkillBackgroundModifier).modifiedSkillRqidLink?.rqid !== rqidToDelete;
          });

          if (this.item.isEmbedded) {
            this.item.actor?.updateEmbeddedDocuments("Item", [
              {
                _id: this.item.id,
                "system.backgroundModifiers": backgroundSkills,
              },
            ]);
          } else {
            this.item.update({
              "system.backgroundModifiers": backgroundSkills,
            });
          }
        });
      });
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
    console.log("BACKGROUND _onDropItem(event, data)", event, data);

    const allowedDropDocumentTypes = getAllowedDropDocumentTypes(event);
    // @ts-expect-error fromDropData
    const droppedItem = await Item.implementation.fromDropData(data);

    if (!isAllowedDocumentType(droppedItem, allowedDropDocumentTypes)) {
      return false;
    }

    if (droppedItem.type === ItemTypeEnum.Skill) {
      const droppedRqid = droppedItem.getFlag(systemId, documentRqidFlags);

      if (droppedItem && droppedRqid.id) {
        const skillMod = new SkillBackgroundModifier();
        skillMod.modifiedSkillRqidLink = new RqidLink(droppedRqid?.id, droppedItem.name || "");

        skillMod.enabled = true; // I think the user expects the new SkillBackgroundModifier to be enabled

        skillMod.bonus = 0;
        skillMod.incomeSkill = false;
        skillMod.backgroundProvidesTraining = false;
        skillMod.cultSkill = false;
        skillMod.cultStartingSkill = false;

        const modifiers = this.item.system.backgroundModifiers;

        modifiers.push(skillMod);

        if (this.item.isEmbedded) {
          await this.item.actor?.updateEmbeddedDocuments("Item", [
            {
              _id: this.item.id,
              "system.backgroundModifiers": modifiers,
            },
          ]);
        } else {
          await this.item.update({
            "system.backgroundModifiers": modifiers,
          });
        }
      } else {
        // see #315 and this situation should be handled however we decide
        // to generally handle dropping things that do not have rqids
        console.log("Dropped skill did not have an Rqid");
      }
      // Return now so we don't handle his at the RqgItemSheet._onDrop
      return [this.item];
    }

    return await super._onDropItem(event, data);
  }
}
