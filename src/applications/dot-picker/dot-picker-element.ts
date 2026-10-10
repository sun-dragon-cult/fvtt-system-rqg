/**
 * A row of dots that fill up like a bar: `<rqg-dot-picker name="…" value="2" max="4">`. Clicking a
 * dot sets the value to it, clicking the top filled dot again lowers it by one, and dots above
 * `limit` can't be picked. Arrow keys, Home and End work like a slider. Takes part in forms like
 * any input.
 */
export class RqgDotPickerElement extends foundry.applications.elements
  .AbstractFormInputElement<number> {
  static override tagName = "rqg-dot-picker";

  static register(): void {
    if (!customElements.get(this.tagName)) {
      customElements.define(this.tagName, this);
    }
  }

  #max: number;
  #limit = Infinity;
  #dots: HTMLElement[] = [];

  constructor() {
    super();
    this._internals.role = "slider";
    this.#max = Math.max(0, Math.floor(Number(this.getAttribute("max")) || 0));
    this._setValue(Number(this.getAttribute("value")));
  }

  get max(): number {
    return this.#max;
  }

  /** The highest value that can be picked; dots above it are shown as unreachable. */
  get limit(): number {
    return this.#limit;
  }

  set limit(limit: number) {
    this.#limit = limit;
    this._refresh();
  }

  /** Set the value without firing input and change, for code adjusting several pickers at once. */
  setValueQuietly(value: number): void {
    this._setValue(value);
    this._refresh();
  }

  protected override _setValue(value: number): void {
    this._value = Math.clamp(Math.floor(Number(value) || 0), 0, this.#max);
  }

  protected override _buildElements(): HTMLElement[] {
    this.#dots = Array.from({ length: this.#max }, (_dot, index) => {
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.dataset["value"] = String(index + 1);
      return dot;
    });
    return this.#dots;
  }

  protected override _refresh(): void {
    this.#dots.forEach((dot, index) => {
      dot.classList.toggle("filled", index < this._value);
      dot.classList.toggle("unreachable", index + 1 > this.#limit);
    });
    this._internals.ariaValueMin = "0";
    this._internals.ariaValueMax = String(this.#max);
    this._internals.ariaValueNow = String(this._value);
    this._internals.setFormValue(String(this._value));
  }

  protected override _activateListeners(): void {
    this.tabIndex = this.disabled ? -1 : 0;
    this.addEventListener("keydown", this.#onKeyDown.bind(this), { signal: this.abortSignal });
  }

  protected override _toggleDisabled(disabled: boolean): void {
    this.tabIndex = disabled ? -1 : 0;
  }

  protected override _onClick(event: PointerEvent): void {
    const dot = (event.target as HTMLElement).closest<HTMLElement>(".dot");
    const picked = Number(dot?.dataset["value"]);
    if (!dot || !this.editable || picked > this.#limit) {
      return;
    }
    this.value = picked === this._value ? picked - 1 : picked;
  }

  #onKeyDown(event: KeyboardEvent): void {
    if (!this.editable) {
      return;
    }
    const highest = Math.min(this.#max, this.#limit);
    const next =
      event.key === "ArrowRight" || event.key === "ArrowUp"
        ? this._value + 1
        : event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? this._value - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? highest
              : undefined;
    if (next === undefined) {
      return;
    }
    event.preventDefault();
    if (next >= 0 && next <= highest && next !== this._value) {
      this.value = next;
    }
  }
}
