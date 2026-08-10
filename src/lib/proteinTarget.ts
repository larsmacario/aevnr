export const PROTEIN_TARGET_MIN_G = 20;
export const PROTEIN_TARGET_MAX_G = 400;
export const PROTEIN_TARGET_STEP_G = 5;

export function clampProteinTargetG(value: number): number {
  const rounded = Math.round(value / PROTEIN_TARGET_STEP_G) * PROTEIN_TARGET_STEP_G;
  return Math.min(PROTEIN_TARGET_MAX_G, Math.max(PROTEIN_TARGET_MIN_G, rounded));
}
