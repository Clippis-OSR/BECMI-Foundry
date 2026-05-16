import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getCharacterSaves, getActorSaves, getCharacterTHAC0, getActorTHAC0 } from '../../module/rules/index.mjs';
import { getActorTHAC0 as getCombatActorTHAC0, getTargetAC } from '../../module/combat/attack.mjs';

const repoRoot = path.resolve(process.cwd());
const readClass = (id) => JSON.parse(fs.readFileSync(path.join(repoRoot, 'data/classes', `${id}.json`), 'utf8'));

describe('save + thac0 canonical runtime lookups', () => {
  beforeEach(() => {
    globalThis.game = { settings: { get: () => false } };
    globalThis.CONFIG = {
      BECMI: {
        classTables: {
          fighter: readClass('fighter'),
          cleric: readClass('cleric'),
          magicUser: readClass('magic-user'),
          thief: readClass('thief'),
          dwarf: readClass('dwarf'),
          elf: readClass('elf'),
          halfling: readClass('halfling')
        },
        characterTHAC0: JSON.parse(fs.readFileSync(path.join(repoRoot, "data/tables/character-thac0.json"), "utf8"))
      }
    };
  });

  it('resolves canonical save categories for class + level', () => {
    const saves = getCharacterSaves('fighter', 1);
    expect(saves).toEqual({
      deathRayPoison: 12,
      magicWands: 13,
      paralysisTurnStone: 14,
      dragonBreath: 15,
      rodStaffSpell: 16
    });
  });

  it('returns null when class or level progression row is invalid', () => {
    expect(getCharacterSaves('unknown-class', 1)).toBeNull();
    expect(getCharacterTHAC0('fighter', 99)).toBeNull();
  });

  it('shows class progression differences at same level', () => {
    const fighter = getCharacterTHAC0('fighter', 6);
    const magicUser = getCharacterTHAC0('magicUser', 6);
    expect(fighter).not.toBe(magicUser);
  });

  it('actor save/thac0 lookups derive from actor type + class + level', () => {
    const actor = { type: 'character', system: { class: 'cleric', derived: { level: 4 } }, name: 'Cleric' };
    const saves = getActorSaves(actor);
    const thac0 = getActorTHAC0(actor);
    expect(saves?.dragonBreath).toBeTypeOf('number');
    expect(thac0).toBeTypeOf('number');
  });


  it('creature THAC0 and saves read canonical monster fields only', () => {
    const actor = {
      type: 'creature',
      name: 'Strict Monster',
      system: {
        hd: '99',
        hitDice: '99',
        savesAs: { class: 'fighter', level: 20 },
        monster: { hitDice: '1', saveAs: 'F1' }
      }
    };
    expect(getActorTHAC0(actor)).toBeNull();
    expect(getActorSaves(actor)).toBeNull();
  });

  it('combat attack helpers use canonical derived THAC0 and descending AC', () => {
    const attacker = { type: 'character', system: { class: 'fighter', derived: { level: 2 }, combat: { thac0: 2 } } };
    const target = { system: { ac: { value: -1 }, combat: { ac: 9 } } };
    expect(getCombatActorTHAC0(attacker)).toBe(19);
    expect(getTargetAC(target)).toBe(-1);
  });
});
