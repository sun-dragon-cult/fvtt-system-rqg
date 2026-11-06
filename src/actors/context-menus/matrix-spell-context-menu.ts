import type { RqgContextMenuEntry } from "../../foundry-ui/rqg-context-menu";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { PhysicalItem } from "@item-model/item-types.ts";
import { Rqid } from "../../system/api/rqid-api";
import { isValidRqidString } from "../../system/api/rqid-validation";
import { resolveMatrixSpellItem } from "../../system/spell-matrix";
import { getRequiredDomDataset, resolveCastItem } from "../../system/util";
import { contextMenuRunes } from "./context-menu-runes";

/** The matrix item on the actor and the index of the spell in it, from the row's dataset. */
function resolveMatrixEntry(el: HTMLElement, actor: RqgActor) {
  const matrixItem = resolveCastItem(el, actor) as PhysicalItem | undefined;
  const entryIndex = Number(getRequiredDomDataset(el, "matrix-spell-index"));
  return { matrixItem, entryIndex };
}

/** Context menu for a spell stored in a Spell Matrix. The row's item id is the matrix item's. */
export const matrixSpellMenuOptions = (
  actor: RqgActor,
  token: TokenDocument | null,
): RqgContextMenuEntry[] => [
  {
    label: "RQG.Game.RollChat",
    icon: contextMenuRunes.RollViaChat,
    visible: () => true,
    onClick: async (_event: Event, el: HTMLElement) => {
      const { matrixItem, entryIndex } = resolveMatrixEntry(el, actor);
      const spell = matrixItem ? await resolveMatrixSpellItem(matrixItem, entryIndex) : undefined;
      if (spell) {
        await actor.castSpell(spell, { token });
      }
    },
  },
  {
    label: "RQG.ContextMenu.ViewDescription",
    icon: contextMenuRunes.ViewDescription,
    visible: (el: HTMLElement) => {
      const { matrixItem, entryIndex } = resolveMatrixEntry(el, actor);
      return isValidRqidString(matrixItem?.system.matrixSpells?.[entryIndex]?.spellRqidLink?.rqid);
    },
    onClick: async (_event: Event, el: HTMLElement) => {
      const { matrixItem, entryIndex } = resolveMatrixEntry(el, actor);
      const spell = matrixItem ? await resolveMatrixSpellItem(matrixItem, entryIndex) : undefined;
      const rqid = spell?.system.descriptionRqidLink?.rqid;
      if (isValidRqidString(rqid)) {
        await Rqid.renderRqidDocument(rqid);
      }
    },
  },
  {
    label: "RQG.ContextMenu.EditMatrixItem",
    icon: contextMenuRunes.Edit,
    visible: () => true,
    onClick: (_event: Event, el: HTMLElement) => {
      resolveMatrixEntry(el, actor).matrixItem?.sheet?.render(true);
    },
  },
];
