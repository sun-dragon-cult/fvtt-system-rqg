import { CharacteristicCard } from "../../chat/characteristicCard";
import { RqgActor } from "../rqgActor";
import { Characteristic, Characteristics } from "../../data-model/actor-data/characteristics";
import { activateChatTab, getDomDataset, getGame, getGameUser, localize, localizeCharacteristic, requireValue, RqgError } from "../../system/util";
import { ActorDataConstructorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData";
import { showImproveCharacteristicDialog } from "../../dialog/improveCharacteristicDialog";
import { ContextMenuRunes } from "./contextMenuRunes";

export const characteristicMenuOptions = (
  actor: RqgActor,
  token: TokenDocument | null
): ContextMenu.Item[] => [
  {
    name: localize("RQG.ContextMenu.RollCard"),
    icon: ContextMenuRunes.RollCard,
    condition: () => true,
    callback: async (el: JQuery) => {
      const { name: characteristicName, value: characteristic } = getCharacteristic(actor, el);
      await CharacteristicCard.show(
        {
          name: characteristicName,
          data: characteristic,
        },
        actor,
        token
      );
    },
  },
  {
    name: localize("RQG.ContextMenu.RollCharacteristicDirect"),
    icon: ContextMenuRunes.RollDirect,
    condition: () => true,
    callback: async (el: JQuery): Promise<void> => {
      const { name: characteristicName, value: characteristic } = getCharacteristic(actor, el);
      const speakerName = token?.name ?? actor.data.token.name ?? "";
      await CharacteristicCard.roll(
        characteristicName,
        characteristic.value,
        5,
        0,
        actor,
        speakerName
      );
    },
  },
  {
    name: localize("RQG.ContextMenu.ToggleExperience"),
    icon: ContextMenuRunes.ToggleExperience,
    condition: (el: JQuery) => {
      const { name: characteristicName } = getCharacteristic(actor, el);
      return characteristicName === "power";
    },
    callback: async (): Promise<RqgActor | undefined> =>
      await actor.update({
        "data.characteristics.power.hasExperience":
          !actor.data.data.characteristics.power.hasExperience,
      }),
  },
  {
    name: localize("RQG.ContextMenu.ImproveItem", {itemType: localize("RQG.Actor.Characteristics.Characteristic")}),
    icon: ContextMenuRunes.Improve,
    condition: (el: JQuery): boolean => {
      const { name: characteristicName, value: characteristic } = getCharacteristic(actor, el);
      // You can train STR, CON, DEX, POW, and CHA, and you can increase POW via experience
      // You cannot train INT or increase it via experience

      const trainable = ["strength", "constitution", "dexterity", "power", "charisma"];
      return !!trainable.includes(characteristicName);
    },
    callback: (el: JQuery) => {
      const charName = getDomDataset(el, "characteristic");
      requireValue(charName, localize("RQG.ContextMenu.Notification.DatasetNotFound"));

      const characteristic = (actor.data.data.characteristics as any)[charName];
      characteristic.name = charName;
      const speakerName = token?.name ?? actor.data.token.name ?? "";
      showImproveCharacteristicDialog(actor, "characteristic", characteristic, speakerName);
    },
  },
  {
    name: localize("RQG.ContextMenu.InitializeCharacteristic"),
    icon: ContextMenuRunes.InitializeCharacteristics,
    condition: (): boolean => !!getGame().user?.isGM,
    callback: async (el: JQuery) => {
      const characteristic = getDomDataset(el, "characteristic");
      requireValue(characteristic, localize("RQG.ContextMenu.Notification.DatasetNotFound"));
      const confirmed = await confirmInitializeDialog(actor.name ?? "", characteristic);
      if (confirmed) {
        const updateData = await getCharacteristicUpdate(
          characteristic,
          (actor.data.data.characteristics as any)[characteristic].formula,
          actor.name ?? getGameUser().name ?? ""
        );
        await actor.update(updateData);
        await initializeCurrentDerivedAttributes(actor);
      }
    },
  },
  {
    name: localize("RQG.ContextMenu.InitializeAllCharacteristics"),
    icon: ContextMenuRunes.InitializeAllCharacteristics,
    condition: (): boolean => !!getGame().user?.isGM,
    callback: async () => {
      const confirmed = await confirmInitializeDialog(actor.name ?? "");
      if (confirmed) {
        await initializeAllCharacteristics(actor);
      }
    },
  },
];

async function getCharacteristicUpdate(
  characteristic: string,
  formula: string,
  speakerName?: string
): Promise<DeepPartial<ActorDataConstructorData>> {
  if (!formula) {
    return {
      data: { characteristics: { [characteristic]: { value: "" } } },
    };
  }

  const r = new Roll(formula, {});
  await r.evaluate({ async: true });
  if (speakerName) {
    await r.toMessage({
      speaker: { alias: speakerName },
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      flavor: localize("RQG.ContextMenu.InitializeResultCard", {char: localizeCharacteristic(characteristic)}),
    });
    activateChatTab();
  }
  return {
    data: { characteristics: { [characteristic]: { value: Number(r.total) } } },
  };
}

export async function initializeAllCharacteristics(
  actor: RqgActor,
  silent: boolean = false
): Promise<void> {
  let updateData = {};

  for (const characteristic of Object.keys(actor.data.data.characteristics)) {
    const update = await getCharacteristicUpdate(
      characteristic,
      (actor.data.data.characteristics as any)[characteristic].formula,
      silent ? undefined : actor.name ?? getGameUser().name ?? ""
    );
    mergeObject(updateData, update);
  }
  await actor.update(updateData);
  await initializeCurrentDerivedAttributes(actor);
}

/** Sets actor's current hitPoints.value to the hitPoints.max */
async function initializeCurrentDerivedAttributes(actor: RqgActor) {
  const hpUpdate = {
    "data.attributes.hitPoints.value": actor.data.data.attributes.hitPoints.max,
    "data.attributes.magicPoints.value": actor.data.data.attributes.magicPoints.max,
  };
  await actor.update(hpUpdate);
}

function getCharacteristic(actor: RqgActor, el: JQuery): { name: string; value: Characteristic } {
  const characteristicName = getDomDataset(el, "characteristic");
  const actorCharacteristics: Characteristics = actor.data.data.characteristics;
  if (characteristicName && characteristicName in actorCharacteristics) {
    return {
      name: characteristicName,
      value: actorCharacteristics[characteristicName as keyof typeof actorCharacteristics],
    };
  } else {
    throw new RqgError(
      localize("RQG.Contextmenu.Notification.CharacteristicNotFound", {characteristicName: characteristicName, actorName: actor.name})
    );
  }
}

async function confirmInitializeDialog(
  actorName: string,
  characteristic: string = ""
): Promise<boolean> {
  return await new Promise(async (resolve) => {
    const title = !!characteristic
      ? localize("RQG.ContextMenu.OverwriteCharacteristicDialogTitle", {characteristicName: localizeCharacteristic(characteristic), actorName:  actorName})
      : localize("RQG.ContextMenu.OverwriteAllCharacteristicsDialogTitle", {actorName:  actorName});
    const content = !!characteristic
      ? localize("RQG.ContextMenu.OverwriteCharacteristicDialog", {characteristicName: localizeCharacteristic(characteristic)})
      : localize("RQG.ContextMenu.OverwriteAllCharacteristicsDialog");
    const dialog = new Dialog({
      title: title,
      content: content,
      default: "submit",
      buttons: {
        submit: {
          icon: '<i class="fas fa-check"></i>',
          label: localize("RQG.Dialog.Common.btnConfirm"),

          callback: () => {
            resolve(true);
          },
        },
        cancel: {
          label: localize("RQG.Dialog.Common.btnCancel"),
          icon: '<i class="fas fa-times"></i>',
          callback: () => {
            resolve(false);
          },
        },
      },
    });
    await dialog.render(true);
  });
}
