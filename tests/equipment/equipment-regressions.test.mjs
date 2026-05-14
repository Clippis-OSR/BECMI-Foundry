import { describe, expect, it } from 'vitest';

import { equipItem } from '../../module/items/equipment-slots.mjs';
import { hasAvailableAmmo } from '../../module/items/ammo.mjs';
import { createActor, createItem, installFoundryStubs } from '../helpers/foundry-test-helpers.mjs';

installFoundryStubs();

describe('equipment regressions', () => {
  it('two-handed weapon blocks shield/offhand', async () => {
    const greatsword = createItem({ id: 'w2h', type: 'weapon', system: { slot: 'weaponMain', hands: 'two', weaponType: 'melee' } });
    const shield = createItem({ id: 's1', type: 'armor', system: { slot: 'shield' } });
    const actor = createActor({ items: [greatsword, shield] });

    await equipItem(actor, greatsword);
    await expect(equipItem(actor, shield)).rejects.toThrow(/Cannot equip shield while a two-handed weapon/);
  });

  it('shield occupies offhand', async () => {
    const shield = createItem({ id: 's1', type: 'armor', system: { slot: 'shield' } });
    const actor = createActor({ items: [shield] });

    await equipItem(actor, shield);
    expect(actor.system.equipmentSlots.shield).toBe('s1');
    expect(actor.system.equipmentSlots.weaponOffhand).toBe('s1');
  });

  it('natural attacks bypass hand restrictions', async () => {
    const bite = createItem({ id: 'n1', type: 'weapon', system: { slot: 'natural', weaponType: 'natural', hands: 'none' } });
    const greatsword = createItem({ id: 'w2h', type: 'weapon', system: { slot: 'weaponMain', hands: 'two', weaponType: 'melee' } });
    const actor = createActor({ type: 'creature', items: [bite, greatsword] });

    await equipItem(actor, greatsword);
    await equipItem(actor, bite);

    expect(actor.system.equipmentSlots.weaponMain).toBe('w2h');
    expect(bite.system.equipped).toBe(true);
    expect(bite.system.slot).toBe('natural');
    expect(bite.system.inventory.location).toBe('worn');
  });

  it('equipment slot and inventory location remain separate concepts', async () => {
    const sword = createItem({ id: 'w1', type: 'weapon', system: { slot: 'weaponMain', hands: 'one', weaponType: 'melee', inventory: { location: 'backpack' } } });
    const actor = createActor({ items: [sword] });
    await equipItem(actor, sword);

    expect(sword.system.slot).toBe('weaponMain');
    expect(sword.system.inventory.location).toBe('worn');
    expect(actor.system.equipmentSlots.weaponMain).toBe('w1');
  });

  it('ammo linkage validation requires matching ammo type with quantity', () => {
    const actor = createActor({
      items: [
        createItem({ id: 'a1', type: 'ammo', system: { ammoType: 'arrow', quantity: 0 } }),
        createItem({ id: 'a2', type: 'ammo', system: { ammoType: 'quarrel', quantity: 12 } })
      ]
    });

    expect(hasAvailableAmmo(actor, 'arrow')).toBe(false);
    expect(hasAvailableAmmo(actor, 'quarrel')).toBe(true);
    expect(hasAvailableAmmo(actor, '')).toBe(true);
  });
});
