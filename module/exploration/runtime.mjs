import { deriveElapsedTimeFromTurns, getTimeUnits } from "./time.mjs";
import { getMovementContext, getMovementSummary as summarizeMovement } from "./movement.mjs";
import { normalizeLightSource, tickLightSources } from "./light.mjs";

const safeInt = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const freezeArray = (value) => Object.freeze([...value]);

const normalizeHooks = (hooks = {}) => Object.freeze({
  onExplorationTurnAdvance: typeof hooks?.onExplorationTurnAdvance === "function" ? hooks.onExplorationTurnAdvance : null,
  onExplorationLightExpired: typeof hooks?.onExplorationLightExpired === "function" ? hooks.onExplorationLightExpired : null,
  onExplorationMovementUpdated: typeof hooks?.onExplorationMovementUpdated === "function" ? hooks.onExplorationMovementUpdated : null,
  onExplorationDurationTick: typeof hooks?.onExplorationDurationTick === "function" ? hooks.onExplorationDurationTick : null
});

function emitHook(hook, payload, events) {
  if (typeof hook !== "function") return;
  const result = hook(payload);
  if (result !== undefined) events.push(result);
}

export function normalizeExplorationState(state = {}, runtime = {}) {
  const currentTurn = safeInt(state?.currentTurn, 0);
  const elapsedTurns = safeInt(state?.elapsedTurns ?? state?.currentTurn, currentTurn);
  const elapsed = deriveElapsedTimeFromTurns(elapsedTurns);
  const movementContext = getMovementContext(state?.movementContext ?? runtime?.movementContext ?? "dungeonExploration");
  const movement = summarizeMovement(runtime?.encumbrance ?? state?.encumbrance ?? {}, movementContext);
  const activeLightSources = asArray(state?.activeLightSources).map((source) => normalizeLightSource(source));
  const diagnostics = asArray(state?.diagnostics).map((entry) => String(entry));

  return Object.freeze({
    currentTurn,
    elapsedTurns,
    elapsedMinutes: elapsed.elapsedMinutes,
    elapsedHours: elapsed.elapsedMinutes / 60,
    elapsedDays: elapsed.elapsedDays,
    movementValue: movement.movementValue,
    movementContext,
    activeLightSources: freezeArray(activeLightSources),
    diagnostics: freezeArray(diagnostics),
    extension: Object.freeze({
      encounterChecks: null,
      fatigueChecks: null,
      spellDurationChecks: null
    })
  });
}

export function advanceExplorationTurn(state = {}, runtime = {}) {
  const hooks = normalizeHooks(runtime?.hooks);
  const before = normalizeExplorationState(state, runtime);
  const events = [];

  const elapsedTurns = before.elapsedTurns + 1;
  const elapsed = deriveElapsedTimeFromTurns(elapsedTurns);
  const movement = summarizeMovement(runtime?.encumbrance ?? state?.encumbrance ?? {}, before.movementContext);
  const activeLightSources = tickLightSources(before.activeLightSources, 1);

  const expiredLights = activeLightSources.filter((source) => !source.active && source.remainingTurns === 0);
  const diagnostics = [
    ...before.diagnostics,
    `turn advanced: ${before.currentTurn} -> ${before.currentTurn + 1}`,
    ...activeLightSources.flatMap((source) => source.diagnostics)
  ];

  const next = Object.freeze({
    currentTurn: before.currentTurn + 1,
    elapsedTurns,
    elapsedMinutes: elapsed.elapsedMinutes,
    elapsedHours: elapsed.elapsedMinutes / 60,
    elapsedDays: elapsed.elapsedDays,
    movementValue: movement.movementValue,
    movementContext: before.movementContext,
    activeLightSources: freezeArray(activeLightSources),
    diagnostics: freezeArray(diagnostics),
    extension: before.extension
  });

  const durationEvent = Object.freeze({ type: "explorationDurationTick", turn: next.currentTurn, elapsedTurns, elapsedMinutes: next.elapsedMinutes });
  const movementEvent = Object.freeze({ type: "explorationMovementUpdated", turn: next.currentTurn, movementValue: next.movementValue, movementContext: next.movementContext });
  const turnEvent = Object.freeze({ type: "explorationTurnAdvanced", turn: next.currentTurn, elapsedTurns, elapsedMinutes: next.elapsedMinutes });

  events.push(durationEvent, movementEvent, turnEvent);

  for (const light of expiredLights) {
    const lightEvent = Object.freeze({ type: "explorationLightExpired", turn: next.currentTurn, lightKey: light.lightKey, label: light.label });
    events.push(lightEvent);
    emitHook(hooks.onExplorationLightExpired, lightEvent, events);
  }

  emitHook(hooks.onExplorationDurationTick, durationEvent, events);
  emitHook(hooks.onExplorationMovementUpdated, movementEvent, events);
  emitHook(hooks.onExplorationTurnAdvance, turnEvent, events);

  return Object.freeze({
    state: next,
    events: freezeArray(events),
    diagnostics: next.diagnostics
  });
}

export function getMovementSummary(state = {}, runtime = {}) {
  const normalized = normalizeExplorationState(state, runtime);
  return summarizeMovement(runtime?.encumbrance ?? state?.encumbrance ?? {}, normalized.movementContext);
}

export function getExplorationSummary(state = {}, runtime = {}) {
  const normalized = normalizeExplorationState(state, runtime);
  const movement = summarizeMovement(runtime?.encumbrance ?? state?.encumbrance ?? {}, normalized.movementContext);

  return Object.freeze({
    currentTurn: normalized.currentTurn,
    elapsedMinutes: normalized.elapsedMinutes,
    elapsedHours: normalized.elapsedHours,
    elapsedDays: normalized.elapsedDays,
    movementValue: normalized.movementValue,
    movementContext: normalized.movementContext,
    milesPerDay: movement.milesPerDay,
    activeLights: normalized.activeLightSources.filter((source) => source.active).length,
    activeLightSources: normalized.activeLightSources,
    remainingTurns: normalized.activeLightSources.map((source) => Object.freeze({ lightKey: source.lightKey, remainingTurns: source.remainingTurns })),
    diagnostics: normalized.diagnostics,
    timeUnits: getTimeUnits(),
    extension: normalized.extension
  });
}
