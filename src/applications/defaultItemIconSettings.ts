import { systemId } from "../system/config";
import { defaultItemIconsObject } from "../system/settings/defaultItemIcons";
import type { ItemTypeEnum, RqgItemType } from "@item-model/itemTypes.ts";
import { templatePaths } from "../system/loadHandlebarsTemplates";
import {
  getEventTargetElement,
  isFoundryElementInstanceOf,
  localizeItemType,
} from "../system/util";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

// Map each ItemTypeEnum value to a string (icon path)
export type IconSettingsData = {
  [K in ItemTypeEnum | "reputation"]: string;
};

type DefaultItemIconSettingsContext = {
  iconRows: {
    key: RqgItemType | "reputation";
    value: string;
  }[];
};

export class DefaultItemIconSettings extends HandlebarsApplicationMixin(
  ApplicationV2<DefaultItemIconSettingsContext>,
) {
  static override DEFAULT_OPTIONS = {
    id: "default-icons-settings-dialog",
    tag: "form",
    window: {
      title: "RQG.Settings.DefaultItemIcons.settingName",
      icon: "fa-solid fa-image",
      contentClasses: ["standard-form", "default-icons"],
      resizable: true,
    },
    position: {
      width: 500,
      height: 680,
    },
    form: {
      handler: DefaultItemIconSettings.onSubmit,
      closeOnSubmit: true,
    },
    actions: {
      resetDefaults: DefaultItemIconSettings.onResetDefaults,
    },
  };

  static override PARTS = {
    body: {
      template: templatePaths.defaultItemIconSettings,
      scrollable: [""],
    },
    footer: {
      template: templatePaths.defaultItemIconSettingsFooter,
    },
  };

  override async _prepareContext(): Promise<DefaultItemIconSettingsContext> {
    const currentSettings: any = game.settings?.get(systemId, "defaultItemIconSettings");
    const iconRows = Object.entries(defaultItemIconsObject)
      .map(([key, value]) => ({
        key: key as RqgItemType | "reputation",
        value: currentSettings[key] ?? value,
      }))
      .sort((a, b) => localizeItemType(a.key).localeCompare(localizeItemType(b.key)));

    return {
      iconRows: iconRows,
    };
  }

  protected override _onChangeForm(formConfig: any, event: Event): void {
    this.updatePreviewFromEvent(event);
    super._onChangeForm(formConfig, event);
  }

  private updatePreviewFromEvent(event: Event): void {
    const target = getEventTargetElement(event);
    if (!isFoundryElementInstanceOf(target, HTMLElement)) {
      return;
    }

    const filePicker = target.closest("file-picker");
    if (!filePicker) {
      return;
    }

    const input = isFoundryElementInstanceOf(target, HTMLInputElement)
      ? target
      : filePicker.querySelector<HTMLInputElement>("input");
    const selectedPath =
      (filePicker as HTMLInputElement & { value?: string }).value ?? input?.value;
    if (!selectedPath) {
      return;
    }

    const preview = filePicker.closest(".form-group")?.querySelector<HTMLImageElement>("img");
    if (preview) {
      preview.src = selectedPath;
    }
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

  private static async onResetDefaults(
    this: DefaultItemIconSettings,
    _event: PointerEvent,
    _target: HTMLElement,
  ): Promise<void> {
    await game.settings?.set(
      systemId,
      "defaultItemIconSettings",
      foundry.utils.deepClone(defaultItemIconsObject),
    );
    this.render();
  }
}
