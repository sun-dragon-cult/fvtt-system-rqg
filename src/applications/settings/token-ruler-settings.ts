import { systemId } from "../../system/config";
import { templatePaths } from "../../system/load-handlebars-templates";
import { defaultTokenRulerSettings } from "../../system/settings/default-token-ruler-settings";
import { isFoundryElementInstanceOf } from "../../system/util";
import type { TokenRulerSettingsContext } from "./token-ruler-settings.types.ts";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * The application responsible for configuring RqgTokenRuler.
 */
export default class TokenRulerSettings extends HandlebarsApplicationMixin(
  ApplicationV2<TokenRulerSettingsContext>,
) {
  static exampleMov = 8;

  /** @inheritDoc */
  static override DEFAULT_OPTIONS = {
    id: "token-ruler-config",
    tag: "form",
    window: {
      contentClasses: ["standard-form"],
      title: "RQG.Settings.TokenRulerSettings.dialogTitle",
      icon: "fa-solid fa-ruler",
    },
    position: {
      width: 480,
    },
    form: {
      closeOnSubmit: true,
      handler: TokenRulerSettings.onSubmit,
    },
  };

  /** @override */
  static override PARTS = {
    body: {
      template: templatePaths.tokenRulerSettings,
      root: true,
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  };

  /* -------------------------------------------- */

  /* -------------------------------------------- */
  /*  Application                                 */
  /* -------------------------------------------- */

  override async _prepareContext(): Promise<TokenRulerSettingsContext> {
    const config = game.settings?.get(systemId, "tokenRulerSettings") || defaultTokenRulerSettings;
    const sprintMultiplier = config.sprintMultiplier ?? 0;
    return {
      sprintMultiplier: sprintMultiplier,
      sprintMeters: (
        sprintMultiplier *
        CONFIG.RQG.metersPerMov *
        TokenRulerSettings.exampleMov
      ).toNearest(0.01),
      lineWidth: config.lineWidth ?? 30,
      alpha: config.alpha ?? 1,

      rangeColors: {
        attack: config.rangeColors?.attack ?? 0x00ff00,
        walk: config.rangeColors?.walk ?? 0xffff00,
        sprint: config.rangeColors?.sprint ?? 0xff8000,
        unreachable: config.rangeColors?.unreachable ?? 0xff0000,
      },
      buttons: [{ type: "submit", icon: "fa-solid fa-floppy-disk", label: "SETTINGS.Save" }],
    };
  }

  protected override _onChangeForm(formConfig: any, event: Event): void {
    const target = event.target;
    if (
      isFoundryElementInstanceOf(target, HTMLInputElement) &&
      target.name === "sprintMultiplier"
    ) {
      this.updateSprintMeters(Number(target.value) || 0);
    }
    super._onChangeForm(formConfig, event);
  }

  private updateSprintMeters(sprintMultiplier: number): void {
    const sprint = this.element.querySelector<HTMLSpanElement>("[data-sprint-meters]");
    if (!sprint) {
      return;
    }
    sprint.textContent = (
      sprintMultiplier *
      CONFIG.RQG.metersPerMov *
      TokenRulerSettings.exampleMov
    )
      .toNearest(0.01)
      .toString();
  }

  /* -------------------------------------------- */

  /** @override */
  private static async onSubmit(
    _event: SubmitEvent | Event,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ) {
    const config = game.settings?.get(systemId, "tokenRulerSettings") ?? defaultTokenRulerSettings;
    foundry.utils.mergeObject(config, formData.object);
    await game.settings?.set(systemId, "tokenRulerSettings", config);
  }
}
