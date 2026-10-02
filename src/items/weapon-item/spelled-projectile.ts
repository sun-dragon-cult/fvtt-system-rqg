import type { WeaponItem } from "@item-model/weapon-data-model.ts";
import { systemId } from "../../system/config";
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
 * one, else a new one-missile item split off the stack.
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
  return (created as WeaponItem | undefined) ?? item;
}

/**
 * The spells on a fired projectile are spent. A missile split off a stack goes back to it (or is
 * gone, if it was used up) and the launcher is loaded from the stack again.
 */
export async function spendProjectileSpells(
  projectile: WeaponItem,
  launcher: WeaponItem,
): Promise<void> {
  const spent = spellEffects(projectile).map((effect) => effect.id ?? "");
  if (spent.length) {
    await projectile.deleteEmbeddedDocuments("ActiveEffect", spent);
  }

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
  await actor.deleteEmbeddedDocuments("Item", [projectile.id ?? ""]);
  if (launcher.system.projectileId !== stack.id) {
    await launcher.update({ system: { projectileId: stack.id } });
  }
}
