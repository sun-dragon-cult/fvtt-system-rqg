import { organizeEmbeddedItems } from "../actors/rqgActorSheetDataPrep";
import { ActorTypeEnum, type CharacterActor } from "../data-model/actor-data/rqgActorData";
import { systemId } from "../system/config";
import {
  assertHtmlElement,
  assertDocumentSubType,
  getItemDocumentTypes,
  localize,
  getDocumentFromUuid,
  isDocumentSubType,
} from "../system/util";
import { SkillCategoryEnum, type SkillItem } from "@item-model/skillDataModel.ts";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { RqidLink } from "../data-model/shared/rqidLink";
import { RqgItem } from "../items/rqgItem";
import { actorWizardFlags, documentRqidFlags } from "../data-model/shared/rqgDocumentFlags";
import { Rqid } from "../system/api/rqidApi";
import { isValidRqidString, toRqidString } from "../system/api/rqidValidation";
import type { RqidString } from "../system/api/rqidApi";
import type { IAbility } from "../data-model/shared/ability";
import type { RqgActor } from "../actors/rqgActor";
import { templatePaths } from "../system/loadHandlebarsTemplates";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

type ActorWizardBaseCtor = (abstract new (
  ...args: any[]
) => foundry.applications.api.ApplicationV2.Any) &
  typeof ApplicationV2 & {
    PARTS: Record<
      string,
      foundry.applications.api.HandlebarsApplicationMixin.HandlebarsTemplatePart
    >;
  };

const ActorWizardBase = HandlebarsApplicationMixin(ApplicationV2) as unknown as ActorWizardBaseCtor;

import type { RuneItem } from "@item-model/runeDataModel.ts";
import type { PassionItem } from "@item-model/passionDataModel.ts";
import type { HomelandItem } from "@item-model/homelandDataModel.ts";
import type { HitLocationItem } from "@item-model/hitLocationDataModel.ts";
import type { CultItem } from "@item-model/cultDataModel.ts";

/**
 * Template context types for the Actor Wizard.
 * These types represent what the Handlebars template receives,
 * which includes enriched HTML, computed properties, and UI state
 * that don't belong in the strict data model types.
 */

/** System data with additional template properties for display */
interface TemplateSystemData {
  [key: string]: any;
  choice?: CreationChoice;
}

/** Item with template-specific properties (uses intersection to add choice to system) */
type TemplateItem = RqgItem & {
  system: RqgItem["system"] & TemplateSystemData;
};

/** RqidLink with choice property for template display */
interface TemplateRqidLink extends RqidLink {
  choice?: CreationChoice;
}

/** Species template context with enriched biography */
interface TemplateSpeciesContext {
  selectedSpeciesTemplate:
    | (RqgActor & {
        items: TemplateItem[];
        system: any; // Allows for enriched biography and other template properties
      })
    | undefined;
  speciesTemplateOptions: SelectOptionData<string>[] | undefined;
}

/** Homeland template context with enriched content and embedded items */
interface TemplateHomelandContext {
  selectedHomeland:
    | (HomelandItem & {
        system: any; // Allows for enriched wizardInstructions and TemplateRqidLinks
        runes?: TemplateItem[]; // computed for display
        embeddedItems?: Record<string, any>; // organized items for display
      })
    | undefined;
  homelandOptions: SelectOptionData<string>[] | undefined;
}

/** Complete template context returned by getData() */
interface ActorWizardTemplateContext extends foundry.applications.api.ApplicationV2.RenderContext {
  actor: RqgActor;
  species: TemplateSpeciesContext;
  speciesTemplateItems: Record<string, any> | undefined;
  homeland: TemplateHomelandContext;
  choices: Record<string, CreationChoice>;
  collapsibleOpenStates: Record<string, boolean>;
}

export class ActorWizard extends ActorWizardBase {
  actor: RqgActor;
  species: {
    selectedSpeciesTemplate: RqgActor | undefined;
    speciesTemplateOptions: SelectOptionData<string>[] | undefined; // value is uuid
  } = { selectedSpeciesTemplate: undefined, speciesTemplateOptions: undefined };
  homeland: {
    selectedHomeland: RqgItem | undefined;
    homelandOptions: SelectOptionData<string>[] | undefined; // value is rqid
  } = { selectedHomeland: undefined, homelandOptions: undefined };
  collapsibleOpenStates: Record<string, boolean> = {};
  choices: Record<string, CreationChoice> = {};

