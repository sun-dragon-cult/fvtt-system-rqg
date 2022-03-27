import { ActorTypeEnum } from "../data-model/actor-data/rqgActorData";
import { RqgActorSheet } from "./rqgActorSheet";


export class RqgActorCreationSheet extends RqgActorSheet {
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
}