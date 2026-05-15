import { describe, expect, it, vi } from 'vitest';

import { weaponItemToAttackData } from '../../module/combat/attack.mjs';
import { rollAttack } from '../../module/combat/combat-engine.mjs';
import { createActor, createItem, installDeterministicRolls, installFoundryStubs } from '../helpers/foundry-test-helpers.mjs';

installFoundryStubs();

describe('missile ammo enforcement', () => {
  it('bow + arrows valid attack and consumes one arrow', async () => {
    installDeterministicRolls([15]);
    const bow = createItem({ id: 'w-bow', name: 'Short Bow', type: 'weapon', system: { equipped: true, weaponType: 'missile', ammoType: 'arrow', damage: '1d6' } });
    const arrows = createItem({ id: 'a-arrow', type: 'ammo', system: { ammoType: 'arrow', quantity: 3 } });
    const actor = createActor({ items: [bow, arrows] });
    const target = createActor({ id: 't1' });

    const result = await rollAttack({ attacker: actor, target, attackData: weaponItemToAttackData(bow), postToChat: false, rollDamageOnHit: false });

    expect(result.attackResult).toBeTruthy();
    expect(arrows.system.quantity).toBe(2);
  });

  it('crossbow + quarrels valid attack', async () => {
    installDeterministicRolls([12]);
    const crossbow = createItem({ id: 'w-xbow', type: 'weapon', system: { equipped: true, weaponType: 'missile', ammoType: 'quarrel', damage: '1d6' } });
    const quarrels = createItem({ id: 'a-quarrel', type: 'ammo', system: { ammoType: 'quarrel', quantity: 5 } });
    const actor = createActor({ items: [crossbow, quarrels] });

    const result = await rollAttack({ attacker: actor, target: createActor({ id: 't2' }), attackData: weaponItemToAttackData(crossbow), postToChat: false, rollDamageOnHit: false });

    expect(result.attackResult).toBeTruthy();
    expect(quarrels.system.quantity).toBe(4);
  });

  it('missing ammo blocks attack', async () => {
    const warn = vi.spyOn(globalThis.ui.notifications, 'warn').mockImplementation(() => {});
    const bow = createItem({ id: 'w-bow', type: 'weapon', system: { equipped: true, weaponType: 'missile', ammoType: 'arrow' } });
    const actor = createActor({ items: [bow] });

    const result = await rollAttack({ attacker: actor, target: createActor({ id: 't3' }), attackData: weaponItemToAttackData(bow), postToChat: false, rollDamageOnHit: false });

    expect(result.blockedByAmmo).toBe(true);
    expect(result.attackResult).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('incompatible ammo blocks attack', async () => {
    const bow = createItem({ id: 'w-bow', type: 'weapon', system: { equipped: true, weaponType: 'missile', ammoType: 'arrow' } });
    const quarrels = createItem({ id: 'a-quarrel', type: 'ammo', system: { ammoType: 'quarrel', quantity: 8 } });
    const actor = createActor({ items: [bow, quarrels] });

    const result = await rollAttack({ attacker: actor, target: createActor({ id: 't4' }), attackData: weaponItemToAttackData(bow), postToChat: false, rollDamageOnHit: false });

    expect(result.blockedByAmmo).toBe(true);
    expect(result.attackResult).toBeNull();
    expect(quarrels.system.quantity).toBe(8);
  });

  it('thrown missile weapon does not require ammo when ammoType is empty', async () => {
    installDeterministicRolls([11]);
    const javelin = createItem({ id: 'w-jav', type: 'weapon', system: { equipped: true, weaponType: 'missile', ammoType: null, damage: '1d6' } });
    const actor = createActor({ items: [javelin] });

    const result = await rollAttack({ attacker: actor, target: createActor({ id: 't5' }), attackData: weaponItemToAttackData(javelin), postToChat: false, rollDamageOnHit: false });

    expect(result.attackResult).toBeTruthy();
    expect(result.blockedByAmmo).toBeUndefined();
  });

  it('natural attack does not require ammo', async () => {
    installDeterministicRolls([16]);
    const bite = createItem({ id: 'w-bite', type: 'weapon', system: { equipped: true, weaponType: 'natural', ammoType: null, slot: 'natural', damage: '1d4' } });
    const actor = createActor({ type: 'creature', items: [bite] });

    const result = await rollAttack({ attacker: actor, target: createActor({ id: 't6' }), attackData: weaponItemToAttackData(bite), postToChat: false, rollDamageOnHit: false });

    expect(result.attackResult).toBeTruthy();
  });
});
