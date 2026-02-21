import { AbilitySuccessLevelEnum } from "./AbilityRoll.defs";
import { RqgError } from "../../system/util.ts";

export function calculateAbilitySuccessLevel(
  rawChance: number,
  roll: number,
): AbilitySuccessLevelEnum {
  const chance = Math.max(0, rawChance);
  const critical = Math.min(95, Math.max(1, Math.ceil((chance - 29) / 20) + 1));
  const special = Math.min(
    95,
    chance === 6 || chance === 7 ? 2 : Math.min(95, Math.max(1, Math.ceil((chance - 7) / 5) + 1)),
  );
  const fumble = Math.min(100, 100 - Math.ceil((100 - chance - 9) / 20) + 1);
  const success = Math.min(95, Math.max(chance, 5));
  const fail = fumble === 96 ? 95 : Math.max(96, fumble - 1);
  const lookup = [
    { limit: critical, result: AbilitySuccessLevelEnum.Critical },
    { limit: special, result: AbilitySuccessLevelEnum.Special },
    { limit: success, result: AbilitySuccessLevelEnum.Success },
    { limit: fail, result: AbilitySuccessLevelEnum.Failure },
    { limit: Infinity, result: AbilitySuccessLevelEnum.Fumble },
  ];
  const successLevel = lookup.find((v) => roll <= v.limit);
  if (!successLevel) {
    throw new RqgError(
      "calculateAbilitySuccessLevel did not find a success level",
      rawChance,
      roll,
    );
  }
  return successLevel.result;
}
