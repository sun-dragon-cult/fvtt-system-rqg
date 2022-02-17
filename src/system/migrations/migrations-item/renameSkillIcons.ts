import { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import { ItemUpdate } from "../applyMigrations";

export async function renameSkillIcons(itemData: ItemData): Promise<ItemUpdate> {
  if (itemData.img?.startsWith("systems/rqg/assets/images/skill/")) {
    const currentFileName = itemData.img.split("/").pop();
    const fileName = currentFileName && renamedIcon.get(currentFileName);
    if (fileName) {
      return {
        img: `systems/rqg/assets/images/skills/${fileName}`,
      };
    }
  }
  return {};
}

const renamedIcon = new Map([
  ["3d-meeple.svg", "act.svg"],
  ["abstract-046.svg", "customs.svg"],
  ["backstab.svg", "intrigue.svg"],
  ["battle-gear.svg", "battle.svg"],
  ["bison.svg", "understand-herd-beast.svg"],
  ["campfire.svg", "survival.svg"],
  ["chariot.svg", "drive.svg"],
  ["charm.svg", "charm.svg"],
  ["classical-knowledge.svg", "lore.svg"],
  ["healing.svg", "treat-disease.svg"],
  ["coinflip.svg", "sleight.svg"],
  ["curvy-knife.svg", "peaceful-cut.svg"],
  ["hooded-assassin.svg", "sense-assassin.svg"],
  ["deer-track.svg", "track.svg"],
  ["djembe.svg", "play-instrument.svg"],
  ["domino-mask.svg", "disguise.svg"],
  ["dove.svg", "fly.svg"],
  ["egyptian-walk.svg", "dance.svg"],
  ["first-aid-kit.svg", "first-aid.svg"],
  ["flexible-star.svg", "elder-race-lore.svg"],
  ["flying-flag.svg", "homeland-lore.svg"],
  ["hide.svg", "hide.svg"],
  ["high-kick.svg", "martial-arts.svg"],
  ["horse-head.svg", "ride.svg"],
  ["human-ear.svg", "listen.svg"],
  ["jester-hat.svg", "lore-trickster.svg"],
  ["jump-across.svg", "jump.svg"],
  ["life-buoy.svg", "sense-life.svg"],
  ["lockpicks.svg", "devise.svg"],
  ["magnifying-glass.svg", "search.svg"],
  ["meditation.svg", "meditate.svg"],
  ["psychic-waves.svg", "spirit-travel.svg"],
  ["sight-disabled.svg", "conceal.svg"],
  ["mining.svg", "mineral-lore.svg"],
  ["minions.svg", "manage-household.svg"],
  ["mountain-climbing.svg", "climb.svg"],
  ["remedy.svg", "treat-poison.svg"],
  ["mute.svg", "move-quietly.svg"],
  ["night-sky.svg", "celestial-lore.svg"],
  ["rolling-dices.svg", "game.svg"],
  ["nose-side.svg", "track-by-scent.svg"],
  ["paint-brush.svg", "art.svg"],
  ["paw.svg", "animal-lore.svg"],
  ["pentacle.svg", "alchemy.svg"],
  ["person.svg", "lore-race.svg"],
  ["prayer.svg", "worship.svg"],
  ["public-speaker.svg", "orate.svg"],
  ["radar-sweep.svg", "darksense-scan.svg"],
  ["resonance.svg", "darksense-search.svg"],
  ["sailboat.svg", "boat.svg"],
  ["sarcophagus.svg", "prepare-corpse.svg"],
  ["scroll-quill.svg", "read-write.svg"],
  ["shaking-hands.svg", "bargain.svg"],
  ["shepherds-crook.svg", "herd.svg"],
  ["shiny-purse.svg", "evaluate.svg"],
  ["sing.svg", "sing.svg"],
  ["spark-spirit.svg", "spirit-lore.svg"],
  ["spectre.svg", "spirit-combat.svg"],
  ["surrounded-eye.svg", "scan.svg"],
  ["sword-smithing.svg", "craft.svg"],
  ["talk.svg", "speak.svg"],
  ["talk.svg", "fast-talk.svg"],
  ["think.svg", "insight.svg"],
  ["throne-king.svg", "bureaucracy.svg"],
  ["tied-scroll.svg", "library-use.svg"],
  ["totem.svg", "spirit-dance.svg"],
  ["tree-branch.svg", "plant-lore.svg"],
  ["trireme.sv", "shiphandling.svg"],
  ["two-shadows.svg", "dodge.svg"],
  ["water-splash.svg", "swim.svg"],
  ["confrontation.svg", "intimidate.svg"],
  ["wheat.svg", "farm.svg"],
]);