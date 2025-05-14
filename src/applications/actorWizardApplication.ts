import { RqgActorSheet } from "../actors/rqgActorSheet";
import { ActorTypeEnum } from "../data-model/actor-data/rqgActorData";
import { systemId } from "../system/config";
import {
  assertHtmlElement,
  assertItemType,
  getItemDocumentTypes,
  getGame,
  localize,
} from "../system/util";
import { SkillCategoryEnum } from "../data-model/item-data/skillData";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { RqidLink } from "../data-model/shared/rqidLink";
import { RqgItem } from "../items/rqgItem";
import { actorWizardFlags, documentRqidFlags } from "../data-model/shared/rqgDocumentFlags";
import { Rqid } from "../system/api/rqidApi";
import type { IAbility } from "../data-model/shared/ability";
import type { RqgActor } from "../actors/rqgActor";
import { templatePaths } from "../system/loadHandlebarsTemplates";

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
      systemId,
      actorWizardFlags,
    )?.selectedSpeciesId;

    const template = getGame().actors?.get(previouslySelectedTemplateId as string) as
      | RqgActor
      | undefined;

    if (!template) {
      this.species.selectedSpeciesTemplate = undefined;
    } else if (template?.type === ActorTypeEnum.Character) {
      this.species.selectedSpeciesTemplate = template;
    } else {
      this.species.selectedSpeciesTemplate = undefined;
      const msg = `The Actor named ${this.actor.name} has a \n[rqg.actorWizardFlags.selectedSpeciesId]\n flag with a value that is not an RqgActor.`;
      // @ts-expect-error console
      ui.notifications?.warn(msg, { console: false });
      console.warn(msg);
    }

    const savedChoices = this.actor.getFlag(systemId, actorWizardFlags)?.wizardChoices;

    if (savedChoices) {
      // Get saved choices from flag
      const parsed = JSON.parse(savedChoices) as Record<string, CreationChoice>;
      this.choices = {};
      for (const c in parsed) {
        // Reconstitute them as CreationChoice objects so that the functions exist.
        this.choices[c] = Object.assign(new CreationChoice(), parsed[c]);
      }
    }
  }

  static get defaultOptions(): FormApplication.Options {
    return foundry.utils.mergeObject(FormApplication.defaultOptions, {
      classes: [systemId, "sheet", ActorTypeEnum.Character],
      popOut: true,
      template: templatePaths.actorWizardApplication,
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

    const worldLanguage = getGame().settings.get(systemId, "worldLanguage");

    if (!this.species.speciesTemplates) {
      // Don't get these every time.
      // this.species.speciesTemplates = await getActorTemplates();
      const templates = await Rqid.fromRqidRegexBest(/.*template.*/, "a", worldLanguage);
      this.species.speciesTemplates = templates as RqgActor[];
    }

    if (!this.homeland.homelands) {
      // Don't get these every time
      const homelands = (await Rqid.fromRqidRegexBest(
        /.*homeland.*/,
        "i",
        worldLanguage,
      )) as RqgItem[];
      this.homeland.homelands = homelands.filter((i) => i.type === ItemTypeEnum.Homeland);
    }

    if (this.actor) {
      // See if the user has already chosen a species template that is stored in flags
      const previouslySelectedSpeciesId = this.actor.getFlag(
        systemId,
        actorWizardFlags,
      )?.selectedSpeciesId;

      if (previouslySelectedSpeciesId) {
        const flaggedSpecies = this.species.speciesTemplates?.find(
          (s) => s.id === previouslySelectedSpeciesId,
        );
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
        systemId,
        actorWizardFlags,
      )?.selectedHomelandRqid;
      if (previouslySelectedHomelandRqid) {
        await this.setHomeland(previouslySelectedHomelandRqid);
      }
    }

    await this.updateChoices();

    // put choices on selected species items for purposes of sheet
    this.species.selectedSpeciesTemplate?.items.forEach((i) => {
      const rqid = i.getFlag(systemId, documentRqidFlags)?.id;
      const associatedChoice = rqid && this.choices[rqid];
      if (associatedChoice) {
        // TODO Is choice a temporary property?
        i.system.choice = associatedChoice;
      }
    });

    // enrich biography for purposes of sheet
    if (this.species.selectedSpeciesTemplate?.system.background.biography) {
      this.species.selectedSpeciesTemplate.system.background.biography =
        await TextEditor.enrichHTML(
          this.species.selectedSpeciesTemplate?.system.background.biography,
        );
    }

    // put choices on selected homeland journal rqidLinks for purposes of sheet
    const selectedHomeland = this.homeland.selectedHomeland;
    const homelandRqidLinks: RqidLink[] = (
      selectedHomeland?.system?.cultureJournalRqidLinks ?? []
    ).concat(
      ...(selectedHomeland?.system?.tribeJournalRqidLinks ?? []),
      ...(selectedHomeland?.system?.clanJournalRqidLinks ?? []),
      ...(selectedHomeland?.system?.cultRqidLinks ?? []),
    );
    if (homelandRqidLinks.length) {
      homelandRqidLinks.forEach((rqidLink: RqidLink | CreationChoice) => {
        const associatedChoice = this.choices[rqidLink.rqid];
        if (associatedChoice) {
          //@ts-expect-error choice TODO Is choice a temporary property?
          rqidLink.choice = associatedChoice;
        }
      });
    }

    const homelandRunes: RqgItem[] = [];
    if (selectedHomeland?.system?.runeRqidLinks) {
      for (const runeRqidLink of selectedHomeland?.system?.runeRqidLinks ?? []) {
        const rune = (await Rqid.fromRqid(runeRqidLink.rqid)) as RqgItem | undefined;
        assertItemType(rune?.type, ItemTypeEnum.Rune);
        rune.system.chance = 10; // Homeland runes always grant +10%, this is for display purposes only
        rune.system.hasExperience = false;
        const associatedChoice = this.choices[runeRqidLink.rqid];
        if (associatedChoice) {
          // put choice on homeland runes for purposes of sheet
          rune.system.choice = associatedChoice;
        }
        homelandRunes.push(rune);
      }
      // put runes on homeland for purposes of sheet
      //@ts-expect-error runes
      this.homeland.selectedHomeland.runes = homelandRunes;
    }

    const homelandSkills: RqgItem[] = [];
    if (selectedHomeland?.system?.skillRqidLinks) {
      for (const skillRqidLink of selectedHomeland?.system?.skillRqidLinks ?? []) {
        const skill = (await Rqid.fromRqid(skillRqidLink.rqid)) as RqgItem | undefined;
        assertItemType(skill?.type, ItemTypeEnum.Skill);
        const associatedChoice = this.choices[skillRqidLink.rqid];
        if (associatedChoice) {
          // put choice on homeland skills for purposes of sheet
          skill.system.choice = associatedChoice;
        }
        if (skillRqidLink.bonus) {
          skill.system.baseChance = 0;
          skill.system.gainedChance = 0;
          skill.system.hasExperience = false;
          skill.system.chance = skillRqidLink.bonus;
        }
        homelandSkills.push(skill);
      }
    }

    // enrich homeland wizard instructions for purposes of sheet
    if (selectedHomeland?.system.wizardInstructions) {
      selectedHomeland.system.wizardInstructions = await TextEditor.enrichHTML(
        selectedHomeland.system.wizardInstructions,
      );
    }

    // Create an object similar to the one from ActorSheet organizeEmbeddedItems
    const itemTypes: any = Object.fromEntries(getItemDocumentTypes().map((t: string) => [t, []]));
    const skills: any = {};
    Object.values(SkillCategoryEnum).forEach((cat: string) => {
      skills[cat] = homelandSkills.filter((s: any) => cat === s.system.category);
    });
    // Sort the skills inside each category
    Object.values(skills).forEach((skillList) =>
      (skillList as RqgItem[]).sort((a: RqgItem, b: RqgItem) =>
        ("" + a.name).localeCompare("" + b.name),
      ),
    );
    itemTypes[ItemTypeEnum.Skill] = skills;

    const homelandPassions: RqgItem[] = [];
    if (selectedHomeland?.system?.passionRqidLinks) {
      for (const passionRqidLink of selectedHomeland?.system?.passionRqidLinks ?? []) {
        const passion = (await Rqid.fromRqid(passionRqidLink.rqid)) as RqgItem | undefined;
        assertItemType(passion?.type, ItemTypeEnum.Passion);
        const associatedChoice = this.choices[passionRqidLink.rqid];
        passion.system.hasExperience = false;
        if (associatedChoice) {
          // put choice on homeland passions for purposes of sheet
          passion.system.choice = associatedChoice;
        }
        homelandPassions.push(passion as RqgItem); // Already asserted
      }
    }

    const passions: any = [];
    homelandPassions.forEach((passion) => {
      passions.push(passion);
    });
    itemTypes[ItemTypeEnum.Passion] = passions;

    if (this.homeland.selectedHomeland) {
      // put skills and passions on homeland for purposes of sheet
      //@ts-expect-error embeddedItems
      this.homeland.selectedHomeland.embeddedItems = itemTypes; //TODO Sort this by category and use the skill tab
    }

    return {
      actor: this.actor,
      species: this.species,
      speciesTemplateItems: this.species.selectedSpeciesTemplate
        ? await new RqgActorSheet(this.actor).organizeEmbeddedItems(
            this.species.selectedSpeciesTemplate,
          )
        : undefined,
      homeland: this.homeland,
      choices: this.choices,
      collapsibleOpenStates: this.collapsibleOpenStates,
    };
  }

  activateListeners(html: JQuery): void {
    super.activateListeners(html);

    this.form?.querySelectorAll(".wizard-choice-input").forEach((el) => {
      el.addEventListener("change", async (ev) => {
        const inputTarget = ev.target as HTMLInputElement;
        const rqid = inputTarget.dataset.rqid;
        const forChoice = inputTarget.dataset.forChoice;
        if (rqid) {
          const changedChoice = this.choices[rqid];
          if (changedChoice) {
            if (forChoice === "species") {
              changedChoice.speciesPresent = inputTarget.checked;
            }
            if (forChoice === "homeland") {
              changedChoice.homelandPresent = inputTarget.checked;
            }
            if (forChoice === "homelandCultures") {
              changedChoice.homelandCultureChosen = inputTarget.checked;
            }
            if (forChoice === "homelandTribes") {
              changedChoice.homelandTribeChosen = inputTarget.checked;
            }
            if (forChoice === "homelandClans") {
              changedChoice.homelandClanChosen = inputTarget.checked;
            }
            if (forChoice === "homelandCult") {
              changedChoice.homelandCultChosen = inputTarget.checked;
            }
          }
        }
        this.render();
      });
    });

    this.form?.querySelectorAll(".collapsible-header").forEach((el) => {
      el.addEventListener("click", (ev) => {
        const target = ev.target;
        assertHtmlElement(target);
        const wrapper = target?.closest(".collapsible-wrapper");
        assertHtmlElement(wrapper);
        const wasOpen = wrapper?.dataset.open === "true";
        const wrapperName = wrapper?.dataset.collapsibleName;
        if (wrapperName) {
          this.collapsibleOpenStates[wrapperName] = !wasOpen;
        }
        const body = $(wrapper as HTMLElement).find(".collapsible-wrapper-body")[0];
        $(body).slideToggle(300);
        const plus = $(wrapper as HTMLElement).find(".fa-plus-square")[0];
        plus?.classList.toggle("no-display");
        const minus = $(wrapper as HTMLElement).find(".fa-minus-square")[0];
        minus?.classList.toggle("no-display");

        this.render();
      });
    });

    this.form?.querySelectorAll("[data-actor-creation-complete]").forEach((el) => {
      el.addEventListener("click", () => {
        this._setActorCreationComplete();
      });
    });

    // Handle rqid links
    RqidLink.addRqidLinkClickHandlers($(this.form!));
  }

  _setActorCreationComplete() {
    this.actor.setFlag(systemId, actorWizardFlags, { actorWizardComplete: true });
    document.querySelectorAll(`.actor-wizard-button-${this.actor.id}`).forEach((el) => {
      el.remove();
    });
    this.close();
  }

  async _updateObject(event: Event, formData?: object): Promise<unknown> {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      const select = target as HTMLSelectElement;
      if (select.name === "selectedSpeciesTemplateId") {
        // @ts-expect-error selectedSpeciesTemplateId
        const selectedTemplateId = formData?.selectedSpeciesTemplateId;
        await this.setSpeciesTemplate(selectedTemplateId, true);
      }
      if (select.name === "selectedHomelandRqid") {
        // @ts-expect-error selectedHomelandRqid
        const selectedHomelandRqid = formData?.selectedHomelandRqid;
        await this.setHomeland(selectedHomelandRqid);
      }
    }
    this.render();
    return;
  }

  async setSpeciesTemplate(selectedTemplateId: string, checkAll: boolean) {
    this.species.selectedSpeciesTemplate = this.species.speciesTemplates?.find(
      (t) => t.id === selectedTemplateId,
    );

    await this.actor.unsetFlag(systemId, "actorWizardFlags.selectedSpeciesId");

    await this.actor.setFlag(systemId, actorWizardFlags, {
      selectedSpeciesId: this.species.selectedSpeciesTemplate?.id ?? undefined,
    });

    const templateChars = this.species.selectedSpeciesTemplate?.system.characteristics;

    if (templateChars) {
      const update = {
        system: {
          attributes: {
            move: this.species.selectedSpeciesTemplate?.system.attributes.move,
          },
          background: {
            species: this.species.selectedSpeciesTemplate?.system.background.species,
            speciesRqidLink:
              this.species.selectedSpeciesTemplate?.system.background.speciesRqidLink,
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
    const addHitLocations = this.species.selectedSpeciesTemplate?.items.filter(
      (h) => h.type === ItemTypeEnum.HitLocation,
    );
    if (addHitLocations) {
      //@ts-expect-error addHitLocations
      await this.actor.createEmbeddedDocuments("Item", addHitLocations);
    }

    this.species.selectedSpeciesTemplate?.items.forEach((i) => {
      const rqidFlags = i.getFlag(systemId, documentRqidFlags);
      if (!rqidFlags?.id) {
        console.warn("NO RQID!", i);
        return; // TODO How should this be handled?
      }

      if (i.type === ItemTypeEnum.Skill) {
        const skillData = i.system;
        if (!this.choices[rqidFlags.id]) {
          // Adding a new choice that hasn't existed before so it should be checked.
          this.choices[rqidFlags.id] = new CreationChoice();
          this.choices[rqidFlags.id].rqid = rqidFlags.id;
          this.choices[rqidFlags.id].speciesValue = skillData.baseChance;
          this.choices[rqidFlags.id].speciesPresent = true;
        } else {
          // The old template and the new template both have the same item
          this.choices[rqidFlags.id].speciesValue = skillData.baseChance;
          if (checkAll) {
            this.choices[rqidFlags.id].speciesPresent = true;
          }
        }
      }
      if (i.type === ItemTypeEnum.Rune || i.type === ItemTypeEnum.Passion) {
        // Rune or Passion
        const abilityData = i.system as IAbility;
        if (this.choices[rqidFlags.id] === undefined) {
          // Adding a new choice that hasn't existed before so it should be checked.
          this.choices[rqidFlags.id] = new CreationChoice();
          this.choices[rqidFlags.id].rqid = rqidFlags.id;
          this.choices[rqidFlags.id].speciesValue = abilityData.chance || 0;
          this.choices[rqidFlags.id].speciesPresent = true;
        } else {
          // The old template and the new template both have the same item
          this.choices[rqidFlags.id].speciesValue = abilityData.chance || 0;
          if (checkAll) {
            this.choices[rqidFlags.id].speciesPresent = true;
          }
        }
      }
    });

    // Find any rqids that are in the choices but not on the species template
    // and mark them not present on the species
    const speciesRqids = this.species.selectedSpeciesTemplate?.items.map(
      (i) => i.getFlag(systemId, documentRqidFlags)?.id,
    );
    for (const choiceKey in this.choices) {
      if (!speciesRqids?.includes(choiceKey)) {
        this.choices[choiceKey].speciesPresent = false;
      }
    }
  }

  async setHomeland(selectedHomelandRqid: string) {
    this.homeland.selectedHomeland = this.homeland.homelands?.find(
      (h) => h.getFlag(systemId, documentRqidFlags)?.id === selectedHomelandRqid,
    );

    await this.actor.unsetFlag(systemId, "actorWizardFlags.selectedHomelandRqid");

    await this.actor.setFlag(systemId, actorWizardFlags, {
      selectedHomelandRqid: this.homeland.selectedHomeland?.getFlag(systemId, documentRqidFlags)
        ?.id,
    });

    const selectedHomeland = this.homeland.selectedHomeland;

    if (selectedHomeland) {
      selectedHomeland.system.cultureJournalRqidLinks.forEach((journalRqidLink: RqidLink) => {
        if (this.choices[journalRqidLink.rqid] === undefined) {
          // adding a new choice that hasn't existed before, but Culture JournalEntries shouldn't be checked by default
          this.choices[journalRqidLink.rqid] = new CreationChoice();
          this.choices[journalRqidLink.rqid].rqid = journalRqidLink.rqid;
          this.choices[journalRqidLink.rqid].type = "journal-culture";
          this.choices[journalRqidLink.rqid].homelandCultureChosen = false;
        }
      });

      selectedHomeland.system.tribeJournalRqidLinks.forEach((journalRqidLink: RqidLink) => {
        if (this.choices[journalRqidLink.rqid] === undefined) {
          // adding a new choice that hasn't existed before, but Tribe JournalEntries shouldn't be checked by default
          this.choices[journalRqidLink.rqid] = new CreationChoice();
          this.choices[journalRqidLink.rqid].rqid = journalRqidLink.rqid;
          this.choices[journalRqidLink.rqid].type = "journal-tribe";
          this.choices[journalRqidLink.rqid].homelandTribeChosen = false;
        }
      });

      selectedHomeland.system.clanJournalRqidLinks.forEach((journalRqidLink: RqidLink) => {
        if (this.choices[journalRqidLink.rqid] === undefined) {
          // adding a new choice that hasn't existed before, but Clan JournalEntries shouldn't be checked by default
          this.choices[journalRqidLink.rqid] = new CreationChoice();
          this.choices[journalRqidLink.rqid].rqid = journalRqidLink.rqid;
          this.choices[journalRqidLink.rqid].type = "journal-clan";
          this.choices[journalRqidLink.rqid].homelandClanChosen = false;
        }
      });

      selectedHomeland.system.cultRqidLinks.forEach((cultRqidLink: RqidLink) => {
        if (this.choices[cultRqidLink.rqid] === undefined) {
          // adding a new choice that hasn't existed before, but Cult Items shouldn't be checked by default
          this.choices[cultRqidLink.rqid] = new CreationChoice();
          this.choices[cultRqidLink.rqid].rqid = cultRqidLink.rqid;
          this.choices[cultRqidLink.rqid].type = ItemTypeEnum.Cult;
          this.choices[cultRqidLink.rqid].homelandCultChosen = false;
        }
      });

      selectedHomeland.system.skillRqidLinks.forEach((skillRqidLink: RqidLink) => {
        if (this.choices[skillRqidLink.rqid] === undefined) {
          // adding a new choice that hasn't existed before, check Skill Items by default since MOST of them will be used
          this.choices[skillRqidLink.rqid] = new CreationChoice();
          this.choices[skillRqidLink.rqid].rqid = skillRqidLink.rqid;
          this.choices[skillRqidLink.rqid].type = ItemTypeEnum.Skill;
          this.choices[skillRqidLink.rqid].homelandPresent = true;
        }
        // Homeland always adds +10% to runes.  This is the the real value that gets added.
        this.choices[skillRqidLink.rqid].homelandValue = skillRqidLink.bonus || 0;
      });

      selectedHomeland.system.runeRqidLinks.forEach((runeRqidLink: RqidLink) => {
        if (this.choices[runeRqidLink.rqid] === undefined) {
          // adding a new choice that hasn't existed before, check Rune Items by default since there's usually only ONE
          this.choices[runeRqidLink.rqid] = new CreationChoice();
          this.choices[runeRqidLink.rqid].rqid = runeRqidLink.rqid;
          this.choices[runeRqidLink.rqid].type = ItemTypeEnum.Rune;
          this.choices[runeRqidLink.rqid].homelandPresent = true;
        }
        // Homeland always adds +10% to runes.  This is the the real value that gets added.
        this.choices[runeRqidLink.rqid].homelandValue = 10;
      });

      selectedHomeland.system.passionRqidLinks.forEach((passionRqidLink: RqidLink) => {
        if (this.choices[passionRqidLink.rqid] === undefined) {
          // adding a new choice that hasn't existed before, check Passion Items by default
          this.choices[passionRqidLink.rqid] = new CreationChoice();
          this.choices[passionRqidLink.rqid].rqid = passionRqidLink.rqid;
          this.choices[passionRqidLink.rqid].type = ItemTypeEnum.Passion;
          this.choices[passionRqidLink.rqid].homelandPresent = true;
        }
        this.choices[passionRqidLink.rqid].homelandValue = 10;
      });
    }
  }

  async updateChoices() {
    const updates = [];
    const adds = [];
    const deletes: string[] = [];
    for (const key in this.choices) {
      const existingItems = this.actor.getEmbeddedDocumentsByRqid(key);
      if (existingItems.length > 0) {
        for (const actorItem of existingItems) {
          // Handle Skills, Runes, and Passions, which use the .present property of the choice
          if (
            actorItem.type === ItemTypeEnum.Skill ||
            actorItem.type === ItemTypeEnum.Rune ||
            actorItem.type === ItemTypeEnum.Passion
          ) {
            if (this.choices[key].present()) {
              if (actorItem.type === ItemTypeEnum.Skill) {
                assertItemType(actorItem.type, ItemTypeEnum.Skill);
                const existingSkillData = actorItem.system;
                const newBaseChance = this.choices[key].totalValue();
                if (existingSkillData.baseChance !== newBaseChance) {
                  // Item exists on the actor and has a different baseChance, so update it.
                  updates.push({
                    _id: actorItem.id,
                    system: { baseChance: newBaseChance },
                  });
                }
              }
              if (actorItem.type === ItemTypeEnum.Rune || actorItem.type === ItemTypeEnum.Passion) {
                const existingAbilityData = actorItem.system as IAbility;
                const newChance = this.choices[key].totalValue();
                if (existingAbilityData.chance !== newChance) {
                  updates.push({
                    _id: actorItem.id,
                    system: { chance: newChance },
                  });
                }
              }
            } else {
              // Item exists on the actor but doesn't exist on the template or hasn't been chosen
              if (actorItem.id && !deletes.includes(actorItem.id)) {
                // TODO ???
              }
              //@ts-expect-error actorItem.id
              deletes.push(actorItem.id);
            }
          }
          // Handle Cults which use .homelandCultChosen and don't need to get "added up"
          if (actorItem.type === ItemTypeEnum.Cult) {
            if (this.choices[key].homelandCultChosen) {
              // Cult already exists on actor
              // Do nothing
            } else {
              // Cult exists on actor but hasn't been chosen (maybe has been de-selected)
              if (actorItem.id) {
                deletes.push(actorItem.id);
              }
            }
          }
        }
      } else {
        // did not find an existing item on the actor corresponding to rqid "key"

        // Copy Skills, Runes, and Passions from the Actor template
        if (this.choices[key].speciesPresent) {
          const item = (await Rqid.fromRqid(key)) as RqgItem | undefined;
          let itemsToAddFromTemplate = item ? [item] : undefined;
          if (!itemsToAddFromTemplate) {
            // Didn't find items by rqid, so just take what's on the Species Template
            itemsToAddFromTemplate =
              this.species.selectedSpeciesTemplate?.getEmbeddedDocumentsByRqid(key) || [];
            console.log(
              `Actor Species Template had an item with rqid "${key} that was not found in by rqid. Using item from the Actor Species Template.`,
              itemsToAddFromTemplate,
            );
          }

          if (itemsToAddFromTemplate) {
            for (const templateItem of itemsToAddFromTemplate) {
              // Item exists on the template and has been chosen but does not exist on the actor, so add it
              if (templateItem.type === ItemTypeEnum.Skill) {
                templateItem.system.baseChance = this.choices[key].totalValue();
                templateItem.system.hasExperience = false;
              }
              if (templateItem.type === ItemTypeEnum.Rune) {
                templateItem.system.chance = this.choices[key].totalValue();
                templateItem.system.hasExperience = false;
              }
              if (templateItem.type === ItemTypeEnum.Passion) {
                templateItem.system.chance = this.choices[key].totalValue();
                templateItem.system.hasExperience = false;
              }
              adds.push(templateItem);
            }
          }
        }

        // Copy Skills, Runes, and Passions from the Homeland using rqid
        if (this.choices[key].homelandPresent) {
          const itemToAddFromHomeland = await Rqid.fromRqid(key);
          if (itemToAddFromHomeland instanceof RqgItem) {
            // Item exists on the template and has been chosen but does not exist on the actor, so add it
            if (itemToAddFromHomeland.type === ItemTypeEnum.Skill) {
              itemToAddFromHomeland.system.baseChance = this.choices[key].totalValue();
              itemToAddFromHomeland.system.hasExperience = false;
            }
            if (itemToAddFromHomeland.type === ItemTypeEnum.Rune) {
              itemToAddFromHomeland.system.chance = this.choices[key].totalValue();
              itemToAddFromHomeland.system.hasExperience = false;
            }
            if (itemToAddFromHomeland.type === ItemTypeEnum.Passion) {
              itemToAddFromHomeland.system.chance = this.choices[key].totalValue();
              itemToAddFromHomeland.system.hasExperience = false;
            }
            adds.push(itemToAddFromHomeland); // TODO or itemToAddFromHomeland.toObject() ??
          }
        }

        // Get Cults by rqid and add to actor
        let cultsEligibleToAdd: RqidLink[] = [];

        if (this.homeland.selectedHomeland) {
          cultsEligibleToAdd = this.homeland.selectedHomeland?.system.cultRqidLinks;
        }

        if (cultsEligibleToAdd.map((c) => c.rqid).includes(key)) {
          if (this.choices[key].homelandCultChosen) {
            const cult = await Rqid.fromRqid(key);
            if (cult) {
              adds.push(cult);
            }
          }
        }
      }
    }
    //@ts-expect-errors adds // TODO fix "adds" typing
    await this.actor.createEmbeddedDocuments("Item", adds);
    await this.actor.updateEmbeddedDocuments("Item", updates);
    await this.actor.deleteEmbeddedDocuments("Item", deletes);

    const selectedHomelandData = this.homeland.selectedHomeland?.system;

    const selectedCultureRqidLinks: RqidLink[] = [];
    const selectedTribeRqidLinks: RqidLink[] = [];
    const selectedClanRqidLinks: RqidLink[] = [];

    if (selectedHomelandData) {
      selectedHomelandData.cultureJournalRqidLinks.forEach((rqidLink: RqidLink) => {
        if (this.choices[rqidLink.rqid].homelandCultureChosen) {
          selectedCultureRqidLinks.push(rqidLink);
        }
      });

      selectedHomelandData.tribeJournalRqidLinks.forEach((rqidLink: RqidLink) => {
        if (this.choices[rqidLink.rqid].homelandTribeChosen) {
          selectedTribeRqidLinks.push(rqidLink);
        }
      });

      selectedHomelandData.clanJournalRqidLinks.forEach((rqidLink: RqidLink) => {
        if (this.choices[rqidLink.rqid].homelandClanChosen) {
          selectedClanRqidLinks.push(rqidLink);
        }
      });
    }

    // This is just always going to replace the Culture RqidLinks
    await this.actor.update({
      system: {
        background: {
          homelandJournalRqidLink: selectedHomelandData?.homelandJournalRqidLink,
          regionJournalRqidLink: selectedHomelandData?.regionJournalRqidLink,
          cultureJournalRqidLinks: selectedCultureRqidLinks,
          tribeJournalRqidLinks: selectedTribeRqidLinks,
          clanJournalRqidLinks: selectedClanRqidLinks,
        },
      },
    });

    await this.actor.setFlag(systemId, actorWizardFlags, {
      wizardChoices: JSON.stringify(this.choices),
    });
  }
}

class CreationChoice {
  rqid: string = "";
  type: string = "";
  speciesValue: number = 0;
  speciesPresent: boolean = false;
  homelandValue: number = 0;
  homelandPresent: boolean = false;
  homelandCultureChosen: boolean = false;
  homelandTribeChosen: boolean = false;
  homelandClanChosen: boolean = false;
  homelandCultChosen: boolean = false;

  totalValue = () => {
    let result: number = 0;
    if (this.type === ItemTypeEnum.Passion) {
      // The first instance of a Passion is worth 60% and each additional one is worth +10%
      if (this.speciesPresent) {
        result += 10;
      }
      if (this.homelandPresent) {
        result += 10;
      }
      if (result > 0) {
        result += 50;
      }
      return result;
    }
    if (this.speciesPresent) {
      result += this.speciesValue;
    }
    if (this.homelandPresent) {
      result += this.homelandValue;
    }
    return result;
  };
  present = () => {
    return this.speciesPresent || this.homelandPresent;
  };
}
