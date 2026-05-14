import { describe, expect, it } from 'vitest';

import { calculateTotalEncumbrance } from '../../module/items/encumbrance.mjs';
import { equipItem } from '../../module/items/equipment-slots.mjs';
import {
  buildMonsterAttackSummary,
  getMonsterActions,
  getNaturalAttacks,
  weaponItemToAttackData
} from '../../module/combat/attack.mjs';
import { createActor, createItem, installFoundryStubs } from '../helpers/foundry-test-helpers.mjs';

installFoundryStubs();

describe('creature natural attacks + monster actions regressions', () => {
  it('natural attacks are returned by getNaturalAttacks', () => {
    const actor = createActor({
      type: 'creature',
      items: [
        createItem({ id: 'n1', type: 'weapon', system: { weaponType: 'natural', slot: 'natural', ammoType: null } }),
        createItem({ id: 'w1', type: 'weapon', system: { weaponType: 'melee', slot: 'weaponMain' } })
      ]
    });

    const attacks = getNaturalAttacks(actor);
    expect(attacks.map((item) => item.id)).toEqual(['n1']);
  });

  it('natural attacks bypass hand restrictions and do not require ammo', async () => {
    const bite = createItem({ id: 'n1', type: 'weapon', system: { slot: 'natural', weaponType: 'natural', hands: 'none', ammoType: null } });
    const greatsword = createItem({ id: 'w2h', type: 'weapon', system: { slot: 'weaponMain', hands: 'two', weaponType: 'melee' } });
    const actor = createActor({ type: 'creature', items: [bite, greatsword] });

    await equipItem(actor, greatsword);
    await equipItem(actor, bite);

    const biteAttackData = weaponItemToAttackData(bite);
    expect(actor.system.equipmentSlots.weaponMain).toBe('w2h');
    expect(biteAttackData.ammo).toBeNull();
    expect(bite.system.slot).toBe('natural');
  });

  it('natural attacks do not count toward encumbrance by default', () => {
    const actor = createActor({
      type: 'creature',
      items: [
        createItem({
          id: 'n1',
          type: 'weapon',
          system: {
            weaponType: 'natural',
            slot: 'natural',
            weight: 100,
            quantity: 1,
            inventory: { location: 'worn', countsTowardEncumbrance: false }
          }
        })
      ]
    });

    const total = calculateTotalEncumbrance(actor);
    expect(total.total).toBe(0);
  });

  it('monster action descriptors preserve type/label/description', () => {
    const actor = createActor({
      type: 'creature',
      system: {
        monster: {
          actions: [
            { type: 'special', label: 'Regenerate', description: 'Heals 1 hp per round.' },
            { type: 'breath', label: 'Fire Breath', description: 'Placeholder breath weapon entry.' },
            { type: 'saveRequired', label: 'Frightful Presence', description: 'Save vs spell or flee.' }
          ]
        }
      }
    });

    const actions = getMonsterActions(actor);
    expect(actions).toEqual([
      { type: 'special', label: 'Regenerate', description: 'Heals 1 hp per round.' },
      { type: 'breath', label: 'Fire Breath', description: 'Placeholder breath weapon entry.' },
      { type: 'saveRequired', label: 'Frightful Presence', description: 'Save vs spell or flee.' }
    ]);
  });

  it('attack summary builds from multiple natural attacks', () => {
    const actor = createActor({
      type: 'creature',
      items: [
        createItem({ id: 'n1', name: 'Claw', type: 'weapon', system: { weaponType: 'natural', slot: 'natural', damage: '1d4', attackLabel: 'Claw', attackCount: 2, ammoType: null } }),
        createItem({ id: 'n2', name: 'Bite', type: 'weapon', system: { weaponType: 'natural', slot: 'natural', damage: '1d8', attackLabel: 'Bite', attackCount: 1, ammoType: null } })
      ]
    });

    expect(buildMonsterAttackSummary(actor)).toBe('2× Claw (1d4), 1× Bite (1d8)');
  });
});
