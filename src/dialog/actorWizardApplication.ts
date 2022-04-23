import { RqgActor } from "../actors/rqgActor";
import { RqgActorSheet } from "../actors/rqgActorSheet";
import { ActorTypeEnum } from "../data-model/actor-data/rqgActorData";
import { getActorTemplates, getHomelands, Rqid } from "../system/api/rqidApi";
import { RQG_CONFIG } from "../system/config";
import { assertItemType, getGame, getRequiredDomDataset, localize } from "../system/util";
import { SkillDataSource } from "../data-model/item-data/skillData";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { IAbility } from "../data-model/shared/ability";
import { RqidLink } from "../data-model/shared/rqidLink";
import { Homeland } from "../actors/item-specific/homeland";
import { RqgItem } from "../items/rqgItem";
import { HomelandDataSource } from "../data-model/item-data/homelandData";

export class ActorWizard extends FormApplication {
  actor: RqgActor;
  species: {
    selectedSpeciesTemplate: RqgActor | undefined;
    speciesTemplates: RqgActor[] | undefined;
  } = { selectedSpeciesTemplate: undefined, speciesTemplates: undefined };
  homeland: {
    selectedHomeland: RqgItem | undefined;
    homelands: RqgItem[] | undefined;
  } = { selectedHomeland: undefined, homelands: undefined };
  collapsibleOpenStates: Record<string, boolean> = {};
  choices: Record<string, CreationChoice> = {};

