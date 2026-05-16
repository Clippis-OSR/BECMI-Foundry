import { describe, expect, it } from 'vitest';
import { calculateTotalEncumbrance } from '../../module/items/encumbrance.mjs';
import { getInventoryDiagnostics } from '../../module/items/inventory-manager.mjs';
import { createActor, createItem } from '../helpers/foundry-test-helpers.mjs';

describe('inventory polish diagnostics + carried/stored flow', () => {
  it('handles carried/stored/equipped/container/currency deterministically', () => {
    const carriedPack = createItem({ id: 'pack', type: 'container', system: { weight: 2, inventory: { location: 'backpack' }, containerType: 'backpack' } });
    const storedPack = createItem({ id: 'stash', type: 'container', system: { weight: 2, inventory: { location: 'storage' }, containerType: 'backpack' } });
    const actor = createActor({
      items: [
        createItem({ id: 'loose', system: { weight: 10, inventory: { location: 'carried' } } }),
        createItem({ id: 'eq', type: 'weapon', system: { weight: 5, equipped: true, inventory: { location: 'worn' } } }),
        createItem({ id: 'worn', system: { weight: 3, inventory: { location: 'worn' } } }),
        carriedPack,
        createItem({ id: 'inpack', system: { weight: 7, containerId: 'pack', inventory: { location: 'backpack' } } }),
        storedPack,
        createItem({ id: 'instored', system: { weight: 9, containerId: 'stash', inventory: { location: 'storage' } } }),
        createItem({ id: 'insack', system: { weight: 6, inventory: { location: 'sack' } } })
      ],
      system: { currency: { carried: { gp: 100 }, treasureHorde: { gp: 1000 } } }
    });
    const totals = calculateTotalEncumbrance(actor);
    expect(totals.totalCarriedWeight).toBe(50);
    expect(totals.totalStoredWeight).toBe(20);
    expect(totals.movementTier.id).toBe('0-400');
  });

  it('reports invalid states without mutating runtime data', () => {
    const a = createItem({ id: 'a', type: 'container', system: { weight: 1, containerId: 'b', inventory: { location: 'backpack' } } });
    const b = createItem({ id: 'b', type: 'container', system: { weight: 1, containerId: 'a', inventory: { location: 'backpack' } } });
    const broken = createItem({ id: 'broken', system: { quantity: -2, weight: 'bad', equipped: true, containerId: 'missing', inventory: { location: 'storage' } } });
    const actor = createActor({ items: [a, b, broken], system: { currency: { carried: { gp: -1 } } } });

    const diagnostics = getInventoryDiagnostics(actor);
    expect(diagnostics.some((d) => d.code === 'containerCycle')).toBe(true);
    expect(diagnostics.some((d) => d.code === 'invalidContainer')).toBe(true);
    expect(diagnostics.some((d) => d.code === 'equippedNotCarried')).toBe(true);
    expect(diagnostics.some((d) => d.code === 'invalidQuantity')).toBe(true);
    expect(diagnostics.some((d) => d.code === 'malformedEncumbrance')).toBe(true);
    expect(diagnostics.some((d) => d.code === 'invalidCurrency')).toBe(true);
    expect(broken.system.quantity).toBe(-2);
  });
});
