import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { extractDescriptionBlocksFromPage, sanitizeCanonicalRows } from '../../module/spells/local-spell-pipeline.mjs';

const seedPath = path.resolve('data/spells/seed-basic-expert.json');

describe('seed-first spell workflow', () => {
  it('seed manifest has required shape and unique key/class/level triples', async () => {
    const data = JSON.parse(await fs.readFile(seedPath, 'utf8'));
    const rows = data.spells;
    const seen = new Set();
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual(['name','needsDetails','reversible','reverseName','sourceBook','sourcePage','spellClass','spellKey','spellLevel'].sort());
      const t = `${row.spellKey}|${row.spellClass}|${row.spellLevel}`;
      expect(seen.has(t)).toBe(false);
      seen.add(t);
    }
  });

  it('extraction assist cannot create unknown spell rows', () => {
    const text = `Known Spell\nRange: 10\nDuration: 1 turn\nEffect: test\nUnknown Spell\nRange: 1\nDuration: 1\nEffect: x`;
    const out = extractDescriptionBlocksFromPage({ text, knownSpellNames: ['Known Spell'], knownSpellKeys: ['known-spell'] });
    expect(out.blocks.map((b) => b.spellKey)).toEqual(['known-spell']);
    expect(out.unmatchedCandidates.some((c) => c.spellKey === 'unknown-spell')).toBe(true);
  });

  it('canonical output keeps short summaries only', () => {
    const [row] = sanitizeCanonicalRows([{ spellKey: 'x', name: 'X', spellClass: 'Cleric', spellLevel: 1, range: 'r', duration: 'd', effect: 'e', save: '', manualNotes: 'a'.repeat(1200), tags: '', sourceBook: 'Basic', sourcePage: 1 }]);
    expect(row.summary.length).toBeLessThanOrEqual(280);
  });
});

import { execFileSync } from 'node:child_process';

it('build refuses unreviewed rows by default', async () => {
  await fs.mkdir(path.resolve('private/review'), { recursive: true });
  await fs.writeFile(path.resolve('private/review/spells-review.json'), JSON.stringify([{ spellKey: 'x', name: 'X', spellClass: 'Cleric', spellLevel: 1, range: 'r', duration: 'd', effect: 'e', reviewed: false }]));
  expect(() => execFileSync('node', ['scripts/build-spells.mjs'], { encoding: 'utf8' })).toThrow();
});

it('seed generation creates one review row per seed spell', async () => {
  execFileSync('node', ['scripts/seed-spells.mjs'], { encoding: 'utf8' });
  const seed = JSON.parse(await fs.readFile(seedPath, 'utf8')).spells;
  const review = JSON.parse(await fs.readFile(path.resolve('private/review/spells-review.json'), 'utf8'));
  expect(review).toHaveLength(seed.length);
});