  constructor(object: RqgActor, options: any) {
    super(object, options);
    this.actor = object;
    const previouslySelectedTemplateId = this.actor.getFlag(
      RQG_CONFIG.flagScope,
      RQG_CONFIG.actorWizardFlags.selectedSpeciesId
    );

    const template = getGame().actors?.get(previouslySelectedTemplateId as string) as RqgActor;

    if (!template) {
      this.species.selectedSpeciesTemplate = undefined;
    }
    //@ts-ignore
    else if (template?.type === ActorTypeEnum.Character) {
      this.species.selectedSpeciesTemplate = template as RqgActor;
    } else {
      this.species.selectedSpeciesTemplate = undefined;
      const msg = `The Actor named ${this.actor.name} has a \n${RQG_CONFIG.actorWizardFlags.selectedSpeciesId}\n flag with a value that is not an RqgActor.`;
      console.warn(msg);
      ui.notifications?.warn(msg);
    }

    const savedChoices = this.actor.getFlag(
      RQG_CONFIG.flagScope,
      RQG_CONFIG.actorWizardFlags.wizardChoices
    );
    if (savedChoices) {
      // Get saved choices from flag
      const parsed = JSON.parse(savedChoices as string) as Record<string, CreationChoice>;
      this.choices = {};
      for (const c in parsed) {
        // Reconstitute them as CreationChoice objects so that the functions exist.
        this.choices[c] = Object.assign(new CreationChoice(), parsed[c]);
      }
    }
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
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true,
      resizable: true,
      tabs: [
        {
          navSelector: ".creation-sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "0-species",
        },
        {
          navSelector: ".species-tabs",
          contentSelector: ".species-body",
          initial: "skills",
        },
        {
          navSelector: ".homeland-tabs",
          contentSelector: ".homeland-body",
          initial: "cultures",
        },
      ],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
    });
  }

  async getData(): Promise<any> {
    // Set any collapsible sections that need to be open by default
    if (this.collapsibleOpenStates["speciesBackground"] === undefined) {
      this.collapsibleOpenStates["speciesBackground"] = true;
      this.collapsibleOpenStates["homelandWizardInstructions"] = true;
      this.collapsibleOpenStates["homelandAdvanced"] = true;
    }

    if (!this.species.speciesTemplates) {
      // Don't get these every time.
      this.species.speciesTemplates = await getActorTemplates();
    }

    if (!this.homeland.homelands) {
      // Don't get these every time
      this.homeland.homelands = await getHomelands();
    }

    if (this.actor) {
      // See if the user has already chosen a species template that is stored in flags
      const previouslySelectedSpeciesId = this.actor.getFlag(
        RQG_CONFIG.flagScope,
        RQG_CONFIG.actorWizardFlags.selectedSpeciesId
      );
      if (previouslySelectedSpeciesId) {
        const flaggedSpecies = this.species.speciesTemplates?.find((s) => s.id === previouslySelectedSpeciesId);
        if (
          flaggedSpecies &&
          flaggedSpecies.id &&
          this.species.selectedSpeciesTemplate === undefined
        ) {
          // User has chosen a species in a previous session, so set it
          await this.setSpeciesTemplate(flaggedSpecies.id, false);
        }
      }

      // Has the user already chosen a Homeland stored in flags?
      const previouslySelectedHomelandRqid = this.actor.getFlag(
        RQG_CONFIG.flagScope,
        RQG_CONFIG.actorWizardFlags.selectedHomelandRqid
      ) as string;
      if (previouslySelectedHomelandRqid) {
          await this.setHomeland(previouslySelectedHomelandRqid);
      }

    }

    await this.updateChoices();

    // put choices on selected species items for purposes of sheet
    this.species.selectedSpeciesTemplate?.items.forEach((i) => {
      const associatedChoice = this.choices[i.data.data.rqid];
      if (associatedChoice) {
        //@ts-ignore choice
        i.data.data.choice = associatedChoice;
      }
    });

    // put choices on selected homeland journal rqidLinks for purposes of sheet
    const selectedHomeland = this.homeland.selectedHomeland?.data as HomelandDataSource;
    selectedHomeland.data.cultureJournalRqidLinks.forEach((rqidLink) => {
      const associatedChoice = this.choices[rqidLink.rqid];
      if (associatedChoice) {
        //@ts-ignore choice
        rqidLink.choice = associatedChoice;
      }
    });

    return {
      actor: this.actor,
      species: this.species,
      speciesTemplateItems: this.species.selectedSpeciesTemplate
        ? RqgActorSheet.organizeOwnedItems(this.species.selectedSpeciesTemplate)
        : undefined,
      homeland: this.homeland,
      choices: this.choices,
      collapsibleOpenStates: this.collapsibleOpenStates,
    };
  }

  activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);

    this.form?.querySelectorAll(".wizard-choice-input").forEach((el) => {
      el.addEventListener("change", async (ev) => {
        const inputTarget = ev.target as HTMLInputElement;
        const rqid = inputTarget.dataset.rqid;
        const forChoice = inputTarget.dataset.forChoice;
        if (rqid) {
          let changedChoice = this.choices[rqid];
          if (changedChoice) {
            if (forChoice === "species") {
              changedChoice.speciesPresent = inputTarget.checked;
            }
            if (forChoice === "homelandCulture") {
              changedChoice.homelandCultureChosen = inputTarget.checked;
            }
          }
        }
        this.render();
      });
    });

    this.form?.querySelectorAll(".collabsible-header").forEach((el) => {
      el.addEventListener("click", (ev) => {
        const wrapper = (ev.target as HTMLElement).closest(".collabsible-wrapper") as HTMLElement;
        const wasOpen = wrapper.dataset.open === "true" ? true : false;
        const wrapperName = wrapper.dataset.collabsibleName;
        if (wrapperName) {
          this.collapsibleOpenStates[wrapperName] = !wasOpen;
        }
        const body = $(wrapper as HTMLElement).find(".collabsible-wrapper-body")[0];
        $(body).slideToggle(300);
        const plus = $(wrapper as HTMLElement).find(".fa-plus-square")[0];
        plus?.classList.toggle("no-display");
        const minus = $(wrapper as HTMLElement).find(".fa-minus-square")[0];
        minus?.classList.toggle("no-display");

        this.render();
      });
    });

    this.form?.querySelectorAll("[data-actor-creation-complete]").forEach((el) => {
      el.addEventListener("click", (ev) => {
        this._setActorCreationComplete();
      });
    });

    // Handle rqid links
    RqidLink.addRqidLinkClickHandlers($(this.form!));
  }

  _setActorCreationComplete() {
    this.actor.setFlag(RQG_CONFIG.flagScope, RQG_CONFIG.actorWizardFlags.actorWizardComplete, true);
    document.querySelectorAll(`.actor-wizard-button-${this.actor.id}`).forEach((el) => {
      el.remove();
    });
    this.close();
  }

  async _updateObject(event: Event, formData?: object): Promise<unknown> {
    const target = event.target as HTMLElement;

    if (target instanceof HTMLSelectElement) {
      const select = target as HTMLSelectElement;
      if (select.name === "selectedSpeciesTemplateId") {
        // @ts-ignore selectedSpeciesTemplateId
        const selectedTemplateId = formData?.selectedSpeciesTemplateId;
        await this.setSpeciesTemplate(selectedTemplateId, true);
      }
      if (select.name === "selectedHomelandRqid") {
        // @ts-ignore selectedHomelandRqid
        const selectedHomelandRqid = formData?.selectedHomelandRqid;
        await this.setHomeland(selectedHomelandRqid);
      }
    }
    this.render();
    return;
  }

  async setSpeciesTemplate(selectedTemplateId: string, checkAll: boolean) {
    this.species.selectedSpeciesTemplate = this.species.speciesTemplates?.find(
      (t) => t.id === selectedTemplateId
    );

    await this.actor.unsetFlag(RQG_CONFIG.flagScope, RQG_CONFIG.actorWizardFlags.selectedSpeciesId);

    await this.actor.setFlag(
      RQG_CONFIG.flagScope,
      RQG_CONFIG.actorWizardFlags.selectedSpeciesId,
      this.species.selectedSpeciesTemplate?.id
    );

    const templateChars = this.species.selectedSpeciesTemplate?.data.data.characteristics;

    if (templateChars) {
      const update = {
        data: {
          attributes: {
            move: this.species.selectedSpeciesTemplate?.data.data.attributes.move,
          },
          background: {
            species: this.species.selectedSpeciesTemplate?.data.data.background.species,
            speciesRqidLink:
              this.species.selectedSpeciesTemplate?.data.data.background.speciesRqidLink,
          },
          characteristics: {
            strength: {
              formula: templateChars.strength.formula,
            },
            constitution: {
              formula: templateChars.constitution.formula,
            },
            size: {
              formula: templateChars.size.formula,
            },
            dexterity: {
              formula: templateChars.dexterity.formula,
            },
            intelligence: {
              formula: templateChars.intelligence.formula,
            },
            power: {
              formula: templateChars.power.formula,
            },
            charisma: {
              formula: templateChars.charisma.formula,
            },
          },
        },
      };

      await this.actor.update(update);
    }

    // Delete existing hit locations from actor
    const existingHitLocationIds = this.actor.items
      .filter((h) => h.type === ItemTypeEnum.HitLocation)
      .map((h) => h.id)
      .filter((h): h is string => h !== null);
    await this.actor.deleteEmbeddedDocuments("Item", existingHitLocationIds);

    // add hit locations from template to actor
    const addHitLocations = this.species.selectedSpeciesTemplate?.items
      .filter((h) => h.type === ItemTypeEnum.HitLocation)
      .map((h) => h.data);
    if (addHitLocations) {
      //@ts-ignore addHitLocations
      await this.actor.createEmbeddedDocuments("Item", addHitLocations);
    }

    this.species.selectedSpeciesTemplate?.data.items.forEach((i) => {
      if (i.type === ItemTypeEnum.Skill) {
        const skill = i.data as SkillDataSource;
        if (this.choices[skill.data.rqid] === undefined) {
          // Adding a new choice that hasn't existed before so it should be checked.
          this.choices[skill.data.rqid] = new CreationChoice();
          this.choices[skill.data.rqid].rqid = skill.data.rqid;
          this.choices[skill.data.rqid].speciesValue = skill.data.baseChance;
          this.choices[skill.data.rqid].speciesPresent = true;
        } else {
          // The old template and the new template both have the same item
          this.choices[skill.data.rqid].speciesValue = skill.data.baseChance;
          if (checkAll) {
            this.choices[skill.data.rqid].speciesPresent = true;
          }
        }
      }
      if (i.type === ItemTypeEnum.Rune || i.type === ItemTypeEnum.Passion) {
        // Rune or Passion
        const ability = i.data.data as IAbility;
        if (this.choices[ability.rqid] === undefined) {
          // Adding a new choice that hasn't existed before so it should be checked.
          this.choices[ability.rqid] = new CreationChoice();
          this.choices[ability.rqid].rqid = ability.rqid;
          this.choices[ability.rqid].speciesValue = ability.chance || 0;
          this.choices[ability.rqid].speciesPresent = true;
        } else {
          // The old template and the new template both have the same item
          this.choices[ability.rqid].speciesValue = ability.chance || 0;
          if (checkAll) {
            this.choices[ability.rqid].speciesPresent = true;
          }
        }
      }
    });

    // Find any rqids that are in the choices but not on the species template
    // and mark them not present on the species
    const speciesRqids = this.species.selectedSpeciesTemplate?.items.map((i) => i.data.data.rqid);
    for (const choiceKey in this.choices) {
      if (!speciesRqids?.includes(choiceKey)) {
        this.choices[choiceKey].speciesPresent = false;
      }
    }
  }

  async setHomeland(selectedHomelandRqid: string) {
    this.homeland.selectedHomeland = this.homeland.homelands?.find(
      (h) => (h as RqgItem).data.data.rqid === selectedHomelandRqid
    );

    await this.actor.unsetFlag(
      RQG_CONFIG.flagScope,
      RQG_CONFIG.actorWizardFlags.selectedHomelandRqid
    );

    await this.actor.setFlag(
      RQG_CONFIG.flagScope,
      RQG_CONFIG.actorWizardFlags.selectedHomelandRqid,
      this.homeland.selectedHomeland?.data.data.rqid
    );

    const selectedHomeland = this.homeland.selectedHomeland?.data as HomelandDataSource;

    selectedHomeland.data.cultureJournalRqidLinks.forEach((journalRqidLink) => {
      if (this.choices[journalRqidLink.rqid] === undefined) {
        // adding a new choice that hasn't existed before, but journal items shouldn't be checked by default
        this.choices[journalRqidLink.rqid] = new CreationChoice();
        this.choices[journalRqidLink.rqid].rqid = journalRqidLink.rqid;
        this.choices[journalRqidLink.rqid].homelandCultureChosen = false;
      }
    });
  }

  async updateChoices() {
    const updates = [];
    const adds = [];
    const deletes: string[] = [];
    for (const key in this.choices) {
      let existingItems = this.actor.getEmbeddedItemsByRqid(key);
      if (existingItems.length > 0) {
        for (const actorItem of existingItems) {
          if (this.choices[key].present()) {
            if (actorItem.type === ItemTypeEnum.Skill) {
              assertItemType(actorItem.type, ItemTypeEnum.Skill);
              const existingSkill = actorItem.data as SkillDataSource;
              const newBaseChance = this.choices[key].totalValue();
              if (existingSkill.data.baseChance !== newBaseChance)
                // Item exists on the actor and has a different baseChance, so update it.
                updates.push({
                  _id: actorItem.id,
                  data: { baseChance: newBaseChance },
                });
            }
            if (actorItem.type === ItemTypeEnum.Rune || actorItem.type === ItemTypeEnum.Passion) {
              const existingAbility = actorItem.data.data as IAbility;
              const newChance = this.choices[key].totalValue();
              if (existingAbility.chance !== newChance) {
                updates.push({
                  _id: actorItem.id,
                  data: { chance: newChance },
                });
              }
            }
          } else {
            // Item exists on the actor but doesn't exist on the template or hasn't been chosen
            if (actorItem.id) {
              deletes.push(actorItem.id);
            }
          }
        }
      } else {
        const itemsToAdd = this.species.selectedSpeciesTemplate?.getEmbeddedItemsByRqid(key);
        if (itemsToAdd) {
          for (const templateItem of itemsToAdd) {
            if (this.choices[key].present()) {
              // Item exists on the template and has been chosen but does not exist on the actor, so add it
              adds.push(templateItem.data);
            }
          }
        }
      }
    }
    //@ts-ignore adds
    await this.actor.createEmbeddedDocuments("Item", adds);
    await this.actor.updateEmbeddedDocuments("Item", updates);
    await this.actor.deleteEmbeddedDocuments("Item", deletes);

    const selectedHomeland = this.homeland.selectedHomeland?.data as HomelandDataSource;
    const selectedHomelandRqidLinks: RqidLink[] = [];
    selectedHomeland.data.cultureJournalRqidLinks.forEach(rqidLink => {
      if (this.choices[rqidLink.rqid].homelandCultureChosen) {
        selectedHomelandRqidLinks.push(rqidLink);
      }
    });

    // This is just always going to replace the Culture RqidLinks
    await this.actor.update({
      data: {
        background: {
          homelandJournalRqidLink: selectedHomeland.data.homelandJournalRqidLink,
          regionJournalRqidLink: selectedHomeland.data.regionJournalRqidLink,
          cultureJournalRqidLinks: selectedHomelandRqidLinks,
        },
      },
    });

    this.actor.setFlag(
      RQG_CONFIG.flagScope,
      RQG_CONFIG.actorWizardFlags.wizardChoices,
      JSON.stringify(this.choices)
    );
  }
}

class CreationChoice {
  rqid: string = "";
  speciesValue: number = 0;
  speciesPresent: boolean = false;
  homelandValue: number = 0;
  homelandPresent: boolean = false;
  homelandCultureChosen: boolean = false;

  totalValue = () => {
    // TODO: one instance of a passion should be 60% and each additional intance adds +10%
    return this.speciesValue + this.homelandValue;
  };
  present = () => {
    return this.speciesPresent || this.homelandPresent;
  };
}
