import { describe, expect, it } from 'vitest';

import { validateActorSchema, validateItemSchema } from '../../module/utils/schema-validation.mjs';

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
});
