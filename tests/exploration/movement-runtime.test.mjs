import { describe, expect, it } from 'vitest';
import {
  explorationToCombatMovement,
  getDungeonCombatMovement,
  getDungeonExplorationMovement,
  getForcedMarchMilesPerDay,
  getMilesPerDay,
  getMovementContext,
  getMovementSummary,
  getWildernessCombatMovement,
  getWildernessExplorationMovement,
  isSpellAreaAlwaysFeet,
  normalizeMovementValue
} from '../../module/exploration/movement.mjs';
import { convertMissileRange } from '../../module/exploration/runtime.mjs';

describe('canonical becmi movement runtime', () => {
  it('dungeon exploration uses feet', () => {
    const summary = getMovementSummary({ totalCarriedWeight: 401 }, 'dungeonExploration');
    expect(getDungeonExplorationMovement({ totalCarriedWeight: 401 })).toBe(90);
    expect(summary.contextualUnit).toBe('feetPerTurn');
    expect(summary.contextualMovement).toBe(90);
  });

  it('wilderness exploration uses yards', () => {
    const summary = getMovementSummary({ totalCarriedWeight: 401 }, 'wildernessExploration');
    expect(getWildernessExplorationMovement({ totalCarriedWeight: 401 })).toBe(90);
    expect(summary.contextualUnit).toBe('yardsPerTurn');
    expect(summary.contextualMovement).toBe(90);
  });

  it('combat movement is exploration movement divided by 3', () => {
    expect(explorationToCombatMovement(90)).toBe(30);
    expect(getDungeonCombatMovement({ totalCarriedWeight: 401 })).toBe(30);
    expect(getWildernessCombatMovement({ totalCarriedWeight: 401 })).toBe(30);
  });

  it('wilderness miles per day is movement divided by 5', () => {
    expect(getMilesPerDay({ totalCarriedWeight: 401 })).toBe(18);
  });

  it('forced march is 1.5x daily travel', () => {
    expect(getForcedMarchMilesPerDay({ totalCarriedWeight: 401 }, 'wildernessForcedMarch')).toBe(27);
  });

  it('ranged weapons convert to yards in wilderness contexts', () => {
    expect(convertMissileRange(70, 'wildernessExploration')).toBe(70);
    expect(convertMissileRange(70, 'wildernessCombat')).toBe(70);
  });

  it('spell aoe always remains feet', () => {
    expect(isSpellAreaAlwaysFeet()).toBe(true);
  });

  it('invalid movement context normalizes safely', () => {
    expect(getMovementContext('space')).toBe('dungeonExploration');
  });

  it('deterministic rounding and negative normalization behavior', () => {
    expect(normalizeMovementValue(-90)).toBe(0);
    expect(explorationToCombatMovement(91)).toBe(30);
  });
});
