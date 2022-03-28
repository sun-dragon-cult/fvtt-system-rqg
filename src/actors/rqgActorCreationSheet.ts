import {
  ItemData,
  ItemDataSource,
} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData";
import { ActorTypeEnum, CharacterDataProperties } from "../data-model/actor-data/rqgActorData";
import { RqgItemDataSource } from "../data-model/item-data/itemTypes";
import { RqgItem } from "../items/rqgItem";
import { getActorTemplates } from "../system/api/actorTemplateApi";
import { fromRqid } from "../system/api/rqidApi";
import { RqgActor } from "./rqgActor";

interface CreationSheetData {
  data: CharacterDataProperties;
  speciesTemplates: StoredDocument<RqgActor>[] | undefined;
  selectedSpeciesTemplateName: string | undefined;
  selectedSpeciesTemplate: RqgActor | undefined;
}

export class RqgActorCreationSheet extends ActorSheet<
  ActorSheet.Options,
  CreationSheetData | ActorSheet.Data
> {
  selectedSpeciesTemplateName: string | undefined = undefined;
  selectedSpeciesTemplate: RqgActor | undefined;

  get title(): string {
    const linked = this.actor.data.token.actorLink;
    const isToken = this.actor.isToken;

    let prefix = "";
    if (!linked) {
      prefix = isToken ? "[Token] " : "[Prototype] ";
    }
    const speakerName = isToken ? this.actor.token!.data.name : this.actor.data.token.name;
    const postfix = isToken ? ` (${this.actor.data.token.name})` : "";

    return prefix + speakerName + postfix;
  }

  static get defaultOptions(): ActorSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ActorTypeEnum.Character],
      template: "systems/rqg/actors/rqgActorCreationSheet.hbs",
      width: 850,
      height: 650,
      tabs: [
        {
          navSelector: ".creation-sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "0-species",
        },
      ],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
    });
  }

  protected _updateObject(event: Event, formData: object): Promise<RqgActor | undefined> {
    // There is no reason to persist these choices except in the session
    //@ts-ignore formData
    this.selectedSpeciesTemplateName = formData["selectedSpeciesTemplateName"];

    return super._updateObject(event, formData);
  }

  public activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);

    const form = this.form as HTMLFormElement;

    form.querySelectorAll("[data-selected-species-template-name]").forEach((element) => {
      const el = element as HTMLElement;
      el.addEventListener("click", () => this.applySpecies());
    });
  }

  async getData(): Promise<CreationSheetData | ActorSheet.Data<ActorSheet.Options>> {
    const actorData = this.document.data.toObject(false);
    const speciesTemplates = await getActorTemplates();

    if (!this.selectedSpeciesTemplateName && this.actor.data.data.background.species) {
      // We might be resuming the wizard after the player has already made a choice
      this.selectedSpeciesTemplateName = this.actor.data.data.background.species;
    }

    if (speciesTemplates?.map((s) => s.name).includes(this.selectedSpeciesTemplateName || "")) {
      this.selectedSpeciesTemplate = speciesTemplates.find(
        (t) => t.name === this.selectedSpeciesTemplateName
      );
    } else {
      this.selectedSpeciesTemplate = undefined;
    }

    return {
      data: actorData,
      speciesTemplates: speciesTemplates,
      selectedSpeciesTemplateName: this.selectedSpeciesTemplateName,
      selectedSpeciesTemplate: this.selectedSpeciesTemplate,
    };
  }

  private async applySpecies() {
    if (
      this.actor.items.filter((i) => i.type === "skill").length > 0 ||
      this.actor.items.filter((i) => i.type === "rune").length > 0
    ) {
      console.log("TODO: THIS WILL REPLACE SKILLS AND RUNES DIALOG");
      const ids = this.actor.data.items.map((x) => x.id);
      //@ts-ignore ids
      await this.actor.deleteEmbeddedDocuments("Item", ids);
    }

    const update: any = {
      data: {
        characteristics: {
          strength: {},
          constitution: {},
          size: {},
          dexterity: {},
          intelligence: {},
          power: {},
          charisma: {},
        },
        background: {},
      },
    };

    // Replace characteristic formulas
    update.data.characteristics.strength.formula =
      this.selectedSpeciesTemplate?.data.data.characteristics.strength.formula;
    update.data.characteristics.constitution.formula =
      this.selectedSpeciesTemplate?.data.data.characteristics.constitution.formula;
    update.data.characteristics.size.formula =
      this.selectedSpeciesTemplate?.data.data.characteristics.size.formula;
    update.data.characteristics.dexterity.formula =
      this.selectedSpeciesTemplate?.data.data.characteristics.dexterity.formula;
    update.data.characteristics.intelligence.formula =
      this.selectedSpeciesTemplate?.data.data.characteristics.intelligence.formula;
    update.data.characteristics.power.formula =
      this.selectedSpeciesTemplate?.data.data.characteristics.power.formula;
    update.data.characteristics.charisma.formula =
      this.selectedSpeciesTemplate?.data.data.characteristics.charisma.formula;

    // Replace species on background tab, but use the name of the template rather
    // than the background.species
    update.data.background.species = this.selectedSpeciesTemplate?.name;

    await this.actor.update(update);

    const skillsToAdd = this.selectedSpeciesTemplate?.data.items.filter((i) => i.type === "skill");
    const runesToAdd = this.selectedSpeciesTemplate?.data.items.filter((i) => i.type === "rune");

    const itemsToAdd: any[] = [];

    if (skillsToAdd) {
      for (const skill of skillsToAdd) {
        // Get the most up to date version of the skill in case the template is out of date
        const bestSkill = await fromRqid(skill.data.data.rqid, skill.data.data.rqidLang);
        if (bestSkill) {
          itemsToAdd.push(bestSkill.data);
        } else {
          const msg = `Species Template named ${this.selectedSpeciesTemplate?.name} has a Skill item that could not be found using the rqid "${skill.data.data.rqid}" and rqidLang "${skill.data.data.rqidLang}".`;
          console.log(msg);
          ui.notifications?.warn(msg);
          itemsToAdd.push(skill.data);
        }
      }
    }

    if (runesToAdd) {
      for (const rune of runesToAdd) {
        // Get the most up to date version of the rune in case the template is out of date
        const bestRune = await fromRqid(rune.data.data.rqid, rune.data.data.rqidLang);
        if (bestRune) {
          itemsToAdd.push(bestRune.data);
        } else {
          const msg = `Species Template named ${this.selectedSpeciesTemplate?.name} has a Rune item that could not be found using the rqid "${rune.data.data.rqid}" and rqidLang "${rune.data.data.rqidLang}".`;
          console.log(msg);
          ui.notifications?.warn(msg);
          itemsToAdd.push(rune.data);
        }
      }
    }

    await this.actor.createEmbeddedDocuments("Item", itemsToAdd);
  }
}
