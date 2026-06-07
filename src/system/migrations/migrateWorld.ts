import { localize } from "../util";
import {
  type ActorMigration,
  type ActiveEffectMigration,
  applyMigrations,
  type MigrationChangeRow,
  type ItemMigration,
  type MigrationLogLevel,
  type MigrationResult,
} from "./applyMigrations";
import { systemId } from "../config";
import { tagSkillNameSkillsWithRqid } from "./migrations-item/tagSkillNameSkillsWithRqid";
import { migrateWorldDialog } from "../../applications/migrateWorldDialog";
import { migrateWeaponSkillLinks } from "./migrations-item/migrateWeaponSkillLinks";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { RqidBatchEditor } from "../../applications/rqid-batch-editor/rqidBatchEditor";
import { openDataModelRepairDialog } from "../api/dataModelRepair";
import { migrateRuneItemType } from "./migrations-item/migrateRuneItemType";
import { relabelRuneMagicCommandCultSpiritRqid } from "./migrations-item/relabelRuneMagicCommandCultSpiritRqid";
import { migrateActorActiveEffectPaths } from "./migrations-actor/migrateActorActiveEffectPaths";
import { migrateItemActiveEffectPaths } from "./migrations-item/migrateItemActiveEffectPaths";
import { migrateActiveEffectActiveEffectPaths } from "./migrations-effect/migrateActiveEffectActiveEffectPaths";
import { templatePaths } from "../loadHandlebarsTemplates";
import type { MigrationDocumentLink, MigrationLogEntry } from "./applyMigrations";
import { RqgLogger } from "../logging/rqgLogger";

const logger = new RqgLogger("Migration");
const ISSUES_PAGE_UUID_PLACEHOLDER = "__RQG_MIGRATION_ISSUES_PAGE_UUID__";

/**
 * Perform a system migration for the entire World, applying migrations for what is in it
 */
