import { describe, expect, it } from 'vitest';

import { validateActorSchema, validateItemSchema } from '../../module/utils/schema-validation.mjs';
import { createActor, createItem } from '../helpers/foundry-test-helpers.mjs';
import { validateItemContainerAssignment } from '../../module/items/inventory-manager.mjs';
import { validateMonsterProgression } from '../../module/utils/validate-rules-data.mjs';

describe('schema regressions', () => {
  it('creature monster schema has canonical defaults', () => {
    const creature = {
      type: 'creature',
      system: {
        saves: {},
        monster: {
          hitDice: '1',
          morale: 7,
          xp: 10,
          treasureType: '',
          movement: { land: { feetPerTurn: 120, feetPerRound: 40 }, special: '' }
        }
      }
    };
    expect(() => validateActorSchema(creature, 'creature-defaults')).not.toThrow();
  });

  it('canonical slot enforcement rejects non-canonical item slots', () => {
    expect(() => validateItemSchema({ type: 'weapon', system: { slot: 'bothHands', weaponType: 'melee', hands: 'two' } }, 'slot-test'))
      .toThrow(/Invalid item\.system\.slot "bothHands"/);
  });

  it('canonical actor type enforcement rejects monster alias', () => {
    expect(() => validateActorSchema({ type: 'monster', system: { saves: {} } }, 'actor-type-test'))
      .toThrow(/Invalid actor\.type "monster"/);
  });

  it('rejects creature with blank monster hitDice', () => {
    expect(() => validateActorSchema({ type: 'creature', system: { saves: {}, monster: { hitDice: '' } } }, 'hitdice-test'))
      .toThrow(/monster\.hitDice must not be empty/);
  });

  it('rejects non-numeric creature morale', () => {
    expect(() => validateActorSchema({ type: 'creature', system: { saves: {}, monster: { hitDice: '1', morale: 'abc', movement: { land: {} } } } }, 'morale-test'))
      .toThrow(/monster\.morale must be numeric/);
  });

  it('rejects non-numeric creature xp', () => {
    expect(() => validateActorSchema({ type: 'creature', system: { saves: {}, monster: { hitDice: '1', xp: 'abc', movement: { land: {} } } } }, 'xp-test'))
      .toThrow(/monster\.xp must be numeric/);
  });

  it('canonical inventory location enforcement rejects invalid values', () => {
    expect(() => validateItemSchema({ type: 'equipment', system: { inventory: { location: 'badPlace' } } }, 'inventory-location-test'))
      .toThrow(/Invalid item\.system\.inventory\.location "badPlace"/);
  });

  it('rejects self-containing and circular container references', () => {
    const packA = createItem({ id: 'packA', type: 'container', system: { inventory: { location: 'backpack' } } });
    const packB = createItem({ id: 'packB', type: 'container', system: { containerId: 'packA', inventory: { location: 'backpack' } } });
    const rope = createItem({ id: 'rope', system: { inventory: { location: 'backpack' } } });
    const actor = createActor({ items: [packA, packB, rope] });

    expect(() => validateItemContainerAssignment(actor, rope, { containerId: 'rope' })).toThrow(/inside itself/);
    expect(() => validateItemContainerAssignment(actor, packA, { containerId: 'packB' })).toThrow(/Circular container reference/);
  });

  it('accepts monster progression that references external lookup tables', () => {
    const warnings = validateMonsterProgression({ id: 'monster-progression', name: 'Monster Progression', uses: { thac0: 'monster-thac0', saves: 'monster-saves' } });
    expect(warnings).toEqual([]);
  });
});
