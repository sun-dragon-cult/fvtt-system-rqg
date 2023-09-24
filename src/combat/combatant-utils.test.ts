import { getCombatantIdsToDelete, getSrWithoutCombatants } from "./combatant-utils";

describe("Combatant to add calculations are correct", () => {
  it("should return a missing sr", () => {
    // Arrange
    const combatantList = [
      { id: "aaa", initiative: 1 },
      { id: "bbb", initiative: 5 },
    ] as Combatant[];
    const targetSrSet = new Set([1, 5, 10]);

    // Act
    const srToCreateCombtantFor = getSrWithoutCombatants(combatantList, targetSrSet);

    // Assert
    expect(srToCreateCombtantFor).toStrictEqual([10]);
  });

  it("should return a missing sr even with a null sr", () => {
    // Arrange
    const combatantList = [
      { id: "aaa", initiative: 1 },
      { id: "bbb", initiative: 5 },
      { id: "bbb", initiative: null },
    ] as Combatant[];
    const targetSrSet = new Set([1, 5, 10]);

    // Act
    const srToCreateCombtantFor = getSrWithoutCombatants(combatantList, targetSrSet);

    // Assert
    expect(srToCreateCombtantFor).toStrictEqual([10]);
  });

  it("should return a missing sr even with a duplicate sr", () => {
    // Arrange
    const combatantList = [
      { id: "aaa", initiative: 1 },
      { id: "bbb", initiative: 5 },
      { id: "bbb", initiative: 5 },
    ] as Combatant[];
    const targetSrSet = new Set([1, 5, 10]);

    // Act
    const srToCreateCombtantFor = getSrWithoutCombatants(combatantList, targetSrSet);

    // Assert
    expect(srToCreateCombtantFor).toStrictEqual([10]);
  });
});

describe("Combatants to delete calculations are correct", () => {
  it("should return sr not in target Set", () => {
    // Arrange
    const combatantList = [
      { id: "aaa", initiative: 1 },
      { id: "bbb", initiative: 5 },
      { id: "ccc", initiative: 10 },
    ] as Combatant[];
    const targetSrSet = new Set([1, 5]);

    // Act
    const combatantIdsToDelete = getCombatantIdsToDelete(combatantList, targetSrSet);

    // Assert
    expect(combatantIdsToDelete).toStrictEqual(["ccc"]);
  });

  it("should return sr not in target Set when combatant sr is null", () => {
    // Arrange
    const combatantList = [
      { id: "aaa", initiative: 1 },
      { id: "bbb", initiative: 5 },
      { id: "ccc", initiative: null },
    ] as Combatant[];
    const targetSrSet = new Set([1, 5]);

    // Act
    const combatantIdsToDelete = getCombatantIdsToDelete(combatantList, targetSrSet);

    // Assert
    expect(combatantIdsToDelete).toStrictEqual(["ccc"]);
  });

  it("should delete duplicate sr that is in target sr set", () => {
    // Arrange
    const combatantList = [
      { id: "aaa", initiative: 1 },
      { id: "bbb", initiative: 5 },
      { id: "ccc", initiative: 5 },
    ] as Combatant[];
    const targetSrSet = new Set([1, 5]);

    // Act
    const combatantIdsToDelete = getCombatantIdsToDelete(combatantList, targetSrSet);

    // Assert
    expect(combatantIdsToDelete).toStrictEqual(["ccc"]);
  });

  it("should not remove the last combatant", () => {
    // Arrange
    const combatantList = [{ id: "aaa", initiative: 1 }] as Combatant[];
    const targetSrSet = new Set([]);

    // Act
    const combatantIdsToDelete = getCombatantIdsToDelete(combatantList, targetSrSet);

    // Assert
    expect(combatantIdsToDelete).toStrictEqual([]);
  });

  it("should keep the first combatant when there are multiple but none in target sr", () => {
    // Arrange
    const combatantList = [
      { id: "aaa", initiative: 1 },
      { id: "bbb", initiative: 5 },
      { id: "ccc", initiative: 5 },
    ] as Combatant[];
    const targetSrSet = new Set([]);

    // Act
    const combatantIdsToDelete = getCombatantIdsToDelete(combatantList, targetSrSet);

    // Assert
    expect(combatantIdsToDelete).toStrictEqual(["bbb", "ccc"]);
  });
});
