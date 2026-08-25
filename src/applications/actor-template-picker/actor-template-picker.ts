import type { DeepPartial } from "fvtt-types/utils";
import {
  actorTagsMatchFilter,
  getActorTemplates,
  type ActorTemplateEntry,
} from "../../system/api/actor-template-api";
import { systemId } from "../../system/config";
import { templatePaths } from "../../system/load-handlebars-templates";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

interface ActorTemplatePickerRow extends ActorTemplateEntry {
  tagsAttr: string;
  /** `source` plus rqid lang/priority. */
  sourceDisplay: string;
}

function buildSourceDisplay(template: ActorTemplateEntry): string {
  if (!template.rqid?.lang) {
    return template.source;
  }
  const priority = template.rqid.priority;
  const detail = priority ? `${template.rqid.lang}, priority: ${priority}` : template.rqid.lang;
  return `${template.source} (${detail})`;
}

interface TemplateFacet {
  key: string;
  options: SelectOptionData<string>[];
}

interface ActorTemplatePickerContext extends foundry.applications.api.ApplicationV2.RenderContext {
  templates: ActorTemplatePickerRow[];
  hasTemplates: boolean;
  facets: TemplateFacet[];
}

/** Groups every distinct tag by its colon-hierarchical namespace into one filter facet each. */
function buildFacets(templates: ActorTemplateEntry[]): TemplateFacet[] {
  const valuesByFacet = new Map<string, Set<string>>();
  for (const template of templates) {
    for (const tag of template.tags) {
      const separatorIndex = tag.indexOf(":");
      if (separatorIndex === -1) {
        continue;
      }
      const key = tag.slice(0, separatorIndex);
      const value = tag.slice(separatorIndex + 1);
      if (!valuesByFacet.has(key)) {
        valuesByFacet.set(key, new Set());
      }
      valuesByFacet.get(key)?.add(value);
    }
  }
  return [...valuesByFacet.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, values]) => ({
      key,
      options: [...values].sort().map((value) => ({ value: `${key}:${value}`, label: value })),
    }));
}

/** Searchable/tag-filterable picker for choosing a template actor to clone (#778/#636). */
export class ActorTemplatePicker extends HandlebarsApplicationMixin(
  ApplicationV2<ActorTemplatePickerContext>,
) {
  private readonly resolvePick: (uuid: string | undefined) => void;
  private resolved = false;
  private templates: ActorTemplateEntry[] = [];
  private searchFilter?: foundry.applications.ux.SearchFilter;

  private constructor(resolvePick: (uuid: string | undefined) => void) {
    super({});
    this.resolvePick = resolvePick;
  }

  static async pick(): Promise<string | undefined> {
    return new Promise((resolve) => {
      const app = new ActorTemplatePicker(resolve);
      void app.render({ force: true });
    });
  }

  static override DEFAULT_OPTIONS = {
    id: "actor-template-picker",
    classes: [systemId, "actor-template-picker"],
    window: {
      title: "RQG.Dialog.ActorTemplatePicker.Title",
      icon: "fas fa-address-card",
      resizable: true,
    },
    actions: {
      selectTemplate: ActorTemplatePicker._selectTemplateAction,
    },
    position: {
      width: 560,
      height: 680,
    },
  } satisfies foundry.applications.api.ApplicationV2.DefaultOptions;

  static override PARTS = {
    body: {
      template: templatePaths.actorTemplatePicker,
      scrollable: [".actor-template-picker-list"],
      root: true,
    },
  };

  override async _prepareContext(): Promise<ActorTemplatePickerContext> {
    if (!this.templates.length) {
      this.templates = await getActorTemplates();
    }
    const rows: ActorTemplatePickerRow[] = this.templates.map((template) => ({
      ...template,
      tagsAttr: template.tags.join("|"),
      sourceDisplay: buildSourceDisplay(template),
    }));
    return {
      templates: rows,
      hasTemplates: this.templates.length > 0,
      facets: buildFacets(this.templates),
    };
  }

  override async _onRender(
    context: foundry.applications.api.HandlebarsApplicationMixin.RenderContext,
    options: DeepPartial<foundry.applications.api.ApplicationV2.RenderOptions>,
  ): Promise<void> {
    await super._onRender(context, options);

    this.searchFilter ??= new foundry.applications.ux.SearchFilter({
      inputSelector: '[name="search"]',
      contentSelector: ".actor-template-picker-list",
      callback: this._onSearchFilter.bind(this),
    });
    this.searchFilter.bind(this.element);

    for (const select of this.element.querySelectorAll<HTMLSelectElement>("select[data-facet]")) {
      select.addEventListener("change", () => {
        // SearchFilter#filter tolerates a null event at runtime despite its type declaration.
        this.searchFilter?.filter(null as unknown as KeyboardEvent, this.searchFilter.query);
      });
    }
  }

  private _onSearchFilter(
    _event: KeyboardEvent | null,
    _query: string,
    rgx: RegExp,
    html: HTMLElement | null,
  ): void {
    if (!html) {
      return;
    }
    const facetFilters = [...this.element.querySelectorAll<HTMLSelectElement>("select[data-facet]")]
      .map((select) => select.value)
      .filter((value) => value !== "");
    for (const row of html.querySelectorAll<HTMLElement>("[data-uuid]")) {
      const name = row.dataset["name"] ?? "";
      const tags = (row.dataset["tags"] ?? "").split("|").filter(Boolean);
      const matchesQuery = foundry.applications.ux.SearchFilter.testQuery(rgx, name);
      const matchesFacets = facetFilters.every((filterTag) =>
        actorTagsMatchFilter(tags, filterTag),
      );
      row.hidden = !(matchesQuery && matchesFacets);
    }
  }

  private static _selectTemplateAction(
    this: ActorTemplatePicker,
    _event: PointerEvent,
    target: HTMLElement,
  ): void {
    const uuid = target.closest<HTMLElement>("[data-uuid]")?.dataset["uuid"];
    if (!uuid) {
      return;
    }
    this.resolveOnce(uuid);
    void this.close();
  }

  private resolveOnce(uuid: string | undefined): void {
    if (this.resolved) {
      return;
    }
    this.resolved = true;
    this.resolvePick(uuid);
  }

  override async close(
    options?: foundry.applications.api.ApplicationV2.ClosingOptions,
  ): Promise<this | void> {
    this.resolveOnce(undefined);
    return await super.close(options);
  }
}
