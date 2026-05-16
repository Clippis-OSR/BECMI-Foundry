import { describe, it, expect, beforeEach } from 'vitest';
import { installFoundryStubs, createActor } from '../helpers/foundry-test-helpers.mjs';
import { getTurnUndead, getCanonicalTurnUndeadTable, resolveTurnUndeadOutcome } from '../../module/rules/turn-undead.mjs';
import { evaluateTurnUndead } from '../../module/rolls/becmi-rolls.mjs';

beforeEach(async () => {
  installFoundryStubs();
  const fs = await import('node:fs');
  const read = (f) => JSON.parse(fs.readFileSync(new URL(`../../data/classes/${f}.json`, import.meta.url), 'utf8'));
  globalThis.CONFIG = { BECMI: { classTables: { cleric: read('cleric'), fighter: read('fighter') } } };
});

describe('turn undead runtime', () => {
  it('progresses by cleric level from canonical table', () => {
    const l1 = getTurnUndead('cleric', 1);
    const l5 = getTurnUndead('cleric', 5);
    expect(l1.skeleton).toBe(7);
    expect(l5.skeleton).toBe('D');
  });

  it('lookup preserves canonical B/X categories only', () => {
    const table = getCanonicalTurnUndeadTable(getTurnUndead('cleric', 1));
    expect(Object.keys(table)).toEqual(['skeleton','zombie','ghoul','wight','wraith','mummy','spectre','vampire']);
  });

  it('supports none/turn/destroy outcomes deterministically', () => {
    expect(resolveTurnUndeadOutcome(9, 8).outcome).toBe('none');
    expect(resolveTurnUndeadOutcome(9, 10).outcome).toBe('turn');
    expect(resolveTurnUndeadOutcome('D', 2).outcome).toBe('destroy');
  });

  it('rejects non-cleric usage', () => {
    const fighter = createActor({ type: 'character', system: { derived: { turnUndead: null } } });
    expect(evaluateTurnUndead({ actor: fighter, undeadType: 'skeleton', rollTotal: 7 })).toMatchObject({ ok: false });
  });

  it('returns deterministic action output from supplied roll', () => {
    const cleric = createActor({ type: 'character', system: { derived: { turnUndead: { skeleton: 7 } } } });
    const result = evaluateTurnUndead({ actor: cleric, undeadType: 'skeleton', rollTotal: 7 });
    expect(result).toMatchObject({ ok: true, outcome: 'turn', entry: 7, rollTotal: 7 });
  });
});
