import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgItemSheet } from "../RqgItemSheet";
import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import { DocumentSheetData } from "../shared/sheetInterfaces";
import { assertHtmlElement, getGameUser } from "../../system/util";
import { RqgItem } from "../rqgItem";
import { getAllowedDropDocumentTypes, isAllowedDocumentType } from "../../documents/dragDrop";
import { documentRqidFlags } from "../../data-model/shared/rqgDocumentFlags";
import { SkillBackgroundModifier } from "../../data-model/item-data/backgroundData";
import { RqidLink } from "../../data-model/shared/rqidLink";

export interface BackgroundSheetData {
  backgroundModifiersJoined: string;
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

      backgroundModifiersJoined: system.backgroundModifiers
        .map((modifier: any) => {
          console.log("MAP to join modifier bonuses into a string", modifier);
          const bonus = modifier.bonus || 0;
          const bonusValueText = `${bonus >= 0 ? "+" : "-"}${bonus}%`;
          if (modifier.incomeSkill) {
            return `<span class="incomeSkillText">${modifier.rqid?.name} ${bonusValueText}</span>`;
          } else {
            return `<span>${modifier.name} ${bonusValueText}</span>`;
          }
        })
        .join(", "),
    };
  }

  protected _updateObject(event: Event, formData: any): Promise<any> {
    // Do Background Specific Stuff here
    console.log("BACKGROUND super._updateObject(event, formData)", event, formData);

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

    const form = this.form as HTMLFormElement;

    form
      .querySelector("#btn-edit-background-modifiers-" + this.item.id)
      ?.addEventListener("click", () => {
        this.toggleBackgroundModifierEdit(false);
      });

    // Do Background Specific Stuff Here
  }

  private toggleBackgroundModifierEdit(forceEdit = false) {
    const form = this.form as HTMLFormElement;
    const displayBackgroundModifiers = form.querySelector(
      "#background-modifier-display-" + this.item.id,
    );
    assertHtmlElement(displayBackgroundModifiers);
    const editBackgroundModifiers = form.querySelector("#background-modifier-edit-" + this.item.id);
    assertHtmlElement(editBackgroundModifiers);
    const btnEdit = form.querySelector("#btn-edit-background-modifiers-" + this.item.id);
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

        skillMod.enabled = true;

        //test
        skillMod.bonus = 10;
        skillMod.incomeSkill = true;
        skillMod.backgroundProvidesTraining = true;
        skillMod.cultSkill = true;
        skillMod.cultStartingSkill = true;

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