export async function migrateWorld(): Promise<void> {
  const systemVersion: string = game.system?.version ?? "";
  const worldVersion = (game.settings?.get(systemId, "worldMigrationVersion") ??
    "") as unknown as string;
  if (worldVersion === "" && game.user?.isGM) {
    // Initialize world version to current system version for new worlds (with the default "" version).
    await game.settings.set(systemId, "worldMigrationVersion", systemVersion);
    return;
  }
  if (systemVersion === worldVersion) {
    return; // Already up to date
  }

  if (!game.user?.isGM) {
    ui.notifications?.warn(
      localize("RQG.Migration.WorldNotUpdated", { systemVersion: systemVersion }),
      { permanent: true },
    );
    return;
  }

  await runDataModelRepairPreflight();

  // Open a dialog to set missing Rqids on selected items
  await RqidBatchEditor.factory(
    ItemTypeEnum.Skill, // weapon skills need Rqid for weapon -> skill link
    ItemTypeEnum.RuneMagic, // common spells need Rqid for visualisation in spell list
    ItemTypeEnum.Rune, // Future needs
  );

  const confirmed = await migrateWorldDialog(systemVersion);
  if (!confirmed) {
    ui.notifications?.warn(
      localize("RQG.Migration.MigrationAborted", { systemVersion: systemVersion }),
      { permanent: true },
    );
    return;
  }

  const migrationNotification = ui.notifications?.info(
    localize("RQG.Migration.applyingMigration", { systemVersion: systemVersion }),
    { permanent: true, console: false, progress: true },
  );
  logger.info(`Starting world migration to version ${systemVersion}`, { notify: false });
  try {
    const migrationResult = await applyDefaultWorldMigrations(
      undefined,
      undefined,
      migrationNotification,
    );
    await logMigrationReport(systemVersion, migrationResult);

    if (migrationResult.errorCount === 0) {
      // *** Set the migration as complete ***
      await game.settings.set(systemId, "worldMigrationVersion", systemVersion);

      migrationNotification?.update?.({
        message: localize("RQG.Migration.migrationFinished", {
          systemVersion: systemVersion,
        }),
      });
      logger.info(`Finished world migration`, { notify: false });
    } else {
      migrationNotification?.update?.({
        message: localize("RQG.Migration.migrationFinishedWithErrors", {
          systemVersion: systemVersion,
          errorCount: migrationResult.errorCount.toString(),
        }),
      });
      logger.warn(
        `World migration completed with ${migrationResult.errorCount} errors. worldMigrationVersion was not updated.`,
        { notify: false },
      );
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    migrationNotification?.update?.({
      message: localize("RQG.Migration.migrationFailed", {
        systemVersion: systemVersion,
        error: errorMessage,
      }),
    });
    logger.error(`World migration failed: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

/**
 * Run the default world migration. It is possible to override the migrations for items
 * and or actors by supplying an array of migration functions.
 * Accessible through game.system.api.migration.applyWorldMigrations()
 * This makes it possible to run custom migrations via macros.
 */
export async function applyDefaultWorldMigrations(
  itemMigrations: ItemMigration[] | undefined = undefined,
  actorMigrations: ActorMigration[] | undefined = undefined,
  migrationNotification?: any,
  activeEffectMigrations: ActiveEffectMigration[] | undefined = undefined,
): Promise<MigrationResult> {
  if (!game.user?.isGM) {
    ui.notifications?.info(localize("RQG.Notification.Error.GMOnlyOperation"));
    const noOpResult: MigrationResult = {
      errorCount: 1,
      warningCount: 0,
      logCount: 0,
      logEntries: [],
      stats: {
        worldActorsInspected: 0,
        worldItemsInspected: 0,
        scenesInspected: 0,
        unlinkedTokenActorsInspected: 0,
        compendiumsInspected: 0,
        compendiumsSkippedByDesign: 0,
        compendiumDocumentsInspected: 0,
      },
    };
    return noOpResult;
  }
  const worldItemMigrations: ItemMigration[] = itemMigrations ?? [
    tagSkillNameSkillsWithRqid,
    migrateWeaponSkillLinks,
    migrateRuneItemType,
    relabelRuneMagicCommandCultSpiritRqid,
    migrateItemActiveEffectPaths,
  ];
  const worldActorMigrations: ActorMigration[] = actorMigrations ?? [migrateActorActiveEffectPaths];
  const worldActiveEffectMigrations: ActiveEffectMigration[] = activeEffectMigrations ?? [
    migrateActiveEffectActiveEffectPaths,
  ];

  return await applyMigrations(
    worldItemMigrations,
    worldActorMigrations,
    migrationNotification,
    worldActiveEffectMigrations,
  );
}

async function buildMigrationReportPages(
  migrationResult: MigrationResult,
): Promise<MigrationReportPages> {
  const performedMigrations = selectPerformedMigrationEntries(migrationResult.logEntries);
  const warnings = migrationResult.logEntries.filter((entry) => entry.level === "warn");
  const errors = migrationResult.logEntries.filter((entry) => entry.level === "error");
  const issues = migrationResult.logEntries.filter(
    (entry) => entry.level === "warn" || entry.level === "error",
  );

  // Stage 1: Group migration entries by source. If this fails, create a minimal fallback grouping.
  let performedGroups: MigrationReportGroup[] = [];
  let issueGroups: MigrationReportGroup[] = [];
  try {
    performedGroups = await groupMigrationEntriesBySource(performedMigrations);
    issueGroups = await groupMigrationEntriesBySource(issues);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.warn(
      `Failed to group migration report entries (will use minimal fallback grouping): ${errorMessage}`,
      { notify: false },
    );
    // Create a minimal fallback with ungrouped raw entries so the template still renders content
    if (performedMigrations.length > 0) {
      const fallbackEntries: MigrationReportEntry[] = await Promise.all(
        performedMigrations.map((entry) => parseMigrationEntry(entry)),
      );
      performedGroups = [
        {
          sourceKind: "world",
          sourceName: localize("RQG.Migration.reportSourceWorld"),
          sourceAnchorId: "migration-world",
          title: localize("RQG.Migration.reportSourceWorld"),
          actorGroups: [
            {
              actorName: localize("RQG.Migration.reportSourceUnknownActor"),
              entries: fallbackEntries,
            },
          ],
        },
      ];
    }

    if (issues.length > 0) {
      const fallbackEntries: MigrationReportEntry[] = await Promise.all(
        issues.map((entry) => parseMigrationEntry(entry)),
      );
      issueGroups = [
        {
          sourceKind: "world",
          sourceName: localize("RQG.Migration.reportSourceWorld"),
          sourceAnchorId: "migration-world",
          title: localize("RQG.Migration.reportSourceWorld"),
          actorGroups: [
            {
              actorName: localize("RQG.Migration.reportSourceUnknownActor"),
              entries: fallbackEntries,
            },
          ],
        },
      ];
    }
  }

  const errorSummaryGroups = buildErrorSummaryGroups(issueGroups);
  const sourceIssueSummary = buildSourceIssueSummary(issueGroups, migrationResult);
  const affectedSources = buildAffectedSources(issueGroups);
  const reportContext = {
    logCount: migrationResult.logCount,
    worldActorsWithIssuesLabel: sourceIssueSummary.worldActorsWithIssuesLabel,
    worldItemsWithIssuesLabel: sourceIssueSummary.worldItemsWithIssuesLabel,
    scenesWithIssuesLabel: sourceIssueSummary.scenesWithIssuesLabel,
    compendiumsWithIssuesLabel: sourceIssueSummary.compendiumsWithIssuesLabel,
    compendiumsSkippedByDesignLabel: sourceIssueSummary.compendiumsSkippedByDesignLabel,
    warningCount: warnings.length,
    errorCount: errors.length,
    hasErrors: errors.length > 0,
    errorSummaryGroups,
    stats: migrationResult.stats,
    hasPerformedMigrations: performedMigrations.length > 0,
    performedGroups,
    hasIssues: issues.length > 0,
    affectedSources,
    issueGroups,
  };

  // Stage 2: Render templates. If this fails, generate minimal fallback HTML.
  let summaryHtml: string = "";
  let performedHtml: string = "";
  let issuesHtml: string = "";
  try {
    [summaryHtml, performedHtml, issuesHtml] = await Promise.all([
      foundry.applications.handlebars.renderTemplate(
        templatePaths.migrationReportSummary,
        reportContext,
      ),
      foundry.applications.handlebars.renderTemplate(
        templatePaths.migrationReportPerformed,
        reportContext,
      ),
      foundry.applications.handlebars.renderTemplate(
        templatePaths.migrationReportIssues,
        reportContext,
      ),
    ]);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.warn(`Failed to render migration report templates (using fallback): ${errorMessage}`, {
      notify: false,
    });
    // Generate minimal HTML from raw data as fallback
    summaryHtml = generateMigrationReportFallbackSummary(migrationResult, warnings, errors);
    performedHtml = generateMigrationReportFallbackPerformed(performedMigrations);
    issuesHtml = generateMigrationReportFallbackIssues(issues);
  }

  return { summaryHtml, performedHtml, issuesHtml };
}

function selectPerformedMigrationEntries(
  entries: MigrationResult["logEntries"],
): MigrationLogEntry[] {
  const nonMetaInfoEntries = entries.filter((entry) => {
    if (entry.level !== "info") {
      return false;
    }

    return !isMetaMigrationInfoEntry(stripMigrationPrefix(entry.message));
  });

  const actionableEntries = nonMetaInfoEntries.filter((entry) => {
    if ((entry.changes?.length ?? 0) > 0) {
      return true;
    }

    if (entry.migrationName) {
      return true;
    }

    const normalized = stripMigrationPrefix(entry.message);
    return normalized.startsWith("Migrating ") || normalized.startsWith("Migrated ");
  });

  return actionableEntries.length > 0 ? actionableEntries : nonMetaInfoEntries;
}

async function logMigrationReport(
  systemVersion: string,
  migrationResult: MigrationResult,
): Promise<void> {
  const warnings = migrationResult.logEntries.filter((entry) => entry.level === "warn");
  const errors = migrationResult.logEntries.filter((entry) => entry.level === "error");

  const reportPages = await buildMigrationReportPages(migrationResult);

  // Stage 3: Attempt to save. If this fails, show dialog so the user can retry or download.
  try {
    await saveMigrationReportToJournal(systemVersion, reportPages);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to save migration report to journal: ${errorMessage}`, {
      notify: false,
    });
    ui.notifications?.error(
      localize("RQG.Migration.reportSaveFailed", {
        error: errorMessage,
      }),
      { console: false },
    );
    await showMigrationReportSaveFailureDialog(
      systemVersion,
      migrationResult,
      reportPages,
      errorMessage,
    );
  }

  logger.info(
    `Migration report v${systemVersion}: ${migrationResult.logCount} entries (${warnings.length} warnings, ${errors.length} errors)`,
    { notify: false },
  );
}

function generateMigrationReportFallbackSummary(
  migrationResult: MigrationResult,
  warnings: MigrationLogEntry[],
  errors: MigrationLogEntry[],
): string {
  return `
    <h2>${foundry.utils.escapeHTML(localize("RQG.Migration.reportPageSummary"))}</h2>
    <p>Log entries: ${migrationResult.logCount} (${warnings.length} ${localize("RQG.Migration.reportSummaryWarnings").toLowerCase()}, ${errors.length} ${localize("RQG.Migration.reportSummaryErrors").toLowerCase()})</p>
    <p><strong>Statistics:</strong></p>
    <ul>
      <li>World actors processed: ${migrationResult.stats.worldActorsInspected}</li>
      <li>World items processed: ${migrationResult.stats.worldItemsInspected}</li>
      <li>Scenes processed: ${migrationResult.stats.scenesInspected}</li>
      <li>Compendiums processed: ${migrationResult.stats.compendiumsInspected}</li>
    </ul>
  `;
}

function generateMigrationReportFallbackIssues(entries: MigrationLogEntry[]): string {
  if (entries.length === 0) {
    return `<p>${localize("RQG.Migration.reportNoIssuesDetected")}</p>`;
  }

  const entriesHtml = entries
    .map(
      (entry) =>
        `<li><strong>${foundry.utils.escapeHTML(entry.level.toUpperCase())}:</strong> ${foundry.utils.escapeHTML(entry.message)}</li>`,
    )
    .join("\n");

  return `
    <h2>${foundry.utils.escapeHTML(localize("RQG.Migration.reportPageIssues"))}</h2>
    <p>Detailed formatting is unavailable, but here are the raw migration entries:</p>
    <ul>${entriesHtml}</ul>
  `;
}

function generateMigrationReportFallbackPerformed(entries: MigrationLogEntry[]): string {
  if (entries.length === 0) {
    return `<p>${localize("RQG.Migration.reportNoPerformedMigrationsDetected")}</p>`;
  }

  const entriesHtml = entries
    .map((entry) => {
      let html = `<li><strong>${foundry.utils.escapeHTML(localize("RQG.Migration.reportLevelInfo"))}:</strong> ${foundry.utils.escapeHTML(stripMigrationPrefix(entry.message))}`;
      if (entry.migrationName) {
        html += ` <em>(${foundry.utils.escapeHTML(entry.migrationName)})</em>`;
      }
      html += `</li>`;
      return html;
    })
    .join("\n");

  return `
    <h2>${foundry.utils.escapeHTML(localize("RQG.Migration.reportPagePerformed"))}</h2>
    <ul>${entriesHtml}</ul>
  `;
}

function buildErrorSummaryGroups(
  issueGroups: MigrationReportGroup[],
): MigrationErrorSummaryGroup[] {
  const rows: MigrationErrorSummaryGroup[] = [];
  for (const group of issueGroups) {
    for (const actorGroup of group.actorGroups) {
      for (const entry of actorGroup.entries) {
        if (entry.level !== "error") {
          continue;
        }

        const extractedUuid = extractPreferredUuidFromErrorText(entry.text);
        const nameLabel = buildErrorNameLabel(
          entry.documents,
          actorGroup.actorName,
          group.sourceName,
        );
        const uuidText =
          extractedUuid ||
          entry.documents?.find((document) => !!document.uuid)?.uuid ||
          localize("RQG.Migration.reportSummaryErrorUuidMissing");
        const errorText = extractedUuid
          ? entry.text.replace(`[${extractedUuid}]`, "").trim()
          : entry.text;

        rows.push({
          nameLabel,
          sourceLabel: group.title,
          uuidText,
          errorText,
        });
      }
    }
  }

  return rows;
}

function extractPreferredUuidFromErrorText(message: string): string | undefined {
  const bracketedUuid = message.match(/\[([^\]]+)\]/)?.[1]?.trim();
  if (!bracketedUuid) {
    return undefined;
  }

  const itemMatch = bracketedUuid.match(/^(.*?\.Item\.[^.]+)(?:\.|$)/);
  if (itemMatch?.[1]) {
    return itemMatch[1];
  }

  return bracketedUuid;
}

