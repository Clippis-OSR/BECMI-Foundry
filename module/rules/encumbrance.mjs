/**
 * BECMI movement by encumbrance in coin-weight units (cn).
 *
 * These tiers mirror the classic BECMI sheet movement rows:
 * 120/40, 90/30, 60/20, 30/10, 15/5, 0/0.
 *
 * Kept table-driven so rule thresholds can be changed in one place without
 * touching UI or actor preparation logic.
 */
export const BECMI_ENCUMBRANCE_MOVEMENT_TABLE = Object.freeze([
  Object.freeze({ id: "0-400", min: 0, max: 400, normalFeetPerTurn: 120, encounterFeetPerRound: 40 }),
  Object.freeze({ id: "401-800", min: 401, max: 800, normalFeetPerTurn: 90, encounterFeetPerRound: 30 }),
  Object.freeze({ id: "801-1200", min: 801, max: 1200, normalFeetPerTurn: 60, encounterFeetPerRound: 20 }),
  Object.freeze({ id: "1201-1600", min: 1201, max: 1600, normalFeetPerTurn: 30, encounterFeetPerRound: 10 }),
  Object.freeze({ id: "1601-2400", min: 1601, max: 2400, normalFeetPerTurn: 15, encounterFeetPerRound: 5 }),
  Object.freeze({ id: "2401+", min: 2401, max: Number.POSITIVE_INFINITY, normalFeetPerTurn: 0, encounterFeetPerRound: 0 })
]);

export function getMovementTierByEncumbrance(totalCn) {
  const value = Number.isFinite(Number(totalCn)) ? Number(totalCn) : 0;
  const tier = BECMI_ENCUMBRANCE_MOVEMENT_TABLE.find((entry) => value >= entry.min && value <= entry.max);
  return tier ?? BECMI_ENCUMBRANCE_MOVEMENT_TABLE[BECMI_ENCUMBRANCE_MOVEMENT_TABLE.length - 1];
}
