import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const seedPath = path.resolve('data/spells/seed-basic-expert.json');
const reviewDir = path.resolve('private/review');
const reviewJsonPath = path.join(reviewDir, 'spells-review.json');
const reviewWorkbookPath = path.join(reviewDir, 'spells-review-workbook.csv');

async function readMaybe(file) {
  try { return await fs.readFile(file, 'utf8'); } catch { return undefined; }
}

describe('spell import review', () => {
  it('never leaves reviewed=true rows with missing required fields after import', async () => {
    const originalSeed = await readMaybe(seedPath);
    const originalReviewJson = await readMaybe(reviewJsonPath);
    const originalWorkbook = await readMaybe(reviewWorkbookPath);

    const seed = {
      spells: [
        {
          spellKey: 'magic-missile', name: 'Magic Missile', spellClass: 'Magic-User', spellLevel: 1,
          sourceBook: 'Basic', sourcePage: 42, reversible: false, reverseName: '', needsDetails: true
        }
      ]
    };

    const existingReview = [
      {
        spellKey: 'magic-missile', name: 'Magic Missile', spellClass: 'Magic-User', spellLevel: 1,
        sourceBook: 'Basic', sourcePage: '', reversible: false, reverseName: '', needsDetails: true,
        range: '', duration: '', effect: '', save: '', tags: [], manualNotes: '', pageVerified: false, reviewed: false
      }
    ];

    const workbook = [
      'spellKey,name,spellClass,spellLevel,sourceBook,sourcePage,range,duration,effect,save,tags,manualNotes,reviewed,pageVerified,suggestedSourcePage,suggestedRange,suggestedDuration,suggestedEffect,suggestedSave,suggestedTags,validationStatus,nextAction',
      'magic-missile,Magic Missile,Magic-User,1,Basic,,120ft,1turn,CreatesDarts,,combat|arcane,,true,true,42,120ft,1turn,CreatesDarts,none,combat|arcane,pending,fill details'
    ].join('\n');

    try {
      await fs.writeFile(seedPath, JSON.stringify(seed, null, 2));
      await fs.mkdir(reviewDir, { recursive: true });
      await fs.writeFile(reviewJsonPath, JSON.stringify(existingReview, null, 2));
      await fs.writeFile(reviewWorkbookPath, workbook);

      execFileSync('node', ['scripts/spell-import-review.mjs'], { encoding: 'utf8' });

      const imported = JSON.parse(await fs.readFile(reviewJsonPath, 'utf8'));
      expect(imported).toHaveLength(1);
      expect(imported[0].reviewed).toBe(false);
      expect(imported[0].pageVerified).toBe(false);
      expect(imported[0].range).toBe('120ft');
      expect(imported[0].effect).toBe('CreatesDarts');
    } finally {
      if (originalSeed == null) await fs.rm(seedPath, { force: true }); else await fs.writeFile(seedPath, originalSeed);
      if (originalReviewJson == null) await fs.rm(reviewJsonPath, { force: true }); else await fs.writeFile(reviewJsonPath, originalReviewJson);
      if (originalWorkbook == null) await fs.rm(reviewWorkbookPath, { force: true }); else await fs.writeFile(reviewWorkbookPath, originalWorkbook);
    }
  });
});
