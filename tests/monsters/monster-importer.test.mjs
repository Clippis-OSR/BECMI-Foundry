import { describe, expect, it } from 'vitest';
import { createCreatureFromCanonicalMonster, updateCreatureFromCanonicalMonster } from '../../module/monsters/monster-importer.mjs';

function canonical() {
  return {
    system: {
      monsterKey: 'giant_frog',
      schemaVersion: 1,
      name: 'Giant Frog',
      source: { book: 'Expert', page: '12', notes: '' },
      ac: 7,
      hitDice: '2',
      movement: "90' (30')",
      movementModes: { move: '90(30)' },
      attacks: [{ type: 'bite', count: 1, damage: '1d6', riderText: 'swallow on 20', specialTags: ['swallow'] }],
      damage: '1d6',
      damageParts: [{ raw: '1d6', dice: '1d6', rider: null }],
      numberAppearing: '1d4',
      saveAs: 'F1',
      morale: 8,
      treasureType: 'Nil',
      treasure: { raw: 'Nil', normalizedCodes: [] },
      alignment: 'Neutral',
      xp: 20,
      specialAbilities: 'Swallow on 20',
      description: { text: 'Large amphibian.', notes: '' },
      notes: ''
    }
  };
}

describe('monster importer', () => {
  it('update path replaces imported natural attacks deterministically', async () => {
    const calls = { replace: 0 };
    const actorApi = {
      createActor: async (_actorData, itemData) => ({ id: 'a1', items: itemData, flags: { becmi: {} } }),
      updateActor: async (_actor, actorData) => ({ id: 'a1', items: [], flags: actorData.flags }),
      replaceImportedNaturalAttacks: async (_actor, itemData) => {
        calls.replace += 1;
        expect(itemData).toHaveLength(1);
        expect(itemData[0].flags.becmi.replaceKey).toBe('giant_frog::0');
      }
    };
    const created = await createCreatureFromCanonicalMonster(canonical(), { actorApi });
    expect(created.itemData).toHaveLength(1);
    const updated = await updateCreatureFromCanonicalMonster({ id: 'a1', flags: { becmi: {} } }, canonical(), { actorApi });
    expect(updated.itemData).toHaveLength(1);
    expect(calls.replace).toBe(1);
  });
});
