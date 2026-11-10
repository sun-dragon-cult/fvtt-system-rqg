import { Rqid, type RqidDisplay, type RqidString } from "../../system/api/rqid-api";
import { RqidLink } from "../../data-model/shared/rqid-link";
import { localize } from "../../system/util";

/** Name of the document `uuid` points to; the uuid itself, marked missing, when none does. */
export function displayFromUuid(uuid: string): RqidDisplay {
  const document = uuid ? foundry.utils.fromUuidSync(uuid, { strict: false }) : null;
  const name = (document as { name?: string } | null)?.name;
  return name ? { name, missing: false } : { name: uuid, missing: Boolean(uuid) };
}

/**
 * A link to the document an rqid resolves to: `<rqg-link rqid="i.skill.jump"></rqg-link>`, or to
 * one specific document: `<rqg-link uuid="Actor.abc"></rqg-link>`.
 * Shows the type icon and the resolved name, marked when nothing matches, and keeps the name
 * current while it is shown. Click or Enter opens the document.
 *
 * Attributes: `rqid` or `uuid`; `owner`, the uuid of the document holding an rqid link, whose
 * actor's items name links nothing else resolves; `anchor`, a heading on a journal page to open at.
 */
export class RqgLinkElement extends foundry.applications.elements.AdoptableHTMLElement {
  static readonly tagName = "rqg-link";

  static register(): void {
    if (!customElements.get(this.tagName)) {
      customElements.define(this.tagName, this);
    }
  }

  static readonly observedAttributes = ["rqid", "uuid", "owner"];

  #abortController?: AbortController;
  #display?: RqidDisplay;
  #shown?: string;

  get rqid(): string {
    return this.getAttribute("rqid") ?? "";
  }

  get uuid(): string {
    return this.getAttribute("uuid") ?? "";
  }

  connectedCallback(): void {
    this.#abortController = new AbortController();
    const { signal } = this.#abortController;
    this.setAttribute("role", "link");
    if (!this.hasAttribute("tabindex")) {
      this.tabIndex = 0;
    }
    this.addEventListener("click", (event) => void this.#open(event), { signal });
    this.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Enter") {
          void this.#open(event);
        }
      },
      { signal },
    );
    // Also tells of renamed, created and deleted top-level documents, which uuid links show
    Rqid.onNamesChanged(() => this.refresh(), signal);
    this.refresh();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#abortController?.abort();
    this.#abortController = undefined;
  }

  attributeChangedCallback(): void {
    // Attributes are set before connectedCallback when the element is upgraded
    if (this.#abortController) {
      this.refresh();
    }
  }

  /** Resolve the name again and redraw. */
  refresh(): void {
    const rqid = this.rqid;
    const uuid = this.uuid;
    const display = uuid
      ? displayFromUuid(uuid)
      : Rqid.displayFromRqid(rqid, RqidLink.ownerActor(this.getAttribute("owner")));
    this.#display = display;

    const shown = `${rqid}|${uuid}|${display.name}|${display.missing}`;
    if (shown === this.#shown) {
      return;
    }
    this.#shown = shown;

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = display.name;
    const icon = document.createElement("span");
    icon.className = "icon";
    icon.innerHTML = uuid
      ? Rqid.getDocumentIcon(foundry.utils.parseUuid(uuid)?.type)
      : (Rqid.getRqidIcon(rqid) ?? "");
    this.replaceChildren(icon, name);

    this.toggleAttribute("missing", display.missing);
    const tooltip = display.missing
      ? uuid
        ? localize("RQG.Foundry.ContentLink.UuidLinkMissing", { uuid })
        : localize("RQG.Foundry.ContentLink.RqidLinkMissing", { rqid })
      : uuid
        ? undefined
        : RqidLink.tooltip(rqid);
    if (tooltip) {
      this.dataset["tooltip"] = tooltip;
    } else {
      delete this.dataset["tooltip"];
    }
  }

  async #open(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const actorItem = this.#display?.actorItem;
    if (actorItem) {
      await actorItem.sheet?.render(true);
      return;
    }
    if (this.uuid) {
      // As Foundry's content links: a macro runs, a journal page opens in its journal
      const document = await foundry.utils.fromUuid(this.uuid);
      await (
        document as { _onClickDocumentLink?(event: Event): unknown } | null
      )?._onClickDocumentLink?.(event);
      return;
    }
    if (this.rqid) {
      await Rqid.renderRqidDocument(
        this.rqid as RqidString,
        this.getAttribute("anchor") ?? undefined,
      );
    }
  }
}
