import { deriveElapsedTimeFromTurns, getTimeUnits } from "./time.mjs";
import { getMovementContext, getMovementSummary as summarizeMovement } from "./movement.mjs";
import { normalizeLightSource, tickLightSources } from "./light.mjs";
import { applyTerrainToDailyTravel, convertDistanceByContext, getForcedMarchState, getPartyMovementSummary } from "./movement-contracts.mjs";
import { resolveWildernessEncounterCheck, resolveWildernessLostCheck, resolveWildernessEvasionCheck, resolveWildernessPursuitCheck } from "./wilderness-procedures.mjs";

const safeInt = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
};

const safeNum = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const asArray = (value) => (Array.isArray(value) ? value : []);
const freezeArray = (value) => Object.freeze([...value]);

const normalizeHooks = (hooks = {}) => Object.freeze({
  onExplorationTurnAdvance: typeof hooks?.onExplorationTurnAdvance === "function" ? hooks.onExplorationTurnAdvance : null,
  onExplorationLightExpired: typeof hooks?.onExplorationLightExpired === "function" ? hooks.onExplorationLightExpired : null,
  onExplorationMovementUpdated: typeof hooks?.onExplorationMovementUpdated === "function" ? hooks.onExplorationMovementUpdated : null,
  onExplorationDurationTick: typeof hooks?.onExplorationDurationTick === "function" ? hooks.onExplorationDurationTick : null,
  onExplorationEncounterCadence: typeof hooks?.onExplorationEncounterCadence === "function" ? hooks.onExplorationEncounterCadence : null,
  onWildernessEncounterCheck: typeof hooks?.onWildernessEncounterCheck === "function" ? hooks.onWildernessEncounterCheck : null,
  onWildernessLostCheck: typeof hooks?.onWildernessLostCheck === "function" ? hooks.onWildernessLostCheck : null,
  onWildernessEvasionCheck: typeof hooks?.onWildernessEvasionCheck === "function" ? hooks.onWildernessEvasionCheck : null,
  onWildernessPursuitCheck: typeof hooks?.onWildernessPursuitCheck === "function" ? hooks.onWildernessPursuitCheck : null
});

function emitHook(hook, payload, events) {
  if (typeof hook !== "function") return;
  const result = hook(payload);
  if (result !== undefined) events.push(result);
}

function normalizeWildernessState(state = {}) {
  return Object.freeze({
    terrainKey: typeof state?.terrainKey === "string" && state.terrainKey ? state.terrainKey : "normal",
    travelProgressMiles: Math.max(0, safeNum(state?.travelProgressMiles, 0)),
    dayTravelMiles: Math.max(0, safeNum(state?.dayTravelMiles, 0)),
    forcedMarchUsed: state?.forcedMarchUsed === true,
    daysTraveled: safeInt(state?.daysTraveled, 0),
    encounterCadenceCounter: safeInt(state?.encounterCadenceCounter, 0),
    encounterCadenceTurns: Math.max(1, safeInt(state?.encounterCadenceTurns, 3))
  });
}

