export type DataModelRepairOptions = {
  autoReloadAfterFinish?: boolean;
};

export type DataModelRepairResult = {
  needsReload: boolean;
};

type DataModelFieldInfo = {
  type?: "number" | "boolean" | "choice";
  integer?: boolean;
  nullable?: boolean;
  initial?: boolean | number | null;
  choices?: string[];
};

type DataModelError = {
  fieldPath: string;
  errorType: "choice" | "number" | "boolean";
  invalidValue: unknown;
  choices?: string[];
  integer?: boolean;
  nullable?: boolean;
  initial?: boolean | number | null;
};

type InvalidDocumentCollection = {
  invalidDocumentIds?: Set<string>;
  getInvalid(id: string): unknown;
};

type RepairEntry = {
  context: string;
  name: string;
  type: string;
  id: string;
  collection?: InvalidDocumentCollection;
  errors: DataModelError[];
};

type UnknownTypeEntry = {
  context: string;
  name: string;
  type: string;
  id: string;
  collection: InvalidDocumentCollection;
  documentName: "Actor" | "Item";
};

type ErrorGroupDocument = {
  name: string;
  context: string;
  id: string;
  collection?: InvalidDocumentCollection;
  fieldPath: string;
};

type ErrorGroup = {
  itemType: string;
  fieldPath: string;
  errorType: "choice" | "number" | "boolean";
  invalidValue: unknown;
  choices?: string[];
  integer?: boolean;
  nullable?: boolean;
  initial?: boolean | number | null;
  documents: ErrorGroupDocument[];
};

function getSchemaInfo(ModelClass: {
  schema: { fields: Record<string, foundry.data.fields.DataField> };
}): Record<string, DataModelFieldInfo> {
  const info: Record<string, DataModelFieldInfo> = {};

  function walkSchema(schema: Record<string, foundry.data.fields.DataField>, path: string): void {
    for (const [key, field] of Object.entries(schema)) {
      const fieldPath = path ? `${path}.${key}` : key;

      if (field instanceof foundry.data.fields.NumberField) {
        info[fieldPath] = {
          type: "number",
          integer: !!field.options?.integer,
          nullable: !!field.options?.nullable,
          initial: field.options?.initial ?? 0,
        };
      } else if (field instanceof foundry.data.fields.BooleanField) {
        info[fieldPath] = {
          type: "boolean",
          initial: field.options?.initial ?? false,
        };
      }

      if (field.options?.choices) {
        const choiceValues = Array.isArray(field.options.choices)
          ? field.options.choices
          : Object.keys(field.options.choices);
        info[fieldPath] = { ...info[fieldPath], type: "choice", choices: choiceValues };
      }

      if (field instanceof foundry.data.fields.ArrayField) {
        if (field.element instanceof foundry.data.fields.NumberField) {
          info[`${fieldPath}[]`] = {
            type: "number",
            integer: !!field.element.options?.integer,
            nullable: !!field.element.options?.nullable,
            initial: field.element.options?.initial ?? 0,
          };
        } else if (field.element instanceof foundry.data.fields.SchemaField) {
          walkSchema(field.element.fields, `${fieldPath}[]`);
        }
      } else if ("fields" in field && field.fields) {
        walkSchema(field.fields as Record<string, foundry.data.fields.DataField>, fieldPath);
      }
    }
  }

  walkSchema(ModelClass.schema.fields, "");
  return info;
}

function isValidNumber(value: unknown, fieldInfo: DataModelFieldInfo): boolean {
  if (value === null) {
    return !!fieldInfo.nullable;
  }
  if (typeof value === "string") {
    return false;
  }
  if (typeof value !== "number" || Number.isNaN(value)) {
    return false;
  }
  return true;
}

