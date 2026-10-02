import type { WeaponItem } from "@item-model/weapon-data-model.ts";
import { systemId } from "../../system/config";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { splitFromProjectileIdFlag } from "../../data-model/shared/rqg-document-flags";

// Speedart, Multimissile, Firearrow and the like are cast on one missile and used up when it is
// fired (RBM p.114, p.117, p.119), so the enchanted missile is split off its stack.

/** The projectile a launcher (e.g. a bow) fires. Thrown weapons are their own projectile. */
export function getLoadedProjectile(launcher: WeaponItem): WeaponItem | undefined {
  if (!launcher.system.isProjectileWeapon) {
    return undefined;
  }
  return launcher.parent?.items.get(launcher.system.projectileId) as WeaponItem | undefined;
}

function spellEffects(item: WeaponItem): ActiveEffect[] {
  return item.effects.contents.filter((effect: any) => !!effect.system?.spell);
}

/** The names of the spells active on a projectile, e.g. "Speedart". */
export function projectileSpellNames(item: WeaponItem): string {
  return spellEffects(item)
    .filter((effect) => effect.active)
    .map((effect) => effect.name)
    .join(", ");
}

/** The projectile's name and count, plus the spells on it, so enchanted ones can be told apart. */
export function projectileLabel(item: WeaponItem): string {
  const spells = projectileSpellNames(item);
  const label = `${item.name ?? ""} (${item.system.quantity})`;
  return spells ? `${label} – ${spells}` : label;
}

/**
 * The item a spell cast on one missile should attach to: the projectile itself when it is a single
 * one, else a new one-missile item split off the stack, which the stack's launchers then load.
 */
export async function splitOffProjectile(item: WeaponItem): Promise<WeaponItem> {
  const actor = item.parent;
  if (!item.system.isProjectile || item.system.quantity <= 1 || !actor) {
    return item;
  }
  const data = item.toObject() as any;
  delete data._id;
  data.system.quantity = 1;
  data.effects = (data.effects ?? []).filter((effect: any) => !effect.system?.spell);
  foundry.utils.setProperty(data, `flags.${systemId}.${splitFromProjectileIdFlag}`, item.id);

  await item.update({ system: { quantity: item.system.quantity - 1 } });
  const [created] = (await actor.createEmbeddedDocuments("Item", [data])) ?? [];
  if (!created) {
    return item;
  }
  await reloadLaunchers(actor, item.id ?? "", created.id ?? "");
  return created as WeaponItem;
}

/** Load the launchers that had one projectile loaded with another instead. */
async function reloadLaunchers(actor: Actor, fromId: string, toId: string): Promise<void> {
  const reloads = actor.items.contents
    .filter((item: any) => item.type === ItemTypeEnum.Weapon && item.system.projectileId === fromId)
    .map((launcher) => ({ _id: launcher.id, system: { projectileId: toId } }));
  if (reloads.length) {
    await actor.updateEmbeddedDocuments("Item", reloads);
  }
}

/**
 * The spells on a fired projectile are spent. A missile split off a stack goes back to it (or is
 * gone, if it was used up) and its launcher is loaded from the stack again.
 */
export async function spendProjectileSpells(projectile: WeaponItem): Promise<void> {
  const spent = spellEffects(projectile).map((effect) => effect.id ?? "");
  if (spent.length) {
    await projectile.deleteEmbeddedDocuments("ActiveEffect", spent);
  }
  await returnToStack(projectile);
}

async function returnToStack(projectile: WeaponItem): Promise<void> {
  const actor = projectile.parent;
  const stack = actor?.items.get(projectile.getFlag(systemId, splitFromProjectileIdFlag) ?? "") as
    WeaponItem | undefined;
  if (!actor || !stack) {
    return;
  }
  if (projectile.system.quantity > 0) {
    await stack.update({
      system: { quantity: stack.system.quantity + projectile.system.quantity },
    });
  }
  await reloadLaunchers(actor, projectile.id ?? "", stack.id ?? "");
  await actor.deleteEmbeddedDocuments("Item", [projectile.id ?? ""]);
}

/**
 * A split-off missile whose spells have all run out goes back to its stack. Foundry marks an
 * expired effect on the active GM's client, so this runs there only.
 */
export function initSpelledProjectiles(): void {
  Hooks.on("updateActiveEffect", (effect: ActiveEffect, changed: any, _options, userId: string) => {
    if (userId !== game.user?.id || changed.duration?.expired !== true) {
      return;
    }
    const item = effect.parent as WeaponItem | null;
    if (
      !(item instanceof Item) ||
      !item.getFlag(systemId, splitFromProjectileIdFlag) ||
      !(effect.system as { spell?: unknown })?.spell ||
      spellEffects(item).some((spell) => spell.active)
    ) {
      return;
    }
    void spendProjectileSpells(item);
  });
}
