import { describe, expect, it } from 'vitest';
import { getActorAttackSources } from '../../module/combat/attack.mjs';
import { createActor, createItem, installFoundryStubs } from '../helpers/foundry-test-helpers.mjs';
import {
  buildCreatureActorDataFromCanonicalMonster,
  buildCreatureRuntimeFromMonster,
  buildNaturalAttackItemsFromMonster
} from '../../module/monsters/monster-runtime.mjs';
import { createCreatureFromCanonicalMonster } from '../../module/monsters/monster-importer.mjs';

installFoundryStubs();

function canonicalMonster(overrides = {}) {
  return {
    system: {
      monsterKey: 'owl_bear',
      schemaVersion: 1,
      name: 'Owl Bear',
      source: { book: 'Basic', page: '52', notes: '' },
      ac: 5,
      hitDice: '5',
      movement: "120' (40')",
      movementModes: { move: '120(40)' },
      attacks: [{ type: 'claw', count: 2, damage: '1d6' }, { type: 'bite', count: 1, damage: '1d8' }],
      damage: '1d6/1d6/1d8',
      damageParts: [{ raw: '1d6', dice: '1d6', rider: null }],
      numberAppearing: '1d2',
      saveAs: 'F3',
      morale: 9,
      treasureType: 'C',
      treasure: { raw: 'C', normalizedCodes: ['C'] },
      alignment: 'Neutral',
      xp: 175,
      specialAbilities: 'Bear hug on 18+',
      description: { text: 'Large predator', notes: '' },
      notes: 'raw'
    , ...(overrides.system ?? {}) }
  };
}

describe('monster runtime integration', () => {
  it('creates creature actor payload from canonical monster and preserves monsterKey', () => {
    const payload = buildCreatureActorDataFromCanonicalMonster(canonicalMonster());
    expect(payload.type).toBe('creature');
    expect(payload.system.monster.monsterKey).toBe('owl_bear');
    expect(payload.flags.becmi.monsterKey).toBe('owl_bear');
  });

  it('natural attacks become valid creature attack sources', () => {
    const items = buildNaturalAttackItemsFromMonster(canonicalMonster()).map((item, i) => createItem({ id: `n${i}`, ...item }));
    const actor = createActor({ type: 'creature', items });
    const sources = getActorAttackSources(actor);
    expect(sources).toHaveLength(2);
    expect(sources.every((s) => s.system.weaponType === 'natural')).toBe(true);
  });

  it('runtime exposes morale and xp safely', () => {
    const actor = createActor({ type: 'creature', system: buildCreatureActorDataFromCanonicalMonster(canonicalMonster()).system });
    const runtime = buildCreatureRuntimeFromMonster(actor);
    expect(runtime.morale).toBe(9);
    expect(runtime.xp).toBe(175);
  });

  it('preserves raw special ability text', () => {
    const actor = createActor({ type: 'creature', system: buildCreatureActorDataFromCanonicalMonster(canonicalMonster()).system });
    const runtime = buildCreatureRuntimeFromMonster(actor);
    expect(runtime.specialAbilitiesRaw).toBe('Bear hug on 18+');
  });

  it('invalid canonical monster data throws and cannot silently create actor', async () => {
    await expect(createCreatureFromCanonicalMonster({ system: { name: 'Bad' } }, { actorApi: { createActor: async () => ({ id: 'x' }) } })).rejects.toThrow();
  });
});
