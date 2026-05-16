import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getCharacterLevelFromXP } from '../../module/rules/lookups.mjs';
const repoRoot = path.resolve(process.cwd());
const readClass = (id) => JSON.parse(fs.readFileSync(path.join(repoRoot, 'data/classes', `${id}.json`), 'utf8'));

describe('xp runtime progression', () => {
  beforeEach(() => {
    globalThis.game = { settings: { get: () => false } };
    globalThis.CONFIG = { BECMI: { classTables: {
      fighter: readClass('fighter'), cleric: readClass('cleric'), magicUser: readClass('magic-user'), thief: readClass('thief'), dwarf: readClass('dwarf'), elf: readClass('elf'), halfling: readClass('halfling')
    } } };
  });
  it('derives level from xp thresholds using class tables only', () => {
    expect(getCharacterLevelFromXP('fighter', 0)).toBe(1);
    expect(getCharacterLevelFromXP('fighter', 1999)).toBe(1);
    expect(getCharacterLevelFromXP('fighter', 2000)).toBe(2);
    expect(getCharacterLevelFromXP('fighter', 4000)).toBe(3);
  });
  it('enforces demi-human caps from canonical limits', () => {
    expect(getCharacterLevelFromXP('dwarf', Number.MAX_SAFE_INTEGER)).toBe(12);
    expect(getCharacterLevelFromXP('elf', Number.MAX_SAFE_INTEGER)).toBe(10);
    expect(getCharacterLevelFromXP('halfling', Number.MAX_SAFE_INTEGER)).toBe(8);
  });
  it('handles invalid xp deterministically', () => {
    expect(getCharacterLevelFromXP('fighter', -1)).toBe(1);
    expect(getCharacterLevelFromXP('fighter', 'bad')).toBe(1);
    expect(getCharacterLevelFromXP('fighter', null)).toBe(1);
  });
});
