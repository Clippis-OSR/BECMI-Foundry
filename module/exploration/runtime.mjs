import {
  convertRangeDistanceByContext,
  getMovementContext,
  getMovementSummary,
  isSpellAreaAlwaysFeet
} from "./movement.mjs";

export function getRuntimeMovementState(encumbrance = {}, context = "dungeonExploration") {
  return getMovementSummary(encumbrance, getMovementContext(context));
}

export function convertMissileRange(distanceFeet, context = "dungeonExploration") {
  return convertRangeDistanceByContext(distanceFeet, context);
}

export { isSpellAreaAlwaysFeet };
