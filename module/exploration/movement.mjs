import { getMovementTierByEncumbrance } from "../rules/encumbrance.mjs";

const DEFAULT_TRAVEL_PACE = "normal";

const safeNum = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export function getMovementForTurn(encumbrance = {}, options = {}) {
  const totalCarriedWeight = Math.max(0, safeNum(encumbrance.totalCarriedWeight, 0));
  const movementTier = getMovementTierByEncumbrance(totalCarriedWeight);
  const travelPace = typeof options.travelPace === "string" && options.travelPace.trim() ? options.travelPace : DEFAULT_TRAVEL_PACE;
  const movementRate = safeNum(movementTier.normalFeetPerTurn, 0);

  return Object.freeze({
    travelPace,
    totalCarriedWeight,
    movementTier: movementTier.id,
    movementRate,
    movementPerTurn: movementRate,
    movementTierData: movementTier,
    extension: Object.freeze({
      paceModifiers: Object.freeze([]),
      terrainModifiers: Object.freeze([])
    })
  });
}
