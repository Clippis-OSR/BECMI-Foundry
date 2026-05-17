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

  it('resolves Companion identities from canonical seed', async () => {
    const originalReviewJson = await readMaybe(reviewJsonPath);
    const originalWorkbook = await readMaybe(reviewWorkbookPath);

    const companionKeys = [
      ['cure-critical-wounds', 'Cleric', 5],
      ['truesight', 'Cleric', 5],
      ['aerial-servant', 'Cleric', 6],
      ['barrier', 'Cleric', 6],
      ['create-normal-animals', 'Cleric', 6]
    ];

    const seed = JSON.parse(await fs.readFile(seedPath, 'utf8'));
    const seedRows = Array.isArray(seed) ? seed : seed.spells;
    for (const [spellKey, spellClass, spellLevel] of companionKeys) {
      expect(seedRows.some((r) => r.spellKey === spellKey && r.spellClass === spellClass && Number(r.spellLevel) === spellLevel)).toBe(true);
    }

    const existingReview = companionKeys.map(([spellKey, spellClass, spellLevel]) => ({
      spellKey, name: spellKey, spellClass, spellLevel,
      sourceBook: 'Companion', sourcePage: '', reversible: false, reverseName: '', needsDetails: true,
      range: '', duration: '', effect: '', save: '', tags: [], manualNotes: '', pageVerified: false, reviewed: false
    }));

    const workbookRows = companionKeys.map(([spellKey, spellClass, spellLevel]) =>
      `${spellKey},${spellKey},${spellClass},${spellLevel},Companion,200,120ft,1turn,Test effect,none,companion,,false,true,200,120ft,1turn,Test effect,none,companion,pending,verify`
    );

    const workbook = [
      'spellKey,name,spellClass,spellLevel,sourceBook,sourcePage,range,duration,effect,save,tags,manualNotes,reviewed,pageVerified,suggestedSourcePage,suggestedRange,suggestedDuration,suggestedEffect,suggestedSave,suggestedTags,validationStatus,nextAction',
      ...workbookRows
    ].join('\n');

    try {
      await fs.mkdir(reviewDir, { recursive: true });
      await fs.writeFile(reviewJsonPath, JSON.stringify(existingReview, null, 2));
      await fs.writeFile(reviewWorkbookPath, workbook);

      execFileSync('node', ['scripts/spell-import-review.mjs'], { encoding: 'utf8' });

      const imported = JSON.parse(await fs.readFile(reviewJsonPath, 'utf8'));
      for (const [spellKey, spellClass, spellLevel] of companionKeys) {
        const row = imported.find((r) => r.spellKey === spellKey && r.spellClass === spellClass && Number(r.spellLevel) === spellLevel);
        expect(row).toBeTruthy();
        expect(row.sourceBook).toBe('Companion');
        expect(row.sourcePage).toBe('200');
      }
    } finally {
      if (originalReviewJson == null) await fs.rm(reviewJsonPath, { force: true }); else await fs.writeFile(reviewJsonPath, originalReviewJson);
      if (originalWorkbook == null) await fs.rm(reviewWorkbookPath, { force: true }); else await fs.writeFile(reviewWorkbookPath, originalWorkbook);
    }
  });

  it('does not write partial review JSON when workbook has unresolved rows', async () => {
    const originalSeed = await readMaybe(seedPath);
    const originalReviewJson = await readMaybe(reviewJsonPath);
    const originalWorkbook = await readMaybe(reviewWorkbookPath);

    const seed = { spells: [{ spellKey: 'known', name: 'Known', spellClass: 'Cleric', spellLevel: 5, sourceBook: 'Companion', sourcePage: 1, reversible: false, reverseName: '', needsDetails: true }] };
    const existingReview = [{ spellKey: 'known', name: 'Known', spellClass: 'Cleric', spellLevel: 5, sourceBook: 'Companion', sourcePage: '', reversible: false, reverseName: '', needsDetails: true, range: '', duration: '', effect: '', save: '', tags: [], manualNotes: '', pageVerified: false, reviewed: false }];
    const workbook = [
      'spellKey,name,spellClass,spellLevel,sourceBook,sourcePage,range,duration,effect,save,tags,manualNotes,reviewed,pageVerified,suggestedSourcePage,suggestedRange,suggestedDuration,suggestedEffect,suggestedSave,suggestedTags,validationStatus,nextAction',
      'unknown,Unknown,Cleric,5,Companion,200,120ft,1turn,Test effect,none,companion,,false,true,200,120ft,1turn,Test effect,none,companion,pending,verify'
    ].join('\n');

    try {
      await fs.writeFile(seedPath, JSON.stringify(seed, null, 2));
      await fs.mkdir(reviewDir, { recursive: true });
      await fs.writeFile(reviewJsonPath, JSON.stringify(existingReview, null, 2));
      const before = await fs.readFile(reviewJsonPath, 'utf8');
      await fs.writeFile(reviewWorkbookPath, workbook);

      expect(() => execFileSync('node', ['scripts/spell-import-review.mjs'], { encoding: 'utf8' })).toThrow();

      const after = await fs.readFile(reviewJsonPath, 'utf8');
      expect(after).toBe(before);
    } finally {
      if (originalSeed == null) await fs.rm(seedPath, { force: true }); else await fs.writeFile(seedPath, originalSeed);
      if (originalReviewJson == null) await fs.rm(reviewJsonPath, { force: true }); else await fs.writeFile(reviewJsonPath, originalReviewJson);
      if (originalWorkbook == null) await fs.rm(reviewWorkbookPath, { force: true }); else await fs.writeFile(reviewWorkbookPath, originalWorkbook);
    }
  });

  it('resolves canonical key cure-critical-wounds|Cleric|5 even when review JSON is stale', async () => {
    const originalSeed = await readMaybe(seedPath);
    const originalReviewJson = await readMaybe(reviewJsonPath);
    const originalWorkbook = await readMaybe(reviewWorkbookPath);

    const seed = {
      spells: [
        { spellKey: 'known', name: 'Known', spellClass: 'Cleric', spellLevel: 1, sourceBook: 'Basic', sourcePage: 1, reversible: false, reverseName: '', needsDetails: true },
        { spellKey: 'cure-critical-wounds', name: 'Cure Critical Wounds', spellClass: 'Cleric', spellLevel: 5, sourceBook: 'Companion', sourcePage: 200, reversible: false, reverseName: '', needsDetails: true }
      ]
    };
    // Stale review JSON intentionally missing cure-critical-wounds.
    const existingReview = [
      { spellKey: 'known', name: 'Known', spellClass: 'Cleric', spellLevel: 1, sourceBook: 'Basic', sourcePage: '', reversible: false, reverseName: '', needsDetails: true, range: '', duration: '', effect: '', save: '', tags: [], manualNotes: '', pageVerified: false, reviewed: false }
    ];
    const workbook = [
      'spellKey,name,spellClass,spellLevel,sourceBook,sourcePage,range,duration,effect,save,tags,manualNotes,reviewed,pageVerified,suggestedSourcePage,suggestedRange,suggestedDuration,suggestedEffect,suggestedSave,suggestedTags,validationStatus,nextAction',
      'cure-critical-wounds,Cure Critical Wounds,Cleric,5,Companion,200,Touch,Instant,Heals target,none,healing,Companion verified,true,true,200,Touch,Instant,Heals target,none,healing,ready,ready'
    ].join('\n');

    try {
      await fs.writeFile(seedPath, JSON.stringify(seed, null, 2));
      await fs.mkdir(reviewDir, { recursive: true });
      await fs.writeFile(reviewJsonPath, JSON.stringify(existingReview, null, 2));
      await fs.writeFile(reviewWorkbookPath, workbook);

      expect(() => execFileSync('node', ['scripts/spell-import-review.mjs'], { encoding: 'utf8' })).not.toThrow();

      const imported = JSON.parse(await fs.readFile(reviewJsonPath, 'utf8'));
      const row = imported.find((r) => `${r.spellKey}|${r.spellClass}|${r.spellLevel}` === 'cure-critical-wounds|Cleric|5');
      expect(row).toBeTruthy();
      expect(row.reviewed).toBe(true);
      expect(row.pageVerified).toBe(true);
      expect(row.manualNotes).toBe('Companion verified');
    } finally {
      if (originalSeed == null) await fs.rm(seedPath, { force: true }); else await fs.writeFile(seedPath, originalSeed);
      if (originalReviewJson == null) await fs.rm(reviewJsonPath, { force: true }); else await fs.writeFile(reviewJsonPath, originalReviewJson);
      if (originalWorkbook == null) await fs.rm(reviewWorkbookPath, { force: true }); else await fs.writeFile(reviewWorkbookPath, originalWorkbook);
    }
  });

});
