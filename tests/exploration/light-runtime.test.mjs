import { describe, expect, it } from 'vitest';
import {
  getActiveLightSummary,
  getExpiredLightSources,
  getLightSourceOptions,
  getLightSourceRules,
  normalizeActiveLightSource,
  tickLightSources
} from '../../module/exploration/light.mjs';

describe('light runtime', () => {
  it('ticks torch duration down by exploration turn', () => {
    const [ticked] = tickLightSources([{ lightKey: 'torch', remainingTurns: 6, active: true }], 1);
    expect(ticked.remainingTurns).toBe(5);
    expect(ticked.active).toBe(true);
  });

  it('ticks lantern duration down by exploration turn', () => {
    const [ticked] = tickLightSources([{ lightKey: 'lantern', remainingTurns: 24, active: true }], 1);
    expect(ticked.remainingTurns).toBe(23);
    expect(ticked.active).toBe(true);
  });

  it('reports expired light diagnostics', () => {
    const [ticked] = tickLightSources([{ lightKey: 'torch', remainingTurns: 1, active: true }], 1);
    expect(ticked.remainingTurns).toBe(0);
    expect(ticked.active).toBe(false);
    expect(ticked.diagnostics).toContain('expired light: torch');
  });

  it('falls back unknown light to generic rules with diagnostics', () => {
    const source = normalizeActiveLightSource({ lightKey: 'sunrod', active: true });
    expect(source.lightKey).toBe('genericLight');
    expect(source.diagnostics).toContain('unknown light source: sunrod');
  });

  it('never allows remaining turns below zero', () => {
    const [ticked] = tickLightSources([{ lightKey: 'torch', remainingTurns: 0, active: true }], 5);
    expect(ticked.remainingTurns).toBe(0);
  });

  it('handles active and inactive sources deterministically', () => {
    const summary = getActiveLightSummary([
      { lightKey: 'torch', remainingTurns: 2, active: true },
      { lightKey: 'lantern', remainingTurns: 0, active: true },
      { lightKey: 'unknown' }
    ]);

    expect(summary.activeCount).toBe(2);
    expect(summary.inactiveCount).toBe(1);
    expect(summary.brightestRadius).toBe(30);
    expect(getExpiredLightSources(summary.inactive).length).toBe(1);
  });

  it('exposes canonical source options and rules lookup', () => {
    const options = getLightSourceOptions();
    expect(options.some((option) => option.lightKey === 'torch')).toBe(true);
    expect(getLightSourceRules('oilFlask').durationTurns).toBe(24);
  });
});
