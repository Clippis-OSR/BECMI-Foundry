import { describe, expect, it } from 'vitest';

import { validateActorSchema, validateItemSchema } from '../../module/utils/schema-validation.mjs';
import { createActor, createItem } from '../helpers/foundry-test-helpers.mjs';
import { validateItemContainerAssignment } from '../../module/items/inventory-manager.mjs';
import { validateMonsterProgression } from '../../module/utils/validate-rules-data.mjs';

describe('schema regressions', () => {
  it('canonical slot enforcement rejects non-canonical item slots', () => {
    expect(() => validateItemSchema({ type: 'weapon', system: { slot: 'bothHands', weaponType: 'melee', hands: 'two' } }, 'slot-test'))
      .toThrow(/Invalid item\.system\.slot "bothHands"/);
  });

  it('canonical actor type enforcement rejects monster alias', () => {
    expect(() => validateActorSchema({ type: 'monster', system: { saves: {} } }, 'actor-type-test'))
      .toThrow(/Invalid actor\.type "monster"/);
  });

  it('canonical inventory location enforcement rejects invalid values', () => {
    expect(() => validateItemSchema({ type: 'equipment', system: { inventory: { location: 'equipped' } } }, 'inventory-location-test'))
      .toThrow(/Invalid item\.system\.inventory\.location "equipped"/);
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