function findErrors(
  source: unknown,
  schemaInfo: Record<string, DataModelFieldInfo>,
  path = "",
): DataModelError[] {
  const errors: DataModelError[] = [];
  if (!source || typeof source !== "object") {
    return errors;
  }

  for (const [key, value] of Object.entries(source)) {
    const fieldPath = path ? `${path}.${key}` : key;
    const fieldInfo = schemaInfo[fieldPath];

    if (fieldInfo?.type === "choice" && typeof value === "string") {
      if (!fieldInfo.choices?.includes(value)) {
        errors.push({
          fieldPath,
          errorType: "choice",
          invalidValue: value,
          choices: fieldInfo.choices,
        });
      }
    } else if (fieldInfo?.type === "number" && !isValidNumber(value, fieldInfo)) {
      errors.push({
        fieldPath,
        errorType: "number",
        invalidValue: value,
        integer: fieldInfo.integer,
        nullable: fieldInfo.nullable,
        initial: fieldInfo.initial,
      });
    } else if (fieldInfo?.type === "boolean" && typeof value !== "boolean") {
      errors.push({
        fieldPath,
        errorType: "boolean",
        invalidValue: value,
      });
    } else if (Array.isArray(value)) {
      const elementInfo = schemaInfo[`${fieldPath}[]`];
      if (elementInfo?.type === "number") {
        value.forEach((entry, index) => {
          if (!isValidNumber(entry, elementInfo)) {
            errors.push({
              fieldPath: `${fieldPath}.${index}`,
              errorType: "number",
              invalidValue: entry,
              integer: elementInfo.integer,
              nullable: elementInfo.nullable,
              initial: elementInfo.initial,
            });
          }
        });
      } else {
        const subInfo: Record<string, DataModelFieldInfo> = {};
        for (const [subPath, subValue] of Object.entries(schemaInfo)) {
          if (subPath.startsWith(`${fieldPath}[].`)) {
            subInfo[subPath.replace(`${fieldPath}[].`, "")] = subValue;
          }
        }
        if (Object.keys(subInfo).length > 0) {
          value.forEach((entry, index) => {
            if (entry && typeof entry === "object") {
              const subErrors = findErrors(entry, subInfo);
              for (const error of subErrors) {
                errors.push({
                  ...error,
                  fieldPath: `${fieldPath}[${index}].${error.fieldPath}`,
                });
              }
            }
          });
        }
      }
    } else if (value && typeof value === "object" && !fieldInfo) {
      errors.push(...findErrors(value, schemaInfo, fieldPath));
    }
  }

  return errors;
}

function coerceToNumber(value: unknown, fieldInfo: DataModelFieldInfo): number | null {
  const fallback = fieldInfo.nullable ? null : ((fieldInfo.initial as number | null) ?? 0);
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === "number") {
    if (Number.isNaN(value)) {
      return fallback;
    }
    return fieldInfo.integer ? Math.round(value) : value;
  }
  const trimmed = String(value).trim();
  if (trimmed === "" || trimmed === "null" || trimmed === "undefined") {
    return fallback;
  }
  const normalized = trimmed.replace(",", ".");
  const numberValue = Number(normalized);
  if (Number.isNaN(numberValue)) {
    return fallback;
  }
  return fieldInfo.integer ? Math.round(numberValue) : numberValue;
}

function collectFromCollection(
  collection: InvalidDocumentCollection | undefined,
  context: string,
  repairs: RepairEntry[],
  unknownTypeDocs: UnknownTypeEntry[],
  seenCollections: Set<unknown>,
): void {
  if (!collection?.invalidDocumentIds?.size || seenCollections.has(collection)) {
    return;
  }
  seenCollections.add(collection);

  for (const id of collection.invalidDocumentIds) {
    const doc = collection.getInvalid(id) as
      | {
          type?: string;
          name?: string;
          _source?: { system?: unknown };
          system?: unknown;
        }
      | undefined;
    if (!doc?.type) {
      continue;
    }

    const ModelClass = CONFIG.Item.dataModels[doc.type as Item.SubType];
    if (!ModelClass) {
      unknownTypeDocs.push({
        context,
        name: doc.name ?? "(unnamed)",
        type: doc.type,
        id,
        collection,
        documentName: "Item",
      });
      continue;
    }

    const rawSystem = doc._source?.system ?? doc.system;
    const schemaInfo = getSchemaInfo(ModelClass);
    const foundErrors = findErrors(rawSystem, schemaInfo);
    if (foundErrors.length > 0) {
      repairs.push({
        context,
        name: doc.name ?? "(unnamed)",
        type: doc.type,
        id,
        collection,
        errors: foundErrors,
      });
    }
  }
}

