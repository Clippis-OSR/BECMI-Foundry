import { describe, it, expect } from 'vitest';
import { normalizeMonsterRow } from '../../module/utils/monster-parser.mjs';
import { buildNaturalAttackItemsFromMonster } from '../../module/monsters/monster-runtime.mjs';

describe('monster import normalization', () => {
  it('normalizes treasure and movement modes', () => {
    const out = normalizeMonsterRow({ Name: 'Wyvern', AC: '3', 'Hit Dice': '7*', Move: '90 (30), Fly 240(80)', Attack: 'Bite/Sting', Damage: '2d8/1d6 poison', 'Save As': ' F 4 ', Morale: '9', 'Tresure Type': '(P)D, E + 5000gp', Aligment: 'Neutral', 'XP Value': '850' }, { sourceBook: 'Expert' });
    expect(out.movement).toEqual({ move: '90(30)', fly: '240(80)' });
    expect(out.treasureType).toBe('P, D, E');
    expect(out.saveAs).toBe('F4');
  });

  it('creates natural weapon items from canonical attacks with rider text', () => {
    const items = buildNaturalAttackItemsFromMonster({ system: { monsterKey: 'wyvern', attacks: [{ type: 'sting', count: 1, damage: '1d6', riderText: 'poison' }], damage: '1d6' } });
    expect(items[0].system.weaponType).toBe('natural');
    expect(items[0].system.riderText).toBe('poison');
    expect(items[0].flags.becmi.importedNaturalAttack).toBe(true);
  });
});