  private _currentTab: string = "0-species";

  constructor(
    actor: RqgActor,
    options?: Partial<foundry.applications.types.ApplicationConfiguration>,
  ) {
    super(options);
    this.actor = actor;
    const previouslySelectedTemplateUuid = this.actor.getFlag(
      systemId,
      actorWizardFlags,
    )?.selectedSpeciesUuid;

    const template = fromUuidSync(previouslySelectedTemplateUuid) as RqgActor | undefined;

    if (!template) {
      this.species.selectedSpeciesTemplate = undefined;
    } else if (isDocumentSubType<CharacterActor>(template, ActorTypeEnum.Character)) {
      this.species.selectedSpeciesTemplate = template;
    } else {
      this.species.selectedSpeciesTemplate = undefined;
      const msg = `The Actor named ${this.actor.name} has a \n[rqg.actorWizardFlags.selectedSpeciesUuid]\n flag with a value that is not an RqgActor.`;
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

  static override DEFAULT_OPTIONS = {
    id: "actor-wizard-application",
    tag: "form",
    classes: [systemId, "sheet", "character"],
    position: {
      width: 850,
      height: 650,
    },
    window: {
      resizable: true,
      title: "RQG.ActorCreation.AdventurerCreationWizardTitle",
    },
    form: {
      handler: ActorWizard.onSubmit,
      submitOnChange: true,
      closeOnSubmit: false,
    },
  };

  static override PARTS = {
    form: { template: templatePaths.actorWizardApplication },
  };

  override async _prepareContext(): Promise<ActorWizardTemplateContext> {
    // Set any collapsible sections that need to be open by default
    if (this.collapsibleOpenStates["speciesBackground"] === undefined) {
      this.collapsibleOpenStates["speciesBackground"] = true;
      this.collapsibleOpenStates["homelandWizardInstructions"] = true;
      this.collapsibleOpenStates["homelandAdvanced"] = true;
    }

    const worldLanguage =
      game.settings?.get(systemId, "worldLanguage") ?? CONFIG.RQG.fallbackLanguage;

    if (!this.species.speciesTemplateOptions) {
      // Don't get these every time.
      // this.species.speciesTemplates = await getActorTemplates();
      const templates = (await Rqid.fromRqidRegexBest(
        /.*template.*/,
        "a",
        worldLanguage,
      )) as RqgActor[];
      this.species.speciesTemplateOptions = templates.map((templateActor) => ({
        value: templateActor.uuid ?? "",
        label: templateActor.name ?? "",
      }));
      this.species.speciesTemplateOptions.unshift({
        value: "",
        label: localize("RQG.ActorCreation.Step0.ChooseSpecies"),
      });
    }

    if (!this.homeland.homelandOptions) {
      // Don't get these every time
      const homelands = (await Rqid.fromRqidRegexBest(
        /.*homeland.*/,
        "i",
        worldLanguage,
      )) as RqgItem[];
      this.homeland.homelandOptions = homelands
        .filter((i) => isDocumentSubType<HomelandItem>(i, ItemTypeEnum.Homeland))
        .map((homelandItem) => ({
          value: homelandItem.getFlag(systemId, "documentRqidFlags").id ?? "",
          label: homelandItem.name ?? "",
        }));

      this.homeland.homelandOptions.unshift({
        value: "",
        label: localize("RQG.ActorCreation.Step1.ChooseHomeland"),
      });
    }

    if (this.actor) {
      // See if the user has already chosen a species template that is stored in flags
      const previouslySelectedSpeciesUuid = this.actor.getFlag(
        systemId,
        actorWizardFlags,
      )?.selectedSpeciesUuid;

      if (
        previouslySelectedSpeciesUuid &&
        previouslySelectedSpeciesUuid !== this.species?.selectedSpeciesTemplate?.uuid
      ) {
        const flaggedSpecies = await getDocumentFromUuid<RqgActor>(previouslySelectedSpeciesUuid);
        if (flaggedSpecies?.uuid && this.species.selectedSpeciesTemplate === undefined) {
          // User has chosen a species in a previous session, so set it
          await this.setSpeciesTemplate(flaggedSpecies.uuid, false);
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

    // Prepare template species context with choices on items
    const templateSpecies: TemplateSpeciesContext = {
      selectedSpeciesTemplate: this.species.selectedSpeciesTemplate
        ? ({
            ...this.species.selectedSpeciesTemplate,
            items: this.species.selectedSpeciesTemplate.items.map((item) => {
              const rqid = item.getFlag(systemId, documentRqidFlags)?.id;
              const associatedChoice = rqid && this.choices[rqid];
              const templateItem = item as TemplateItem;
              if (associatedChoice) {
                templateItem.system.choice = associatedChoice;
              }
              return templateItem;
            }),
          } as unknown as TemplateSpeciesContext["selectedSpeciesTemplate"])
        : undefined,
      speciesTemplateOptions: this.species.speciesTemplateOptions,
    };

    // Enrich biography for template display
    if (
      templateSpecies.selectedSpeciesTemplate?.system &&
      "background" in templateSpecies.selectedSpeciesTemplate.system &&
      (templateSpecies.selectedSpeciesTemplate.system as any).background?.biography
    ) {
      const background = (templateSpecies.selectedSpeciesTemplate.system as any).background;
      background.biography = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        background.biography,
      );
    }

    // Prepare template homeland context with enriched content and embedded items
    const selectedHomeland = this.homeland.selectedHomeland;
    if (selectedHomeland) {
      assertDocumentSubType<HomelandItem>(selectedHomeland, ItemTypeEnum.Homeland);
    }

    let templateHomelandItem: TemplateHomelandContext["selectedHomeland"];

    if (selectedHomeland) {
      // Add choices to RqidLinks
      const cultureJournalRqidLinks = selectedHomeland.system.cultureJournalRqidLinks?.map(
        (link) => {
          const templateLink: TemplateRqidLink = { ...link };
          const associatedChoice = this.choices[link.rqid];
          if (associatedChoice) {
            templateLink.choice = associatedChoice;
          }
          return templateLink;
        },
      );

      const tribeJournalRqidLinks = selectedHomeland.system.tribeJournalRqidLinks?.map((link) => {
        const templateLink: TemplateRqidLink = { ...link };
        const associatedChoice = this.choices[link.rqid];
        if (associatedChoice) {
          templateLink.choice = associatedChoice;
        }
        return templateLink;
      });

      const clanJournalRqidLinks = selectedHomeland.system.clanJournalRqidLinks?.map((link) => {
        const templateLink: TemplateRqidLink = { ...link };
        const associatedChoice = this.choices[link.rqid];
        if (associatedChoice) {
          templateLink.choice = associatedChoice;
        }
        return templateLink;
      });

      const cultRqidLinks = selectedHomeland.system.cultRqidLinks?.map((link) => {
        const templateLink: TemplateRqidLink = { ...link };
        const associatedChoice = this.choices[link.rqid];
        if (associatedChoice) {
          templateLink.choice = associatedChoice;
        }
        return templateLink;
      });

      // Build runes with choices for template display
      const homelandRunes: TemplateItem[] = [];
      if (selectedHomeland.system.runeRqidLinks) {
        for (const runeRqidLink of selectedHomeland.system.runeRqidLinks) {
          const rune = await Rqid.fromRqid(runeRqidLink.rqid);
          if (rune) {
            assertDocumentSubType<RuneItem>(rune, ItemTypeEnum.Rune);
            rune.system.chance = 10; // Homeland runes always grant +10%, this is for display purposes only
            rune.system.hasExperience = false;
            const templateRune = rune as TemplateItem;
            const associatedChoice = this.choices[runeRqidLink.rqid];
            if (associatedChoice) {
              templateRune.system.choice = associatedChoice;
            }
            homelandRunes.push(templateRune);
          }
        }
      }

      // Build skills with choices and bonuses for template display
      const homelandSkills: TemplateItem[] = [];
      if (selectedHomeland.system.skillRqidLinks) {
        for (const skillRqidLink of selectedHomeland.system.skillRqidLinks) {
          const skill = await Rqid.fromRqid(skillRqidLink.rqid);
          if (skill) {
            assertDocumentSubType<SkillItem>(skill, ItemTypeEnum.Skill);
            const templateSkill = skill as TemplateItem;
            const associatedChoice = this.choices[skillRqidLink.rqid];
            if (associatedChoice) {
              templateSkill.system.choice = associatedChoice;
            }
            if (skillRqidLink.bonus) {
              skill.system.baseChance = 0;
              skill.system.gainedChance = 0;
              skill.system.hasExperience = false;
              skill.system.chance = skillRqidLink.bonus;
            }
            homelandSkills.push(templateSkill);
          }
        }
      }

      // Build passions with choices for template display
      const homelandPassions: TemplateItem[] = [];
      if (selectedHomeland.system.passionRqidLinks) {
        for (const passionRqidLink of selectedHomeland.system.passionRqidLinks) {
          const passion = await Rqid.fromRqid(passionRqidLink.rqid);
          if (passion) {
            assertDocumentSubType<PassionItem>(passion, ItemTypeEnum.Passion);
            passion.system.hasExperience = false;
            const templatePassion = passion as TemplateItem;
            const associatedChoice = this.choices[passionRqidLink.rqid];
            if (associatedChoice) {
              templatePassion.system.choice = associatedChoice;
            }
            homelandPassions.push(templatePassion);
          }
        }
      }

      // Enrich wizard instructions HTML for template display
      let enrichedInstructions = selectedHomeland.system.wizardInstructions;
      if (enrichedInstructions) {
        enrichedInstructions =
          await foundry.applications.ux.TextEditor.implementation.enrichHTML(enrichedInstructions);
      }

      // Organize embedded items by type and category (for template display)
      const itemTypes: Record<string, any> = Object.fromEntries(
        getItemDocumentTypes().map((t: string) => [t, []]),
      );
      const skillsByCategory: Record<string, TemplateItem[]> = {};
      Object.values(SkillCategoryEnum).forEach((cat: string) => {
        skillsByCategory[cat] = homelandSkills.filter(
          (s: TemplateItem) => cat === s.system["category"],
        );
      });
      // Sort skills within each category
      Object.values(skillsByCategory).forEach((skillList) => {
        skillList.sort((a: RqgItem, b: RqgItem) => ("" + a.name).localeCompare("" + b.name));
      });
      itemTypes[ItemTypeEnum.Skill] = skillsByCategory;
      itemTypes[ItemTypeEnum.Passion] = homelandPassions;

      // Build template homeland item with all enriched/computed properties
      templateHomelandItem = {
        ...selectedHomeland,
        system: {
          ...selectedHomeland.system,
          wizardInstructions: enrichedInstructions,
          cultureJournalRqidLinks,
          tribeJournalRqidLinks,
          clanJournalRqidLinks,
          cultRqidLinks,
        },
        runes: homelandRunes,
        embeddedItems: itemTypes,
      } as unknown as TemplateHomelandContext["selectedHomeland"];
    }

    const templateHomeland: TemplateHomelandContext = {
      selectedHomeland: templateHomelandItem,
      homelandOptions: this.homeland.homelandOptions,
    };

    return {
      actor: this.actor,
      species: templateSpecies,
      speciesTemplateItems:
        this.species.selectedSpeciesTemplate &&
        isDocumentSubType<CharacterActor>(
          this.species.selectedSpeciesTemplate,
          ActorTypeEnum.Character,
        )
          ? await organizeEmbeddedItems(this.species.selectedSpeciesTemplate, [])
          : undefined,
      homeland: templateHomeland,
      choices: this.choices,
      collapsibleOpenStates: this.collapsibleOpenStates,
    };
  }

  override async _onRender(
    context: foundry.applications.api.ApplicationV2.RenderContext,
    options: any,
  ): Promise<void> {
    await super._onRender(context, options);

    // Main wizard tab navigation
    if (this.element.querySelector(".creation-sheet-tabs")) {
      const tabs = new foundry.applications.ux.Tabs({
        navSelector: ".creation-sheet-tabs",
        contentSelector: ".sheet-body",
        initial: this._currentTab,
        callback: (_e: any, _t: any, name: string) => {
          if (name) {
            this._currentTab = name;
          }
        },
      });
      tabs.bind(this.element);
    }

    // Species sub-tabs
    if (this.element.querySelector(".species-tabs")) {
      const speciesTabs = new foundry.applications.ux.Tabs({
        navSelector: ".species-tabs",
        contentSelector: ".species-body",
        initial: "skills",
      });
      speciesTabs.bind(this.element);
    }

    // Homeland sub-tabs
    if (this.element.querySelector(".homeland-tabs")) {
      const homelandTabs = new foundry.applications.ux.Tabs({
        navSelector: ".homeland-tabs",
        contentSelector: ".homeland-body",
        initial: "cultures",
      });
      homelandTabs.bind(this.element);
    }

    // Complete creation button
    this.element.querySelectorAll("[data-actor-creation-complete]").forEach((el) => {
      el.addEventListener("click", () => this._setActorCreationComplete());
    });

    // Collapsible sections
    this.element.querySelectorAll(".collapsible-header").forEach((el) => {
      el.addEventListener("click", (ev) => {
        const target = ev.target;
        assertHtmlElement(target);
        const wrapper = target?.closest(".collapsible-wrapper");
        assertHtmlElement(wrapper);
        const wasOpen = wrapper?.dataset["open"] === "true";
        const wrapperName = wrapper?.dataset["collapsibleName"];
        if (wrapperName) {
          this.collapsibleOpenStates[wrapperName] = !wasOpen;
        }
        const body = wrapper?.querySelector<HTMLElement>(".collapsible-wrapper-body");
        if (body) {
          $(body).slideToggle(300);
        }
        wrapper?.querySelector(".fa-plus-square")?.classList.toggle("no-display");
        wrapper?.querySelector(".fa-minus-square")?.classList.toggle("no-display");
        this.render();
      });
    });

    // RQID link click handlers
    void RqidLink.addRqidLinkClickHandlersToJQuery($(this.element));
  }

  _setActorCreationComplete() {
    void this.actor.setFlag(systemId, actorWizardFlags, { actorWizardComplete: true });
    void this.close();
  }

  private static async onSubmit(
    this: unknown,
    event: Event,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const wizard = this as ActorWizard;
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      if (target.name === "selectedSpeciesTemplateUuid") {
        await wizard.setSpeciesTemplate(
          formData.object["selectedSpeciesTemplateUuid"] as string,
          true,
        );
      }
      if (target.name === "selectedHomelandRqid") {
        const homelandRqid = formData.object["selectedHomelandRqid"];
        if (isValidRqidString(homelandRqid)) {
          await wizard.setHomeland(homelandRqid);
        }
      }
    }
    if (target instanceof HTMLInputElement && target.classList.contains("wizard-choice-input")) {
      const rqid = target.dataset["rqid"];
      const forChoice = target.dataset["forChoice"];
      if (rqid) {
        const changedChoice = wizard.choices[rqid];
        if (changedChoice) {
          if (forChoice === "species") {
            changedChoice.speciesPresent = target.checked;
          }
          if (forChoice === "homeland") {
            changedChoice.homelandPresent = target.checked;
          }
          if (forChoice === "homelandCultures") {
            changedChoice.homelandCultureChosen = target.checked;
          }
          if (forChoice === "homelandTribes") {
            changedChoice.homelandTribeChosen = target.checked;
          }
          if (forChoice === "homelandClans") {
            changedChoice.homelandClanChosen = target.checked;
          }
          if (forChoice === "homelandCult") {
            changedChoice.homelandCultChosen = target.checked;
          }
        }
      }
    }
    if (target instanceof HTMLInputElement && target.name === "name") {
      await wizard.actor.update({ name: formData.object["name"] as string });
    }

    wizard.render();
  }

  async setSpeciesTemplate(selectedTemplateUuid: string, checkAll: boolean): Promise<void> {
    this.species.selectedSpeciesTemplate = (await getDocumentFromUuid<RqgActor>(
      selectedTemplateUuid,
    )) as RqgActor | undefined;
    if (this.species.selectedSpeciesTemplate) {
      assertDocumentSubType<CharacterActor>(
        this.species.selectedSpeciesTemplate,
        ActorTypeEnum.Character,
      );
    }

    await this.actor.unsetFlag(systemId, "actorWizardFlags.selectedSpeciesUuid" as any);

    await this.actor.setFlag(systemId, actorWizardFlags, {
      selectedSpeciesUuid: this.species.selectedSpeciesTemplate?.uuid ?? undefined,
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
      .filter((h) => isDocumentSubType<HitLocationItem>(h, ItemTypeEnum.HitLocation))
      .map((h) => h.id)
      .filter((h): h is string => h !== null);
    await this.actor.deleteEmbeddedDocuments("Item", existingHitLocationIds);

    // add hit locations from template to actor
    const addHitLocations = this.species.selectedSpeciesTemplate?.items.filter((h) =>
      isDocumentSubType<HitLocationItem>(h, ItemTypeEnum.HitLocation),
    );
    if (addHitLocations) {
      await this.actor.createEmbeddedDocuments("Item", addHitLocations);
    }

    this.species.selectedSpeciesTemplate?.items.forEach((i) => {
      const rqidFlags = i.getFlag(systemId, documentRqidFlags);
      if (!rqidFlags?.id) {
        console.warn("NO RQID!", i);
        return; // TODO How should this be handled?
      }

      if (isDocumentSubType<SkillItem>(i, ItemTypeEnum.Skill)) {
        const skillData = i.system;
        const choice = (this.choices[rqidFlags.id] ??= Object.assign(new CreationChoice(), {
          rqid: rqidFlags.id,
          speciesPresent: true,
        }));
        choice.speciesValue = skillData.baseChance;
        if (checkAll) {
          choice.speciesPresent = true;
        }
      }
      if (
        isDocumentSubType<RuneItem>(i, ItemTypeEnum.Rune) ||
        isDocumentSubType<PassionItem>(i, ItemTypeEnum.Passion)
      ) {
        const abilityData = i.system;
        const choice = (this.choices[rqidFlags.id] ??= Object.assign(new CreationChoice(), {
          rqid: rqidFlags.id,
          speciesPresent: true,
        }));
        choice.speciesValue = abilityData.chance || 0;
        if (checkAll) {
          choice.speciesPresent = true;
        }
      }
    });

    // Find any rqids that are in the choices but not on the species template
    // and mark them not present on the species
    const speciesRqids = this.species.selectedSpeciesTemplate?.items
      .map((i) => i.getFlag(systemId, documentRqidFlags)?.id)
      .filter((id): id is RqidString => id != null);
    for (const choiceKey in this.choices) {
      const choice = this.choices[choiceKey];
      if (
        choice &&
        speciesRqids &&
        isValidRqidString(choiceKey) &&
        !speciesRqids.includes(choiceKey)
      ) {
        choice.speciesPresent = false;
      }
    }
  }

  async setHomeland(selectedHomelandRqid: RqidString): Promise<void> {
    const selectedHomeland = (await Rqid.fromRqid(selectedHomelandRqid)) as RqgItem | undefined;

    this.homeland.selectedHomeland = selectedHomeland;

    await this.actor.unsetFlag(systemId, "actorWizardFlags.selectedHomelandRqid" as any);

    await this.actor.setFlag(systemId, actorWizardFlags, {
      selectedHomelandRqid: selectedHomelandRqid,
    });

    if (selectedHomeland) {
      assertDocumentSubType<HomelandItem>(selectedHomeland, ItemTypeEnum.Homeland);
      selectedHomeland.system.cultureJournalRqidLinks.forEach((journalRqidLink) => {
        this.choices[journalRqidLink.rqid] ??= Object.assign(new CreationChoice(), {
          rqid: journalRqidLink.rqid,
          type: "journal-culture",
          homelandCultureChosen: false,
        });
      });

      selectedHomeland.system.tribeJournalRqidLinks.forEach((journalRqidLink) => {
        this.choices[journalRqidLink.rqid] ??= Object.assign(new CreationChoice(), {
          rqid: journalRqidLink.rqid,
          type: "journal-tribe",
          homelandTribeChosen: false,
        });
      });

      selectedHomeland.system.clanJournalRqidLinks.forEach((journalRqidLink) => {
        this.choices[journalRqidLink.rqid] ??= Object.assign(new CreationChoice(), {
          rqid: journalRqidLink.rqid,
          type: "journal-clan",
          homelandClanChosen: false,
        });
      });

      selectedHomeland.system.cultRqidLinks.forEach((cultRqidLink) => {
        this.choices[cultRqidLink.rqid] ??= Object.assign(new CreationChoice(), {
          rqid: cultRqidLink.rqid,
          type: ItemTypeEnum.Cult,
          homelandCultChosen: false,
        });
      });

      selectedHomeland.system.skillRqidLinks.forEach((skillRqidLink) => {
        const choice = (this.choices[skillRqidLink.rqid] ??= Object.assign(new CreationChoice(), {
          rqid: skillRqidLink.rqid,
          type: ItemTypeEnum.Skill,
          homelandPresent: true,
        }));
        choice.homelandValue = skillRqidLink.bonus || 0;
      });

      selectedHomeland.system.runeRqidLinks.forEach((runeRqidLink) => {
        const choice = (this.choices[runeRqidLink.rqid] ??= Object.assign(new CreationChoice(), {
          rqid: runeRqidLink.rqid,
          type: ItemTypeEnum.Rune,
          homelandPresent: true,
        }));
        choice.homelandValue = 10;
      });

      selectedHomeland.system.passionRqidLinks.forEach((passionRqidLink) => {
        const choice = (this.choices[passionRqidLink.rqid] ??= Object.assign(new CreationChoice(), {
          rqid: passionRqidLink.rqid,
          type: ItemTypeEnum.Passion,
          homelandPresent: true,
        }));
        choice.homelandValue = 10;
      });
    }
  }

  async updateChoices() {
    const updates = [];
    const adds = [];
    const deletes: string[] = [];
    for (const key in this.choices) {
      const keyRqid = toRqidString(key);
      const existingItems = this.actor.getEmbeddedDocumentsByRqid(keyRqid);
      if (existingItems.length > 0) {
        for (const actorItem of existingItems) {
          // Handle Skills, Runes, and Passions, which use the .present property of the choice
          if (
            isDocumentSubType<SkillItem>(actorItem, ItemTypeEnum.Skill) ||
            isDocumentSubType<RuneItem>(actorItem, ItemTypeEnum.Rune) ||
            isDocumentSubType<PassionItem>(actorItem, ItemTypeEnum.Passion)
          ) {
            if (this.choices[key]?.present()) {
              if (isDocumentSubType<SkillItem>(actorItem, ItemTypeEnum.Skill)) {
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
              if (
                isDocumentSubType<RuneItem>(actorItem, ItemTypeEnum.Rune) ||
                isDocumentSubType<PassionItem>(actorItem, ItemTypeEnum.Passion)
              ) {
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
              if (actorItem.id) {
                deletes.push(actorItem.id);
              }
            }
          }
          // Handle Cults which use .homelandCultChosen and don't need to get "added up"
          if (isDocumentSubType<CultItem>(actorItem, ItemTypeEnum.Cult)) {
            if (this.choices[key]?.homelandCultChosen) {
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
        if (this.choices[key]?.speciesPresent) {
          const item = (await Rqid.fromRqid(key)) as RqgItem | undefined;
          let itemsToAddFromTemplate = item ? [item] : undefined;
          if (!itemsToAddFromTemplate) {
            // Didn't find items by rqid, so just take what's on the Species Template
            itemsToAddFromTemplate =
              this.species.selectedSpeciesTemplate?.getEmbeddedDocumentsByRqid(keyRqid) || [];
            console.log(
              `Actor Species Template had an item with rqid "${key} that was not found in by rqid. Using item from the Actor Species Template.`,
              itemsToAddFromTemplate,
            );
          }

          if (itemsToAddFromTemplate) {
            for (const templateItem of itemsToAddFromTemplate) {
              // Item exists on the template and has been chosen but does not exist on the actor, so add it
              if (isDocumentSubType<SkillItem>(templateItem, ItemTypeEnum.Skill)) {
                templateItem.system.baseChance = this.choices[key]?.totalValue() ?? 0;
                templateItem.system.hasExperience = false;
              }
              if (isDocumentSubType<RuneItem>(templateItem, ItemTypeEnum.Rune)) {
                templateItem.system.chance = this.choices[key]?.totalValue() ?? 0;
                templateItem.system.hasExperience = false;
              }
              if (isDocumentSubType<PassionItem>(templateItem, ItemTypeEnum.Passion)) {
                templateItem.system.chance = this.choices[key]?.totalValue();
                templateItem.system.hasExperience = false;
              }
              adds.push(templateItem);
            }
          }
        }

        // Copy Skills, Runes, and Passions from the Homeland using rqid
        if (this.choices[key]?.homelandPresent) {
          const itemToAddFromHomeland = await Rqid.fromRqid(key);
          if (itemToAddFromHomeland instanceof RqgItem) {
            // Item exists on the template and has been chosen but does not exist on the actor, so add it
            if (isDocumentSubType<SkillItem>(itemToAddFromHomeland, ItemTypeEnum.Skill)) {
              itemToAddFromHomeland.system.baseChance = this.choices[key]?.totalValue();
              itemToAddFromHomeland.system.hasExperience = false;
            }
            if (isDocumentSubType<RuneItem>(itemToAddFromHomeland, ItemTypeEnum.Rune)) {
              itemToAddFromHomeland.system.chance = this.choices[key]?.totalValue();
              itemToAddFromHomeland.system.hasExperience = false;
            }
            if (isDocumentSubType<PassionItem>(itemToAddFromHomeland, ItemTypeEnum.Passion)) {
              itemToAddFromHomeland.system.chance = this.choices[key]?.totalValue();
              itemToAddFromHomeland.system.hasExperience = false;
            }
            adds.push(itemToAddFromHomeland); // TODO or itemToAddFromHomeland.toObject() ??
          }
        }

        // Get Cults by rqid and add to actor
        let cultsEligibleToAdd: RqidLink[] = [];

        if (this.homeland.selectedHomeland) {
          assertDocumentSubType<HomelandItem>(
            this.homeland.selectedHomeland,
            ItemTypeEnum.Homeland,
          );
          cultsEligibleToAdd = this.homeland.selectedHomeland?.system.cultRqidLinks;
        }

        if (cultsEligibleToAdd.map((c) => c.rqid).includes(key)) {
          if (this.choices[key]?.homelandCultChosen) {
            const cult = await Rqid.fromRqid(key);
            if (cult) {
              adds.push(cult);
            }
          }
        }
      }
    }
    await this.actor.createEmbeddedDocuments("Item", adds as any);
    await this.actor.updateEmbeddedDocuments("Item", updates);
    await this.actor.deleteEmbeddedDocuments("Item", deletes);

    const selectedHomeland = this.homeland.selectedHomeland;

    const selectedCultureRqidLinks: RqidLink[] = [];
    const selectedTribeRqidLinks: RqidLink[] = [];
    const selectedClanRqidLinks: RqidLink[] = [];

    if (selectedHomeland) {
      assertDocumentSubType<HomelandItem>(selectedHomeland, ItemTypeEnum.Homeland);
      selectedHomeland.system.cultureJournalRqidLinks.forEach((rqidLink) => {
        if (this.choices?.[rqidLink.rqid]?.homelandCultureChosen) {
          selectedCultureRqidLinks.push(rqidLink);
        }
      });

      selectedHomeland.system.tribeJournalRqidLinks.forEach((rqidLink) => {
        if (this.choices?.[rqidLink.rqid]?.homelandTribeChosen) {
          selectedTribeRqidLinks.push(rqidLink);
        }
      });

      selectedHomeland.system.clanJournalRqidLinks.forEach((rqidLink) => {
        if (this.choices?.[rqidLink.rqid]?.homelandClanChosen) {
          selectedClanRqidLinks.push(rqidLink);
        }
      });
    }

    // This is just always going to replace the Culture RqidLinks
    await this.actor.update({
      system: {
        background: {
          homelandJournalRqidLink: selectedHomeland?.system.homelandJournalRqidLink,
          regionJournalRqidLink: selectedHomeland?.system.regionJournalRqidLink,
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

export class CreationChoice {
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
    if (isDocumentSubType<PassionItem>(this as any, ItemTypeEnum.Passion)) {
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
