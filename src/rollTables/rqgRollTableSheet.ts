import { addRqidLinkToSheet } from "../documents/rqidSheetButton";

// @ts-expect-error applications
export class RqgRollTableSheet extends foundry.applications.sheets.RollTableSheet {
  async _renderFrame(options: any) {
    const frame = await super._renderFrame(options);
    // @ts-expect-error _renderFrame _renderFrame hasFrame
    if (!this.hasFrame) {
      return frame;
    }

    await addRqidLinkToSheet(this as any);

    return frame;
  }
}
