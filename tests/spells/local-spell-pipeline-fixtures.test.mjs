import { describe, it, expect } from 'vitest';
import { extractSpellIndexFromPage, extractDescriptionBlocksFromPage, mergeSpellIndexAndDescriptions } from '../../module/spells/local-spell-pipeline.mjs';

describe('spell extraction fixtures', () => {
  it('separates cleric and magic-user on same page', () => {
    const text = `FIRST LEVEL CLERIC SPELLS\nCure Light Wounds\nDetect Magic\nFIRST LEVEL MAGIC-USER SPELLS\nCharm Person\nMagic Missile\nSleep\n`;
    const { indexRows } = extractSpellIndexFromPage({ text, sourceBook: 'basic', sourcePage: 37 });
    expect(indexRows.find((r) => r.spellName === 'Magic Missile')?.spellClass).toBe('Magic-User');
    expect(indexRows.find((r) => r.spellName === 'Cure Light Wounds')?.spellClass).toBe('Cleric');
  });

  it('parses description blocks from known spell names only', () => {
    const text = `Invisibility\nRange: 240'\nDuration: 6 turns\nEffect: one creature\nRandom heading\n`;
    const { blocks } = extractDescriptionBlocksFromPage({ text, knownSpellNames: ['Invisibility'] });
    expect(blocks).toHaveLength(1);
    expect(blocks[0].effect).toContain('one creature');
  });

  it('rejects heading false positives and companion style heading names', () => {
    const text = `Seventh-Level Magic-user Spells\nSpell Table\nCombat\n`;
    const { indexRows } = extractSpellIndexFromPage({ text });
    expect(indexRows.some((r) => /Seventh-Level Magic-user Spells/i.test(r.spellName))).toBe(false);
  });

  it('preserves duplicate spell names across classes', () => {
    const indexRows = [
      { spellName: 'Detect Magic', spellKey: 'detect-magic', spellClass: 'Cleric', spellLevel: 1, sourcePage: 1, sourceBook: 'basic', sourceFile: 'basic.pdf' },
      { spellName: 'Detect Magic', spellKey: 'detect-magic', spellClass: 'Magic-User', spellLevel: 1, sourcePage: 1, sourceBook: 'basic', sourceFile: 'basic.pdf' },
    ];
    const merged = mergeSpellIndexAndDescriptions(indexRows, [{ spellName: 'Detect Magic', spellKey: 'detect-magic', range: '60\'', duration: '2 turns', effect: 'see auras', sourcePage: 20, sourceBook: 'basic', sourceFile: 'basic.pdf' }]);
    expect(merged).toHaveLength(2);
  });
});
