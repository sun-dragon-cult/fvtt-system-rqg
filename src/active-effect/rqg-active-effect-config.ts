import type { DeepPartial } from "fvtt-types/utils";
import { decorateRqidFrameButton, getRqidFrameButton } from "../documents/rqid-sheet-button";

export class RqgActiveEffectConfig extends foundry.applications.sheets.ActiveEffectConfig {
  override _getFrameButtons(
    options: DeepPartial<foundry.applications.api.ApplicationV2.RenderOptions>,
  ): foundry.applications.api.ApplicationV2.HeaderControlsEntry[] {
    const buttons = super._getFrameButtons(options);
    buttons.unshift(getRqidFrameButton(this as unknown as DocumentSheet<any, any>));
    return buttons;
  }

  override async _onRender(
    context: DeepPartial<foundry.applications.sheets.ActiveEffectConfig.RenderContext>,
    options: DeepPartial<foundry.applications.sheets.ActiveEffectConfig.RenderOptions>,
  ): Promise<void> {
    await super._onRender(context, options);
    await decorateRqidFrameButton(this as unknown as DocumentSheet<any, any>);
  }
}