function buildErrorNameLabel(
  documents: MigrationDocumentLink[] | undefined,
  actorName: string,
  sourceName: string,
): string {
  const actorDocument = documents?.find(
    (document) => document.kind === "Actor" && !!document.label,
  );
  const itemDocument = documents?.find((document) => document.kind === "Item" && !!document.label);
  if (itemDocument?.label && actorDocument?.label) {
    return `${itemDocument.label} (${actorDocument.label})`;
  }
  if (actorDocument?.label) {
    return actorDocument.label;
  }
  if (itemDocument?.label) {
    return itemDocument.label;
  }
  return actorName || sourceName;
}

async function runDataModelRepairPreflight(): Promise<void> {
  logger.info(`Running DataModel Repair preflight`, {
    notify: false,
  });
  await openDataModelRepairDialog({ autoReloadAfterFinish: true });
}

async function showMigrationReportSaveFailureDialog(
  systemVersion: string,
  migrationResult: MigrationResult,
  reportPages: MigrationReportPages,
  initialError: string,
): Promise<void> {
  const { ApplicationV2 } = foundry.applications.api;
  let reportHtml = buildMigrationReportFallbackHtml(reportPages);

  class MigrationFailureApp extends ApplicationV2 {
    static override DEFAULT_OPTIONS = {
      id: "rqg-migration-failure",
      classes: ["rqg", "rqg-migration-failure-dialog"],
      window: {
        title: localize("RQG.Migration.reportSaveFailureDialogTitle", { systemVersion }),
        resizable: true,
      },
      position: {
        width: 900,
        height: 620,
      },
    };

    override async _renderHTML(): Promise<HTMLElement> {
      const wrapper = document.createElement("div");
      const previewHtml = stripExecutableMarkupForSandboxedPreview(reportHtml);
      wrapper.innerHTML = `
        <p>${localize("RQG.Migration.reportSaveFailureDialogBody")}</p>
        <p><strong>${localize("RQG.Migration.reportSaveFailureDialogErrorLabel")}</strong> ${foundry.utils.escapeHTML(initialError)}</p>
        <p>Rendered migration report preview:</p>
        <iframe
          sandbox="allow-same-origin"
          style="width: 100%; height: 260px; border: 1px solid var(--color-border-light-primary); border-radius: 4px; background: white;"
          srcdoc="${foundry.utils.escapeHTML(previewHtml)}">
        </iframe>
        <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem; margin-bottom: 0.25rem; width: 100%;">
          <button type="button" class="rqg-migration-retry-save" style="flex: 1 1 0;"><i class="fas fa-rotate-right"></i> ${localize("RQG.Migration.reportSaveFailureDialogRetry")}</button>
          <button type="button" class="rqg-migration-download-html" style="flex: 1 1 0;"><i class="fas fa-download"></i> ${localize("RQG.Migration.reportSaveFailureDialogDownload")}</button>
          <button type="button" class="rqg-migration-copy-html" style="flex: 1 1 0;"><i class="fas fa-copy"></i> ${localize("RQG.Migration.reportSaveFailureDialogCopy")}</button>
          <button type="button" class="rqg-migration-close" style="flex: 1 1 0; margin-left: 1rem;"><i class="fas fa-times"></i> ${localize("RQG.Migration.reportCloseButton")}</button>
        </div>
        <p>${localize("RQG.Migration.reportSaveFailureDialogFallbackCopyHint")}</p>
      `;
      return wrapper;
    }

    override _replaceHTML(result: HTMLElement, content: HTMLElement): void {
      content.replaceChildren(result);
    }

    override async close(options?: any): Promise<this> {
      return await super.close(options);
    }

    override async _onRender(): Promise<void> {
      this.element
        .querySelector<HTMLButtonElement>(".rqg-migration-close")
        ?.addEventListener("click", () => {
          void this.close();
        });

      this.element
        .querySelector<HTMLButtonElement>(".rqg-migration-retry-save")
        ?.addEventListener("click", () => {
          void (async () => {
            try {
              // Re-run stages 1-2 to get fresh template-rendered HTML (with document links)
              const freshPages = await buildMigrationReportPages(migrationResult);
              reportHtml = buildMigrationReportFallbackHtml(freshPages);
              await saveMigrationReportToJournal(systemVersion, freshPages);
              await this.close();
            } catch (err: unknown) {
              const retryError = err instanceof Error ? err.message : String(err);
              ui.notifications?.error(
                localize("RQG.Migration.reportSaveFailed", { error: retryError }),
                { console: false },
              );
            }
          })();
        });

      this.element
        .querySelector<HTMLButtonElement>(".rqg-migration-download-html")
        ?.addEventListener("click", () => {
          try {
            const blob = new Blob([reportHtml], { type: "text/html;charset=utf-8" });
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = objectUrl;
            link.download = `rqg-migration-report-v${systemVersion}.html`;
            link.click();
            URL.revokeObjectURL(objectUrl);
            ui.notifications?.info(localize("RQG.Migration.reportHtmlDownloaded"), {
              console: false,
            });
          } catch (err: unknown) {
            const downloadError = err instanceof Error ? err.message : String(err);
            ui.notifications?.error(
              localize("RQG.Migration.reportDownloadFailed", { error: downloadError }),
              { console: false },
            );
          }
        });

      this.element
        .querySelector<HTMLButtonElement>(".rqg-migration-copy-html")
        ?.addEventListener("click", () => {
          navigator.clipboard
            .writeText(reportHtml)
            .then(() => {
              ui.notifications?.info(localize("RQG.Migration.reportHtmlCopied"), {
                console: false,
              });
            })
            .catch((err: unknown) => {
              const copyError = err instanceof Error ? err.message : String(err);
              ui.notifications?.error(
                localize("RQG.Migration.reportCopyFailed", { error: copyError }),
                { console: false },
              );
            });
        });
    }
  }

  const app = new MigrationFailureApp();
  app.render({ force: true });
}

