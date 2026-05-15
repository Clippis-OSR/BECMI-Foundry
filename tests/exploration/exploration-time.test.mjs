import { describe, expect, it } from 'vitest';
import { getTimeUnits } from '../../module/exploration/time.mjs';
import { getMovementForTurn } from '../../module/exploration/movement.mjs';
import { advanceExplorationTurn, getExplorationSummary, normalizeExplorationState } from '../../module/exploration/exploration-state.mjs';

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
    const next = advanceExplorationTurn({ mode: 'dungeon', currentTurn: 2, elapsedTurns: 3 }, { encumbrance: { totalCarriedWeight: 350 } });
    expect(next.currentTurn).toBe(3);
    expect(next.elapsedTurns).toBe(4);
    expect(next.elapsedMinutes).toBe(40);
    expect(next.elapsedWatches).toBeCloseTo(1 / 6, 8);
    expect(next.elapsedDays).toBeCloseTo(1 / 36, 8);
    expect(next.elapsedRounds).toBe(240);
  });

  it('derives movement from encumbrance contract', () => {
    const movement = getMovementForTurn({ totalCarriedWeight: 801 });
    expect(movement.movementTier).toBe('801-1200');
    expect(movement.movementRate).toBe(60);
    expect(movement.movementPerTurn).toBe(60);
  });

  it('keeps movement per turn deterministic for equivalent numeric input', () => {
    const a = getMovementForTurn({ totalCarriedWeight: '401' });
    const b = getMovementForTurn({ totalCarriedWeight: 401 });
    expect(a.movementPerTurn).toBe(90);
    expect(b.movementPerTurn).toBe(90);
    expect(a.movementTier).toBe(b.movementTier);
  });

  it('normalizes invalid exploration state safely', () => {
    const normalized = normalizeExplorationState({ mode: 'space', currentTurn: -5, elapsedTurns: 'abc', travelPace: '' }, { encumbrance: { totalCarriedWeight: 99999 } });
    expect(normalized.mode).toBe('dungeon');
    expect(normalized.currentTurn).toBe(0);
    expect(normalized.elapsedTurns).toBe(0);
    expect(normalized.elapsedMinutes).toBe(0);
    expect(normalized.movementRate).toBe(0);
    expect(normalized.travelPace).toBe('normal');
  });

  it('returns canonical summary shape', () => {
    const summary = getExplorationSummary({ mode: 'wilderness', currentTurn: 1, elapsedTurns: 24 }, { encumbrance: { totalCarriedWeight: 0 } });
    expect(summary.mode).toBe('wilderness');
    expect(summary.elapsedMinutes).toBe(240);
    expect(summary.elapsedWatches).toBe(1);
    expect(summary.timeUnits.watchHours).toBe(4);
  });
});
