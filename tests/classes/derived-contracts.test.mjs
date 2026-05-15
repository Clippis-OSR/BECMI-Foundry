import { describe, it, expect, beforeEach } from 'vitest';
import { installFoundryStubs, createActor, createItem } from '../helpers/foundry-test-helpers.mjs';
import { calculateActorAC, getClassLevelData, getCharacterTHAC0, getMovementTierByEncumbrance } from '../../module/rules/index.mjs';

beforeEach(async () => {
  installFoundryStubs();
  const fs = await import('node:fs');
  const read = (f) => JSON.parse(fs.readFileSync(new URL(`../../data/classes/${f}.json`, import.meta.url), 'utf8'));
  globalThis.CONFIG = { BECMI: { classTables: { cleric: read('cleric'), fighter: read('fighter'), thief: read('thief'), magicUser: read('magic-user') } } };
});

describe('canonical derived contracts', () => {
  it('movement derives from encumbrance tier', () => {
    const tier = getMovementTierByEncumbrance(450);
    expect(tier.normalFeetPerTurn).toBeTypeOf('number');
    expect(tier.encounterFeetPerRound).toBeTypeOf('number');
  });

  it('AC derives from armor/shield/dex modifiers', () => {
    const actor = createActor({ system: { abilities: { dex: { mod: 1 } }, equipmentSlots: { armor: 'a', shield: 's' } }, items: [
      createItem({ id: 'a', type: 'armor', system: { acBase: 5, equipped: true, slot: 'armor' } }),
      createItem({ id: 's', type: 'armor', system: { acBonus: 1, equipped: true, slot: 'shield' } })
    ] });
    expect(calculateActorAC(actor).value).toBeLessThan(9);
  });

  it('attack/spell slots/thief/turn-undead derive from class+level data', () => {
    const mu = getClassLevelData('magicUser', 1);
    const thief = getClassLevelData('thief', 1);
    const cleric = getClassLevelData('cleric', 1);
    expect(mu?.spellcasting?.slots ?? null).toBeTruthy();
    expect(thief?.thiefSkills ?? null).toBeTruthy();
    expect(cleric?.turnUndead ?? null).toBeTruthy();
  });
});