type MigrationActorGroup = {
  actorName: string;
  entries: MigrationReportEntry[];
};

type MigrationReportGroup = {
  sourceKind: MigrationSourceKind;
  sourceName: string;
  sourceAnchorId: string;
  title: string;
  actorGroups: MigrationActorGroup[];
};

type MigrationSourceKind = "world" | "scene" | "compendium";

type MigrationReportEntry = {
  level: MigrationLogLevel;
  levelLabel: string;
  iconClass: string;
  text: string;
  migrationName?: string;
  documents?: MigrationDocumentLink[];
  documentsHtml?: string;
  changes?: MigrationChangeRow[];
  hiddenChangeCount?: number;
};

type MigrationAffectedSourceLink = {
  name: string;
};

type MigrationErrorSummaryGroup = {
  nameLabel: string;
  sourceLabel: string;
  uuidText: string;
  errorText: string;
};

type MigrationAffectedSources = {
  world: boolean;
  scenes: MigrationAffectedSourceLink[];
  compendiums: MigrationAffectedSourceLink[];
};

type MigrationReportPages = {
  summaryHtml: string;
  performedHtml: string;
  issuesHtml: string;
};

async function groupMigrationEntriesBySource(
  entries: MigrationResult["logEntries"],
): Promise<MigrationReportGroup[]> {
  const sourceGroups = new Map<string, Map<string, MigrationReportEntry[]>>();
  const sourceTitles = new Map<string, string>();
  const sourceNames = new Map<string, string>();
  const sourceKinds = new Map<string, MigrationSourceKind>();

  for (const entry of entries) {
    const source = resolveMigrationSource(entry);
    const parsedEntry = await parseMigrationEntry(entry);
    const actorName = resolveActorName(entry);

    sourceTitles.set(source.groupKey, source.groupTitle);
    sourceNames.set(source.groupKey, source.groupName);
    sourceKinds.set(source.groupKey, source.sourceKind);

    if (!sourceGroups.has(source.groupKey)) {
      sourceGroups.set(source.groupKey, new Map());
    }

    const actorMap = sourceGroups.get(source.groupKey)!;
    if (!actorMap.has(actorName)) {
      actorMap.set(actorName, []);
    }

    actorMap.get(actorName)!.push(parsedEntry);
  }

  const result: MigrationReportGroup[] = [];
  for (const [sourceKey, actorMap] of sourceGroups) {
    const actorGroups: MigrationActorGroup[] = [];
    for (const [actorName, entries] of actorMap) {
      actorGroups.push({ actorName, entries });
    }

    result.push({
      sourceKind: sourceKinds.get(sourceKey) ?? "world",
      sourceName: sourceNames.get(sourceKey) ?? sourceTitles.get(sourceKey)!,
      sourceAnchorId: toAnchorId(sourceKey),
      title: sourceTitles.get(sourceKey)!,
      actorGroups,
    });
  }

  return result;
}

