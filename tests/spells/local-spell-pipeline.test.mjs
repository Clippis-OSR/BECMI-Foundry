import { describe, it, expect } from 'vitest';
import { detectSpellCandidatesFromText, toReviewRows, sanitizeCanonicalRows, validateCanonicalRows } from '../../module/spells/local-spell-pipeline.mjs';

describe('local spell pipeline', () => {
  it('supports basic style list extraction', () => {
    const text = `FIRST LEVEL CLERIC SPELLS\nCure Light Wounds    Detect Magic\nFIRST LEVEL MAGIC-USER SPELLS\nCharm Person    Sleep`; 
    const out = detectSpellCandidatesFromText({ text, sourceBook: 'basic', sourcePage: 37 });
    expect(out.length).toBeGreaterThan(3);
    expect(out.find((c) => c.spellName === 'Charm Person')?.spellClass).toBe('Magic-User');
  });

  it('supports expert clerical description style with R/D/E', () => {
    const text = `FIRST LEVEL CLERIC SPELLS\nCure Light Wounds\nCure Light Wounds\nRange: Touch\nDuration: permanent\nEffect: heals 1d6+1 HP`; 
    const out = detectSpellCandidatesFromText({ text, sourceBook: 'expert', sourcePage: 23 });
    const row = out.find((c) => c.spellName === 'Cure Light Wounds');
    expect(row?.range).toBe('Touch');
    expect(row?.duration).toContain('permanent');
  });

  it('excludes heading false positives', () => {
    const text = `SEVENTH-LEVEL MAGIC-USER SPELLS\nSaving Throw\nExperience Table`; 
    const out = detectSpellCandidatesFromText({ text });
    expect(out.some((c) => /Saving Throw|Experience Table/i.test(c.spellName))).toBe(false);
  });

  it('review rows and canonical validation still work', () => {
    const rows = toReviewRows([{ spellName: 'Light', spellKey: 'light', spellClass: 'Magic-User', spellLevel: 1, sourcePage: 1, sourceBook: 'basic', sourceFile: 'basic.pdf', range: '', duration: '', effect: '', needsReview: false }]);
    const [canonical] = sanitizeCanonicalRows(rows);
    expect(canonical.spellName).toBe('Light');
    expect(validateCanonicalRows([canonical])).toEqual([]);
  });
});
