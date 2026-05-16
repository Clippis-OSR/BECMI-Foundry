import { describe, it, expect } from 'vitest';
import {
  buildCreatureActorData,
  buildMonsterItemData,
  importMonster,
  importMonsterCollection
} from '../../module/utils/monster-builder.mjs';

const sampleMonster = {
  id: 'owl-bear',
  name: 'Owl Bear',
  sourceBook: 'Basic',
  sourcePage: 52,
  armorClass: 5,
  hitDice: '5',
  movement: '120(40)',
  attacks: [
    { type: 'claw', count: 2, damage: '1d6' },
    { type: 'bite', count: 1, damage: '1d8', damageTypes: ['piercing'] }
  ],
  damage: '2d6/1d8',
  specialAbilities: 'hug on 18+ attack roll',
  notes: 'Ferocious predator'
};

describe('monster builder', () => {
  it('builds creature actor data with source flags and mapped monster fields', () => {
    const actorData = buildCreatureActorData(sampleMonster, { importVersion: 3 });
    expect(actorData.type).toBe('creature');
    expect(actorData.flags.becmi).toMatchObject({
      sourceMonsterId: 'owl-bear',
      sourceBook: 'Basic',
      importVersion: 3
    });
    expect(actorData.system.monster.armorClass).toBe(5);
    expect(actorData.system.monster.hitDice).toBe('5');
    expect(actorData.system.monster).not.toHaveProperty('avgHP');
  });

  it('builds natural attacks as equipped natural weapon items not counting encumbrance', () => {
    const items = buildMonsterItemData(sampleMonster);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      type: 'weapon',
      system: {
        weaponType: 'natural',
        slot: 'natural',
        equipped: true,
        hands: 'none',
        ammoType: null,
        attackCount: 2,
        attackLabel: 'claw',
        inventory: {
          location: 'worn',
          countsTowardEncumbrance: false
        }
      }
    });
    expect(items[1].system.damageTypes).toEqual(['piercing']);
  });

  it('dry-run import is deterministic', async () => {
    const first = await importMonsterCollection([sampleMonster], { dryRun: true });
    const second = await importMonsterCollection([sampleMonster], { dryRun: true });
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('update import path plans rebuild without duplicating attacks', async () => {
    const existing = { id: 'actor123', items: [{ id: 'a1', flags: { becmi: { importedNaturalAttack: true } } }] };
    const calls = { replace: 0, update: 0 };
    const report = await importMonster(sampleMonster, {
      dryRun: false,
      updateExisting: true,
      findExistingActor: async () => existing,
      actorApi: {
        async createActor() { throw new Error('should not create'); },
        async updateActor(actor) { calls.update += 1; return actor; },
        async replaceImportedNaturalAttacks(actor, items) {
          calls.replace += 1;
          expect(items).toHaveLength(2);
          return actor;
        }
      }
    });
    expect(report.action).toBe('update');
    expect(calls.update).toBe(1);
    expect(calls.replace).toBe(1);
  });

  it('natural attacks are canonical and have no ammo/encumbrance burden', () => {
    const [item] = buildMonsterItemData({ ...sampleMonster, attacks: [{ type: 'claw', count: 1 }] });
    expect(item.system.weaponType).toBe('natural');
    expect(item.system.slot).toBe('natural');
    expect(item.system.equipped).toBe(true);
    expect(item.system.inventory.location).toBe('worn');
    expect(item.system.inventory.countsTowardEncumbrance).toBe(false);
    expect(item.system).not.toHaveProperty('ammo');
  });

  it('repeated imports do not duplicate actors when updateExisting is false', async () => {
    const created = [];
    const createdSet = new Set();
    const actorApi = { async createActor(data) { created.push(data); createdSet.add(data.flags.becmi.sourceMonsterId); return { id: data.flags.becmi.sourceMonsterId }; } };
    const findExistingActor = async (monster) => (createdSet.has(monster.id) ? { id: monster.id, items: [] } : null);

    await importMonsterCollection([sampleMonster], { dryRun: false, actorApi, findExistingActor });
    await importMonsterCollection([sampleMonster], { dryRun: false, actorApi, findExistingActor });
    expect(created).toHaveLength(1);
  });
});
