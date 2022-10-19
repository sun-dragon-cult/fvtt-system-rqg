import { assertItemType, getGame, getHTMLElement, localize, RqgError } from "../system/util";
import { systemId } from "../system/config";
import { Rqid } from "../system/api/rqidApi";
import { RqgAsyncDialog } from "./rqgAsyncDialog";
import { RqgItem } from "../items/rqgItem";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { concatenateSkillName } from "../items/skill-item/concatenateSkillName";

export async function requestSkillSpecializationDialog(
  skillItem: RqgItem
): Promise<string | undefined> {
  assertItemType(skillItem?.type, ItemTypeEnum.Skill);
  if (skillItem.system?.specialization !== "...") {
    return; // Not a skill with undefined specialization
  }

  const worldLanguage = getGame().settings.get(systemId, "worldLanguage");
  const descriptionJournal = await Rqid.fromRqid(
    skillItem.system.descriptionRqidLink.rqid,
    worldLanguage,
    true
  );
  // @ts-ignore link - fel typ på descriptionJournal?
  const link = descriptionJournal ? TextEditor.enrichHTML(descriptionJournal.link) : "";
  const contentHtml = await renderTemplate(
    "systems/rqg/applications/requestSkillSpecialization.hbs",
    {
      skillName: skillItem.system.skillName,
      skillDescriptionLink: link,
    }
  );

  const requestSpecializationDialog = new RqgAsyncDialog<string>(
    localize("RQG.Dialog.requestSkillSpecialization.title"),
    contentHtml
  );
  const buttons = {
    submit: {
      icon: '<i class="fas fa-check"></i>',
      label: localize("RQG.Dialog.requestSkillSpecialization.btnSetSpecialization"),
      callback: (html: JQuery | HTMLElement) => {
        const el = getHTMLElement(html);
        if (!el) {
          // Should never happen...
          throw new RqgError("Unexpected html from Dialog callback");
        }
        const requestedSpecialization = [...el.getElementsByTagName("input")][0]?.value;
        if (!requestedSpecialization) {
          // Don't close the Dialog. This works, but also logs an error
          throw new Error(localize("RQG.Dialog.requestSkillSpecialization.inputRequired"));
        }

        const proposedSkillName = concatenateSkillName(
          (skillItem.system as any).skillName, // TODO typing
          requestedSpecialization
        );
        const notUnique = skillItem.parent?.items.contents.some(
          (i: any) => i.name === proposedSkillName
        );
        if (notUnique) {
          throw new Error(
            localize("RQG.Item.Notification.ItemNotUnique", {
              actorName: skillItem.parent?.name,
              documentType: skillItem.type,
              documentName: proposedSkillName,
            })
          );
        }
        requestSpecializationDialog.resolve(requestedSpecialization);
      },
    },
    cancel: {
      icon: '<i class="fas fa-times"></i>',
      label: localize("RQG.Dialog.Common.btnCancel"),
      callback: () => requestSpecializationDialog.reject(""),
    },
  };

  const answer = await requestSpecializationDialog.setButtons(buttons, "submit").show();
  return typeof answer === "string" ? answer : undefined; // It returns the RqgItem if rejected!
}
