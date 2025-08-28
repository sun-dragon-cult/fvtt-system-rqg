import { addRqidLinkToSheet } from "../documents/rqidSheetButton";

export class RqgRollTableSheet extends foundry.applications.sheets.RollTableSheet {
  override async _renderFrame(options: any) {
    const frame = await super._renderFrame(options);
    if (!this.hasFrame) {
      return frame;
    }

    await addRqidLinkToSheet(this as any);

    return frame;
  }
}
