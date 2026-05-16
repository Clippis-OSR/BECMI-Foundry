import { beforeEach, describe, expect, it } from 'vitest';
import { clearMonsterIndexes, registerMonsterIndex } from '../../module/monsters/monster-index.mjs';
import {
  buildCoinTreasure,
  buildGemJewelryHooks,
  createTreasureVisibility,
  lookupCanonicalMonsterTreasure,
  parseCanonicalTreasureCodes
} from '../../module/treasure/treasure-helpers.mjs';

describe('treasure helpers', () => {
  beforeEach(() => clearMonsterIndexes());

  it('parses canonical treasure type codes from raw normalized strings', () => {
    expect(parseCanonicalTreasureCodes('(P)D, E + 5000gp')).toEqual(['P', 'D', 'E']);
  });

  it('normalizes coin generation deterministically', () => {
    const a = buildCoinTreasure({ cp: 100.9, sp: '20', ep: -5, gp: 3, pp: 'x' });
    const b = buildCoinTreasure({ cp: 100.9, sp: '20', ep: -5, gp: 3, pp: 'x' });
    expect(a).toEqual({ cp: 100, sp: 20, ep: 0, gp: 3, pp: 0 });
    expect(a).toEqual(b);
  });

  it('looks up canonical monster treasure data only', () => {
    registerMonsterIndex({
      system: {
        monsterKey: 'goblin-basic',
        treasureType: 'C',
        treasure: { raw: 'C', normalizedCodes: ['C'] }
      }
    });
    expect(lookupCanonicalMonsterTreasure('goblin-basic')).toMatchObject({
      monsterKey: 'goblin-basic',
      raw: 'C',
      codes: ['C'],
      canonicalOnly: true
    });
  });

  it('provides gem and jewelry placeholder hooks without automation', () => {
    expect(buildGemJewelryHooks()).toEqual({ gems: null, jewelry: null, placeholdersOnly: true });
    expect(createTreasureVisibility({ encounterTreasure: true, gmOnlyDetails: true })).toEqual({ encounterTreasure: true, gmOnlyDetails: true });
  });
});
