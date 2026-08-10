import type { CharacterActor } from "../../data-model/actor-data/rqg-actor-data";
import { systemId } from "../../system/config";
import { templatePaths } from "../../system/load-handlebars-templates";
import { getRequiredDomDataset, localize } from "../../system/util";
import { getSpeakerCompat } from "../../system/fvtt-type-compat";
import {
  buildExperienceRollRowView,
  type ExperienceRollEntry,
  type ExperienceRollGainKind,
  type ExperienceRollRowGroup,
  getEligibleExperienceRollEntries,
  getEligibleExperienceRollEntry,
  groupExperienceRollRows,
  rollAllExperienceRollEntries,
  rollExperienceRollEntry,
} from "../../rolls/improvement-roll/experience-roll-eligibility";
import type { ImprovementResult } from "../../rolls/improvement-roll/improvement-roll.types";
import {
  showImprovementChatMessage,
  showImprovementSummaryChatMessage,
} from "../../rolls/improvement-roll/improvement-roll-presenter";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

type ExperienceRollSessionContext = {
  actorName: string;
  groups: ExperienceRollRowGroup[];
  isEmpty: boolean;
  gainKind: ExperienceRollGainKind;
  canRollAll: boolean;
};

/**
 * Single-screen session for resolving every pending experience check on an adventurer at once
 * (#912): abilities and POW alike, one Roll per row plus a Roll All. Eligibility is derived from
 * live actor state on every render, so closing and reopening mid-session just shows whatever is
 * still pending - the only session-local state is the fixed/random gain toggle and the set of rows
 * this instance has already resolved, kept around so their outcome stays visible instead of
 * vanishing the moment their hasExperience flag clears.
 */
export class ExperienceRollSession extends HandlebarsApplicationMixin(
  ApplicationV2<ExperienceRollSessionContext>,
) {
  private readonly actor: CharacterActor;
  private gainKind: ExperienceRollGainKind = "random";
  private readonly resolvedThisSession = new Map<
    string,
    { entry: ExperienceRollEntry; result: ImprovementResult }
  >();

  static override DEFAULT_OPTIONS = {
    id: "experience-roll-session",
    classes: [systemId, "experience-roll-session"],
    window: {
      icon: "fa-solid fa-arrow-trend-up",
      contentClasses: ["standard-form"],
      resizable: true,
    },
    position: {
      width: 560,
      height: "auto" as const,
    },
    actions: {
      rollRow: ExperienceRollSession.onRollRow,
      rollAll: ExperienceRollSession.onRollAll,
      setGainKind: ExperienceRollSession.onSetGainKind,
    },
  } satisfies foundry.applications.api.ApplicationV2.DefaultOptions;

  static override PARTS = {
    header: {
      template: templatePaths.experienceRollSessionHeader,
    },
    body: {
      template: templatePaths.experienceRollSessionBody,
      scrollable: [""],
    },
  };

  constructor(actor: CharacterActor) {
    super();
    this.actor = actor;
  }

  private get actorName(): string {
    return this.actor.name ?? "";
  }

  private get speaker(): ChatMessage.SpeakerData {
    return getSpeakerCompat({ actor: this.actor });
  }

  override get title(): string {
    return localize("RQG.Actor.ExperienceRollSession.Title", { actorName: this.actorName });
  }

  override async _prepareContext(): Promise<ExperienceRollSessionContext> {
    const actorName = this.actorName;
    const speaker = this.speaker;
    const liveEntries = getEligibleExperienceRollEntries(this.actor);
    const liveIds = new Set(liveEntries.map((entry) => entry.id));

    const rows = [
      ...liveEntries.map((entry) =>
        buildExperienceRollRowView(entry, this.gainKind, actorName, speaker),
      ),
      // Rows this instance already resolved keep showing their outcome even though the fresh
      // eligibility list no longer includes them (their hasExperience flag is now cleared).
      ...[...this.resolvedThisSession.values()]
        .filter(({ entry }) => !liveIds.has(entry.id))
        .map(({ entry, result }) =>
          buildExperienceRollRowView(entry, this.gainKind, actorName, speaker, result),
        ),
    ];

    const groups = groupExperienceRollRows(rows);

    return {
      actorName,
      groups,
      isEmpty: groups.length === 0,
      gainKind: this.gainKind,
      canRollAll: liveEntries.some((entry) => entry.rollable),
    };
  }

  private static async onRollRow(
    this: ExperienceRollSession,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    // Disabled immediately (rather than after the first await) so a fast double-click can't fire
    // a second rollExperienceRollEntry before this row's actor.update() has cleared hasExperience -
    // the render() below replaces this element regardless of which branch returns.
    (target as HTMLButtonElement).disabled = true;

    const id = getRequiredDomDataset(target, "row-id");
    // Snapshot the entry being rolled purely to keep it visible afterwards - the actual roll
    // re-derives and revalidates eligibility from live actor data itself (see
    // rollExperienceRollEntry), the same "rebuild from live source on submit" rule the per-item
    // improve dialogs follow.
    const entry = getEligibleExperienceRollEntry(this.actor, id);

    const resolution = await rollExperienceRollEntry(
      this.actor,
      id,
      this.gainKind,
      this.actorName,
      this.speaker,
    );

    if (!resolution) {
      ui.notifications?.error(localize("RQG.Actor.ExperienceRollSession.SourceNoLongerAvailable"));
      await this.render();
      return;
    }

    if (entry) {
      this.resolvedThisSession.set(id, { entry, result: resolution.result });
    }
    // Independent of each other - the chat message doesn't gate the re-render - so run them
    // concurrently rather than stacking the chat card's dice-so-nice wait behind the render.
    await Promise.all([showImprovementChatMessage(resolution), this.render()]);
  }

  private static async onRollAll(
    this: ExperienceRollSession,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    (target as HTMLButtonElement).disabled = true;

    const results = await rollAllExperienceRollEntries(
      this.actor,
      this.gainKind,
      this.actorName,
      this.speaker,
    );
    if (results.length === 0) {
      await this.render();
      return;
    }

    for (const { entry, resolution } of results) {
      this.resolvedThisSession.set(entry.id, { entry, result: resolution.result });
    }
    await Promise.all([
      showImprovementSummaryChatMessage(
        results.map(({ resolution }) => resolution),
        this.speaker,
      ),
      this.render(),
    ]);
  }

  private static onSetGainKind(
    this: ExperienceRollSession,
    _event: PointerEvent,
    target: HTMLElement,
  ): void {
    this.gainKind = getRequiredDomDataset(target, "gain-kind") === "fixed" ? "fixed" : "random";
    void this.render();
  }
}
