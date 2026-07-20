import { describe, it, expect } from "vitest";
import { mockItems } from "../../../test/mocks/mockLocationItems";
import { mergeArraysById } from "../../system/util";
import type { RqgActor } from "@actors/rqg-actor";
import type { WeaponItem } from "@item-model/weapon-data-model.ts";
import { weaponLifecycle } from "./weapon-lifecycle";

describe("weaponLifecycle.handleItemUpdateDocumentsPreUpdate", () => {
  it("removes the projectileId link from a weapon when its linked projectile is unequipped", () => {
    // --- Arrange ---
    const items = JSON.parse(JSON.stringify(mockItems)) as RqgActor["items"]["contents"];
    const bow = items.find((i) => i.name === "Light Crossbow.") as WeaponItem;
    const bolt = items.find((i) => i.name === "Barbed Bolts") as WeaponItem;
    expect(bow.system.projectileId).toBe(bolt.id);

    const actor = { items: { contents: items } } as unknown as RqgActor;
    const updates: object[] = [
      {
        _id: bolt.id,
        "system.equippedStatus": "carried",
      },
    ];

    // --- Act ---
    weaponLifecycle.handleItemUpdateDocumentsPreUpdate(actor, bolt, updates, {});

    // --- Assert ---
    expect(JSON.parse(JSON.stringify(updates))).toContainEqual({
      _id: bow.id,
      "system.projectileId": "",
    });
  });

  it("does not touch projectileId links when the projectile stays equipped", () => {
    // --- Arrange ---
    const items = JSON.parse(JSON.stringify(mockItems)) as RqgActor["items"]["contents"];
    const bow = items.find((i) => i.name === "Light Crossbow.") as WeaponItem;
    const bolt = items.find((i) => i.name === "Barbed Bolts") as WeaponItem;

    const actor = { items: { contents: items } } as unknown as RqgActor;
    const updates: object[] = [
      {
        _id: bolt.id,
        "system.equippedStatus": "equipped",
      },
    ];

    // --- Act ---
    weaponLifecycle.handleItemUpdateDocumentsPreUpdate(actor, bolt, updates, {});

    // --- Assert ---
    const boltUpdates = mergeArraysById([], updates);
    expect(boltUpdates.some((u: any) => u._id === bow.id && "system.projectileId" in u)).toBe(
      false,
    );
  });

  it("also removes the link when the update uses a nested system object (e.g. updateEmbeddedDocuments)", () => {
    // --- Arrange ---
    const items = JSON.parse(JSON.stringify(mockItems)) as RqgActor["items"]["contents"];
    const bow = items.find((i) => i.name === "Light Crossbow.") as WeaponItem;
    const bolt = items.find((i) => i.name === "Barbed Bolts") as WeaponItem;

    const actor = { items: { contents: items } } as unknown as RqgActor;
    const updates: object[] = [
      {
        _id: bolt.id,
        system: { equippedStatus: "notCarried" },
      },
    ];

    // --- Act ---
    weaponLifecycle.handleItemUpdateDocumentsPreUpdate(actor, bolt, updates, {});

    // --- Assert ---
    expect(JSON.parse(JSON.stringify(updates))).toContainEqual({
      _id: bow.id,
      "system.projectileId": "",
    });
  });
});
