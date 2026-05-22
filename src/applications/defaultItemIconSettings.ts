import { systemId } from "../system/config";
import { defaultItemIconsObject } from "../system/settings/defaultItemIcons";
import type { ItemTypeEnum, RqgItemType } from "@item-model/itemTypes.ts";
import { templatePaths } from "../system/loadHandlebarsTemplates";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

// Map each ItemTypeEnum value to a string (icon path)
export type IconSettingsData = {
  [K in ItemTypeEnum | "reputation"]: string;
};

export class DefaultItemIconSettings extends HandlebarsApplicationMixin(
  ApplicationV2<IconSettingsData>,
) {
  static override DEFAULT_OPTIONS = {
    id: "default-icons-settings-dialog",
    tag: "form",
    window: {
      title: "RQG.Settings.DefaultItemIcons.dialogTitle",
      contentClasses: ["default-icons"],
    },
    position: {
      width: 500,
    },
    form: {
      handler: DefaultItemIconSettings.onSubmit,
      closeOnSubmit: false,
      submitOnChange: true,
    },
  };

  static override PARTS = {
    body: {
      template: templatePaths.defaultItemIconSettings,
      root: true,
    },
  };

  override async _prepareContext(): Promise<IconSettingsData> {
    const currentSettings: any = game.settings?.get(systemId, "defaultItemIconSettings");
    return Object.entries(defaultItemIconsObject).reduce((acc: any, [key, value]) => {
      acc[key] = currentSettings[key] ?? value;
      return acc;
    }, {});
  }

  static async onSubmit(
    this: DefaultItemIconSettings,
    _event: Event,
    _form: HTMLFormElement,
    formData: FormDataExtended,
  ): Promise<void> {
    const data = formData.object as Record<RqgItemType | "reputation", string>;
    await game.settings?.set(systemId, "defaultItemIconSettings", data);
    this.render();
  }
}
