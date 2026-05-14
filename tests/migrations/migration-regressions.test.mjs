import { describe, expect, it } from 'vitest';
import { validateActorSchema, validateItemSchema } from '../../module/utils/schema-validation.mjs';

describe('migration-oriented schema guards', () => {
  it('rejects legacy actor aliases that migrations should normalize', () => {
    expect(() => validateActorSchema({ type: 'monster', system: {} }, 'legacy-actor')).toThrow(/Invalid actor\.type "monster"/);
  });

  it('rejects legacy item slot aliases that migrations should normalize', () => {
    expect(() => validateItemSchema({ type: 'weapon', system: { slot: 'bothHands', weaponType: 'melee', hands: 'two' } }, 'legacy-item')).toThrow(/Invalid item\.system\.slot "bothHands"/);
  });
});
