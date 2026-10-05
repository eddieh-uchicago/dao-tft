export type TraitStyle = "bronze" | "silver" | "gold" | "prismatic";

/**
 * Bronze at the 1st threshold, silver at the 2nd, gold from the 3rd on. A trait
 * with more than 3 thresholds goes prismatic at its last one.
 */
export function traitStyle(count: number, breakpoints: number[]): TraitStyle | null {
  const reached = breakpoints.filter((b) => count >= b).length;
  if (!reached) return null;
  if (breakpoints.length > 3 && reached === breakpoints.length) return "prismatic";
  return reached === 1 ? "bronze" : reached === 2 ? "silver" : "gold";
}
