import { ActorTypeEnum, CharacterDataProperties } from "../data-model/actor-data/rqgActorData";
import { getActorTemplates } from "../system/api/actorTemplateApi";
import { getGame } from "../system/util";
import { RqgActor } from "./rqgActor";

interface CreationSheetData {
  data: CharacterDataProperties;
  speciesTemplates: StoredDocument<RqgActor>[] | undefined;
  selectedSpeciesTemplate: RqgActor | undefined;
}

export class RqgActorCreationSheet extends ActorSheet<
  ActorSheet.Options,
  CreationSheetData | ActorSheet.Data
> {
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

  async getData(): Promise<CreationSheetData | ActorSheet.Data<ActorSheet.Options>> {
    const actorData = this.document.data.toObject(false);
    const speciesTemplates = await getActorTemplates();
    let selectedSpeciesTemplate
    if (speciesTemplates?.map((s) => s.name).includes(this.actor.data.data.background.species)) {
      selectedSpeciesTemplate = speciesTemplates.find(t => t.name === this.actor.data.data.background.species)
    } else {
      selectedSpeciesTemplate = undefined;
    }

      return {
        data: actorData,
        speciesTemplates: speciesTemplates,
        selectedSpeciesTemplate: selectedSpeciesTemplate,
      };
  }
}