import { describe, expect, it } from 'vitest';
import { getTimeUnits } from '../../module/exploration/time.mjs';
import { getMovementForTurn } from '../../module/exploration/movement.mjs';
import { advanceExplorationTurn, getExplorationSummary, normalizeExplorationState } from '../../module/exploration/runtime.mjs';

describe('exploration time runtime', () => {
  it('exposes canonical time unit constants', () => {
    expect(getTimeUnits()).toEqual({
      combatRoundSeconds: 10,
      explorationTurnMinutes: 10,
      watchHours: 4,
      dayHours: 24
    });
  });

  it('advances turns and derived elapsed units deterministically', () => {
    const next = advanceExplorationTurn({ currentTurn: 2, elapsedTurns: 3 }, { encumbrance: { totalCarriedWeight: 350 } }).state;
    expect(next.currentTurn).toBe(3);
    expect(next.elapsedTurns).toBe(4);
    expect(next.elapsedMinutes).toBe(40);
    expect(next.elapsedHours).toBeCloseTo(2 / 3, 8);
    expect(next.elapsedDays).toBeCloseTo(1 / 36, 8);
  });

  it('derives movement from encumbrance contract', () => {
    const movement = getMovementForTurn({ totalCarriedWeight: 801 });
    expect(movement.movementTier).toBe('801-1200');
    expect(movement.movementRate).toBe(60);
    expect(movement.movementPerTurn).toBe(60);
  });

  it('normalizes invalid exploration state safely', () => {
    const normalized = normalizeExplorationState({ currentTurn: -5, elapsedTurns: 'abc' }, { encumbrance: { totalCarriedWeight: 99999 } });
    expect(normalized.currentTurn).toBe(0);
    expect(normalized.elapsedTurns).toBe(0);
    expect(normalized.elapsedMinutes).toBe(0);
    expect(normalized.movementValue).toBe(0);
  });

  it('returns canonical summary shape', () => {
    const summary = getExplorationSummary({ currentTurn: 1, elapsedTurns: 24, movementContext: 'wildernessExploration' }, { encumbrance: { totalCarriedWeight: 0 } });
    expect(summary.elapsedMinutes).toBe(240);
    expect(summary.elapsedHours).toBe(4);
    expect(summary.timeUnits.watchHours).toBe(4);
    expect(summary.wilderness).toBeDefined();
  });
});
