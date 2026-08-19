/* Migrate old "Matrix" (isMatrix) Spirit Magic spells to real Spell Matrix Enchantment items (#959).
 *
 * Before #959, the only way to represent a spell matrix was checking "Matrix" on a personal Spirit
 * Magic spell - that only ever excluded the spell from the caster's own CHA spell-point limit, with
 * no physical item, no sharing with anyone else, and no data connecting it to this feature.
 *
 * There's no fully automatic migration: nothing in the old data says which physical item (if any)
 * an isMatrix spell was meant to represent, or who besides the caster was ever meant to hold it -
 * that's a GM judgment call. This macro does the mechanical part instead: for each isMatrix spell
 * you pick, it creates a new Gear item on the same actor with the Spell Matrix Enchantment already
 * linked and set to the same points, named after the spell. It never touches or deletes the
 * original spell - move/rename/reassign the new item to wherever it should really live, and remove
 * the old spell's "Matrix" checkbox by hand once you're happy with the result.
 */
async function migrateIsMatrixSpells() {
  const candidates = [];
  for (const actor of game.actors ?? []) {
    for (const item of actor.items) {
      if (item.type === "spiritMagic" && item.system.isMatrix) {
        const rqid = game.system.api.rqid.getDocumentFlag(item)?.id;
        candidates.push({ actor, item, rqid });
      }
    }
  }

  if (!candidates.length) {
    ui.notifications.info(
      "No Spirit Magic spells with the old 'Matrix' checkbox were found - nothing to migrate.",
    );
    return;
  }

  const rows = candidates
    .map((c, i) => {
      const warning = c.rqid
        ? ""
        : ` <span style="color:#a33">— no rqid, can't be resolved live; assign one via the Rqid Editor first, then re-run this macro</span>`;
      return `
      <div style="margin-bottom:4px;">
        <label>
          <input type="checkbox" name="pick" value="${i}" ${c.rqid ? "checked" : "disabled"}>
          <strong>${c.actor.name}</strong> — ${c.item.name}
          (${c.item.system.points} point${c.item.system.points === 1 ? "" : "s"})${warning}
        </label>
      </div>`;
    })
    .join("");

  const content = `
    <p>Found ${candidates.length} Spirit Magic spell${candidates.length === 1 ? "" : "s"} still using
    the old "Matrix" checkbox, superseded by real Spell Matrix Enchantment items.</p>
    <p>For each one checked below, this creates a new Gear item <strong>on the same actor</strong>,
    named "&lt;Spell&gt; Matrix", with the Spell Matrix Enchantment already linked and set to the
    same points. It does <em>not</em> touch or delete the original spell, and does <em>not</em>
    decide which actual physical item - or which character - the matrix should really belong to:
    move, rename, and reassign the new item as needed, then remove the old spell's "Matrix" checkbox
    by hand once you're happy with it.</p>
    <form>${rows}</form>
  `;

  new Dialog({
    title: "Migrate isMatrix Spells to Spell Matrix Items",
    content,
    buttons: {
      migrate: {
        icon: '<i class="fas fa-right-left"></i>',
        label: "Create Matrix Items",
        callback: async (html) => {
          const picked = Array.from(html[0].querySelectorAll('input[name="pick"]:checked')).map(
            (el) => candidates[Number(el.value)],
          );
          let created = 0;
          for (const { actor, item, rqid } of picked) {
            await actor.createEmbeddedDocuments("Item", [
              {
                name: `${item.name} Matrix`,
                type: "gear",
                img: item.img,
                system: {
                  matrixSpell: {
                    spellRqidLink: { rqid, name: item.name },
                    points: item.system.points,
                  },
                },
              },
            ]);
            created++;
          }
          ui.notifications.info(
            `Created ${created} Matrix item${created === 1 ? "" : "s"}. Review, rename, and ` +
              `reassign as needed, then remove the old spell's Matrix checkbox by hand.`,
          );
        },
      },
      cancel: {
        label: "Cancel",
      },
    },
    default: "migrate",
  }).render(true);
}

migrateIsMatrixSpells();
