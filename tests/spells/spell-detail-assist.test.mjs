import { describe, it, expect } from 'vitest';
import { buildSeededSpellDetailSuggestions, mergeSpellSuggestionsIntoReview, sanitizeCanonicalRows } from '../../module/spells/local-spell-pipeline.mjs';

describe('spell detail assist', () => {
  const seedRows = [
    { spellKey: 'light', name: 'Light', spellClass: 'Cleric', spellLevel: 1, sourceBook: 'Basic' },
    { spellKey: 'detect-magic', name: 'Detect Magic', spellClass: 'Magic-User', spellLevel: 1, sourceBook: 'Basic' }
  ];

  it('matches seeded-only and does not invent new rows', () => {
    const pages = [{ sourcePage: 1, text: `Light\nRange : 120'\nDuration: 6 turns\nEffect: object glows\nUnknown Spell\nRange: 10'` }];
    const { suggestions } = buildSeededSpellDetailSuggestions({ seedRows, pages });
    expect(suggestions.length).toBe(1);
    expect(suggestions[0].spellKey).toBe('light');
  });

  it('heading immediately followed by prose still captures sourcePage', () => {
    const pages = [{ sourcePage: 8, text: `Light The object shines brightly for one turn.` }];
    const { suggestions } = buildSeededSpellDetailSuggestions({ seedRows, pages });
    expect(suggestions[0].sourcePage).toBe(8);
  });

  it('supports centered uppercase headings', () => {
    const pages = [{ sourcePage: 2, text: `   DETECT MAGIC   \nRange: 60'\nDuration: 2 turns\nEffect: magical aura` }];
    const { suggestions } = buildSeededSpellDetailSuggestions({ seedRows, pages });
    const dm = suggestions.find((s) => s.spellKey === 'detect-magic');
    expect(dm.suggested.range).toBe("60'");
    expect(dm.suggested.effect).toBe('magical aura');
  });

  it('repairs broken OCR hyphenation', () => {
    const pages = [{ sourcePage: 9, text: `Detect Mag-\nic\nRange: 30'` }];
    const { suggestions } = buildSeededSpellDetailSuggestions({ seedRows, pages });
    expect(suggestions.some((s) => s.spellKey === 'detect-magic')).toBe(true);
  });

  it('extracts partial fields when available', () => {
    const pages = [{ sourcePage: 10, text: `Light\nRange: 120'` }];
    const { suggestions } = buildSeededSpellDetailSuggestions({ seedRows, pages });
    expect(suggestions[0].suggested.range).toBe("120'");
    expect(suggestions[0].suggested.duration).toBe('');
  });

  it('detects reversible phrase and tags', () => {
    const pages = [{ sourcePage: 3, text: `Light\nThe reverse of this spell is Darkness.` }];
    const { suggestions } = buildSeededSpellDetailSuggestions({ seedRows, pages });
    expect(suggestions[0].suggested.reversible).toBe(true);
    expect(suggestions[0].suggested.reverseName).toContain('Darkness');
  });

  it('uses fuzzy seeded-name matching but never creates rows', () => {
    const pages = [{ sourcePage: 11, text: `Detect-Magic\nDuration: 2 turns` }];
    const { suggestions } = buildSeededSpellDetailSuggestions({ seedRows, pages });
    expect(suggestions.some((s) => s.spellKey === 'detect-magic')).toBe(true);
    expect(suggestions.some((s) => s.spellKey === 'unknown-spell')).toBe(false);
  });

  it('marks duplicate names ambiguous across classes', () => {
    const seeds = [...seedRows, { spellKey: 'light-mu', name: 'Light', spellClass: 'Magic-User', spellLevel: 1, sourceBook: 'Basic' }];
    const { suggestions } = buildSeededSpellDetailSuggestions({ seedRows: seeds, pages: [{ text: 'Light\nRange: 10\'' }] });
    expect(suggestions.every((s) => s.ambiguousMatch)).toBe(true);
  });

  it('public output sanitization omits suggestions blobs', () => {
    const merged = mergeSpellSuggestionsIntoReview([{ ...seedRows[0], reviewed: true }], [{ spellKey: 'light', sourcePage: 1, suggested: { range: "120'", duration: '', effect: '', save: '', reversible: null, reverseName: '', tags: [], manualNotes: '' }, confidenceByField: {}, needsReview: true, ambiguousMatch: false }]);
    const canonical = sanitizeCanonicalRows(merged.map((r) => ({ ...r, range: "120'", duration: '1 turn', effect: 'glow', reviewed: true })));
    expect(canonical[0].spellKey).toBe('light');
    expect(canonical[0].summary).toBeTypeOf('string');
  });
});
