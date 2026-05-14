import test from 'node:test';
import assert from 'node:assert/strict';

import { validateActorSchema, validateItemSchema } from '../../module/utils/schema-validation.mjs';

test('canonical slot enforcement rejects non-canonical item slots', () => {
  assert.throws(
    () => validateItemSchema({ type: 'weapon', system: { slot: 'bothHands', weaponType: 'melee', hands: 'two' } }, 'slot-test'),
    /Invalid item\.system\.slot "bothHands"/
  );
});

test('canonical actor type enforcement rejects monster alias', () => {
  assert.throws(
    () => validateActorSchema({ type: 'monster', system: { saves: {} } }, 'actor-type-test'),
    /Invalid actor\.type "monster"/
  );
});


test('canonical inventory location enforcement rejects invalid values', () => {
  assert.throws(
    () => validateItemSchema({ type: 'equipment', system: { inventory: { location: 'equipped' } } }, 'inventory-location-test'),
    /Invalid item\.system\.inventory\.location "equipped"/
  );
});
