import { getMovementTierByEncumbrance } from "../rules/encumbrance.mjs";
import { getForcedMarchState } from "./movement-contracts.mjs";

const DEFAULT_TRAVEL_PACE = "normal";
const DEFAULT_MOVEMENT_CONTEXT = "dungeonExploration";

const MOVEMENT_CONTEXTS = Object.freeze(new Set([
  "dungeonExploration",
  "dungeonCombat",
  "wildernessExploration",
  "wildernessCombat",
  "wildernessForcedMarch"
]));

const CONTEXT_UNITS = Object.freeze({
  dungeonExploration: "feetPerTurn",
  dungeonCombat: "feetPerRound",
  wildernessExploration: "yardsPerTurn",
  wildernessCombat: "yardsPerRound",
  wildernessForcedMarch: "milesPerDay"
});

const safeNum = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export function normalizeMovementValue(value) {
  const normalized = Math.floor(safeNum(value, 0));
  return Math.max(0, normalized);
}

export function getBaseMovement(encumbrance = {}) {
  const totalCarriedWeight = Math.max(0, safeNum(encumbrance.totalCarriedWeight, 0));
  const movementTier = getMovementTierByEncumbrance(totalCarriedWeight);
  const movementValue = normalizeMovementValue(movementTier.normalFeetPerTurn);

  return Object.freeze({
    totalCarriedWeight,
    movementTier: movementTier.id,
    movementTierData: movementTier,
    movementValue
  });
}

export function getMovementContext(context) {
  if (MOVEMENT_CONTEXTS.has(context)) return context;
  return DEFAULT_MOVEMENT_CONTEXT;
}

export function explorationToCombatMovement(explorationMovement) {
  return normalizeMovementValue(Math.floor(normalizeMovementValue(explorationMovement) / 3));
}

export function movementToMilesPerDay(movementValue) {
  return normalizeMovementValue(movementValue) / 5;
}

export function getDungeonExplorationMovement(encumbrance = {}) {
  console.warn("[BECMI Exploration] getDungeonExplorationMovement is deprecated. Use getMovementSummary(...).dungeonExploration.");
  return getBaseMovement(encumbrance).movementValue;
}

export function getDungeonCombatMovement(encumbrance = {}) {
  console.warn("[BECMI Exploration] getDungeonCombatMovement is deprecated. Use getMovementSummary(...).dungeonCombat.");
  return explorationToCombatMovement(getDungeonExplorationMovement(encumbrance));
}

export function getWildernessExplorationMovement(encumbrance = {}) {
  console.warn("[BECMI Exploration] getWildernessExplorationMovement is deprecated. Use getMovementSummary(...).wildernessExploration.");
  return getBaseMovement(encumbrance).movementValue;
}

export function getWildernessCombatMovement(encumbrance = {}) {
  console.warn("[BECMI Exploration] getWildernessCombatMovement is deprecated. Use getMovementSummary(...).wildernessCombat.");
  return getDungeonCombatMovement(encumbrance);
}

export function getMilesPerDay(encumbrance = {}) {
  console.warn("[BECMI Exploration] getMilesPerDay is deprecated. Use getMovementSummary(...).milesPerDay.");
  return movementToMilesPerDay(getBaseMovement(encumbrance).movementValue);
}

export function getForcedMarchMilesPerDay(encumbrance = {}, context = "wildernessForcedMarch") {
  console.warn("[BECMI Exploration] getForcedMarchMilesPerDay is deprecated. Use movement-contracts.getForcedMarchState.");
  const normalizedContext = getMovementContext(context);
  if (normalizedContext !== "wildernessForcedMarch") return getMilesPerDay(encumbrance);
  return getForcedMarchState(getMilesPerDay(encumbrance), true).modifiedMilesPerDay;
}

export function convertRangeDistanceByContext(distanceFeet, context = DEFAULT_MOVEMENT_CONTEXT) {
  console.warn("[BECMI Exploration] convertRangeDistanceByContext is deprecated. Use convertDistanceByContext(distance, \"weaponRange\", context).");
  return convertDistanceByContext(distanceFeet, "weaponRange", getMovementContext(context));
}

export function isSpellAreaAlwaysFeet() {
  return true;
}

export function getMovementSummary(encumbrance = {}, context = DEFAULT_MOVEMENT_CONTEXT) {
  const base = getBaseMovement(encumbrance);
  const normalizedContext = getMovementContext(context);

  const contextualMovement = normalizedContext === "dungeonCombat" || normalizedContext === "wildernessCombat"
    ? explorationToCombatMovement(base.movementValue)
    : normalizedContext === "wildernessForcedMarch"
      ? getForcedMarchMilesPerDay(encumbrance, normalizedContext)
      : base.movementValue;

  return Object.freeze({
    context: normalizedContext,
    movementValue: base.movementValue,
    contextualMovement,
    contextualUnit: CONTEXT_UNITS[normalizedContext],
    dungeonExploration: getDungeonExplorationMovement(encumbrance),
    dungeonCombat: getDungeonCombatMovement(encumbrance),
    wildernessExploration: getWildernessExplorationMovement(encumbrance),
    wildernessCombat: getWildernessCombatMovement(encumbrance),
    milesPerDay: getMilesPerDay(encumbrance),
    forcedMarchMilesPerDay: getForcedMarchMilesPerDay(encumbrance, "wildernessForcedMarch"),
    spellAreaAlwaysFeet: isSpellAreaAlwaysFeet()
  });
}

export function getMovementForTurn(encumbrance = {}, options = {}) {
  console.warn("[BECMI Exploration] getMovementForTurn is deprecated. Use getMovementSummary for canonical runtime movement.");
  const travelPace = typeof options.travelPace === "string" && options.travelPace.trim() ? options.travelPace : DEFAULT_TRAVEL_PACE;
  const base = getBaseMovement(encumbrance);

  return Object.freeze({
    travelPace,
    totalCarriedWeight: base.totalCarriedWeight,
    movementTier: base.movementTier,
    movementRate: base.movementValue,
    movementPerTurn: base.movementValue,
    movementValue: base.movementValue,
    movementTierData: base.movementTierData,
    extension: Object.freeze({
      paceModifiers: Object.freeze([]),
      terrainModifiers: Object.freeze([])
    })
  });
}
