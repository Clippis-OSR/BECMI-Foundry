import { describe, it, expect } from 'vitest';
import {
  analyzeSpellPage,
  detectSpellCandidatesFromText,
  toReviewRows,
  sanitizeCanonicalRows,
  validateCanonicalRows,
} from '../../module/spells/local-spell-pipeline.mjs';

describe('local spell pipeline', () => {
  const sampleText = `Light (Magic-User Level 1)\nRange: 120'\nDuration: 6 turns\nEffect: 20' radius\nSaving Throw: None\nThis spell is reversible as Darkness.\n`;

  it('detects spell headings and key fields', () => {
    const [candidate] = detectSpellCandidatesFromText({ text: sampleText, sourceFile: 'basic.pdf', sourcePage: 12, sourceBook: 'basic' });
    expect(candidate.spellName).toBe('Light');
    expect(candidate.range).toContain("120'");
    expect(candidate.duration).toContain('6 turns');
    expect(candidate.effect).toContain("20' radius");
  });

  it('extracts reversible metadata', () => {
    const [candidate] = detectSpellCandidatesFromText({ text: sampleText });
    expect(candidate.reversible).toBe(true);
  });

  it('detects class/level list headings and two-column names', () => {
    const text = `Cleric Spells\nFirst Level\nCure Light Wounds    Detect Magic\nSecond Level\nBless\n`;
    const out = detectSpellCandidatesFromText({ text, sourceFile: 'x.pdf', sourcePage: 2 });
    expect(out.some((c) => c.spellName === 'Cure Light Wounds')).toBe(true);
    expect(out.some((c) => c.spellName === 'Detect Magic')).toBe(true);
  });

  it('detects name-line followed by field blocks and reversed star markers', () => {
    const text = `Magic-User Spells\nThird Level\nHaste*\nRange: 240'\nDuration: 3 turns\nEffect: one creature per level\n`;
    const [candidate] = detectSpellCandidatesFromText({ text });
    expect(candidate.spellName).toBe('Haste');
    expect(candidate.reversible).toBe(true);
  });

  it('returns diagnostics for skipped list pages', () => {
    const page = analyzeSpellPage({ text: 'Companion Spell Lists\nFirst Level\n', sourceFile: 'companion.pdf', sourcePage: 44 });
    expect(page.diagnostics.hasSpellListHeading).toBe(true);
    expect(page.diagnostics.skippedSpellListPage).toBe(true);
  });

  it('generates review rows', () => {
    const rows = toReviewRows(detectSpellCandidatesFromText({ text: sampleText, sourceFile: 'x.pdf', sourcePage: 1 }));
    expect(rows[0]).toHaveProperty('needsReview', true);
    expect(rows[0]).toHaveProperty('confidence');
  });

  it('sanitizes canonical output and avoids raw leakage', () => {
    const rows = toReviewRows(detectSpellCandidatesFromText({ text: sampleText, sourceFile: 'x.pdf', sourcePage: 1, sourceBook: 'basic' }));
    rows[0].needsReview = false;
    rows[0].manualNotes = 'Creates useful light for exploration.';
    const [canonical] = sanitizeCanonicalRows(rows.filter((r) => !r.needsReview));
    expect(canonical.summary).toBe('Creates useful light for exploration.');
    expect(JSON.stringify(canonical)).not.toContain('This spell is reversible as Darkness');
  });

  it('rejects duplicate spell keys', () => {
    const errors = validateCanonicalRows([
      { spellKey: 'light', spellName: 'Light', spellClass: 'Magic-User', spellLevel: 1, range: '', duration: '', effect: '', save: '', reversible: false, reverseName: '', tags: [], summary: '', source: {} },
      { spellKey: 'light', spellName: 'Light Copy', spellClass: 'Magic-User', spellLevel: 1, range: '', duration: '', effect: '', save: '', reversible: false, reverseName: '', tags: [], summary: '', source: {} },
    ]);
    expect(errors.join(' ')).toContain('duplicate spellKey');
  });
});
