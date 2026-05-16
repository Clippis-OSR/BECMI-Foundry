import { beforeEach, describe, expect, it } from 'vitest';
import { clearMonsterIndexes, registerMonsterIndex } from '../../module/monsters/monster-index.mjs';
import {
  buildEncounterHelperState,
  buildWildernessEncounterHelper,
  createEncounterGroup,
  selectEncounterMonster
} from '../../module/encounters/encounter-helper.mjs';

function seedMonster() {
  registerMonsterIndex({
    system: {
      monsterKey: 'goblin-basic',
      name: 'Goblin',
      morale: 7,
      movement: '90 (30)',
      numberAppearing: '2d6',
      source: { book: 'Basic' },
      alignment: 'Chaotic'
    }
  });
}

describe('encounter helper', () => {
  beforeEach(() => {
    clearMonsterIndexes();
    seedMonster();
  });

  it('selects monsters from canonical compendium indexes with runtime fields', () => {
    const selected = selectEncounterMonster('goblin-basic');
    expect(selected.name).toBe('Goblin');
    expect(selected.morale).toBe(7);
    expect(selected.movement).toBe('90 (30)');
  });

  it('creates quick-add dungeon encounter groups with basic quantity handling', () => {
    const group = createEncounterGroup({ monsterKey: 'goblin-basic', quantity: 3.8, context: 'dungeon' });
    expect(group.context).toBe('dungeon');
    expect(group.quantity).toBe(3);
    expect(group.morale).toBe(7);
  });

  it('builds helper state with morale and movement visibility', () => {
    const state = buildEncounterHelperState({ monsterKey: 'goblin-basic', quantity: 4 });
    expect(state.summary.monsterCount).toBe(4);
    expect(state.summary.moraleVisible).toBe(7);
    expect(state.summary.movementVisible).toBe('90 (30)');
  });

  it('integrates optional wilderness encounter support via exploration runtime hooks', () => {
    const helper = buildWildernessEncounterHelper({
      monsterKey: 'goblin-basic',
      quantity: 2,
      explorationState: { wilderness: { terrainKey: 'rough', encounterCadenceTurns: 2, encounterCadenceCounter: 1 } },
      runtime: { encumbrance: { totalCarriedWeight: 401 } }
    });
    expect(helper.encounter.context).toBe('wilderness');
    expect(helper.wilderness.terrainKey).toBe('rough');
    expect(helper.wilderness.encounterCadenceTurns).toBe(2);
  });
});
