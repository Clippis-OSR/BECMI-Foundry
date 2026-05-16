import { describe, it, expect } from 'vitest';
import { extractSpellIndexFromPage, extractDescriptionBlocksFromPage, mergeSpellIndexAndDescriptions } from '../../module/spells/local-spell-pipeline.mjs';

describe('spell extraction fixtures', () => {
  it('expert-style page with cleric and magic-user lists', () => {
    const text = `SEVENTH-LEVEL CLERIC SPELLS\nRestoration\nEIGHTH-LEVEL MAGIC-USER SPELLS\nClone\nMass Charm\n`;
    const { indexRows } = extractSpellIndexFromPage({ text, sourceBook: 'expert', sourcePage: 10 });
    expect(indexRows.find((r) => r.spellName === 'Restoration')?.spellClass).toBe('Cleric');
    expect(indexRows.find((r) => r.spellName === 'Clone')?.spellClass).toBe('Magic-User');
  });

  it('multiple spell lists on same page are separated', () => {
    const text = `FIRST LEVEL CLERICAL SPELLS\nCure Light Wounds\nSECOND LEVEL CLERICAL SPELLS\nBless\nFIRST LEVEL MAGIC-USER SPELLS\nMagic Missile\n`;
    const { indexRows } = extractSpellIndexFromPage({ text });
    expect(indexRows.find((r) => r.spellName === 'Bless')?.spellLevel).toBe(2);
    expect(indexRows.find((r) => r.spellName === 'Magic Missile')?.spellClass).toBe('Magic-User');
  });

  it('basic style mixed list parsing', () => {
    const text = `FIRST LEVEL CLERIC SPELLS\nCure Light Wounds   Detect Magic\nFIRST LEVEL MAGIC-USER SPELLS\nCharm Person   Sleep\n`;
    const { indexRows } = extractSpellIndexFromPage({ text, sourceBook: 'basic', sourcePage: 37 });
    expect(indexRows.find((r) => r.spellName === 'Detect Magic')?.spellClass).toBe('Cleric');
    expect(indexRows.find((r) => r.spellName === 'Sleep')?.spellClass).toBe('Magic-User');
  });

  it('description prose must not become spell names and unmatched goes to debug candidates', () => {
    const text = `Invisibility\nRange: 240'\nDuration: 6 turns\nEffect: one creature\nThis spell can be used to change any metal\n`;
    const { blocks, unmatchedCandidates } = extractDescriptionBlocksFromPage({ text, knownSpellNames: ['Invisibility'], knownSpellKeys: ['invisibility'] });
    expect(blocks).toHaveLength(1);
    expect(blocks[0].spellName).toBe('Invisibility');
    expect(unmatchedCandidates.some((c) => c.candidate.startsWith('This spell'))).toBe(true);
  });

  it('saving throw table rows are rejected', () => {
    const text = `FIRST LEVEL CLERIC SPELLS\nDeath Ray or Poison\nMagic Wands\nDragon Breath\nCure Light Wounds\n`;
    const { indexRows } = extractSpellIndexFromPage({ text });
    expect(indexRows.some((r) => /Death Ray or Poison|Magic Wands|Dragon Breath/.test(r.spellName))).toBe(false);
    expect(indexRows.some((r) => r.spellName === 'Cure Light Wounds')).toBe(true);
  });

  it('range duration effect cannot be borrowed from adjacent spell', () => {
    const text = `Invisibility\nRange: 240'\nDuration: 6 turns\nEffect: one creature\nSleep\n`;
    const { blocks } = extractDescriptionBlocksFromPage({ text, knownSpellKeys: ['invisibility', 'sleep'] });
    const merged = mergeSpellIndexAndDescriptions([{ spellName: 'Sleep', spellKey: 'sleep', spellClass: 'Magic-User', spellLevel: 1 }], blocks);
    expect(merged[0].range).toBe('');
    expect(merged[0].needsReview).toBe(true);
  });
});
