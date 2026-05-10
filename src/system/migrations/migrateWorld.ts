import { localize } from "../util";
import {
  type ActorMigration,
  type ActiveEffectMigration,
  applyMigrations,
  type ItemMigration,
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

  await migrateWorldDialog(systemVersion);
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

async function logMigrationReport(
  systemVersion: string,
  migrationResult: MigrationResult,
): Promise<void> {
  const warnings = migrationResult.logEntries.filter((entry) => entry.level === "warn");
  const errors = migrationResult.logEntries.filter((entry) => entry.level === "error");
  const issues = migrationResult.logEntries.filter(
    (entry) => entry.level === "warn" || entry.level === "error",
  );
  const issueGroups = await groupMigrationEntriesBySource(issues);
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
    hasIssues: issues.length > 0,
    affectedSources,
    issueGroups,
  };
  const [summaryHtml, issuesHtml] = await Promise.all([
    foundry.applications.handlebars.renderTemplate(
      templatePaths.migrationReportSummary,
      reportContext,
    ),
    foundry.applications.handlebars.renderTemplate(
      templatePaths.migrationReportIssues,
      reportContext,
    ),
  ]);

  try {
    await saveMigrationReportToJournal(systemVersion, {
      summaryHtml,
      issuesHtml,
    });
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
      {
        summaryHtml,
        issuesHtml,
      },
      errorMessage,
    );
  }

  logger.info(
    `Migration report v${systemVersion}: ${migrationResult.logCount} entries (${warnings.length} warnings, ${errors.length} errors)`,
    { notify: false },
  );
}

function buildErrorSummaryGroups(issueGroups: MigrationIssueGroup[]): MigrationErrorSummaryGroup[] {
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
  reportPages: MigrationReportPages,
  initialError: string,
): Promise<void> {
  const reportHtml = buildMigrationReportFallbackHtml(reportPages);
  const escapedError = foundry.utils.escapeHTML(initialError);
  const escapedReport = foundry.utils.escapeHTML(reportHtml);

  const content = `
    <p>${localize("RQG.Migration.reportSaveFailureDialogBody")}</p>
    <p><strong>${localize("RQG.Migration.reportSaveFailureDialogErrorLabel")}</strong> ${escapedError}</p>
    <p>${localize("RQG.Migration.reportSaveFailureDialogFallbackCopyHint")}</p>
    <textarea readonly rows="12" style="width: 100%; font-family: monospace;">${escapedReport}</textarea>
  `;

  await foundry.applications.api.DialogV2.wait({
    window: {
      title: localize("RQG.Migration.reportSaveFailureDialogTitle", { systemVersion }),
      resizable: true,
    },
    position: {
      width: 900,
      height: 620,
    },
    content,
    buttons: [
      {
        action: "retry",
        label: localize("RQG.Migration.reportSaveFailureDialogRetry"),
        icon: "fas fa-rotate-right",
        callback: async () => {
          try {
            await saveMigrationReportToJournal(systemVersion, reportPages);
            return true;
          } catch (err: unknown) {
            const retryError = err instanceof Error ? err.message : String(err);
            ui.notifications?.error(
              localize("RQG.Migration.reportSaveFailed", {
                error: retryError,
              }),
              { console: false },
            );
            return false;
          }
        },
      },
      {
        action: "copyHtml",
        label: localize("RQG.Migration.reportSaveFailureDialogCopy"),
        icon: "fas fa-copy",
        callback: async () => {
          try {
            await navigator.clipboard.writeText(reportHtml);
            ui.notifications?.info(localize("RQG.Migration.reportHtmlCopied"), {
              console: false,
            });
            return false;
          } catch (err: unknown) {
            const copyError = err instanceof Error ? err.message : String(err);
            ui.notifications?.error(
              localize("RQG.Migration.reportCopyFailed", {
                error: copyError,
              }),
              { console: false },
            );
            return false;
          }
        },
      },
      {
        action: "close",
        label: localize("RQG.Migration.reportCloseButton"),
        icon: "fas fa-times",
        callback: () => true,
      },
    ],
  });
}

type MigrationActorGroup = {
  actorName: string;
  entries: MigrationIssueEntry[];
};

type MigrationIssueGroup = {
  sourceKind: MigrationSourceKind;
  sourceName: string;
  sourceAnchorId: string;
  title: string;
  actorGroups: MigrationActorGroup[];
};

type MigrationSourceKind = "world" | "scene" | "compendium";

type MigrationIssueEntry = {
  level: "warn" | "error";
  levelLabel: string;
  iconClass: string;
  text: string;
  documents?: MigrationDocumentLink[];
  documentsHtml?: string;
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
  issuesHtml: string;
};

async function groupMigrationEntriesBySource(
  entries: MigrationResult["logEntries"],
): Promise<MigrationIssueGroup[]> {
  const sourceGroups = new Map<string, Map<string, MigrationIssueEntry[]>>();
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

  const result: MigrationIssueGroup[] = [];
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

async function parseMigrationEntry(entry: MigrationLogEntry): Promise<MigrationIssueEntry> {
  if (entry.level !== "warn" && entry.level !== "error") {
    throw new Error(`Unsupported migration report level: ${entry.level}`);
  }

  const normalized = stripMigrationPrefix(entry.message);
  const documents = entry.documents ?? [];
  const enrichedDocumentsHtml = await buildDocumentLinksHtml(documents);
  const levelLabel =
    entry.level === "warn"
      ? localize("RQG.Migration.reportLevelWarning")
      : localize("RQG.Migration.reportLevelError");

  return {
    level: entry.level,
    levelLabel,
    iconClass: entry.level === "warn" ? "fas fa-triangle-exclamation" : "fas fa-circle-xmark",
    text: normalized,
    ...(documents.length ? { documents } : {}),
    ...(enrichedDocumentsHtml ? { documentsHtml: enrichedDocumentsHtml } : {}),
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
  issueGroups: MigrationIssueGroup[],
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

function buildAffectedSources(issueGroups: MigrationIssueGroup[]): MigrationAffectedSources {
  let world = false;
  const scenes = new Map<string, MigrationIssueGroup>();
  const compendiums = new Map<string, MigrationIssueGroup>();

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
  return message.replace(/^RQG \|\s*/, "").trim();
}

async function saveMigrationReportToJournal(
  systemVersion: string,
  reportPages: MigrationReportPages,
): Promise<void> {
  if (!reportPages.summaryHtml.trim() || !reportPages.issuesHtml.trim()) {
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

  const [createdIssuesPage] = await migrationJournal.createEmbeddedDocuments("JournalEntryPage", [
    buildPageData(
      localize("RQG.Migration.reportPageIssues"),
      CONST.SORT_INTEGER_DENSITY * 2,
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
        const link = `@UUID[${document.uuid}]{${document.label}}`;
        return await foundry.applications.ux.TextEditor.implementation.enrichHTML(link);
      }),
  );
  return labels.join(" / ");
}
