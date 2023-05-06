import { formatListByWorldLanguage, isTruthy } from "../../system/util";

export function deriveCultItemName(deity: string, cultNames: string[]): string {
  const joinedCultsFormatted = formatListByWorldLanguage(
    cultNames.filter(isTruthy).map((c) => c.trim())
  );

  if (!joinedCultsFormatted || joinedCultsFormatted === deity) {
    return deity.trim();
  }
  return joinedCultsFormatted + ` (${deity.trim()})`;
}
