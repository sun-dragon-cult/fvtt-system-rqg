import type { RqgActor } from "../actors/rqgActor";

export class RqgCombatant extends Combatant {
  public static init() {
    CONFIG.Combatant.documentClass = RqgCombatant;
  }

  /** Collect unique actors from combatant documents and re-render their sheets. */
  private static rerenderActorSheets(documents: Combatant.Implementation[]): void {
    const actors = new Set<RqgActor>();
    for (const combatant of documents) {
      if (combatant.actor) {
        actors.add(combatant.actor);
      }
    }
    for (const actor of actors) {
      actor.sheet?.render();
    }
  }

  /** @override Rerender actor sheets when a combatant is created to show SR buttons. */
  static override async _onCreateOperation(
    documents: Combatant.Implementation[],
    operation: Combatant.Database.OnCreateOperation,
    user: User.Implementation,
  ): Promise<void> {
    await Combatant._onCreateOperation(documents, operation, user);
    RqgCombatant.rerenderActorSheets(documents);
  }

  /**
   * Remove actor sheets from combatant.apps before delete to prevent
   * Foundry from auto-closing the sheet when the combatant document is removed.
   * @override
   */
  static override async _preDeleteOperation(
    _documents: Combatant.Implementation[],
    operation: Combatant.Database.PreDeleteOperation,
    _user: User.Implementation,
  ): Promise<void> {
    const combat = operation.parent;
    for (const id of operation.ids as string[]) {
      const combatant: Combatant | undefined = combat.combatants.get(id);
      const actorSheet = combatant?.actor?.sheet;
      if (actorSheet) {
        for (const [key, app] of Object.entries(combatant.apps)) {
          if (app === actorSheet) {
            delete combatant.apps[key];
          }
        }
      }
    }
    await Combatant._preDeleteOperation(_documents, operation, _user);
  }

  /** @override Rerender actor sheets after combatant deletion to update SR buttons. */
  static override async _onDeleteOperation(
    documents: Combatant.Implementation[],
    operation: Combatant.Database.OnDeleteOperation,
    user: User.Implementation,
  ): Promise<void> {
    await Combatant._onDeleteOperation(documents, operation, user);
    RqgCombatant.rerenderActorSheets(documents);
  }

  /** @override Rerender actor sheets when combatant initiative changes. */
  static override async _onUpdateOperation(
    documents: Combatant.Implementation[],
    operation: Combatant.Database.OnUpdateOperation,
    user: User.Implementation,
  ): Promise<void> {
    await Combatant._onUpdateOperation(documents, operation, user);
    RqgCombatant.rerenderActorSheets(documents);
  }
}
