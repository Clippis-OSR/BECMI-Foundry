import { describe, expect, it } from 'vitest';
import { validateActorSchema, validateItemSchema } from '../../module/utils/schema-validation.mjs';
import { normalizeItemLocation } from '../../module/items/inventory-manager.mjs';
import { normalizeLegacyItemSlotForMigration } from '../../module/items/legacy-slot-migration.mjs';

describe('migration-oriented schema guards', () => {
  it('rejects legacy actor aliases that migrations should normalize', () => {
    expect(() => validateActorSchema({ type: 'monster', system: {} }, 'legacy-actor')).toThrow(/Invalid actor\.type "monster"/);
  });

  it('rejects legacy item slot aliases that migrations should normalize', () => {
    expect(() => validateItemSchema({ type: 'weapon', system: { slot: 'bothHands', weaponType: 'melee', hands: 'two' } }, 'legacy-item')).toThrow(/Invalid item\.system\.slot "bothHands"/);
  });

  it('normalizes legacy inventory aliases to canonical values', () => {
    expect(normalizeItemLocation('equipped')).toBe('worn');
    expect(normalizeItemLocation('storage')).toBe('storage');
    expect(normalizeItemLocation('treasure')).toBe('treasure');
  });

  it('normalizes blank legacy armor slot to armor or shield', () => {
    expect(normalizeLegacyItemSlotForMigration({ type: 'armor', name: 'Chainmail', system: { slot: '' } })).toEqual({ slot: 'armor', shouldValidate: true });
    expect(normalizeLegacyItemSlotForMigration({ type: 'armor', name: 'Tower Shield', system: { slot: null } })).toEqual({ slot: 'shield', shouldValidate: true });
  });

  it('normalizes blank legacy weapon slot using inference signals', () => {
    expect(normalizeLegacyItemSlotForMigration({ type: 'weapon', system: { slot: '', weaponType: 'natural' } })).toEqual({ slot: 'natural', shouldValidate: true });
    expect(normalizeLegacyItemSlotForMigration({ type: 'weapon', system: { slot: '', ammoType: 'arrow' } })).toEqual({ slot: 'missile', shouldValidate: true });
    expect(normalizeLegacyItemSlotForMigration({ type: 'weapon', system: { slot: undefined, weaponType: 'melee' } })).toEqual({ slot: 'weaponMain', shouldValidate: true });
  });

  it('maps old alias slot values and leaves non-slot item types unvalidated when blank', () => {
    expect(normalizeLegacyItemSlotForMigration({ type: 'weapon', system: { slot: 'bothHands' } })).toEqual({ slot: 'weaponMain', shouldValidate: true });
    expect(normalizeLegacyItemSlotForMigration({ type: 'spell', system: { slot: '' } })).toEqual({ slot: '', shouldValidate: false });
  });
});
