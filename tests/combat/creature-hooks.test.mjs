import { describe, expect, it } from 'vitest';
import {
  getCreatureXP,
  calculateEncounterXP,
  getCreatureMorale,
  canRollMorale,
  getCreatureTreasureType,
  buildTreasureGenerationRequest,
  buildEncounterSummary
} from '../../module/combat/creature-hooks.mjs';

function makeActor({ type = 'creature', name = 'Creature', xp, morale, treasureType, id = null, sourceMonsterId = null } = {}) {
  return {
    id,
    type,
    name,
    system: { monster: { xp, morale, treasureType } },
    flags: { becmi: { sourceMonsterId } }
  };
}

describe('creature hooks', () => {
  it('getCreatureXP returns numeric XP', () => {
    expect(getCreatureXP(makeActor({ xp: '175' }))).toBe(175);
  });

  it('missing XP returns 0', () => {
    expect(getCreatureXP(makeActor())).toBe(0);
  });

  it('calculateEncounterXP sums only creatures', () => {
    const goblin = makeActor({ xp: 5 });
    const ogre = makeActor({ xp: 125 });
    const fighter = makeActor({ type: 'character', xp: 9999 });
    expect(calculateEncounterXP([goblin, { actor: ogre }, fighter])).toBe(130);
  });

  it('getCreatureMorale returns imported morale', () => {
    expect(getCreatureMorale(makeActor({ morale: 8 }))).toBe(8);
  });

  it('canRollMorale rejects characters', () => {
    expect(canRollMorale(makeActor({ type: 'character', morale: 9 }))).toBe(false);
  });

  it('getCreatureTreasureType returns canonical value', () => {
    expect(getCreatureTreasureType(makeActor({ treasureType: 'a, c ; h' }))).toEqual(['A', 'C', 'H']);
  });

  it('buildTreasureGenerationRequest returns data only', () => {
    const request = buildTreasureGenerationRequest(makeActor({ id: 'a1', name: 'Orc', treasureType: ['B'], sourceMonsterId: 'orc' }));
    expect(request).toEqual({
      monsterId: 'orc',
      sourceMonsterId: 'orc',
      name: 'Orc',
      treasureType: ['B'],
      actorType: 'creature',
      actorId: 'a1'
    });
  });

  it('buildEncounterSummary totals XP and groups treasure types', () => {
    const summary = buildEncounterSummary([
      makeActor({ name: 'Orc 1', xp: 10, morale: 8, treasureType: 'A', sourceMonsterId: 'orc' }),
      makeActor({ name: 'Orc 2', xp: 10, morale: 8, treasureType: ['A', 'C'], sourceMonsterId: 'orc' }),
      makeActor({ name: 'Ogre', xp: 125, morale: 9, treasureType: 'C', sourceMonsterId: 'ogre' })
    ]);

    expect(summary.creatureCount).toBe(3);
    expect(summary.totalXP).toBe(145);
    expect(summary.treasureTypes).toEqual({ A: 2, C: 2 });
    expect(summary.sourceMonsterIds).toEqual(['orc', 'orc', 'ogre']);
  });

  it('non-creature actors are ignored or handled safely', () => {
    const character = makeActor({ type: 'character', xp: 500, morale: 12, treasureType: 'Z' });
    expect(getCreatureXP(character)).toBe(0);
    expect(getCreatureMorale(character)).toBeNull();
    expect(getCreatureTreasureType(character)).toEqual([]);
    expect(buildEncounterSummary([character]).creatureCount).toBe(0);
  });
});
