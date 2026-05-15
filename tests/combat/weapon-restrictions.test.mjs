import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createActor, createItem, installDeterministicRolls, installFoundryStubs } from '../helpers/foundry-test-helpers.mjs';
import { rollAttack } from '../../module/combat/combat-engine.mjs';
import { weaponItemToAttackData } from '../../module/combat/attack.mjs';
import { getActorAttackSources } from '../../module/combat/attack.mjs';

const target = () => createActor({ id: 't', type: 'creature', system: { combat: { ac: 9 } } });

describe('weapon restrictions', () => {
  beforeEach(() => {
    installFoundryStubs();
    installDeterministicRolls([15, 15, 15, 15, 15]);
    globalThis.ui = { notifications: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } };
  });

  it('cleric blocked from edged weapon', async () => {
    const sword = createItem({ id: 'sword', name: 'Sword', type: 'weapon', system: { equipped: true, weaponId: 'sword', hands: 'one' } });
    const actor = createActor({ type: 'character', system: { class: 'cleric', equipmentSlots: {} }, items: [sword] });
    const result = await rollAttack({ attacker: actor, target: target(), attackData: weaponItemToAttackData(sword), postToChat: false, rollDamageOnHit: false });
    expect(result.attackResult).toBeNull();
  });

  it('magic-user blocked from non-permitted weapons', async () => {
    const mace = createItem({ id: 'mace', name: 'Mace', type: 'weapon', system: { equipped: true, weaponId: 'mace', hands: 'one' } });
    const actor = createActor({ type: 'character', system: { class: 'magic-user', equipmentSlots: {} }, items: [mace] });
    const result = await rollAttack({ attacker: actor, target: target(), attackData: weaponItemToAttackData(mace), postToChat: false, rollDamageOnHit: false });
    expect(result.attackResult).toBeNull();
  });

  it('fighter/thief/dwarf/elf/halfling permitted weapons included', () => {
    const sword = createItem({ id: 'sword', type: 'weapon', system: { equipped: true, weaponId: 'sword' } });
    for (const cls of ['fighter', 'thief', 'dwarf', 'elf', 'halfling']) {
      const actor = createActor({ type: 'character', system: { class: cls, equipmentSlots: {} }, items: [sword] });
      expect(getActorAttackSources(actor).map((i) => i.id)).toContain('sword');
    }
  });

  it('two-handed weapon + shield blocked', async () => {
    const gs = createItem({ id: 'gs', name: 'Greatsword', type: 'weapon', system: { equipped: true, weaponId: 'twoHandedSword', hands: 'two' } });
    const shield = createItem({ id: 'sh', type: 'armor', system: { equipped: true, slot: 'shield' } });
    const actor = createActor({ type: 'character', system: { class: 'fighter', equipmentSlots: { shield: 'sh' } }, items: [gs, shield] });
    const result = await rollAttack({ attacker: actor, target: target(), attackData: weaponItemToAttackData(gs), postToChat: false, rollDamageOnHit: false });
    expect(result.attackResult).toBeNull();
  });

  it('monster natural attack not blocked by PC restrictions', async () => {
    const bite = createItem({ id: 'bite', name: 'Bite', type: 'weapon', system: { equipped: true, weaponType: 'natural', slot: 'natural', hands: 'none' } });
    const actor = createActor({ type: 'creature', items: [bite], system: { combat: { thac0: 19 } } });
    const result = await rollAttack({ attacker: actor, target: target(), attackData: weaponItemToAttackData(bite), postToChat: false, rollDamageOnHit: false });
    expect(result.attackResult).toBeTruthy();
  });
});
