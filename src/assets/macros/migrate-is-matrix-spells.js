/* Clean up old "Held in Matrix" (isMatrix) Spirit Magic spells, superseded by Spell Matrix
 * Enchantment items (#959) and by proper allied/bound spirit spell-sharing (#1002).
 *
 * Before those features, "Held in Matrix" was the only way to exclude a personal Spirit Magic spell
 * from the caster's own CHA spell-point limit - no physical item, no data connecting it to a real
 * matrix. GMs overloaded that one checkbox for two unrelated situations:
 *   - a spell actually stored in a physical matrix
 *   - a spell that really belonged to a bound or allied spirit, copied onto the character just to
 *     make it accessible without eating into the character's own points
 * Nothing in the old data says which situation a given spell is, or which physical item / which
 * spirit it should point to now - that's a GM judgment call this macro can't make. It only does the
 * mechanical part, one spell at a time, once you've decided: "Create Gear" (matrix case only) adds a
 * Gear item on the same actor with the Spell Matrix Enchantment linked and set to the spell's points,
 * then opens it for you to rename or edit; "Delete Spirit Magic" removes the now-obsolete
 * original spell once its real new home is sorted - matrix gear, spirit spell-sharing, or otherwise -
 * with a confirmation prompt since it can't be undone. Deleting a spell drops its row for good, so
 * it's safe to close the dialog and re-run the macro later to pick up where you left off.
 *
 * Scope: only scans actors in the world Actors directory (game.actors) - not compendium actors, and
 * not unlinked token actor data on scenes.
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
      "No Spirit Magic spells with the old 'Held in Matrix' checkbox were found - nothing to migrate.",
    );
    return;
  }

  const actorLink = (actor) =>
    `<a class="content-link" draggable="true" aria-label="Actor" data-link data-uuid="Actor.${actor.id}" data-id="${actor.id}" data-type="Actor" data-tooltip=""><i class="fa-solid fa-user" inert></i>${actor.name}</a>`;

  const itemLink = (actor, item) =>
    `<a class="content-link" draggable="true" aria-label="Spirit Magic Item" data-link data-uuid="Actor.${actor.id}.Item.${item.id}" data-id="${item.id}" data-type="Item" data-tooltip=""><i class="fa-solid fa-suitcase" inert></i>${item.name}</a>`;

  const escape = (text) =>
    text.replace(
      /[&<>"']/g,
      (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch],
    );

  const rows = candidates
    .map((c, i) => {
      const warning = c.rqid
        ? ""
        : ` <span style="color:#a33">— no rqid, can't be resolved live; assign one via the Rqid Editor first, then re-run this macro</span>`;
      const focus = c.item.system.spellFocus
        ? ` <span style="font-style:italic;">— focus: ${escape(c.item.system.spellFocus)}</span>`
        : "";
      return `
      <div class="matrix-row" data-index="${i}" style="margin-bottom:8px; padding-bottom:8px; border-bottom:1px solid #8882;">
        <div>
          ${actorLink(c.actor)} — ${itemLink(c.actor, c.item)}
          (${c.item.system.points} point${c.item.system.points === 1 ? "" : "s"})${focus}${warning}
        </div>
        <div style="margin-top:4px; display:flex; gap:8px; justify-content:flex-end;">
          <button type="button" class="create-gear" ${c.rqid ? "" : "disabled"}>Create Gear</button>
          <button type="button" class="delete-spell">Delete Spirit Magic</button>
        </div>
      </div>`;
    })
    .join("");

  const content = `
    <p>Found ${candidates.length} Spirit Magic spell${candidates.length === 1 ? "" : "s"} still using
    the old "Held in Matrix" checkbox. That checkbox was overloaded for two different things: a real
    spell matrix, or a bound/allied spirit's spell copied onto the character so it wouldn't count
    against their own points. Decide which applies to each row below before acting on it - this
    macro can't tell them apart.</p>
    <p>Handle these one at a time. <strong>Create Gear</strong> is only for the real-matrix case, and
    only when no gear item for it exists yet: it makes a new Gear item on the same actor, named
    "&lt;Spell&gt; Matrix", with the Spell Matrix Enchantment already linked and set to the same
    points, then opens it so you can rename or do other edits to it. If a matching gear item already
    exists, edit that one by hand instead of creating another - and if a row is actually a
    bound/allied spirit's spell, set up that spirit's proper spell-sharing instead of using this
    button. Once the spell's real new home is sorted - or already existed - <strong>Delete Spirit
    Magic</strong> removes the old spell; it will ask you to confirm first. A row is gone for good as
    soon as its spell is deleted, so it's safe to close this dialog and re-run the macro later to
    pick up where you left off.</p>
    <form>${rows}</form>
  `;

  new Dialog(
    {
      title: "Migrate isMatrix Spells",
      content,
      buttons: {
        close: { label: "Close" },
      },
      render: (html) => {
        html.closest(".window-content").scrollTop(0);

        html.on("click", "button.create-gear", async (ev) => {
          const button = ev.currentTarget;
          const row = button.closest(".matrix-row");
          const { actor, item, rqid } = candidates[Number(row.dataset.index)];

          button.disabled = true;
          const [gear] = await actor.createEmbeddedDocuments("Item", [
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
          gear.sheet.render(true);

          button.textContent = "Gear Created";
        });

        html.on("click", "button.delete-spell", async (ev) => {
          const row = ev.currentTarget.closest(".matrix-row");
          const { item } = candidates[Number(row.dataset.index)];
          const confirmed = await Dialog.confirm({
            title: "Delete Spirit Magic Spell",
            content: `<p>Have you finished setting up <strong>${item.name}</strong>'s real new home -
              a Spell Matrix Enchantment gear item, a bound/allied spirit's spell-sharing, or
              otherwise - or did it already exist? This deletes the original spell and can't be
              undone.</p>`,
          });
          if (!confirmed) {
            return;
          }
          await item.delete();
          row.remove();
        });
      },
    },
    { width: 600 },
  ).render(true);
}

migrateIsMatrixSpells();
