import type { RqgActor } from "../actors/rqgActor";

// Type helper for accessing appId which exists at runtime but isn't in the type definitions
interface SheetWithAppId {
  appId?: number;
  render: () => void;
}

export class RqgCombatant extends Combatant {
  public static init() {
    CONFIG.Combatant.documentClass = RqgCombatant;
  }

  /**
   * Add any open actorSheets when combatant is created, and re-render them to show the SR buttons.
   * @override
   **/
  static override async _onCreateOperation(
    documents: any[],
    operation: any,
    user: any,
  ): Promise<void> {
    await Combatant._onCreateOperation(documents, operation, user);

    documents.forEach((combatant: Combatant) => {
      if (!combatant || !(combatant instanceof Combatant)) {
        return;
      }

      const actorSheet = combatant.actor?.sheet as SheetWithAppId | undefined;
      if (actorSheet && actorSheet.appId) {
        if (!combatant.apps) {
          // Cast to allow assignment to readonly property
          (combatant as any).apps = {};
        }
        combatant.apps[actorSheet.appId] = actorSheet as any;
        actorSheet.render(); // Force rerender to show SR buttons
      }
    });
  }

  /**
   * Remove actorSheet links before delete to prevent them closing
   */
  /** @override */
  static override async _preDeleteOperation(
    _documents: any,
    operation: any,
    _user: any,
  ): Promise<void> {
    const combat = operation.parent;

    const combatants: Combatant[] = operation.ids.map((id: string) => combat.combatants.get(id));
    combatants.forEach((combatant) => {
      const actorSheet = combatant?.actor?.sheet as SheetWithAppId | undefined;
      const appId = actorSheet?.appId;
      Object.entries(combatant.apps).forEach(([key, app]) => {
        const currentApp = app as SheetWithAppId | undefined;
        if (currentApp?.appId === appId) {
          delete combatant.apps[key];
        }
      });
    });

    // Do it after removing combatant apps to avoid closing then sheets
    await Combatant._preDeleteOperation(_documents, operation, _user);
  }

  /**
   * Rerender any open actorSheets after combatant is deleted to remove the SR button(s).
   * @override
   **/
  static override async _onDeleteOperation(
    documents: any[],
    operation: any,
    user: any,
  ): Promise<void> {
    await Combatant._onDeleteOperation(documents, operation, user);
    const actors = new Set<RqgActor>();
    documents.forEach((combatant) => {
      if (combatant && combatant instanceof Combatant && combatant.actor) {
        actors.add(combatant.actor);
      }
    });
    // Rerender actorSheet(s) to remove the SR buttons if it's the last combatant
    [...actors].forEach((actor) => actor.sheet?.render());
  }
}
