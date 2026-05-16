import { beforeEach, describe, expect, it } from 'vitest';
import { clearMonsterIndexes, registerMonsterIndex } from '../../module/monsters/monster-index.mjs';
import { buildEncounterHelperState, buildEncounterTreasureSummary } from '../../module/encounters/encounter-helper.mjs';

describe('runtime treasure integration', () => {
  beforeEach(() => {
    clearMonsterIndexes();
    registerMonsterIndex({
      system: {
        monsterKey: 'orc-basic',
        name: 'Orc',
        morale: 8,
        movement: '120 (40)',
        numberAppearing: '1d6',
        source: { book: 'Basic' },
        treasureType: 'D',
        treasure: { raw: '(D)', normalizedCodes: ['D'] }
      }
    });
  });

  it('adds encounter treasure visibility and canonical lookup to helper state', () => {
    const state = buildEncounterHelperState({ monsterKey: 'orc-basic', quantity: 2 });
    expect(state.treasure.visibility).toEqual({ encounterTreasure: true, gmOnlyDetails: true });
    expect(state.treasure.lookup.codes).toEqual(['D']);
  });

  it('supports standalone gm-facing treasure summary hooks', () => {
    const treasure = buildEncounterTreasureSummary({ monsterKey: 'orc-basic', encounterTreasure: false });
    expect(treasure.visibility.encounterTreasure).toBe(false);
    expect(treasure.hooks.placeholdersOnly).toBe(true);
  });
});
