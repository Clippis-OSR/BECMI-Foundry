import { describe, expect, it } from 'vitest';
import { getMovementTierByEncumbrance } from '../../module/rules/encumbrance.mjs';
import { buildContainerLoadSummary, calculateTotalEncumbrance, getContainerRules, getContainerTypeOptions } from '../../module/items/encumbrance.mjs';
import { createActor, createItem } from '../helpers/foundry-test-helpers.mjs';

describe('encumbrance movement tiers', () => {
  it('maps boundary values to canonical BECMI movement brackets', () => {
    expect(getMovementTierByEncumbrance(400).id).toBe('0-400');
    expect(getMovementTierByEncumbrance(401).id).toBe('401-800');
  });

  it('separates carried and stored totals deterministically', () => {
    const pack = createItem({ id: 'pack', type: 'container', system: { weight: 2, inventory: { location: 'backpack' }, containerType: 'backpack' } });
    const stash = createItem({ id: 'stash', type: 'container', system: { weight: 4, inventory: { location: 'storage' }, containerType: 'largeSack' } });
    const actor = createActor({ items: [
      createItem({ id: 'worn', system: { weight: 10, inventory: { location: 'worn' } } }),
      pack,
      createItem({ id: 'inpack', system: { weight: 8, containerId: 'pack', inventory: { location: 'backpack' } } }),
      stash,
      createItem({ id: 'instash', system: { weight: 30, containerId: 'stash', inventory: { location: 'storage' } } }),
      createItem({ id: 'tr', system: { weight: 5, inventory: { location: 'treasure' } } })
    ], system: { currency: { carried: { gp: 20 } } } });

    const totals = calculateTotalEncumbrance(actor);
    expect(totals.totalCarriedWeight).toBe(30);
    expect(totals.totalStoredWeight).toBe(69);
  });

  it('bag of holding uses proportional multiplier', () => {
    const bag = createItem({ id: 'bag', type: 'container', system: { weight: 0, inventory: { location: 'sack' }, containerType: 'bagOfHolding' } });
    const actor = createActor({ items: [bag, createItem({ id: 'gem', system: { weight: 1000, containerId: 'bag', inventory: { location: 'sack' } } })] });
    const totals = calculateTotalEncumbrance(actor);
    expect(totals.sackWeight).toBe(60);
  });

  it('container rules expose canonical capacities and options', () => {
    expect(getContainerRules('smallSack').capacityCn).toBe(200);
    expect(getContainerRules('backpack').capacityCn).toBe(400);
    expect(getContainerRules('largeSack').capacityCn).toBe(600);
    expect(getContainerRules('bagOfHolding').capacityCn).toBe(10000);
    expect(getContainerTypeOptions().some((o) => o.value === 'bagOfHolding')).toBe(true);
  });

  it('load summary reports overflow diagnostics', () => {
    const sack = createItem({ id: 's1', type: 'container', system: { weight: 1, inventory: { location: 'sack' }, containerType: 'smallSack' } });
    const actor = createActor({ items: [sack, createItem({ id: 'r', system: { weight: 250, containerId: 's1', inventory: { location: 'sack' } } })] });
    const summary = buildContainerLoadSummary(actor, sack);
    expect(summary.overflow).toBe(true);
    expect(summary.remainingCapacityCn).toBe(-50);
  });
});
