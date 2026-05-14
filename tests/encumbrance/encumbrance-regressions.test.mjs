import { describe, expect, it } from 'vitest';
import { getMovementTierByEncumbrance } from '../../module/rules/encumbrance.mjs';

describe('encumbrance movement tiers', () => {
  it('maps boundary values to canonical BECMI movement brackets', () => {
    expect(getMovementTierByEncumbrance(400).id).toBe('0-400');
    expect(getMovementTierByEncumbrance(401).id).toBe('401-800');
    expect(getMovementTierByEncumbrance(2401).normalFeetPerTurn).toBe(0);
  });
});
