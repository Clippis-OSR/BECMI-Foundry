import { describe, expect, it } from 'vitest';
import {
  getActiveLightSummary,
  getExpiredLightSources,
  getLightSourceOptions,
  getLightSourceRules,
  normalizeLightSource,
  tickLightSources
} from '../../module/exploration/light.mjs';

describe('light runtime', () => {
  it('torch duration decreases per exploration turn', () => {
    const [ticked] = tickLightSources([{ lightKey: 'torch', remainingTurns: 6, active: true }], 1);
    expect(ticked.remainingTurns).toBe(5);
    expect(ticked.active).toBe(true);
  });

  it('lantern duration decreases per exploration turn', () => {
    const [ticked] = tickLightSources([{ lightKey: 'lantern', remainingTurns: 24, active: true }], 1);
    expect(ticked.remainingTurns).toBe(23);
    expect(ticked.active).toBe(true);
  });

  it('continualLight does not expire', () => {
    const [ticked] = tickLightSources([{ lightKey: 'continualLight', active: true }], 10);
    expect(ticked.remainingTurns).toBe(Number.POSITIVE_INFINITY);
    expect(ticked.active).toBe(true);
  });

  it('reports expired light diagnostics', () => {
    const [ticked] = tickLightSources([{ lightKey: 'torch', remainingTurns: 1, active: true }], 1);
    expect(ticked.remainingTurns).toBe(0);
    expect(ticked.active).toBe(false);
    expect(ticked.diagnostics).toContain('expired light: torch');
  });

  it('normalizes invalid lightKey with diagnostics', () => {
    const source = normalizeLightSource({ lightKey: 'sunrod', active: true });
    expect(source.lightKey).toBe('genericLight');
    expect(source.diagnostics).toContain('invalid lightKey: sunrod');
  });

  it('remainingTurns never drops below 0', () => {
    const [ticked] = tickLightSources([{ lightKey: 'torch', remainingTurns: 0, active: true }], 5);
    expect(ticked.remainingTurns).toBe(0);
  });

  it('tracks deterministic diagnostics for negative remainingTurns', () => {
    const source = normalizeLightSource({ lightKey: 'torch', remainingTurns: -4 });
    expect(source.remainingTurns).toBe(0);
    expect(source.diagnostics).toContain('negative remainingTurns: torch');
  });

  it('handles active and inactive sources deterministically', () => {
    const summary = getActiveLightSummary([
      { lightKey: 'torch', remainingTurns: 2, active: true },
      { lightKey: 'lantern', remainingTurns: 0, active: true },
      { lightKey: 'continualLight' }
    ]);

    expect(summary.activeCount).toBe(2);
    expect(summary.inactiveCount).toBe(1);
    expect(summary.brightestRadiusFeet).toBe(30);
    expect(getExpiredLightSources(summary.inactive).length).toBe(1);
  });

  it('exposes canonical source options and rules lookup', () => {
    const options = getLightSourceOptions();
    expect(options.some((option) => option.lightKey === 'torch')).toBe(true);
    expect(getLightSourceRules('oilFlask').durationTurns).toBe(24);
  });
});
