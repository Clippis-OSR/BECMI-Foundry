import { getExplorationSummary } from './runtime.mjs';
import { applyTerrainToDailyTravel, getForcedMarchState } from './movement-contracts.mjs';

const formatMiles = (value) => Number(value ?? 0).toFixed(2).replace(/\.00$/, '');

function findEvent(events = [], type) {
  return Array.isArray(events) ? events.find((event) => event?.type === type) ?? null : null;
}

export function getWildernessRuntimeDisplay(state = {}, runtime = {}, turnResult = null) {
  const summary = getExplorationSummary(state, runtime);
  const terrain = applyTerrainToDailyTravel(summary.milesPerDay, summary.wilderness.terrainKey);
  const forcedMarch = getForcedMarchState(terrain.modifiedMilesPerDay, summary.wilderness.forcedMarchUsed);
  const cadenceProgress = `${summary.wilderness.encounterCadenceCounter}/${summary.wilderness.encounterCadenceTurns}`;
  const cadenceTriggered = Boolean(findEvent(turnResult?.events, 'explorationEncounterCadence'));

  return Object.freeze({
    movementContext: summary.movementContext,
    terrain: Object.freeze({
      terrainKey: terrain.terrainKey,
      multiplier: terrain.terrainMultiplier,
      baseMilesPerDay: summary.milesPerDay,
      adjustedMilesPerDay: terrain.modifiedMilesPerDay
    }),
    forcedMarch: Object.freeze({
      active: summary.wilderness.forcedMarchUsed,
      milesPerDay: forcedMarch.modifiedMilesPerDay,
      requiresRest: forcedMarch.requiresRest,
      multiplier: forcedMarch.multiplier
    }),
    progression: Object.freeze({
      travelProgressMiles: summary.wilderness.travelProgressMiles,
      dayTravelMiles: summary.wilderness.dayTravelMiles,
      daysTraveled: summary.wilderness.daysTraveled
    }),
    encounterCadence: Object.freeze({
      turns: summary.wilderness.encounterCadenceTurns,
      counter: summary.wilderness.encounterCadenceCounter,
      progress: cadenceProgress,
      triggered: cadenceTriggered
    }),
    hooks: Object.freeze({
      lost: findEvent(turnResult?.events, 'wildernessLostCheck'),
      evasion: findEvent(turnResult?.events, 'wildernessEvasionCheck'),
      pursuit: findEvent(turnResult?.events, 'wildernessPursuitCheck')
    })
  });
}

export function renderWildernessRuntimeSummary(display = {}) {
  const terrain = display?.terrain ?? {};
  const forcedMarch = display?.forcedMarch ?? {};
  const progression = display?.progression ?? {};
  const cadence = display?.encounterCadence ?? {};
  const hooks = display?.hooks ?? {};

  return Object.freeze([
    `Terrain ${terrain.terrainKey ?? 'normal'} ×${terrain.multiplier ?? 1}`,
    `Miles/day ${formatMiles(terrain.adjustedMilesPerDay)} (base ${formatMiles(terrain.baseMilesPerDay)})`,
    `Forced march ${forcedMarch.active ? 'ON' : 'OFF'} · ${formatMiles(forcedMarch.milesPerDay)} mi/day`,
    `Progress ${formatMiles(progression.travelProgressMiles)} mi total · ${formatMiles(progression.dayTravelMiles)} mi today · ${progression.daysTraveled ?? 0} days`,
    `Encounter cadence ${cadence.progress ?? '0/0'}${cadence.triggered ? ' (triggered)' : ''}`,
    `Hooks lost:${hooks.lost ? 'ready' : 'idle'} evasion:${hooks.evasion ? 'ready' : 'idle'} pursuit:${hooks.pursuit ? 'ready' : 'idle'}`
  ]);
}
