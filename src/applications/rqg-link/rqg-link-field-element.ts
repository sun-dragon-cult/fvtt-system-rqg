import { RqidLink } from "../../data-model/shared/rqid-link";
import {
  getDroppedDocumentRqidLink,
  hasRqid,
  isAllowedDocumentNames,
  isAllowedDocumentType,
  parseDropzoneList,
  resolveDroppedDocument,
} from "../../documents/drag-drop";
import { localize } from "../../system/util";
import { RqgLinkElement } from "./rqg-link-element";
import { buildRqgLinkControl, rqgLinkControlTag } from "./rqg-link-control";
import { entryFor, parseLinks, rqidOf, toLinks, type RqgLinkFieldEntry } from "./rqg-link-value";

/**
 * Detail of the cancelable `rqg-link-drop` event fired before a dropped document is linked.
 * Properties added to `entry` are stored with the link.
 */
export type RqgLinkDropDetail = {
  document: foundry.abstract.Document.Any;
  rqid: string;
  entry: RqgLinkFieldEntry;
};

/** Adds controls to an entry; see RqgLinkFieldElement.renderEntry. */
export type RqgLinkEntryRenderer = (
  element: HTMLElement,
  entry: Readonly<RqgLinkFieldEntry>,
  editable: boolean,
) => void;

/**
 * An editable rqid link, or list of them, that takes part in forms like any input:
 * `<rqg-link-field name="system.skillRqidLinks" value="[…]" documents="Item" types="skill">`.
 * Its value is the stored link data: an array, or one link (or null) with `single`.
 *
 * Attributes:
 * - `value`: the links as JSON.
 * - `link-key`: the property of each entry holding the link, when entries hold more than a link,
 *   like `{ skillRqidLink, bonus, incomeSkill }`.
 * - `single`: one link; a drop replaces it.
 * - `documents`, `types`: comma separated document names and types that may be dropped.
 * - `allow-duplicates`: the same rqid may be linked more than once.
 * - `hint`: localization key for the text shown when empty.
 * - `owner`: uuid of the document holding the links, passed to the shown links.
 * - `readonly`, `disabled`: no changes.
 *
 * `<option>` children become an add menu, and `<rqg-link-control>` children controls in each entry
 * (see rqg-link-control.ts). Before linking a dropped document it fires a cancelable `rqg-link-drop`
 * event (detail: RqgLinkDropDetail), so the sheet can refuse the drop or do more. `renderEntry`
 * lets the sheet add controls that depend on more than the entry.
 */
export class RqgLinkFieldElement extends foundry.applications.elements.AbstractFormInputElement<
  RqgLinkFieldEntry[]
