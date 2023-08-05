import { addRqidLinkToSheetHtml } from "../documents/rqidSheetButton";

export class RqgRollTableConfig extends RollTableConfig {
  protected async _renderOuter(): Promise<JQuery<JQuery.Node>> {
    const html = (await super._renderOuter()) as JQuery<JQuery.Node>;
    await addRqidLinkToSheetHtml(html, this);
    return html;
  }
}
