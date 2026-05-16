import { describe, expect, it } from 'vitest';
import { getWildernessRuntimeDisplay, renderWildernessRuntimeSummary } from '../../module/exploration/runtime-display.mjs';
import { advanceExplorationTurn } from '../../module/exploration/runtime.mjs';

describe('wilderness runtime display ui', () => {
  it('renders compact wilderness exploration summary lines', () => {
    const display = getWildernessRuntimeDisplay({
      movementContext: 'wildernessExploration',
      wilderness: { terrainKey: 'rough', forcedMarchUsed: true, encounterCadenceTurns: 2, encounterCadenceCounter: 1 }
    }, { encumbrance: { totalCarriedWeight: 401 } });

    const lines = renderWildernessRuntimeSummary(display);
    expect(lines).toHaveLength(6);
    expect(lines[0]).toContain('Terrain rough ×0.75');
    expect(lines[1]).toContain('Miles/day 13.5');
    expect(lines[2]).toContain('Forced march ON');
    expect(lines[4]).toContain('1/2');
  });

  it('shows cadence trigger and hook readiness from canonical turn events', () => {
    const state = {
      movementContext: 'wildernessExploration',
      wilderness: { terrainKey: 'normal', encounterCadenceTurns: 1, encounterCadenceCounter: 0 }
    };
    const turnResult = advanceExplorationTurn(state, { encumbrance: { totalCarriedWeight: 401 } });
    const display = getWildernessRuntimeDisplay(turnResult.state, { encumbrance: { totalCarriedWeight: 401 } }, turnResult);
    const lines = renderWildernessRuntimeSummary(display);

    expect(display.encounterCadence.triggered).toBe(true);
    expect(lines[4]).toContain('(triggered)');
    expect(lines[5]).toContain('lost:ready');
    expect(lines[5]).toContain('evasion:ready');
    expect(lines[5]).toContain('pursuit:ready');
  });
});
