import { templatePaths } from "../../system/load-handlebars-templates";
import { localize } from "../../system/util";

/**
 * Post `count` more attacks like the one on an attack card, for the magical missiles of
 * Multimissile (RBM p.117). Each is rolled and defended separately; none uses ammunition, and only
 * the original can impale or crush.
 */
export async function postMagicMissiles(attackMessage: ChatMessage, count: number): Promise<void> {
  const source = attackMessage.toObject() as unknown as {
    system: Record<string, unknown>;
    flavor?: string;
    speaker: ChatMessage.SpeakerData;
  };
  const system = { ...foundry.utils.deepClone(source.system), attackIsMagicMissile: true };
  const content = await foundry.applications.handlebars.renderTemplate(
    templatePaths.attackChatMessage,
    system,
  );
  for (let i = 0; i < Math.max(0, Math.trunc(count)); i++) {
    await ChatMessage.create({
      type: "combat",
      system,
      flavor: `${source.flavor ?? ""} (${localize("RQG.Dialog.Attack.MagicMissile")})`,
      content,
      speaker: source.speaker,
    } as any);
  }
}