async function parseMigrationEntry(entry: MigrationLogEntry): Promise<MigrationReportEntry> {
  const normalized = stripMigrationPrefix(entry.message);
  const documents = entry.documents ?? [];
  const enrichedDocumentsHtml = await buildDocumentLinksHtml(documents);
  const levelLabel = getMigrationReportLevelLabel(entry.level);

  return {
    level: entry.level,
    levelLabel,
    iconClass: getMigrationReportIconClass(entry.level),
    text: normalized,
    ...(entry.migrationName ? { migrationName: entry.migrationName } : {}),
    ...(documents.length ? { documents } : {}),
    ...(enrichedDocumentsHtml ? { documentsHtml: enrichedDocumentsHtml } : {}),
    ...(entry.changes?.length ? { changes: entry.changes } : {}),
    ...(entry.hiddenChangeCount ? { hiddenChangeCount: entry.hiddenChangeCount } : {}),
  };
}

function resolveMigrationSource(entry: MigrationLogEntry): {
  sourceKind: MigrationSourceKind;
  groupKey: string;
  groupName: string;
  groupTitle: string;
} {
  const documents = entry.documents ?? [];

  const compendiumDocument = documents.find((document) => document.kind === "Compendium");
  if (compendiumDocument) {
    const compendiumName =
      compendiumDocument.label ||
      getCompendiumNameFromUuid(compendiumDocument.uuid) ||
      localize("RQG.Migration.reportSourceUnknownCompendium");
    return {
      sourceKind: "compendium",
      groupKey: `compendium:${compendiumName}`,
      groupName: compendiumName,
      groupTitle: localize("RQG.Migration.reportSourceCompendium", {
        name: compendiumName,
      }),
    };
  }

  const inferredCompendiumName = documents
    .map((document) => getCompendiumNameFromUuid(document.uuid))
    .find((name): name is string => !!name);
  if (inferredCompendiumName) {
    return {
      sourceKind: "compendium",
      groupKey: `compendium:${inferredCompendiumName}`,
      groupName: inferredCompendiumName,
      groupTitle: localize("RQG.Migration.reportSourceCompendium", {
        name: inferredCompendiumName,
      }),
    };
  }

  const sceneDocument = documents.find((document) => document.kind === "Scene");
  if (sceneDocument) {
    const sceneName = sceneDocument.label || localize("RQG.Migration.reportSourceUnknownScene");
    return {
      sourceKind: "scene",
      groupKey: `scene:${sceneDocument.uuid || sceneName}`,
      groupName: sceneName,
      groupTitle: localize("RQG.Migration.reportSourceScene", {
        name: sceneName,
      }),
    };
  }

  const inferredSceneId = documents
    .map((document) => getSceneIdFromUuid(document.uuid))
    .find((id): id is string => !!id);
  if (inferredSceneId) {
    const inferredSceneName =
      game.scenes?.get(inferredSceneId)?.name || localize("RQG.Migration.reportSourceUnknownScene");
    return {
      sourceKind: "scene",
      groupKey: `scene:${inferredSceneId}`,
      groupName: inferredSceneName,
      groupTitle: localize("RQG.Migration.reportSourceScene", {
        name: inferredSceneName,
      }),
    };
  }

  return {
    sourceKind: "world",
    groupKey: "world",
    groupName: localize("RQG.Migration.reportSourceWorld"),
    groupTitle: localize("RQG.Migration.reportSourceWorld"),
  };
}