> {
  static override tagName = "rqg-link-field";

  static register(): void {
    if (!customElements.get(this.tagName)) {
      customElements.define(this.tagName, this);
    }
  }

  #options: { value: string; label: string }[] = [];
  #controls: Element[] = [];
  #addPrompt?: string;
  #list?: HTMLElement;
  #renderedEditable?: boolean;
  #renderEntry?: RqgLinkEntryRenderer;

  constructor() {
    super();
    this._value = parseLinks(this.getAttribute("value"), this.linkKey);
    this.removeAttribute("value");
  }

  get linkKey(): string | undefined {
    return this.getAttribute("link-key") ?? undefined;
  }

  /**
   * Called for each entry after its chip and controls, before the remove button. Inputs and selects it
   * adds with a `data-key` edit that property of the entry: a checkbox stores a boolean, a number
   * input a number (0 when empty), others their text.
   */
  get renderEntry(): RqgLinkEntryRenderer | undefined {
    return this.#renderEntry;
  }

  set renderEntry(renderer: RqgLinkEntryRenderer | undefined) {
    this.#renderEntry = renderer;
    this._refresh();
  }

  get single(): boolean {
    return this.hasAttribute("single");
  }

  get allowDuplicates(): boolean {
    return this.hasAttribute("allow-duplicates");
  }

  override connectedCallback(): void {
    const options = [...this.querySelectorAll("option")];
    if (options.length) {
      const isPrompt = (option: HTMLOptionElement) => !option.value || option.value === "empty";
      this.#addPrompt = options.find(isPrompt)?.textContent ?? undefined;
      this.#options = options
        .filter((option) => !isPrompt(option))
        .map((option) => ({ value: option.value, label: option.textContent ?? option.value }));
    }
    const controls = [...this.querySelectorAll(`:scope > ${rqgLinkControlTag}`)];
    if (controls.length) {
      this.#controls = controls;
    }
    super.connectedCallback();
  }

  protected override _getValue(): any {
    const entries = this._value.map((entry) => ({ ...entry }));
    return this.single ? (entries[0] ?? null) : entries;
  }

  protected override _setValue(value: unknown): void {
    this._value = toLinks(value, this.linkKey);
  }

  protected override _buildElements(): HTMLElement[] {
    this.#list = document.createElement("div");
    this.#list.className = "links";
    return [this.#list];
  }

  protected override _refresh(): void {
    if (!this.#list) {
      return;
    }
    const owner = this.getAttribute("owner") ?? "";
    const actor = RqidLink.ownerActor(owner);
    const editable = this.editable;
    const linkKey = this.linkKey;
    const entries = RqidLink.sortedByName(
      (this.single ? this._value.slice(0, 1) : this._value).map((value) => ({
        rqid: rqidOf(value, linkKey),
        value,
      })),
      actor,
    );
    this.#renderedEditable = editable;

    const children: HTMLElement[] = entries.map(({ link: { value, rqid }, index, name }) =>
      this.#buildEntry(value, rqid, index, name, owner, editable),
    );
    if (!entries.length) {
      const placeholder = document.createElement("span");
      placeholder.className = "placeholder";
      placeholder.textContent = localize(
        this.getAttribute("hint") ?? "RQG.Foundry.ContentLink.Field.Empty.Default",
      );
      children.push(placeholder);
    }
    const addMenu = editable ? this.#buildAddMenu() : undefined;
    if (addMenu) {
      children.push(addMenu);
    }
    this.#list.replaceChildren(...children);
    if (this.single && entries.length && editable) {
      this.dataset["tooltip"] = localize("RQG.Foundry.ContentLink.Field.DropToReplace");
    } else {
      delete this.dataset["tooltip"];
    }
  }

  #buildEntry(
    value: RqgLinkFieldEntry,
    rqid: string,
    index: number,
    name: string,
    owner: string,
    editable: boolean,
  ): HTMLElement {
    const entry = document.createElement("span");
    entry.className = "entry";
    entry.dataset["index"] = String(index);

    const chip = document.createElement(RqgLinkElement.tagName) as RqgLinkElement;
    chip.setAttribute("rqid", rqid);
    if (owner) {
      chip.setAttribute("owner", owner);
    }
    entry.append(chip);

    for (const spec of this.#controls) {
      entry.append(
        buildRqgLinkControl(spec, value[spec.getAttribute("key") ?? ""], editable, name),
      );
    }

    this.#renderEntry?.(entry, value, editable);

    if (editable) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "rqg-link-remove";
      remove.innerHTML = `<i class="fa-solid fa-xmark" inert></i>`;
      const label = localize("RQG.Foundry.ContentLink.Field.Remove", { name });
      remove.ariaLabel = label;
      remove.dataset["tooltip"] = label;
      entry.append(remove);
    }
    return entry;
  }

  #buildAddMenu(): HTMLSelectElement | undefined {
    const linked = new Set(this._value.map((entry) => rqidOf(entry, this.linkKey)));
    const available = this.#options.filter(
      (option) => this.allowDuplicates || this.single || !linked.has(option.value),
    );
    if (!available.length) {
      return undefined;
    }
    const select = document.createElement("select");
    select.className = "add";
    select.ariaLabel = localize("RQG.Foundry.ContentLink.Field.Add");
    const prompt = new Option(this.#addPrompt ?? localize("RQG.Foundry.ContentLink.Field.Add"), "");
    select.append(prompt, ...available.map((option) => new Option(option.label, option.value)));
    return select;
  }

  protected override _activateListeners(): void {
    const signal = this.abortSignal;
    this.addEventListener("change", this.#onInnerChange.bind(this), { signal, capture: true });
    this.addEventListener("keydown", this.#onKeyDown.bind(this), { signal });
    this.addEventListener("dragover", this.#onDragOver.bind(this), { signal });
    this.addEventListener(
      "dragleave",
      (event) => {
        if (!this.contains(event.relatedTarget as Node | null)) {
          this.classList.remove("drag-hover");
        }
      },
      { signal },
    );
    this.addEventListener("drop", (event) => void this.#onDrop(event), { signal });
  }

  protected override _toggleDisabled(): void {
    if (this.editable !== this.#renderedEditable) {
      this._refresh();
    }
  }

  protected override _onClick(event: PointerEvent): void {
    const remove = (event.target as HTMLElement).closest("button.rqg-link-remove");
    if (remove && this.editable) {
      this.#removeAt(Number(remove.closest<HTMLElement>(".entry")?.dataset["index"]));
    }
  }

  #onInnerChange(event: Event): void {
    const target = event.target as HTMLElement;
    if (target === this) {
      return;
    }
    // Inner inputs only edit this field's value
    event.stopPropagation();
    if (!this.editable) {
      return;
    }
    if (target instanceof HTMLSelectElement && target.classList.contains("add")) {
      if (target.value) {
        this.#add(entryFor({ rqid: target.value }, this.linkKey));
      }
      return;
    }
    const key = target.dataset["key"];
    if (key && (target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
      const index = Number(target.closest<HTMLElement>(".entry")?.dataset["index"]);
      const entries = this._value.map((entry) => ({ ...entry }));
      if (entries[index]) {
        entries[index][key] = inputValue(target);
        this.value = entries;
      }
    }
  }

  #onKeyDown(event: KeyboardEvent): void {
    if (!this.editable || (event.key !== "Delete" && event.key !== "Backspace")) {
      return;
    }
    const chip = (event.target as HTMLElement).closest(RqgLinkElement.tagName);
    if (chip) {
      event.preventDefault();
      this.#removeAt(Number(chip.closest<HTMLElement>(".entry")?.dataset["index"]));
    }
  }

  #onDragOver(event: DragEvent): void {
    if (!this.editable) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "link";
    }
    this.classList.add("drag-hover");
  }

  async #onDrop(event: DragEvent): Promise<void> {
    this.classList.remove("drag-hover");
    if (!this.editable) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event) as {
      type?: string;
    };
    const allowedDocuments = parseDropzoneList(this.getAttribute("documents") ?? undefined);
    if (!isAllowedDocumentNames(data?.type, allowedDocuments)) {
      return;
    }
    const document = await resolveDroppedDocument(data);
    const allowedTypes = parseDropzoneList(this.getAttribute("types") ?? undefined);
    if (!document || !isAllowedDocumentType(document, allowedTypes) || !hasRqid(document)) {
      return;
    }
    const link = getDroppedDocumentRqidLink(document);
    if (!link) {
      // A page link is stored as parentRqid.pageRqid
      ui.notifications?.warn(
        localize("RQG.Actor.Notification.JournalPageDropRequiresParentRqidWarn", {
          pageName: document.name ?? "",
        }),
      );
      return;
    }
    const detail: RqgLinkDropDetail = {
      document,
      rqid: link.rqid,
      entry: entryFor(link, this.linkKey),
    };
    const proceed = this.dispatchEvent(
      new CustomEvent("rqg-link-drop", { bubbles: true, cancelable: true, detail }),
    );
    if (proceed) {
      this.#add(detail.entry);
    }
  }

  #add(entry: RqgLinkFieldEntry): void {
    const linkKey = this.linkKey;
    const rqid = rqidOf(entry, linkKey);
    const isNew = this.single
      ? rqidOf(this._value[0] ?? {}, linkKey) !== rqid
      : this.allowDuplicates || !this._value.some((e) => rqidOf(e, linkKey) === rqid);
    if (!isNew) {
      this._refresh(); // resets the add menu
      return;
    }
    this.value = this.single ? [entry] : [...this._value, entry];
  }

  #removeAt(index: number): void {
    if (Number.isInteger(index) && this._value[index]) {
      this.value = this._value.filter((_link, i) => i !== index);
    }
  }
}

/** A checkbox gives a boolean, a number input a number (0 when empty), others their text. */
function inputValue(input: HTMLInputElement | HTMLSelectElement): unknown {
  if (input instanceof HTMLInputElement && input.type === "checkbox") {
    return input.checked;
  }
  if (input instanceof HTMLInputElement && input.type === "number") {
    const number = Number(input.value);
    return Number.isFinite(number) ? number : 0;
  }
  return input.value;
}
