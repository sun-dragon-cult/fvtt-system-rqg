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

const INDENT = "\u00A0\u00A0"; // non-breaking - a leading regular space can get collapsed in <option> text

/** Adds every ancestor-depth path of a colon-separated tag value (e.g. "uz:dark-troll" -> "uz", "uz:dark-troll") into `paths`. */
function addAncestorPaths(paths: Set<string>, value: string): void {
  const segments = value.split(":");
  for (let depth = 1; depth <= segments.length; depth++) {
    paths.add(segments.slice(0, depth).join(":"));
  }
}

/** Colon-path segments (with every ancestor depth) for one facet's tags across `templates`. */
function collectFacetPaths(templates: ActorTemplateEntry[], facetKey: string): Set<string> {
  const paths = new Set<string>();
  for (const template of templates) {
    for (const tag of template.tags) {
      const separatorIndex = tag.indexOf(":");
      if (separatorIndex === -1 || tag.slice(0, separatorIndex) !== facetKey) {
        continue;
      }
      addAncestorPaths(paths, tag.slice(separatorIndex + 1));
    }
  }
  return paths;
}

/** One filter facet per tag namespace, with a selectable row for every ancestor level too. */
export function buildFacets(templates: ActorTemplateEntry[]): TemplateFacet[] {
  const pathsByFacet = new Map<string, Set<string>>();
  for (const template of templates) {
    for (const tag of template.tags) {
      const separatorIndex = tag.indexOf(":");
      if (separatorIndex === -1) {
        continue;
      }
      const key = tag.slice(0, separatorIndex);
      let paths = pathsByFacet.get(key);
      if (!paths) {
        paths = new Set();
        pathsByFacet.set(key, paths);
      }
      addAncestorPaths(paths, tag.slice(separatorIndex + 1));
    }
  }
  return [...pathsByFacet.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, paths]) => ({
      key,
      options: [...paths].sort().map((path) => {
        const segments = path.split(":");
        return {
          value: `${key}:${path}`,
          label: `${INDENT.repeat(segments.length - 1)}${segments[segments.length - 1]}`,
        };
      }),
    }));
}

/** Facet option values (`"<key>:<path>"`) still reachable given every *other* active facet filter. */
export function computeAvailableFacetValues(
  templates: ActorTemplateEntry[],
  activeFilters: string[],
  facetKey: string,
): Set<string> {
  const otherFilters = activeFilters.filter((filter) => !filter.startsWith(`${facetKey}:`));
  const reachable = templates.filter((template) =>
    otherFilters.every((filter) => actorTagsMatchFilter(template.tags, filter)),
  );
  return new Set([...collectFacetPaths(reachable, facetKey)].map((path) => `${facetKey}:${path}`));
}

/** Searchable/tag-filterable picker for choosing a template actor to clone (#778/#636). */
export class ActorTemplatePicker extends HandlebarsApplicationMixin(
  ApplicationV2<ActorTemplatePickerContext>,
) {
  private readonly resolvePick: (uuid: string | undefined) => void;
  private resolved = false;
  private templates: ActorTemplateEntry[] = [];
  private templatesByUuid = new Map<string, ActorTemplateEntry>();
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
      this.templatesByUuid = new Map(this.templates.map((template) => [template.uuid, template]));
    }
    const rows: ActorTemplatePickerRow[] = this.templates.map((template) => ({
      ...template,
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
      const template = this.templatesByUuid.get(row.dataset["uuid"] ?? "");
      const matchesQuery = foundry.applications.ux.SearchFilter.testQuery(
        rgx,
        template?.name ?? "",
      );
      const matchesFacets = facetFilters.every((filterTag) =>
        actorTagsMatchFilter(template?.tags, filterTag),
      );
      row.hidden = !(matchesQuery && matchesFacets);
    }
    this._updateFacetAvailability(facetFilters);
  }

  /**
   * Hides options that no other active filter's result set could still contain, so the list stays
   * scannable. The current selection is kept visible (disabled, not hidden) rather than yanked out
   * from under the user - that would silently jump the select to a different value.
   */
  private _updateFacetAvailability(activeFilters: string[]): void {
    for (const select of this.element.querySelectorAll<HTMLSelectElement>("select[data-facet]")) {
      const facetKey = select.dataset["facet"];
      if (!facetKey) {
        continue;
      }
      const available = computeAvailableFacetValues(this.templates, activeFilters, facetKey);
      for (const option of select.options) {
        if (option.value === "") {
          continue;
        }
        const isAvailable = available.has(option.value);
        option.disabled = !isAvailable;
        option.hidden = !isAvailable && option.value !== select.value;
      }
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
