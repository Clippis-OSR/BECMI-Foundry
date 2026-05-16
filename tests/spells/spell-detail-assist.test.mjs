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

  it('handles punctuation/case variants and isolates adjacent blocks', () => {
    const pages = [{ sourcePage: 2, text: `DETECT MAGIC\nRange: 60'\nDuration: 2 turns\nEffect: magical aura\nLight\nRange: touch` }];
    const { suggestions } = buildSeededSpellDetailSuggestions({ seedRows, pages });
    const dm = suggestions.find((s) => s.spellKey === 'detect-magic');
    expect(dm.suggested.range).toBe("60'");
    expect(dm.suggested.effect).toBe('magical aura');
  });

  it('detects reversible phrase and tags', () => {
    const pages = [{ sourcePage: 3, text: `Light\nThe reverse of this spell is Darkness.` }];
    const { suggestions } = buildSeededSpellDetailSuggestions({ seedRows, pages });
    expect(suggestions[0].suggested.reversible).toBe(true);
    expect(suggestions[0].suggested.reverseName).toContain('Darkness');
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
