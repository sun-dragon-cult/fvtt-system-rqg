import { ItemTypeEnum } from "@item-model/item-types.ts";
import {
  SpellEffectTierEnum,
  SpellResistedByEnum,
  SpellTargetKindEnum,
} from "../../../data-model/item-data/spell";
import { Rqid } from "../../api/rqid-api";
import { isValidRqidString } from "../../api/rqid-validation";
import { escapeRegex } from "../../util";
import type { RqgItem } from "@items/rqg-item.ts";
import {
  defaultItemIconsObject,
  getDefaultItemIconSettings,
} from "../../settings/default-item-icons";

type SpellSurveyFields = {
  effectRqidLink?: { rqid?: string; name?: string } | null;
  targetKind?: string;
  effectTier?: string;
  resistedBy?: string;
  passesSpellBarriers?: boolean;
};

// One lookup per rqid and language, however many actors know the spell.
const compendiumSpells = new Map<string, Promise<RqgItem | undefined>>();

function compendiumSpell(rqid: string, lang: string): Promise<RqgItem | undefined> {
  const key = `${lang}|${rqid}`;
  let spell = compendiumSpells.get(key);
  if (!spell) {
    const exactRqid = new RegExp(`^${escapeRegex(rqid)}$`);
    spell = Rqid.fromRqidRegex(exactRqid, "i", lang, { source: "packs", mode: "best" }).then(
      (docs) => docs[0] as RqgItem | undefined,
    );
    compendiumSpells.set(key, spell);
  }
  return spell;
}

/** The icon a spell has when nobody chose one: the system's default, or the world's own default. */
function isDefaultSpellIcon(
  img: string | null | undefined,
  type: "spiritMagic" | "runeMagic",
): boolean {
  return !img || img === defaultItemIconsObject[type] || img === getDefaultItemIconSettings()[type];
}

/**
 * Fill a spell's effect link, survey fields, resistedBy, passesSpellBarriers and icon from its
 * compendium spell, matched by rqid (#1086).
 * Only fills what is unset - an empty link, "none", false, or a default icon - so a GM's own choice
 * is never overwritten.
 */
export async function resyncSpellFieldsFromCompendium(itemData: RqgItem): Promise<Item.UpdateData> {
  if (itemData.type !== ItemTypeEnum.SpiritMagic && itemData.type !== ItemTypeEnum.RuneMagic) {
    return {};
  }
  const spellType = itemData.type as "spiritMagic" | "runeMagic";
  const rqidFlags = itemData.flags?.rqg?.documentRqidFlags;
  const system = itemData.system as SpellSurveyFields;
  const needsLink = !isValidRqidString(system.effectRqidLink?.rqid);
  const needsTargetKind = system.targetKind === SpellTargetKindEnum.None;
  const needsEffectTier = system.effectTier === SpellEffectTierEnum.None;
  const needsResistedBy = system.resistedBy === SpellResistedByEnum.None;
  const needsPassesSpellBarriers = !system.passesSpellBarriers;
  const needsImg = isDefaultSpellIcon(itemData.img, spellType);
  if (
    !rqidFlags?.id ||
    !(
      needsLink ||
      needsTargetKind ||
      needsEffectTier ||
      needsResistedBy ||
      needsPassesSpellBarriers ||
      needsImg
    )
  ) {
    return {};
  }

  // The link and survey fields don't depend on language, so a pack in the spell's own language
  // that predates them falls back field by field to the fallback language's pack.
  const langs = [
    ...new Set([rqidFlags.lang ?? CONFIG.RQG.fallbackLanguage, CONFIG.RQG.fallbackLanguage]),
  ];
  const sourceItems = (
    await Promise.all(langs.map((lang) => compendiumSpell(rqidFlags.id!, lang)))
  ).filter((source): source is RqgItem => !!source && source.uuid !== itemData.uuid);
  const sources = sourceItems.map((source) => source.system as SpellSurveyFields);
  const firstSet = (pick: (from: SpellSurveyFields) => string | undefined, unset: string) =>
    sources.map(pick).find((value) => !!value && value !== unset);

  const patch: Record<string, unknown> = {};
  if (needsLink) {
    const link = sources.map((from) => from.effectRqidLink).find((l) => isValidRqidString(l?.rqid));
    if (link) {
      patch["effectRqidLink"] = { rqid: link.rqid, name: link.name ?? "" };
    }
  }
  const targetKind =
    needsTargetKind && firstSet((from) => from.targetKind, SpellTargetKindEnum.None);
  if (targetKind) {
    patch["targetKind"] = targetKind;
  }
  const effectTier =
    needsEffectTier && firstSet((from) => from.effectTier, SpellEffectTierEnum.None);
  if (effectTier) {
    patch["effectTier"] = effectTier;
  }
  const resistedBy =
    needsResistedBy && firstSet((from) => from.resistedBy, SpellResistedByEnum.None);
  if (resistedBy) {
    patch["resistedBy"] = resistedBy;
  }
  if (needsPassesSpellBarriers && sources.some((from) => from.passesSpellBarriers === true)) {
    patch["passesSpellBarriers"] = true;
  }
  const img =
    needsImg &&
    sourceItems.map((source) => source.img).find((i) => !isDefaultSpellIcon(i, spellType));
  const update: Item.UpdateData = Object.keys(patch).length ? { system: patch } : {};
  return img ? { ...update, img: img } : update;
}