export function normalizeExplorationState(state = {}, runtime = {}) {
  const currentTurn = safeInt(state?.currentTurn, 0);
  const elapsedTurns = safeInt(state?.elapsedTurns ?? state?.currentTurn, currentTurn);
  const elapsed = deriveElapsedTimeFromTurns(elapsedTurns);
  const movementContext = getMovementContext(state?.movementContext ?? runtime?.movementContext ?? "dungeonExploration");
  const movement = summarizeMovement(runtime?.encumbrance ?? state?.encumbrance ?? {}, movementContext);
  const partyMovement = getPartyMovementSummary(runtime?.party ?? state?.party ?? []);
  const movementValue = partyMovement.partyMovement > 0 ? partyMovement.partyMovement : movement.movementValue;
  const activeLightSources = asArray(state?.activeLightSources).map((source) => normalizeLightSource(source));
  const diagnostics = asArray(state?.diagnostics).map((entry) => String(entry));

  return Object.freeze({
    currentTurn,
    elapsedTurns,
    elapsedMinutes: elapsed.elapsedMinutes,
    elapsedHours: elapsed.elapsedMinutes / 60,
    elapsedDays: elapsed.elapsedDays,
    movementValue,
    movementContext,
    activeLightSources: freezeArray(activeLightSources),
    diagnostics: freezeArray(diagnostics),
    wilderness: normalizeWildernessState(state?.wilderness),
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
  const partyMovement = getPartyMovementSummary(runtime?.party ?? state?.party ?? []);
  const movementValue = partyMovement.partyMovement > 0 ? partyMovement.partyMovement : movement.movementValue;
  const activeLightSources = tickLightSources(before.activeLightSources, 1);

  const nextEncounterCadenceCounter = before.wilderness.encounterCadenceCounter + 1;
  const encounterCadenceTriggered = before.movementContext.startsWith("wilderness")
    && nextEncounterCadenceCounter >= before.wilderness.encounterCadenceTurns;

  const dailyTravel = applyTerrainToDailyTravel(movement.milesPerDay, before.wilderness.terrainKey);
  const forcedMarch = getForcedMarchState(dailyTravel.modifiedMilesPerDay, before.wilderness.forcedMarchUsed);
  const milesPerTurn = forcedMarch.modifiedMilesPerDay / 24;
  const travelProgressMiles = before.movementContext.startsWith("wilderness")
    ? before.wilderness.travelProgressMiles + milesPerTurn
    : before.wilderness.travelProgressMiles;
  const dayTravelMiles = before.movementContext.startsWith("wilderness")
    ? before.wilderness.dayTravelMiles + milesPerTurn
    : before.wilderness.dayTravelMiles;

  const daysTraveled = before.movementContext.startsWith("wilderness") && dayTravelMiles >= forcedMarch.modifiedMilesPerDay
    ? before.wilderness.daysTraveled + 1
    : before.wilderness.daysTraveled;

  const wilderness = Object.freeze({
    terrainKey: before.wilderness.terrainKey,
    travelProgressMiles,
    forcedMarchUsed: before.wilderness.forcedMarchUsed,
    dayTravelMiles: before.movementContext.startsWith("wilderness") && dayTravelMiles >= forcedMarch.modifiedMilesPerDay
      ? dayTravelMiles - forcedMarch.modifiedMilesPerDay
      : dayTravelMiles,
    daysTraveled,
    encounterCadenceTurns: before.wilderness.encounterCadenceTurns,
    encounterCadenceCounter: encounterCadenceTriggered ? 0 : nextEncounterCadenceCounter
  });

  const expiredLights = activeLightSources.filter((source) => !source.active && source.remainingTurns === 0);
  const diagnostics = [
    ...before.diagnostics,
    `turn advanced: ${before.currentTurn} -> ${before.currentTurn + 1}`,
    `determine movement: ${movementValue}`,
    `apply terrain modifiers: ${wilderness.terrainKey}`,
    `forced march: ${wilderness.forcedMarchUsed ? "active" : "inactive"}`,
    `advance travel: +${milesPerTurn.toFixed(4)} mi`,
    `consume exploration time: +10 min`,
    `process encounter cadence hooks: ${encounterCadenceTriggered ? "triggered" : "no-op"}`,
    `tick light/duration systems: ${activeLightSources.length}`,
    ...activeLightSources.flatMap((source) => source.diagnostics)
  ];

  const next = Object.freeze({
    currentTurn: before.currentTurn + 1,
    elapsedTurns,
    elapsedMinutes: elapsed.elapsedMinutes,
    elapsedHours: elapsed.elapsedMinutes / 60,
    elapsedDays: elapsed.elapsedDays,
    movementValue,
    movementContext: before.movementContext,
    activeLightSources: freezeArray(activeLightSources),
    diagnostics: freezeArray(diagnostics),
    wilderness,
    extension: before.extension
  });

  const durationEvent = Object.freeze({ type: "explorationDurationTick", turn: next.currentTurn, elapsedTurns, elapsedMinutes: next.elapsedMinutes });

  const wildernessProcedureSupport = before.movementContext.startsWith("wilderness") ? Object.freeze({
    encounter: resolveWildernessEncounterCheck({
      cadenceTurns: next.wilderness.encounterCadenceTurns,
      cadenceCounter: before.wilderness.encounterCadenceCounter,
      dieRoll: runtime?.wildernessProcedureInput?.encounterDieRoll ?? 1,
      target: runtime?.wildernessProcedureInput?.encounterTarget ?? 1,
      modifier: runtime?.wildernessProcedureInput?.encounterModifier ?? 0
    }),
    lost: resolveWildernessLostCheck({
      dieRoll: runtime?.wildernessProcedureInput?.lostDieRoll ?? 1,
      target: runtime?.wildernessProcedureInput?.lostTarget ?? 1,
      modifier: runtime?.wildernessProcedureInput?.lostModifier ?? 0
    }),
    evasion: resolveWildernessEvasionCheck({
      dieRoll: runtime?.wildernessProcedureInput?.evasionDieRoll ?? 7,
      target: runtime?.wildernessProcedureInput?.evasionTarget ?? 7,
      modifier: runtime?.wildernessProcedureInput?.evasionModifier ?? 0
    }),
    pursuit: resolveWildernessPursuitCheck({
      dieRoll: runtime?.wildernessProcedureInput?.pursuitDieRoll ?? 7,
      target: runtime?.wildernessProcedureInput?.pursuitTarget ?? 7,
      modifier: runtime?.wildernessProcedureInput?.pursuitModifier ?? 0
    })
  }) : null;
  const movementEvent = Object.freeze({ type: "explorationMovementUpdated", turn: next.currentTurn, movementValue: next.movementValue, movementContext: next.movementContext });
  const turnEvent = Object.freeze({ type: "explorationTurnAdvanced", turn: next.currentTurn, elapsedTurns, elapsedMinutes: next.elapsedMinutes });

  events.push(durationEvent, movementEvent, turnEvent);

  if (wildernessProcedureSupport) {
    const encounterEvent = Object.freeze({ type: "wildernessEncounterCheck", turn: next.currentTurn, result: wildernessProcedureSupport.encounter });
    const lostEvent = Object.freeze({ type: "wildernessLostCheck", turn: next.currentTurn, result: wildernessProcedureSupport.lost });
    const evasionEvent = Object.freeze({ type: "wildernessEvasionCheck", turn: next.currentTurn, result: wildernessProcedureSupport.evasion });
    const pursuitEvent = Object.freeze({ type: "wildernessPursuitCheck", turn: next.currentTurn, result: wildernessProcedureSupport.pursuit });
    events.push(encounterEvent, lostEvent, evasionEvent, pursuitEvent);
    emitHook(hooks.onWildernessEncounterCheck, encounterEvent, events);
    emitHook(hooks.onWildernessLostCheck, lostEvent, events);
    emitHook(hooks.onWildernessEvasionCheck, evasionEvent, events);
    emitHook(hooks.onWildernessPursuitCheck, pursuitEvent, events);
  }
  if (encounterCadenceTriggered) {
    const encounterEvent = Object.freeze({ type: "explorationEncounterCadence", turn: next.currentTurn, cadenceTurns: next.wilderness.encounterCadenceTurns });
    events.push(encounterEvent);
    emitHook(hooks.onExplorationEncounterCadence, encounterEvent, events);
  }

  for (const light of expiredLights) {
    const lightEvent = Object.freeze({ type: "explorationLightExpired", turn: next.currentTurn, lightKey: light.lightKey, label: light.label });
    events.push(lightEvent);
    emitHook(hooks.onExplorationLightExpired, lightEvent, events);
  }

  emitHook(hooks.onExplorationDurationTick, durationEvent, events);
  emitHook(hooks.onExplorationMovementUpdated, movementEvent, events);
  emitHook(hooks.onExplorationTurnAdvance, turnEvent, events);

  return Object.freeze({ state: next, events: freezeArray(events), diagnostics: next.diagnostics });
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
    terrainAdjustedMilesPerDay: applyTerrainToDailyTravel(movement.milesPerDay, normalized.wilderness.terrainKey).modifiedMilesPerDay,
    forcedMarchMilesPerDay: getForcedMarchState(
      applyTerrainToDailyTravel(movement.milesPerDay, normalized.wilderness.terrainKey).modifiedMilesPerDay,
      normalized.wilderness.forcedMarchUsed
    ).modifiedMilesPerDay,
    wilderness: normalized.wilderness,
    activeLights: normalized.activeLightSources.filter((source) => source.active).length,
    activeLightSources: normalized.activeLightSources,
    remainingTurns: normalized.activeLightSources.map((source) => Object.freeze({ lightKey: source.lightKey, remainingTurns: source.remainingTurns })),
    diagnostics: normalized.diagnostics,
    timeUnits: getTimeUnits(),
    extension: normalized.extension
  });
}

export function convertMissileRange(distanceFeet, context = "dungeonExploration") {
  return convertDistanceByContext(distanceFeet, "weaponRange", context);
}
