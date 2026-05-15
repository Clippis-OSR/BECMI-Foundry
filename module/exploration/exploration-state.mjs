import { deriveElapsedTimeFromTurns, getTimeUnits } from "./time.mjs";
import { getMovementForTurn } from "./movement.mjs";

const MODES = new Set(["dungeon", "wilderness", "downtime"]);
const DEFAULT_MODE = "dungeon";

const safeInt = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
};

export function normalizeExplorationState(state = {}, runtime = {}) {
  const mode = MODES.has(state?.mode) ? state.mode : DEFAULT_MODE;
  const currentTurn = safeInt(state?.currentTurn, 0);
  const elapsedTurns = safeInt(state?.elapsedTurns, 0);
  const elapsed = deriveElapsedTimeFromTurns(elapsedTurns);
  const movement = getMovementForTurn(runtime?.encumbrance ?? state?.encumbrance ?? {}, { travelPace: state?.travelPace });

  return Object.freeze({
    mode,
    currentTurn,
    elapsedTurns: elapsed.elapsedTurns,
    elapsedRounds: elapsed.elapsedRounds,
    elapsedMinutes: elapsed.elapsedMinutes,
    elapsedWatches: elapsed.elapsedWatches,
    elapsedDays: elapsed.elapsedDays,
    travelPace: movement.travelPace,
    movementTier: movement.movementTier,
    movementRate: movement.movementRate,
    movementPerTurn: movement.movementPerTurn,
    extension: Object.freeze({
      light: null,
      fatigue: null,
      encounters: null,
      spellDurations: null
    })
  });
}

export function advanceExplorationTurn(state = {}, runtime = {}) {
  const normalized = normalizeExplorationState(state, runtime);
  return normalizeExplorationState({ ...normalized, currentTurn: normalized.currentTurn + 1, elapsedTurns: normalized.elapsedTurns + 1 }, runtime);
}

export function getExplorationSummary(state = {}, runtime = {}) {
  const normalized = normalizeExplorationState(state, runtime);
  const units = getTimeUnits();
  return Object.freeze({
    mode: normalized.mode,
    currentTurn: normalized.currentTurn,
    elapsedTurns: normalized.elapsedTurns,
    elapsedMinutes: normalized.elapsedMinutes,
    elapsedWatches: normalized.elapsedWatches,
    elapsedDays: normalized.elapsedDays,
    movementTier: normalized.movementTier,
    movementRate: normalized.movementRate,
    movementPerTurn: normalized.movementPerTurn,
    timeUnits: units
  });
}
