import { SystemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/packages.mjs";
import { RqgActor } from "../actors/rqgActor";
import { ActorTypeEnum } from "../data-model/actor-data/rqgActorData";
import { RQG_CONFIG } from "../system/config";
import { localize } from "../system/util";

export class ActorWizard extends FormApplication {
  actor: RqgActor;
  constructor(object: RqgActor, options: any) {
    super(object, options);
    this.actor = object;
  }

  static get defaultOptions(): FormApplication.Options {
    return mergeObject(FormApplication.defaultOptions, {
      classes: ["rqg", "sheet", ActorTypeEnum.Character],
      popOut: true,
      template: "systems/rqg/dialog/actorWizardApplication.hbs",
      id: "actor-wizard-application",
      title: localize("RQG.ActorCreation.AdventurerCreationWizardTitle"),
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

  getData(): any {
    //TODO: this should probably have a specific class
    return {
      actor: this.actor,
    };
  }

  activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);

    this.form?.querySelectorAll("[data-actor-creation-complete]").forEach((el) => {
      el.addEventListener("click", this._setActorCreationComplete);
    });
  }

  _setActorCreationComplete() {
      // TODO: I don't understand why this.actor is undefined when it gets here
    this.actor.setFlag(RQG_CONFIG.flagScope, RQG_CONFIG.actorWizardFlags.actorWizardComplete, true);
    this.close();
  }

  async _updateObject(event: Event, formData?: object): Promise<unknown> {
    console.log("Update Object", formData);
    return;
  }
}
