import { describe, expect, it } from 'vitest';

import {
  buildMonsterCompendium,
  importMonsterData,
  syncMonsterCompendium,
  validateMonsterCompendiumIntegrity
} from '../../module/monsters/monster-compendium.mjs';
import { clearMonsterIndexes, getMonsterByKey } from '../../module/monsters/monster-index.mjs';

function createCanonicalMonster(overrides = {}) {
  const base = {
    schemaVersion: 1,
    monsterKey: 'owl_bear',
    name: 'Owl Bear',
    source: { book: 'Basic', page: '52', notes: '' },
    ac: 5,
    hitDice: '5',
    movement: "120' (40')",
    movementModes: { move: '120(40)' },
    attacks: [{ type: 'claw', count: 2, raw: '2 claws' }],
    damage: '1d6/1d6/1d8',
    damageParts: [{ raw: '1d6', dice: '1d6', rider: null }],
    numberAppearing: '1d2 (1d4)',
    saveAs: 'F3',
    morale: 9,
    treasureType: 'C',
    treasure: { raw: 'C', normalizedCodes: ['C'] },
    alignment: 'Neutral',
    xp: 175,
    specialAbilities: 'Bear hug',
    description: { text: 'Large omnivorous predator.', notes: '' },
    notes: ''
  };
  return { ...base, ...overrides };
}

describe('monster compendium pipeline', () => {
  it('imports valid canonical monsters', () => {
    clearMonsterIndexes();
    const { monsters, diagnostics } = importMonsterData([createCanonicalMonster()]);
    expect(monsters).toHaveLength(1);
    expect(diagnostics.imported).toBe(1);
    expect(getMonsterByKey('owl_bear')?.name).toBe('Owl Bear');
  });

  it('rejects duplicate monsterKey imports', () => {
    clearMonsterIndexes();
    expect(() => importMonsterData([createCanonicalMonster(), createCanonicalMonster()])).toThrow(/duplicate monsterKey/);
  });

  it('rejects invalid monster schema before acceptance', () => {
    clearMonsterIndexes();
    expect(() => importMonsterData([createCanonicalMonster({ monsterKey: 'Owl-Bear' })])).toThrow(/lowercase snake_case/);
  });

  it('sorts deterministically by monsterKey', () => {
    clearMonsterIndexes();
    const { monsters } = importMonsterData([
      createCanonicalMonster({ monsterKey: 'zombie', name: 'Zombie' }),
      createCanonicalMonster({ monsterKey: 'bat', name: 'Bat' })
    ]);
    const entries = buildMonsterCompendium(monsters);
    expect(entries.map((entry) => entry.system.monsterKey)).toEqual(['bat', 'zombie']);
  });

  it('validates stable index output in sync step', () => {
    clearMonsterIndexes();
    const { monsters } = importMonsterData([createCanonicalMonster()]);
    const first = syncMonsterCompendium({ sourceMonsters: monsters, existingEntries: [] });
    const second = syncMonsterCompendium({ sourceMonsters: monsters, existingEntries: [] });
    expect(JSON.stringify(first.entries)).toBe(JSON.stringify(second.entries));
  });

  it('integrity checker rejects duplicate keys', () => {
    const entry = { type: 'creature', name: 'Owl Bear', system: createCanonicalMonster() };
    expect(() => validateMonsterCompendiumIntegrity([entry, entry])).toThrow(/duplicate monsterKey/);
  });
});
