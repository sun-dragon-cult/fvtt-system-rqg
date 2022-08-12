import { getGameUser } from "../system/util";
import { RqidEditor } from "../dialog/rqidEditor/rqidEditor";

export function addRqidSheetHeaderButton(
  systemHeaderButtons: any[],
  sheet: DocumentSheet<any, any>
): void {
  if (getGameUser().isGM) {
    const numberOfButtons = systemHeaderButtons.length;
    const rqidEditorButton = {
      class: "edit-rqid",
      label: "Rqid",
      icon: "fas fa-fingerprint",
      onclick: () => {
        new RqidEditor(sheet.object, {}).render(true, { focus: true });
      },
    };
    systemHeaderButtons.splice(numberOfButtons - 1, 0, rqidEditorButton);
  }
}
