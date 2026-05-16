import { describe, it, expect } from 'vitest';
import { buildSpellDetailContextAssist, preprocessOcrText } from '../../module/spells/local-spell-pipeline.mjs';

describe('spell detail context assist', () => {
  it('extracts nearby context and field lines', () => {
    const rows = [{ spellKey: 'fire-ball', name: 'Fire Ball' }];
    const pages = [{ sourceFile: 'x.pdf', sourcePage: 12, text: 'FIRE BALL\nRange: 240\'\nDuration: instant\nEffect: explosion\nSave vs spells halves' }];
    const out = buildSpellDetailContextAssist({ seedRows: rows, pages });
    expect(out[0].candidatePage).toBe(12);
    expect(out[0].nearbyRangeLines[0]).toContain('Range');
    expect(out[0].nearbySaveReferences.length).toBeGreaterThan(0);
  });

  it('cleans ocr hyphenation and apostrophes', () => {
    const cleaned = preprocessOcrText("Fire-\n ball ’quoted’  text");
    expect(cleaned).toContain("Fireball 'quoted'");
  });

  it('returns no canonical mutation behavior', () => {
    const rows = [{ spellKey: 'light', name: 'Light', range: '', duration: '' }];
    const out = buildSpellDetailContextAssist({ seedRows: rows, pages: [] });
    expect(rows[0].range).toBe('');
    expect(out[0].candidatePage).toBe(null);
  });
});