function buildSourceIssueSummary(
  issueGroups: MigrationReportGroup[],
  migrationResult: MigrationResult,
): {
  worldActorsWithIssuesLabel: string;
  worldItemsWithIssuesLabel: string;
  scenesWithIssuesLabel: string;
  compendiumsWithIssuesLabel: string;
  compendiumsSkippedByDesignLabel: string;
} {
  const worldActorUuidsWithIssues = new Set<string>();
  const worldItemUuidsWithIssues = new Set<string>();

  for (const sourceGroup of issueGroups) {
    if (sourceGroup.sourceKind !== "world") {
      continue;
    }
    for (const actorGroup of sourceGroup.actorGroups) {
      for (const entry of actorGroup.entries) {
        const actorUuids = entry.documents
          ?.filter((document) => document.kind === "Actor")
          .map((document) => document.uuid)
          .filter((uuid): uuid is string => !!uuid);
        actorUuids?.forEach((uuid) => worldActorUuidsWithIssues.add(uuid));

        // Count world-owned Item documents only; embedded Actor items should be
        // represented through actor issue counts to avoid double-counting.
        const hasActorDocument = (entry.documents ?? []).some(
          (document) => document.kind === "Actor",
        );
        if (!hasActorDocument) {
          const itemUuids = entry.documents
            ?.filter((document) => document.kind === "Item")
            .map((document) => document.uuid)
            .filter((uuid): uuid is string => !!uuid);
          itemUuids?.forEach((uuid) => worldItemUuidsWithIssues.add(uuid));
        }
      }
    }
  }

  const scenesWithIssues = issueGroups.filter((group) => group.sourceKind === "scene").length;
  const compendiumsWithIssues = issueGroups.filter(
    (group) => group.sourceKind === "compendium",
  ).length;

  return {
    worldActorsWithIssuesLabel: `${worldActorUuidsWithIssues.size}/${migrationResult.stats.worldActorsInspected}`,
    worldItemsWithIssuesLabel: `${worldItemUuidsWithIssues.size}/${migrationResult.stats.worldItemsInspected}`,
    scenesWithIssuesLabel: `${scenesWithIssues}/${migrationResult.stats.scenesInspected}`,
    compendiumsWithIssuesLabel: `${compendiumsWithIssues}/${migrationResult.stats.compendiumsInspected}`,
    compendiumsSkippedByDesignLabel: `${migrationResult.stats.compendiumsSkippedByDesign}`,
  };
}

