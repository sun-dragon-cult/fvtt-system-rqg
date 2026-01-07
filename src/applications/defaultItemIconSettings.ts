import { localize } from "../system/util";
import { systemId } from "../system/config";
import { defaultItemIconsObject } from "../system/settings/defaultItemIcons";
import type { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { templatePaths } from "../system/loadHandlebarsTemplates";

// Map each ItemTypeEnum value to a string (icon path)
export type IconSettingsData = {
  [K in ItemTypeEnum | "reputation"]: string;
} & {
  [key: string]: string | undefined; // Index signature for Foundry v13
};

export class DefaultItemIconSettings extends foundry.appv1.api.FormApplication<
  IconSettingsData,
  IconSettingsData & FormApplication.Options
> {
  // constructor(object: any, options?: Partial<FormApplication.Options>) {
  //   super(object, options);
  // }

  static override get defaultOptions(): FormApplication.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "default-icons-settings-dialog",
      title: localize("RQG.Settings.DefaultItemIcons.dialogTitle"),
      template: templatePaths.defaultItemIconSettings,
      classes: ["form", "default-icons"],
      width: 500,
      closeOnSubmit: false,
      submitOnChange: true,
    });
  }

  protected override _onSelectFile(selection: string, filePicker: FilePicker): void {
    super._onSelectFile(selection, filePicker);
    this.submit();
  }

  override getData(): IconSettingsData {
    const currentSettings: any = game.settings?.get(systemId, "defaultItemIconSettings");
    const settings = Object.entries(defaultItemIconsObject).reduce((acc: any, [key, value]) => {
      acc[key] = currentSettings[key] ?? value;
      return acc;
    }, {});
    return settings;
  }

  override async _updateObject(event: Event, formData?: IconSettingsData): Promise<void> {
    if (formData != null) {
      // const data = foundry.utils.expandObject(formData); // TODO is this needed?
      await game.settings?.set(systemId, "defaultItemIconSettings", formData);
      this.render();
    }
  }
}
