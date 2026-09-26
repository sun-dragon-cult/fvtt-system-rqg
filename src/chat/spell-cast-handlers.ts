import { getRequiredDomDataset, localize } from "../system/util";
import { templatePaths } from "../system/load-handlebars-templates";
import type { SpellCastOutcome } from "../data-model/shared/spell-cast-outcome";
import type { SpellTargetOutcomeState } from "../data-model/shared/spell-cast-outcome.defs";

const rulings: { state: SpellTargetOutcomeState; icon: string }[] = [
  { state: "affected", icon: "fa-solid fa-check" },
  { state: "unaffected", icon: "fa-solid fa-xmark" },
  { state: "dismissed", icon: "fa-solid fa-ban" },
];

/** The per-target rows of a spellCast card, rendered live so a linked request's answer shows. */
export async function renderSpellCastTargets(outcome: SpellCastOutcome): Promise<string> {
  return foundry.applications.handlebars.renderTemplate(templatePaths.spellCastTargets, {
    isGM: !!game.user?.isGM,
    rulings: rulings.map((r) => ({
      ...r,
      label: localize(`RQG.ChatMessage.SpellCast.Ruling.${r.state}`),
    })),
    targets: outcome.targets.map((target) => ({
      uuid: target.targetTokenOrActorUuid,
      name:
        (fromUuidSync(target.targetTokenOrActorUuid) as { name?: string } | null)?.name ??
        localize("RQG.ChatMessage.SpellCast.UnknownTarget"),
      state: target.state,
      stateLabel: localize(`RQG.ChatMessage.SpellCast.State.${target.state}`),
      resolvedByLabel: target.resolvedBy
        ? localize(`RQG.ChatMessage.SpellCast.ResolvedBy.${target.resolvedBy}`)
        : "",
    })),
  });
}

/** GM override of whether a cast took effect on one target, for any resistedBy mode. */
export async function handleSpellCastRuling(clickedButton: HTMLButtonElement): Promise<void> {
  if (!game.user?.isGM) {
    return;
  }
  const state = getRequiredDomDataset(clickedButton, "spell-cast-ruling");
  const targetUuid = getRequiredDomDataset(clickedButton, "target-uuid");
  const message = game.messages?.get(getRequiredDomDataset(clickedButton, "message-id"));
  if (message?.type !== "spellCast" || !rulings.some((r) => r.state === state)) {
    return;
  }

  const targets = (message.toObject().system as any).targets.map((target: any) =>
    target.targetTokenOrActorUuid === targetUuid
      ? { ...target, state: state, resolvedBy: "gmRuling", casterSuccessLevel: null }
      : target,
  );
  await message.update({ system: { targets: targets } } as any);
}
