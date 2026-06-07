import type { DeepPartial } from "fvtt-types/utils";
import { getDefaultRollMode, getSelectedRollModeFromClickEvent } from "./roll-mode";

type LivePreviewFormBehaviorConfig = {
  submitButtonSelectorForBlurGuard?: string;
  updateLivePreview: () => void;
  onCommittedFormChange?: (event: Event) => boolean | void;
  shouldRerenderOnCommittedChange?: (event: Event) => boolean;
};

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export abstract class RqgInteractiveRollApplicationBase extends HandlebarsApplicationMixin(
  ApplicationV2<any>,
) {
  private _skipNextChangeRerender = false;
  private _livePreviewHandlersBoundTo?: HTMLFormElement;
  protected rollMode: foundry.dice.Roll.Mode = getDefaultRollMode();

  protected onRollModeParentClick(_event: MouseEvent): void {
    // Subclasses can opt in by overriding applySelectedRollMode.
    const newRollMode = getSelectedRollModeFromClickEvent(_event);
    if (!newRollMode) {
      return;
    }

    const changed = this.applySelectedRollMode(newRollMode);
    if (changed) {
      this.render();
    }
  }

  protected applySelectedRollMode(_rollMode: foundry.dice.Roll.Mode): boolean {
    if (this.rollMode === _rollMode) {
      return false;
    }

    this.rollMode = _rollMode;
    return true;
  }

  protected abstract getLivePreviewFormBehaviorConfig(): LivePreviewFormBehaviorConfig;

  protected override _onClickAction(
    event: PointerEvent,
    target: foundry.applications.api.ApplicationV2.ActionTarget,
  ): void {
    if (target.dataset["action"] === "rollMode") {
      this.onRollModeParentClick(event as MouseEvent);
      return;
    }

    super._onClickAction(event, target);
  }

  private bindLivePreviewHandlers(element: HTMLFormElement): void {
    if (this._livePreviewHandlersBoundTo === element) {
      return;
    }

    element.addEventListener("pointerdown", (event) => this.onPointerDownForBlurGuard(event));
    element.addEventListener("input", () => this.onLivePreviewInput());
    this._livePreviewHandlersBoundTo = element;
  }

  private onPointerDownForBlurGuard(event: PointerEvent): void {
    const selector = this.getLivePreviewFormBehaviorConfig().submitButtonSelectorForBlurGuard;
    if (!selector) {
      return;
    }

    const target = event.target;
    if (target instanceof Element && target.closest(selector)) {
      this._skipNextChangeRerender = true;
    }
  }

  private onLivePreviewInput(): void {
    this.getLivePreviewFormBehaviorConfig().updateLivePreview();
  }

  override get element(): HTMLFormElement {
    return super.element as HTMLFormElement;
  }

  protected override async _onRender(
    context: DeepPartial<any>,
    options: DeepPartial<foundry.applications.api.ApplicationV2.RenderOptions>,
  ): Promise<void> {
    await super._onRender(context, options);
    this.bindLivePreviewHandlers(this.element);
  }

  protected override _onChangeForm(
    formConfig: foundry.applications.api.ApplicationV2.FormConfiguration,
    event: Event,
  ): void {
    if (this._skipNextChangeRerender) {
      this._skipNextChangeRerender = false;
      return;
    }

    const behaviorConfig = this.getLivePreviewFormBehaviorConfig();
    const committedChangeResult = behaviorConfig.onCommittedFormChange?.(event);
    super._onChangeForm(formConfig, event);

    const shouldRerender =
      committedChangeResult === false
        ? false
        : (behaviorConfig.shouldRerenderOnCommittedChange?.(event) ?? true);
    if (shouldRerender) {
      this.render();
    }
  }
}
