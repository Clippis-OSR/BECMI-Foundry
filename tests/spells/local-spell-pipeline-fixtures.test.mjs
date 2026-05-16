import { describe, it, expect } from 'vitest';
import { analyzeSpellPage, detectSpellCandidatesFromText } from '../../module/spells/local-spell-pipeline.mjs';

describe('spell extraction fixtures', () => {
  it('extracts from spell list table under explicit heading', () => {
    const text = `FIRST LEVEL CLERIC SPELLS\nCure Light Wounds    Detect Magic\n`; 
    const out = detectSpellCandidatesFromText({ text });
    expect(out.some((c) => c.spellName === 'Cure Light Wounds')).toBe(true);
    expect(out.some((c) => c.spellName === 'Detect Magic')).toBe(true);
  });

  it('extracts range duration effect in description block', () => {
    const text = `SECOND LEVEL MAGIC-USER SPELLS\nInvisibility\nRange: 240'\nDuration: 6 turns\nEffect: one creature\n`;
    const [c] = detectSpellCandidatesFromText({ text });
    expect(c.range).toContain("240'");
    expect(c.duration).toContain('6 turns');
    expect(c.effect).toContain('one creature');
  });

  it('handles reversed spell star marker', () => {
    const text = `Third-Level Cleric Spells\nContinual Light*\nRange: 120'\nDuration: permanent\nEffect: 30-foot radius\n`;
    const [c] = detectSpellCandidatesFromText({ text });
    expect(c.spellName).toBe('Continual Light');
    expect(c.reversible).toBe(true);
  });

  it('handles multi-column OCR-ish text', () => {
    const text = `Eighth-Level Magic-User Spells\nMind Blank      Permanency      Symbol\n`;
    const out = detectSpellCandidatesFromText({ text });
    expect(out.length).toBe(3);
  });

  it('rejects false positives outside spell sections', () => {
    const text = `HIT CHARTS\nSword\nMass Combat\n`;
    const out = analyzeSpellPage({ text, sourceFile: 'x', sourcePage: 1 });
    expect(out.candidates.length).toBe(0);
    expect(out.diagnostics.falsePositiveLikeHeadings.length).toBeGreaterThan(0);
  });

  it('covers 28-candidate failure style page with no spell headings', () => {
    const text = `Item Cost\nSword\nCombat Options for Fighters\nMass Combat\nSpecialists\nHIT CHARTS\nRam\nArtillerist\nBarding\nLycanthropes\n`;
    const out = analyzeSpellPage({ text, sourceFile: 'bad.pdf', sourcePage: 7 });
    expect(out.candidates.length).toBe(0);
  });
});
