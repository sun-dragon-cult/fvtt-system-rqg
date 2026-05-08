import { decorateRqidFrameButton, getRqidFrameButton } from "../documents/rqidSheetButton";

export class RqgRollTableSheet extends foundry.applications.sheets.RollTableSheet {
  // @ts-expect-error TEMP(v14-types) _getFrameButtons exists at runtime in Foundry >=14.361
  override _getFrameButtons(options: any): any[] {
    // @ts-expect-error TEMP(v14-types) super._getFrameButtons is missing from current type defs
    const buttons = super._getFrameButtons(options);
    buttons.unshift(getRqidFrameButton(this as unknown as DocumentSheet<any, any>));
    return buttons;
  }

  override async _onRender(context: any, options: any): Promise<void> {
    await super._onRender(context, options);
    await decorateRqidFrameButton(this as unknown as DocumentSheet<any, any>);
  }
}
