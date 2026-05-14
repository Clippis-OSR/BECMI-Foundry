import test from 'node:test';
import assert from 'node:assert/strict';

import { equipItem } from '../../module/items/equipment-slots.mjs';
import { hasAvailableAmmo } from '../../module/items/ammo.mjs';
import { createActor, createItem, installFoundryStubs } from '../helpers/foundry-test-helpers.mjs';

installFoundryStubs();

test('two-handed weapon blocks shield/offhand', async () => {
  const greatsword = createItem({ id: 'w2h', type: 'weapon', system: { slot: 'weaponMain', hands: 'two', weaponType: 'melee' } });
  const shield = createItem({ id: 's1', type: 'armor', system: { slot: 'shield' } });
  const actor = createActor({ items: [greatsword, shield] });

  await equipItem(actor, greatsword);
  await assert.rejects(() => equipItem(actor, shield), /Cannot equip shield while a two-handed weapon/);
});

test('shield occupies offhand', async () => {
  const shield = createItem({ id: 's1', type: 'armor', system: { slot: 'shield' } });
  const actor = createActor({ items: [shield] });

  await equipItem(actor, shield);
  assert.equal(actor.system.equipmentSlots.shield, 's1');
  assert.equal(actor.system.equipmentSlots.weaponOffhand, 's1');
});

test('natural attacks bypass hand restrictions', async () => {
  const bite = createItem({ id: 'n1', type: 'weapon', system: { slot: 'natural', weaponType: 'natural', hands: 'none' } });
  const greatsword = createItem({ id: 'w2h', type: 'weapon', system: { slot: 'weaponMain', hands: 'two', weaponType: 'melee' } });
  const actor = createActor({ type: 'creature', items: [bite, greatsword] });

  await equipItem(actor, greatsword);
  await equipItem(actor, bite);

  assert.equal(actor.system.equipmentSlots.weaponMain, 'w2h');
  assert.equal(bite.system.equipped, true);
  assert.equal(bite.system.slot, 'natural');
});

test('ammo linkage validation requires matching ammo type with quantity', () => {
  const actor = createActor({
    items: [
      createItem({ id: 'a1', type: 'ammo', system: { ammoType: 'arrow', quantity: 0 } }),
      createItem({ id: 'a2', type: 'ammo', system: { ammoType: 'quarrel', quantity: 12 } })
    ]
  });

  assert.equal(hasAvailableAmmo(actor, 'arrow'), false);
  assert.equal(hasAvailableAmmo(actor, 'quarrel'), true);
  assert.equal(hasAvailableAmmo(actor, ''), true);
});
