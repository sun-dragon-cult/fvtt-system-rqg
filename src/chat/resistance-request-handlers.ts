import { getRequiredDomDataset } from "../system/util";

/** Open the dialog to respond to a resistance-request chat card. */
export async function handleRollResistanceRequest(clickedButton: HTMLButtonElement): Promise<void> {
  const chatMessageId = getRequiredDomDataset(clickedButton, "message-id");
  const { RespondToResistanceRequestDialogV2 } =
    await import("../applications/resistance-roll-dialog/respond-to-resistance-request-dialog-v2");
  await new RespondToResistanceRequestDialogV2(chatMessageId).render({ force: true });
}