function buildAffectedSources(issueGroups: MigrationReportGroup[]): MigrationAffectedSources {
  let world = false;
  const scenes = new Map<string, MigrationReportGroup>();
  const compendiums = new Map<string, MigrationReportGroup>();

  for (const group of issueGroups) {
    if (group.sourceKind === "world") {
      world = true;
    }
    if (group.sourceKind === "scene") {
      scenes.set(group.sourceAnchorId, group);
    }
    if (group.sourceKind === "compendium") {
      compendiums.set(group.sourceAnchorId, group);
    }
  }

  return {
    world,
    scenes: Array.from(scenes.entries())
      .map(([, group]) => ({ name: group.sourceName }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    compendiums: Array.from(compendiums.entries())
      .map(([, group]) => ({ name: group.sourceName }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

function buildMigrationReportFallbackHtml(reportPages: MigrationReportPages): string {
  const sections: Array<[string, string]> = [
    [localize("RQG.Migration.reportPageSummary"), reportPages.summaryHtml],
    [localize("RQG.Migration.reportPagePerformed"), reportPages.performedHtml],
    [localize("RQG.Migration.reportPageIssues"), reportPages.issuesHtml],
  ];

  return sections
    .map(
      ([title, content]) =>
        `<section><h1>${foundry.utils.escapeHTML(title)}</h1>${content}</section>`,
    )
    .join("\n<hr>\n");
}

function toAnchorId(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `migration-${normalized || "source"}`;
}

function resolveActorName(entry: MigrationLogEntry): string {
  const documents = entry.documents ?? [];
  const actorDocument = documents.find((document) => document.kind === "Actor");
  if (actorDocument) {
    return actorDocument.label || localize("RQG.Migration.reportSourceUnknownActor");
  }

  // Try to infer actor from UUID (e.g., Actor.123)
  const actorUuid = documents.find(
    (document) => document.uuid && document.uuid.startsWith("Actor."),
  );
  if (actorUuid?.uuid) {
    const parts = actorUuid.uuid.split(".");
    const actorId = parts[1];
    if (actorId) {
      const actor = game.actors?.get(actorId);
      if (actor?.name) {
        return actor.name;
      }
    }
  }

  return localize("RQG.Migration.reportSourceUnknownActor");
}

function getCompendiumNameFromUuid(uuid: string): string | undefined {
  if (!uuid.startsWith("Compendium.")) {
    return undefined;
  }

  const parts = uuid.split(".");
  if (parts.length < 3) {
    return undefined;
  }

  // Compendium UUIDs are either pack-level (Compendium.scope.pack)
  // or document-level (Compendium.scope.pack.DocumentType.documentId).
  return `${parts[1]}.${parts[2]}`;
}

function getSceneIdFromUuid(uuid: string): string | undefined {
  if (!uuid.startsWith("Scene.")) {
    return undefined;
  }

  const parts = uuid.split(".");
  if (parts.length < 2) {
    return undefined;
  }

  return parts[1];
}

function stripMigrationPrefix(message: string): string {
  return message
    .replace(/^RQG\s*\|\s*/, "")
    .replace(/^[^|]+\|\s*/, "")
    .trim();
}

function isMetaMigrationInfoEntry(normalizedMessage: string): boolean {
  return (
    normalizedMessage.startsWith("Starting world migration") ||
    normalizedMessage.startsWith("Finished world migration") ||
    normalizedMessage.startsWith("Running DataModel Repair preflight") ||
    normalizedMessage.startsWith("Migrated all ") ||
    /^Step \d+ \/ \d+ - /.test(normalizedMessage)
  );
}

function getMigrationReportLevelLabel(level: MigrationLogLevel): string {
  switch (level) {
    case "info":
      return localize("RQG.Migration.reportLevelInfo");
    case "warn":
      return localize("RQG.Migration.reportLevelWarning");
    case "error":
      return localize("RQG.Migration.reportLevelError");
  }
}

function getMigrationReportIconClass(level: MigrationLogLevel): string {
  switch (level) {
    case "info":
      return "fas fa-circle-info";
    case "warn":
      return "fas fa-triangle-exclamation";
    case "error":
      return "fas fa-circle-xmark";
  }
}

function stripExecutableMarkupForSandboxedPreview(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, ' $1="#"');
}

async function saveMigrationReportToJournal(
  systemVersion: string,
  reportPages: MigrationReportPages,
): Promise<void> {
  if (
    !reportPages.summaryHtml.trim() ||
    !reportPages.performedHtml.trim() ||
    !reportPages.issuesHtml.trim()
  ) {
    throw new Error("Migration report HTML is empty.");
  }

  const migrationJournal = await getOrCreateMigrationJournal();
  const versionLabel = systemVersion || "unknown";
  const categoryName = `v${versionLabel} - ${formatLocalTimestamp(new Date())}`;
  const firstCategorySort = Math.min(
    ...(migrationJournal.categories.contents.map((category) => category.sort) ?? []),
  );
  const categorySort = Number.isFinite(firstCategorySort)
    ? firstCategorySort - CONST.SORT_INTEGER_DENSITY
    : CONST.SORT_INTEGER_DENSITY;
  const [createdCategory] = await migrationJournal.createEmbeddedDocuments("JournalEntryCategory", [
    {
      name: categoryName,
      sort: categorySort,
    },
  ]);
  if (!createdCategory?.id) {
    throw new Error("Failed to create migration report journal category.");
  }

  const buildPageData = (name: string, sort: number, content: string) => ({
    name,
    type: "text" as const,
    category: createdCategory.id,
    title: {
      show: true,
      level: 1,
    },
    sort,
    text: {
      format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML,
      content,
    },
  });

  const [createdPerformedPage] = await migrationJournal.createEmbeddedDocuments(
    "JournalEntryPage",
    [
      buildPageData(
        localize("RQG.Migration.reportPagePerformed"),
        CONST.SORT_INTEGER_DENSITY * 2,
        reportPages.performedHtml,
      ),
    ],
  );
  if (!createdPerformedPage?.uuid) {
    throw new Error("Failed to create migration report performed page.");
  }

  const [createdIssuesPage] = await migrationJournal.createEmbeddedDocuments("JournalEntryPage", [
    buildPageData(
      localize("RQG.Migration.reportPageIssues"),
      CONST.SORT_INTEGER_DENSITY * 3,
      reportPages.issuesHtml,
    ),
  ]);
  if (!createdIssuesPage?.uuid) {
    throw new Error("Failed to create migration report issues page.");
  }

  const summaryHtml = reportPages.summaryHtml.replaceAll(
    ISSUES_PAGE_UUID_PLACEHOLDER,
    createdIssuesPage.uuid,
  );
  const [createdSummaryPage] = await migrationJournal.createEmbeddedDocuments("JournalEntryPage", [
    buildPageData(
      localize("RQG.Migration.reportPageSummary"),
      CONST.SORT_INTEGER_DENSITY,
      summaryHtml,
    ),
  ]);

  ui.notifications?.info(
    localize("RQG.Migration.reportSaved", {
      journalName: migrationJournal.name,
    }),
    { console: false },
  );
  // @ts-expect-error render signature varies between V1/V2 sheet implementations
  await migrationJournal.sheet?.render({ force: true, focus: true });
  if (createdSummaryPage?.id) {
    (migrationJournal.sheet as JournalSheet | undefined)?.goToPage(createdSummaryPage.id);
  }
}

async function getOrCreateMigrationJournal(): Promise<JournalEntry> {
  const migrationJournalName = localize("RQG.Migration.reportJournalName");
  const existing = game.journal?.find((journal) => journal.name === migrationJournalName);
  if (existing) {
    return existing;
  }

  const created = await JournalEntry.create({ name: migrationJournalName });
  if (!created) {
    throw new Error("Failed to create migration reports journal entry.");
  }

  return created;
}

function formatLocalTimestamp(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

async function buildDocumentLinksHtml(documents: MigrationDocumentLink[]): Promise<string> {
  const labels = await Promise.all(
    documents
      .filter((document) => document.uuid)
      .map(async (document) => {
        const uuid = document.uuid;
        if (!uuid) {
          return "";
        }

        const label = document.label || uuid;
        const link = `@UUID[${uuid}]{${label}}`;
        try {
          return await foundry.applications.ux.TextEditor.implementation.enrichHTML(link);
        } catch (err: unknown) {
          logger.warn(
            `Failed to enrich migration report UUID link [${uuid}]: ${err instanceof Error ? err.message : String(err)}`,
            { notify: false },
          );
          return foundry.utils.escapeHTML(label);
        }
      }),
  );
  return labels.filter((label) => !!label).join(" / ");
}
