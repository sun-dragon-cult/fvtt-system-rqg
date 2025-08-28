import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import { defaultTokenRulerSettings } from "../../system/settings/defaultTokenRulerSettings";
import type { TokenRulerSettingsContext } from "./tokenRulerSettings.types.ts";

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
      sprintMeters: Math.roundDecimals(
        sprintMultiplier * CONFIG.RQG.metersPerMov * TokenRulerSettings.exampleMov,
        2,
      ),
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

  // add a listener and do DOM manipulation to update the calculated sprint range in meters
  /** @override */
  override async _onRender(): Promise<void> {
    const sprintMultiplier = (this.element as Element).querySelector<HTMLInputElement>(
      '[name="sprintMultiplier"]',
    );
    sprintMultiplier?.addEventListener("input", (e: Event): void => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const html = this.element as HTMLElement;
      const sprintInput = html.querySelector<HTMLInputElement>('input[name="sprintMultiplier"]');

      const sprint = html.querySelector<HTMLSpanElement>("[data-sprint-meters]");
      if (sprint) {
        sprint.innerHTML = Math.roundDecimals(
          (Number(sprintInput?.value) || 0) *
            CONFIG.RQG.metersPerMov *
            TokenRulerSettings.exampleMov,
          2,
        ).toString();
      }
    });
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
