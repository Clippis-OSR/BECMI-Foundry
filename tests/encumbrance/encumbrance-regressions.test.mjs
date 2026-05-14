import { describe, expect, it } from 'vitest';
import { getMovementTierByEncumbrance } from '../../module/rules/encumbrance.mjs';
import { calculateTotalEncumbrance } from '../../module/items/encumbrance.mjs';
import { createActor, createItem } from '../helpers/foundry-test-helpers.mjs';

describe('encumbrance movement tiers', () => {
  it('maps boundary values to canonical BECMI movement brackets', () => {
    expect(getMovementTierByEncumbrance(400).id).toBe('0-400');
    expect(getMovementTierByEncumbrance(401).id).toBe('401-800');
    expect(getMovementTierByEncumbrance(2401).normalFeetPerTurn).toBe(0);
  });

  it('calculates scoped totals and excludes treasure horde coins by default', () => {
    const actor = createActor({
      system: {
        currency: {
          carried: { gp: 20 },
          treasureHorde: { gp: 5000 }
        }
      },
      items: [
        createItem({ id: 'worn', system: { weight: 10, quantity: 1, inventory: { location: 'worn' } } }),
        createItem({ id: 'belt', system: { weight: 5, quantity: 1, inventory: { location: 'beltPouch' } } }),
        createItem({ id: 'pack', type: 'container', system: { weight: 2, quantity: 1, inventory: { location: 'backpack' } } }),
        createItem({ id: 'inpack', system: { weight: 8, quantity: 1, containerId: 'pack', inventory: { location: 'backpack' } } }),
        createItem({ id: 'sack', system: { weight: 4, quantity: 1, inventory: { location: 'sack1' } } }),
        createItem({ id: 'free', system: { weight: 3, quantity: 1, inventory: { location: 'carried' } } }),
        createItem({ id: 'horde', system: { weight: 50, quantity: 1, inventory: { location: 'treasureHorde' } } }),
        createItem({ id: 'ignored', system: { weight: 100, quantity: 1, inventory: { location: 'carried', countsTowardEncumbrance: false } } })
      ]
    });

    const totals = calculateTotalEncumbrance(actor);
    expect(totals.total).toBe(34); // 10+5+(2+8)+4+3 + carried coins(20/10)
    expect(totals.withoutBackpack).toBe(24);
    expect(totals.withoutSacks).toBe(30);
    expect(totals.onlyWornAndBeltPouch).toBe(17);
  });

  it('applies quantity multipliers to item encumbrance', () => {
    const actor = createActor({
      items: [createItem({ id: 'r', system: { weight: 2, quantity: 3, inventory: { location: 'carried' } } })]
    });
    expect(calculateTotalEncumbrance(actor).total).toBe(6);
  });
});
