/* DataModel Repair Macro
 * Finds all invalid documents with validation errors and presents
 * a GUI to fix them. Groups identical errors so they can be fixed in bulk.
 */

const repairs = [];
const seenCollections = new Set();

/**
 * Walk a DataModel schema and collect field metadata keyed by dot-path.
 */
function getSchemaInfo(ModelClass) {
  const info = {};
  function walkSchema(schema, path) {
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
        info[fieldPath] = { type: "boolean", initial: field.options?.initial ?? false };
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
      } else if (field.fields) {
        walkSchema(field.fields, fieldPath);
      }
    }
  }
  walkSchema(ModelClass.schema.fields, "");
  return info;
}

function isValidNumber(value, fieldInfo) {
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

function findErrors(source, schemaInfo, path = "") {
  const errors = [];
  if (!source || typeof source !== "object") {
    return errors;
  }

  for (const [key, value] of Object.entries(source)) {
    const fieldPath = path ? `${path}.${key}` : key;
    const fieldInfo = schemaInfo[fieldPath];

    if (fieldInfo?.type === "choice" && typeof value === "string") {
      if (!fieldInfo.choices.includes(value)) {
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
        value.forEach((entry, i) => {
          if (!isValidNumber(entry, elementInfo)) {
            errors.push({
              fieldPath: `${fieldPath}.${i}`,
              errorType: "number",
              invalidValue: entry,
              integer: elementInfo.integer,
              nullable: elementInfo.nullable,
              initial: elementInfo.initial,
            });
          }
        });
      } else {
        const subInfo = {};
        for (const [sp, sv] of Object.entries(schemaInfo)) {
          if (sp.startsWith(`${fieldPath}[].`)) {
            subInfo[sp.replace(`${fieldPath}[].`, "")] = sv;
          }
        }
        if (Object.keys(subInfo).length > 0) {
          value.forEach((entry, i) => {
            if (entry && typeof entry === "object") {
              const subErrors = findErrors(entry, subInfo);
              for (const e of subErrors) {
                errors.push({ ...e, fieldPath: `${fieldPath}[${i}].${e.fieldPath}` });
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

function coerceToNumber(value, fieldInfo) {
  const fallback = fieldInfo.nullable ? null : (fieldInfo.initial ?? 0);
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
  const num = Number(normalized);
  if (Number.isNaN(num)) {
    return fallback;
  }
  return fieldInfo.integer ? Math.round(num) : num;
}

function collectFromCollection(collection, context) {
  if (!collection.invalidDocumentIds?.size || seenCollections.has(collection)) {
    return;
  }
  seenCollections.add(collection);
  for (const id of collection.invalidDocumentIds) {
    const doc = collection.getInvalid(id);
    if (!doc) {
      continue;
    }

    const ModelClass = CONFIG.Item.dataModels[doc.type];
    if (!ModelClass) {
      continue;
    }

    const rawSystem = doc._source?.system ?? doc.system;
    const schemaInfo = getSchemaInfo(ModelClass);
    const foundErrors = findErrors(rawSystem, schemaInfo);

    if (foundErrors.length > 0) {
      repairs.push({
        context,
        name: doc.name,
        type: doc.type,
        id,
        collection,
        errors: foundErrors,
      });
    }
  }
}

function collectFromSourceItems(sourceItems, invalidActor, context) {
  for (const itemSource of sourceItems) {
    const ModelClass = CONFIG.Item.dataModels[itemSource.type];
    if (!ModelClass) {
      continue;
    }

    const schemaInfo = getSchemaInfo(ModelClass);
    const foundErrors = findErrors(itemSource.system, schemaInfo);

    if (foundErrors.length > 0) {
      repairs.push({
        context,
        name: itemSource.name,
        type: itemSource.type,
        id: itemSource._id,
        invalidActor,
        errors: foundErrors,
      });
    }
  }
}

/* Collect from world items */
collectFromCollection(game.items, "World Items");

/* Collect from actor embedded items (valid actors) */
for (const actor of game.actors) {
  collectFromCollection(actor.items, `Actor: ${actor.name}`);
}

/* Collect from invalid actors */
if (game.actors.invalidDocumentIds?.size) {
  for (const id of game.actors.invalidDocumentIds) {
    const invalidActor = game.actors.getInvalid(id);
    if (!invalidActor) {
      continue;
    }
    if (invalidActor.items?.invalidDocumentIds?.size) {
      collectFromCollection(invalidActor.items, `Actor (invalid): ${invalidActor.name}`);
    }
    if (!invalidActor.items?.invalidDocumentIds?.size && invalidActor._source?.items?.length) {
      collectFromSourceItems(
        invalidActor._source.items,
        invalidActor,
        `Actor (invalid): ${invalidActor.name}`,
      );
    }
  }
}

/* Collect from unlinked token actors */
for (const scene of game.scenes) {
  for (const token of scene.tokens) {
    if (token.actorLink) {
      continue; /* linked tokens share the world actor — already scanned */
    }
    const synthActor = token.actor;
    if (!synthActor) {
      continue;
    }
    const ctx = `Token: ${token.name} (Scene: ${scene.name})`;
    collectFromCollection(synthActor.items, ctx);
  }
}

/**
 * Group errors by (itemType, fieldPath, invalidValue, errorType) so identical
 * errors across multiple documents can be fixed with a single selection.
 */
function buildErrorGroups() {
  const groups = new Map();
  for (const r of repairs) {
    for (const e of r.errors) {
      const key = `${r.type}|${e.fieldPath}|${e.errorType}|${JSON.stringify(e.invalidValue)}`;
      if (!groups.has(key)) {
        groups.set(key, {
          itemType: r.type,
          fieldPath: e.fieldPath,
          errorType: e.errorType,
          invalidValue: e.invalidValue,
          choices: e.choices,
          integer: e.integer,
          nullable: e.nullable,
          initial: e.initial,
          documents: [],
        });
      }
      groups.get(key).documents.push({
        name: r.name,
        context: r.context,
        id: r.id,
        collection: r.collection,
        invalidActor: r.invalidActor,
        fieldPath: e.fieldPath,
      });
    }
  }
  return [...groups.values()];
}

if (repairs.length === 0) {
  ui.notifications.info("No validation errors found in invalid documents.");
} else {
  const errorGroups = buildErrorGroups();
  const { ApplicationV2 } = foundry.applications.api;

  class DataModelRepairApp extends ApplicationV2 {
    static DEFAULT_OPTIONS = {
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

    _errorGroups = errorGroups;
    _totalDocs = repairs.length;

    async _renderHTML() {
      const wrapper = document.createElement("div");
      wrapper.classList.add("datamodel-repair-wrapper");

      const scrollArea = document.createElement("div");
      scrollArea.classList.add("datamodel-repair-scroll");

      const intro = document.createElement("p");
      intro.textContent =
        `Found ${this._totalDocs} documents with validation errors ` +
        `(${this._errorGroups.length} unique issues):`;
      scrollArea.appendChild(intro);

      for (let g = 0; g < this._errorGroups.length; g++) {
        const group = this._errorGroups[g];

        const fieldset = document.createElement("fieldset");
        fieldset.dataset.groupIndex = g;
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

        /* Fix control */
        const fixRow = document.createElement("div");
        fixRow.style.margin = "4px 0";

        if (group.errorType === "choice") {
          fixRow.innerHTML = `<em>"${group.invalidValue}"</em> → `;

          const select = document.createElement("select");
          select.name = `group-${g}`;
          select.dataset.errorType = "choice";

          const skipOpt = document.createElement("option");
          skipOpt.value = "__skip__";
          skipOpt.textContent = "(skip - do not fix)";
          select.appendChild(skipOpt);

          for (const choice of group.choices) {
            const opt = document.createElement("option");
            opt.value = choice;
            opt.textContent = choice || "(empty string)";
            select.appendChild(opt);
          }

          fixRow.appendChild(select);
        } else if (group.errorType === "number") {
          const coerced = coerceToNumber(group.invalidValue, group);
          fixRow.innerHTML =
            `<em>${JSON.stringify(group.invalidValue)}</em> → <strong>${coerced}</strong> (number)` +
            `<input type="hidden" name="group-${g}" data-error-type="number" data-coerced="${coerced}" value="auto">`;
        } else if (group.errorType === "boolean") {
          const coerced = !!group.invalidValue;
          fixRow.innerHTML =
            `<em>${JSON.stringify(group.invalidValue)}</em> → <strong>${coerced}</strong> (boolean)` +
            `<input type="hidden" name="group-${g}" data-error-type="boolean" data-coerced="${coerced}" value="auto">`;
        }

        fieldset.appendChild(fixRow);

        /* Affected documents list */
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
          const li = document.createElement("li");
          li.textContent = `${doc.name} (${doc.context})`;
          docList.appendChild(li);
        }
        details.appendChild(docList);
        fieldset.appendChild(details);

        scrollArea.appendChild(fieldset);
      }

      wrapper.appendChild(scrollArea);

      /* Sticky footer */
      const footer = document.createElement("div");
      footer.classList.add("datamodel-repair-footer");

      const applyBtn = document.createElement("button");
      applyBtn.type = "button";
      applyBtn.dataset.action = "applyFixes";
      applyBtn.innerHTML = '<i class="fas fa-wrench"></i> Apply Fixes';

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.dataset.action = "cancel";
      cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cancel';

      footer.appendChild(applyBtn);
      footer.appendChild(cancelBtn);
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

    _replaceHTML(result, content) {
      content.replaceChildren(result);
    }

    _onRender() {
      this.element
        .querySelector('[data-action="applyFixes"]')
        ?.addEventListener("click", () => this._applyFixes());
      this.element
        .querySelector('[data-action="cancel"]')
        ?.addEventListener("click", () => this.close());
      this.element.querySelectorAll("select[data-error-type='choice']").forEach((select) => {
        select.addEventListener("change", () => {
          const fieldset = select.closest(".repair-group");
          if (!fieldset) {
            return;
          }
          fieldset.classList.toggle("will-fix", select.value !== "__skip__");
        });
      });
    }

    async _applyFixes() {
      let fixCount = 0;
      const fixedDocIds = new Set();

      for (let g = 0; g < this._errorGroups.length; g++) {
        const group = this._errorGroups[g];
        const input = this.element.querySelector(`[name="group-${g}"]`);
        if (!input) {
          continue;
        }

        let newValue;
        const errorType = input.dataset.errorType;

        if (errorType === "choice") {
          if (input.value === "__skip__") {
            continue;
          }
          newValue = input.value;
        } else if (errorType === "number" && input.value === "auto") {
          const coerced = input.dataset.coerced;
          newValue = coerced === "null" ? null : Number(coerced);
        } else if (errorType === "boolean" && input.value === "auto") {
          newValue = input.dataset.coerced === "true";
        } else {
          continue;
        }

        for (const docRef of group.documents) {
          const updateKey = `system.${docRef.fieldPath}`;

          try {
            const doc = docRef.collection ? docRef.collection.getInvalid(docRef.id) : null;
            if (!doc) {
              console.warn(`Could not get invalid document "${docRef.name}" (${docRef.id})`);
              continue;
            }

            await doc.update({ [updateKey]: newValue });
            fixCount++;
            fixedDocIds.add(docRef.id);
            console.log(
              `Fixed ${group.itemType} "${docRef.name}" (${docRef.id}): ${updateKey} = ${JSON.stringify(newValue)}`,
            );
          } catch (e) {
            console.warn(
              `Update sent for "${docRef.name}" (${docRef.id}), client-side handler errored (expected for invalid docs — reload to verify):`,
              e,
            );
            fixCount++;
            fixedDocIds.add(docRef.id);
          }
        }
      }

      ui.notifications.info(
        `Applied ${fixCount} fixes across ${fixedDocIds.size} documents. Reload the world to verify.`,
      );
      this.close();
    }
  }

  new DataModelRepairApp().render(true);
}