function collectFromSourceItems(
  sourceItems: Array<{ _id: string; name?: string; type: string; system?: unknown }>,
  context: string,
  repairs: RepairEntry[],
): void {
  for (const itemSource of sourceItems) {
    const ModelClass = CONFIG.Item.dataModels[itemSource.type as Item.SubType];
    if (!ModelClass) {
      continue;
    }

    const schemaInfo = getSchemaInfo(ModelClass);
    const foundErrors = findErrors(itemSource.system, schemaInfo);
    if (foundErrors.length > 0) {
      repairs.push({
        context,
        name: itemSource.name ?? "(unnamed)",
        type: itemSource.type,
        id: itemSource._id,
        errors: foundErrors,
      });
    }
  }
}

function buildErrorGroups(repairs: RepairEntry[]): ErrorGroup[] {
  const groups = new Map<string, ErrorGroup>();

  for (const repair of repairs) {
    for (const error of repair.errors) {
      const key = `${repair.type}|${error.fieldPath}|${error.errorType}|${JSON.stringify(error.invalidValue)}`;
      if (!groups.has(key)) {
        groups.set(key, {
          itemType: repair.type,
          fieldPath: error.fieldPath,
          errorType: error.errorType,
          invalidValue: error.invalidValue,
          choices: error.choices,
          integer: error.integer,
          nullable: error.nullable,
          initial: error.initial,
          documents: [],
        });
      }

      groups.get(key)!.documents.push({
        name: repair.name,
        context: repair.context,
        id: repair.id,
        collection: repair.collection,
        fieldPath: error.fieldPath,
      });
    }
  }

  return [...groups.values()];
}

