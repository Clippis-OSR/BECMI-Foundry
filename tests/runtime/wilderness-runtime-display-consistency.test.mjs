import { describe, expect, it } from 'vitest';
import { getWildernessRuntimeDisplay } from '../../module/exploration/runtime-display.mjs';
import { getExplorationSummary } from '../../module/exploration/runtime.mjs';

describe('wilderness runtime display consistency', () => {
  it('consumes canonical runtime summary outputs without mutating deterministic authority', () => {
    const state = {
      movementContext: 'wildernessExploration',
      wilderness: { terrainKey: 'mountains', forcedMarchUsed: false, encounterCadenceTurns: 3, encounterCadenceCounter: 2 }
    };
    const runtime = { encumbrance: { totalCarriedWeight: 601 } };

    const summary = getExplorationSummary(state, runtime);
    const display = getWildernessRuntimeDisplay(state, runtime);

    expect(display.terrain.baseMilesPerDay).toBe(summary.milesPerDay);
    expect(display.terrain.adjustedMilesPerDay).toBe(summary.terrainAdjustedMilesPerDay);
    expect(display.forcedMarch.milesPerDay).toBe(summary.forcedMarchMilesPerDay);
    expect(display.progression.travelProgressMiles).toBe(summary.wilderness.travelProgressMiles);
    expect(display.encounterCadence.counter).toBe(summary.wilderness.encounterCadenceCounter);
  });
});
