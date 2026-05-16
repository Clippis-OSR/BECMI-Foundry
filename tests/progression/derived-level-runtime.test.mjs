import { beforeEach, describe, expect, it, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd());
const readClass = (id) => JSON.parse(fs.readFileSync(path.join(repoRoot, 'data/classes', `${id}.json`), 'utf8'));

let BECMIActor;

function makeActor(system) {
  const actor = Object.create(BECMIActor.prototype);
  actor.type = 'character'; actor.name = 'Test Actor'; actor.system = system; actor.items = [];
  return actor;
}

describe('derived runtime progression from xp', () => {
  beforeAll(async () => {
    globalThis.Actor = class { prepareDerivedData() {} };
    ({ BECMIActor } = await import('../../module/actors/becmi-actor.mjs'));
  });

  beforeEach(() => {
    globalThis.game = { settings: { get: () => false } };
    globalThis.foundry = {
      utils: {
        deepClone: (obj) => JSON.parse(JSON.stringify(obj)),
        mergeObject: (target, source) => ({ ...(target ?? {}), ...(source ?? {}) }),
        getProperty: (obj, key) => key.split('.').reduce((acc, part) => acc?.[part], obj)
      }
    };
    globalThis.CONFIG = { BECMI: {
      classTables: { fighter: readClass('fighter'), cleric: readClass('cleric'), magicUser: readClass('magic-user'), thief: readClass('thief'), dwarf: readClass('dwarf'), elf: readClass('elf'), halfling: readClass('halfling') },
      characterTHAC0: JSON.parse(fs.readFileSync(path.join(repoRoot, 'data/tables/character-thac0.json'), 'utf8'))
    } };
  });
  it('updates derived level/saves/attack progression from xp thresholds', () => {
    const actor = makeActor({ class: 'fighter', experience: { current: 4000 }, derived: {} });
    actor._prepareCharacterDerivedData();
    expect(actor.system.derived.level).toBe(3);
    expect(actor.system.derived.thac0).not.toBeUndefined();
    expect(actor.system.derived.saves).toBeTruthy();
  });
  it('updates thief skills, spell slots, and turn undead from level table rows', () => {
    const thief = makeActor({ class: 'thief', experience: { current: 2400 }, derived: {} });
    thief._prepareCharacterDerivedData();
    expect(thief.system.derived.hasThiefSkills).toBe(true);
    expect(thief.system.derived.thiefSkills).toBeTruthy();
    const cleric = makeActor({ class: 'cleric', experience: { current: 3000 }, derived: {} });
    cleric._prepareCharacterDerivedData();
    expect(cleric.system.derived.hasSpellcasting).toBe(true);
    expect(cleric.system.derived.turnUndead).toBeTruthy();
  });
  it('enforces demi-human level caps in runtime derivation', () => {
    const elf = makeActor({ class: 'elf', experience: { current: 999999999 }, derived: {} });
    elf._prepareCharacterDerivedData();
    expect(elf.system.derived.level).toBe(10);
  });
});