export async function openDataModelRepairDialog(
  options: DataModelRepairOptions = {},
): Promise<DataModelRepairResult> {
  const repairs: RepairEntry[] = [];
  const unknownTypeDocs: UnknownTypeEntry[] = [];
  const seenCollections = new Set<unknown>();

  collectFromCollection(
    game.items as InvalidDocumentCollection | undefined,
    "World Items",
    repairs,
    unknownTypeDocs,
    seenCollections,
  );

  for (const actor of game.actors ?? []) {
    collectFromCollection(
      actor.items as InvalidDocumentCollection | undefined,
      `Actor: ${actor.name}`,
      repairs,
      unknownTypeDocs,
      seenCollections,
    );
  }

  if (game.actors?.invalidDocumentIds?.size) {
    for (const id of game.actors.invalidDocumentIds) {
      const invalidActor = game.actors.getInvalid(id) as unknown as
        | {
            type: string;
            name?: string;
            items?: InvalidDocumentCollection;
            _source?: {
              items?: Array<{ _id: string; name?: string; type: string; system?: unknown }>;
            };
          }
        | undefined;
      if (!invalidActor) {
        continue;
      }

      if (!CONFIG.Actor.dataModels[invalidActor.type as Actor.SubType]) {
        unknownTypeDocs.push({
          context: "World Actors",
          name: invalidActor.name ?? "(unnamed)",
          type: invalidActor.type,
          id,
          collection: game.actors as unknown as InvalidDocumentCollection,
          documentName: "Actor",
        });
        continue;
      }

      if (invalidActor.items?.invalidDocumentIds?.size) {
        collectFromCollection(
          invalidActor.items,
          `Actor (invalid): ${invalidActor.name}`,
          repairs,
          unknownTypeDocs,
          seenCollections,
        );
      }
      if (!invalidActor.items?.invalidDocumentIds?.size && invalidActor._source?.items?.length) {
        collectFromSourceItems(
          invalidActor._source.items,
          `Actor (invalid): ${invalidActor.name}`,
          repairs,
        );
      }
    }
  }

  for (const scene of game.scenes ?? []) {
    for (const token of scene.tokens) {
      if (token.actorLink) {
        continue;
      }
      const synthActor = token.actor;
      if (!synthActor) {
        continue;
      }
      collectFromCollection(
        synthActor.items as InvalidDocumentCollection | undefined,
        `Token: ${token.name} (Scene: ${scene.name})`,
        repairs,
        unknownTypeDocs,
        seenCollections,
      );
    }
  }

  if (repairs.length === 0 && unknownTypeDocs.length === 0) {
    ui.notifications?.info("No validation errors or unknown-type documents found.");
    return { needsReload: false };
  }

  const errorGroups = buildErrorGroups(repairs);
  const { ApplicationV2 } = foundry.applications.api;

  class DataModelRepairApp extends ApplicationV2 {
    static override DEFAULT_OPTIONS = {
      id: "datamodel-repair",
      classes: ["datamodel-repair"],
      window: {
        title: "DataModel Repair: Fix Invalid Documents",
        resizable: true,
      },
      position: {
        width: 550,
        height: 600,
      },
    };

    _closeResult: DataModelRepairResult = { needsReload: false };

    override async _renderHTML(): Promise<HTMLElement> {
      const wrapper = document.createElement("div");
      wrapper.classList.add("datamodel-repair-wrapper");

      const scrollArea = document.createElement("div");
      scrollArea.classList.add("datamodel-repair-scroll");

      const intro = document.createElement("p");
      const issueCount = errorGroups.length + (unknownTypeDocs.length > 0 ? 1 : 0);
      intro.textContent =
        `Found ${repairs.length} documents with validation errors` +
        (unknownTypeDocs.length > 0
          ? ` and ${unknownTypeDocs.length} documents with unknown types`
          : "") +
        ` (${issueCount} unique issues):`;
      scrollArea.appendChild(intro);

      if (unknownTypeDocs.length > 0) {
        const fieldset = document.createElement("fieldset");
        fieldset.classList.add("repair-group", "will-delete");

        const legend = document.createElement("legend");
        const typeList = [...new Set(unknownTypeDocs.map((document) => document.type))].join(", ");
        legend.innerHTML =
          `<strong>Unknown types</strong>: <code>${typeList}</code>` +
          ` <span style="background:var(--color-warm-2,#c44);color:#fff;padding:1px 6px;border-radius:8px;font-size:0.8em">${unknownTypeDocs.length}×</span>`;
        fieldset.appendChild(legend);

        const info = document.createElement("p");
        info.style.cssText = "margin:4px 0;font-size:0.9em";
        info.textContent =
          "These documents have types that no longer exist in the system. Check the ones you want to delete.";
        fieldset.appendChild(info);

        for (let index = 0; index < unknownTypeDocs.length; index += 1) {
          const doc = unknownTypeDocs[index]!;
          const row = document.createElement("label");
          row.style.cssText =
            "display:flex;align-items:center;gap:6px;margin:2px 0;font-size:0.9em";

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.name = `unknown-${index}`;
          checkbox.checked = true;
          row.appendChild(checkbox);

          const text = document.createElement("span");
          text.textContent = `${doc.documentName} "${doc.name}" (type: ${doc.type}) — ${doc.context}`;
          row.appendChild(text);

          fieldset.appendChild(row);
        }
        scrollArea.appendChild(fieldset);
      }

      for (let groupIndex = 0; groupIndex < errorGroups.length; groupIndex += 1) {
        const group = errorGroups[groupIndex]!;
        const fieldset = document.createElement("fieldset");
        fieldset.dataset["groupIndex"] = String(groupIndex);
        fieldset.classList.add("repair-group");
        if (group.errorType !== "choice") {
          fieldset.classList.add("will-fix");
        }

        const legend = document.createElement("legend");
        const countBadge =
          group.documents.length > 1
            ? ` <span style="background:var(--color-warm-2,#c44);color:#fff;padding:1px 6px;border-radius:8px;font-size:0.8em">${group.documents.length}×</span>`
            : "";
        legend.innerHTML = `<strong>${group.itemType}</strong> → <code>system.${group.fieldPath}</code>${countBadge}`;
        fieldset.appendChild(legend);

        const fixRow = document.createElement("div");
        fixRow.style.margin = "4px 0";

        if (group.errorType === "choice") {
          fixRow.innerHTML = `<em>"${group.invalidValue}"</em> → `;
          const select = document.createElement("select");
          select.name = `group-${groupIndex}`;
          select.dataset["errorType"] = "choice";

          const skipOption = document.createElement("option");
          skipOption.value = "__skip__";
          skipOption.textContent = "(skip - do not fix)";
          select.appendChild(skipOption);

          for (const choice of group.choices ?? []) {
            const option = document.createElement("option");
            option.value = choice;
            option.textContent = choice || "(empty string)";
            select.appendChild(option);
          }

          fixRow.appendChild(select);
        } else if (group.errorType === "number") {
          const coerced = coerceToNumber(group.invalidValue, group);
          fixRow.innerHTML =
            `<em>${JSON.stringify(group.invalidValue)}</em> → <strong>${coerced}</strong> (number)` +
            `<input type="hidden" name="group-${groupIndex}" data-error-type="number" data-coerced="${coerced}" value="auto">`;
        } else if (group.errorType === "boolean") {
          const coerced = !!group.invalidValue;
          fixRow.innerHTML =
            `<em>${JSON.stringify(group.invalidValue)}</em> → <strong>${coerced}</strong> (boolean)` +
            `<input type="hidden" name="group-${groupIndex}" data-error-type="boolean" data-coerced="${coerced}" value="auto">`;
        }

        fieldset.appendChild(fixRow);

        const details = document.createElement("details");
        details.style.cssText =
          "margin-top:4px;font-size:0.85em;color:var(--color-text-dark-5,#666)";
        const summary = document.createElement("summary");
        summary.style.cursor = "pointer";
        summary.textContent = `${group.documents.length} affected document${group.documents.length > 1 ? "s" : ""}`;
        details.appendChild(summary);

        const docList = document.createElement("ul");
        docList.style.cssText = "margin:2px 0 0 16px;padding:0";
        for (const doc of group.documents) {
          const listItem = document.createElement("li");
          listItem.textContent = `${doc.name} (${doc.context})`;
          docList.appendChild(listItem);
        }
        details.appendChild(docList);
        fieldset.appendChild(details);

        scrollArea.appendChild(fieldset);
      }

      wrapper.appendChild(scrollArea);

      const footer = document.createElement("div");
      footer.classList.add("datamodel-repair-footer");

      const applyButton = document.createElement("button");
      applyButton.type = "button";
      applyButton.dataset["action"] = "applyFixes";
      applyButton.innerHTML = '<i class="fas fa-wrench"></i> Apply Fixes';

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.dataset["action"] = "cancel";
      cancelButton.innerHTML = '<i class="fas fa-times"></i> Cancel';

      footer.appendChild(applyButton);
      footer.appendChild(cancelButton);
      wrapper.appendChild(footer);

      const style = document.createElement("style");
      style.textContent = `
        .datamodel-repair .window-content {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: 0;
        }
        .datamodel-repair-wrapper {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }
        .datamodel-repair-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }
        .repair-group {
          margin-bottom: 8px;
          padding: 6px;
          border: 2px solid var(--color-border-light-2, #888);
          transition: border-color 0.2s;
        }
        .repair-group.will-fix {
          border-color: #2a2;
        }
        .repair-group.will-delete {
          border-color: #c44;
        }
        .datamodel-repair-footer {
          flex: 0 0 auto;
          display: flex;
          gap: 8px;
          padding: 8px;
          border-top: 1px solid var(--color-border-light-2, #888);
          background: var(--color-bg, inherit);
        }
        .datamodel-repair-footer button {
          flex: 1;
        }
      `;
      wrapper.appendChild(style);

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
        .querySelector('[data-action="applyFixes"]')
        ?.addEventListener("click", () => void this._applyFixes());
      this.element
        .querySelector('[data-action="cancel"]')
        ?.addEventListener("click", () => void this.close());
      this.element.querySelectorAll("select[data-error-type='choice']").forEach((select) => {
        select.addEventListener("change", () => {
          const fieldset = select.closest(".repair-group");
          if (!fieldset) {
            return;
          }
          fieldset.classList.toggle("will-fix", (select as HTMLSelectElement).value !== "__skip__");
        });
      });
      const unknownFieldset = this.element.querySelector(".will-delete, .repair-group-unknown");
      if (unknownFieldset) {
        unknownFieldset.classList.add("repair-group-unknown");
        unknownFieldset.addEventListener("change", () => {
          const anyChecked = unknownFieldset.querySelector("input[type='checkbox']:checked");
          unknownFieldset.classList.toggle("will-delete", !!anyChecked);
        });
      }
    }

    async _applyFixes(): Promise<void> {
      let fixCount = 0;
      let deleteCount = 0;
      const fixedDocIds = new Set<string>();

      for (let index = 0; index < unknownTypeDocs.length; index += 1) {
        const checkbox = this.element.querySelector(
          `[name="unknown-${index}"]`,
        ) as HTMLInputElement | null;
        if (!checkbox?.checked) {
          continue;
        }
        const docRef = unknownTypeDocs[index]!;
        try {
          const doc = docRef.collection.getInvalid(docRef.id) as
            | { delete: () => Promise<unknown> }
            | undefined;
          if (!doc) {
            console.warn(`Could not get invalid document "${docRef.name}" (${docRef.id})`);
            continue;
          }
          await doc.delete();
          deleteCount += 1;
          console.log(
            `Deleted unknown-type ${docRef.documentName} "${docRef.name}" (${docRef.id}, type: ${docRef.type})`,
          );
        } catch (error) {
          console.warn(`Failed to delete "${docRef.name}" (${docRef.id}):`, error);
        }
      }

      for (let groupIndex = 0; groupIndex < errorGroups.length; groupIndex += 1) {
        const group = errorGroups[groupIndex]!;
        const input = this.element.querySelector(`[name="group-${groupIndex}"]`) as
          | HTMLInputElement
          | HTMLSelectElement
          | null;
        if (!input) {
          continue;
        }

        let newValue: unknown;
        const errorType = input.dataset["errorType"];

        if (errorType === "choice") {
          if ((input as HTMLSelectElement).value === "__skip__") {
            continue;
          }
          newValue = (input as HTMLSelectElement).value;
        } else if (errorType === "number" && input.value === "auto") {
          const coerced = input.dataset["coerced"];
          newValue = coerced === "null" ? null : Number(coerced);
        } else if (errorType === "boolean" && input.value === "auto") {
          newValue = input.dataset["coerced"] === "true";
        } else {
          continue;
        }

        for (const docRef of group.documents) {
          const updateKey = `system.${docRef.fieldPath}`.replace(/\[(\d+)]/g, ".$1");
          try {
            const doc = docRef.collection?.getInvalid(docRef.id) as
              | { update: (data: Record<string, unknown>) => Promise<unknown> }
              | undefined;
            if (!doc) {
              console.warn(`Could not get invalid document "${docRef.name}" (${docRef.id})`);
              continue;
            }
            await doc.update({ [updateKey]: newValue });
            fixCount += 1;
            fixedDocIds.add(docRef.id);
            console.log(
              `Fixed ${group.itemType} "${docRef.name}" (${docRef.id}): ${updateKey} = ${JSON.stringify(newValue)}`,
            );
          } catch (error) {
            console.warn(
              `Update sent for "${docRef.name}" (${docRef.id}), client-side handler errored (expected for invalid docs — reload to verify):`,
              error,
            );
            fixCount += 1;
            fixedDocIds.add(docRef.id);
          }
        }
      }

      const parts: string[] = [];
      if (fixCount > 0) {
        parts.push(`Fixed ${fixCount} issues across ${fixedDocIds.size} documents`);
      }
      if (deleteCount > 0) {
        parts.push(`Deleted ${deleteCount} unknown-type documents`);
      }

      if (parts.length === 0) {
        ui.notifications?.info("No changes made.");
        this._closeResult = { needsReload: false };
        await this.close();
        return;
      }

      this._closeResult = { needsReload: true };
      await this.close();

      const message = `${parts.join(". ")}. A reload is needed for the changes to take effect.`;
      if (options.autoReloadAfterFinish) {
        return;
      }
      foundry.applications.api.DialogV2.confirm({
        window: { title: "DataModel Repair" },
        content: `<p>${message}</p>`,
        yes: {
          label: "Reload",
          callback: () => window.location.reload(),
        },
        no: { label: "Later" },
      });
    }
  }

  const result = await new Promise<DataModelRepairResult>((resolve) => {
    const application = new DataModelRepairApp();
    const originalClose = application.close.bind(application);
    application.close = async (closeOptions?: any): Promise<typeof application> => {
      const closeResult = await originalClose(closeOptions);
      if (application._closeResult.needsReload && options.autoReloadAfterFinish) {
        window.location.reload();
        return closeResult;
      }
      resolve(application._closeResult);
      return closeResult;
    };
    application.render(true);
  });

  return result;
}
