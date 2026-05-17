import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const testRoot = fs.mkdtemp(path.join(os.tmpdir(), 'spell-import-review-'));
const seedPath = path.resolve(await testRoot, 'data/spells/seed-basic-expert.json');
const canonicalSeedPath = path.resolve('data/spells/seed-basic-expert.json');
const reviewDir = path.resolve(await testRoot, 'data/spells/review');
const reviewJsonPath = path.join(reviewDir, 'spells-review.json');
const reviewWorkbookPath = path.join(reviewDir, 'spells-review-workbook.csv');
const reviewCsvPath = path.join(reviewDir, 'spells-review.csv');
const env = (overrides = {}) => ({ ...process.env, SPELLS_SEED_PATH: seedPath, SPELLS_REVIEW_DIR: reviewDir, SPELLS_REVIEW_JSON_PATH: reviewJsonPath, SPELLS_REVIEW_CSV_PATH: reviewCsvPath, SPELLS_REVIEW_WORKBOOK_PATH: reviewWorkbookPath, SPELLS_BACKUP_DIR: path.join(reviewDir, 'backups'), ...overrides });
const workbookHeader = 'spellKey,name,spellClass,spellLevel,sourceBook,sourcePage,range,duration,effect,save,tags,manualNotes,reviewed,pageVerified,suggestedSourcePage,suggestedRange,suggestedDuration,suggestedEffect,suggestedSave,suggestedTags,validationStatus,nextAction';

async function readMaybe(file) {
  try { return await fs.readFile(file, 'utf8'); } catch { return undefined; }
}
function workbookRowForSeedRow(row, overrides = {}) {
  const merged = {
    spellKey: row.spellKey, name: row.name, spellClass: row.spellClass, spellLevel: row.spellLevel,
    sourceBook: row.sourceBook, sourcePage: row.sourcePage ?? '',
    range: '', duration: '', effect: '', save: '', tags: '', manualNotes: '',
    reviewed: 'false', pageVerified: 'false',
    suggestedSourcePage: '', suggestedRange: '', suggestedDuration: '', suggestedEffect: '', suggestedSave: '', suggestedTags: '',
    validationStatus: 'pending', nextAction: 'fill details',
    ...overrides
  };
  return [
    merged.spellKey, merged.name, merged.spellClass, merged.spellLevel, merged.sourceBook, merged.sourcePage,
    merged.range, merged.duration, merged.effect, merged.save, merged.tags, merged.manualNotes, merged.reviewed, merged.pageVerified,
    merged.suggestedSourcePage, merged.suggestedRange, merged.suggestedDuration, merged.suggestedEffect, merged.suggestedSave, merged.suggestedTags,
    merged.validationStatus, merged.nextAction
  ].join(',');
}

describe.sequential('spell import review', () => {
  it('never leaves reviewed=true rows with missing required fields after import', async () => {
    const originalReviewJson = await readMaybe(reviewJsonPath);
    const originalWorkbook = await readMaybe(reviewWorkbookPath);

    const seed = JSON.parse(await fs.readFile(canonicalSeedPath, 'utf8'));
    const seedRows = Array.isArray(seed) ? seed : seed.spells;

    const companionKeys = seedRows
      .filter((r) => r.sourceBook === 'Companion' && (r.spellClass === 'Cleric' || r.spellClass === 'Druid'))
      .slice(0, 9)
      .map((r) => [r.spellKey, r.spellClass, Number(r.spellLevel)]);

    if (companionKeys.length === 0) return;

    const existingReview = companionKeys.map(([spellKey, spellClass, spellLevel]) => ({
      spellKey, name: spellKey, spellClass, spellLevel,
      sourceBook: 'Companion', sourcePage: '', reversible: false, reverseName: '', needsDetails: true,
      range: '', duration: '', effect: '', save: '', tags: [], manualNotes: '', pageVerified: false, reviewed: false
    }));

    const workbookRows = seedRows.map((row) => {
      const target = companionKeys.find(([spellKey, spellClass, spellLevel]) =>
        row.spellKey === spellKey && row.spellClass === spellClass && Number(row.spellLevel) === spellLevel);
      if (!target) return workbookRowForSeedRow(row);
      return workbookRowForSeedRow(row, {
        sourceBook: 'Companion',
        sourcePage: '200',
        range: '120ft', duration: '1turn', effect: 'Test effect', save: 'none', tags: 'companion', manualNotes: 'Companion canonical',
        reviewed: 'true', pageVerified: 'true',
        suggestedSourcePage: '200', suggestedRange: '120ft', suggestedDuration: '1turn', suggestedEffect: 'Test effect', suggestedSave: 'none', suggestedTags: 'companion',
        validationStatus: 'ready', nextAction: 'ready'
      });
    });

    const workbook = [
      workbookHeader,
      ...workbookRows
    ].join('\n');

    try {
      await fs.mkdir(reviewDir, { recursive: true });
      await fs.mkdir(path.dirname(seedPath), { recursive: true });
      await fs.writeFile(seedPath, JSON.stringify(seed, null, 2));
      await fs.writeFile(reviewJsonPath, JSON.stringify(existingReview, null, 2));
      await fs.writeFile(reviewWorkbookPath, workbook);

      execFileSync('node', ['scripts/spell-import-review.mjs'], { encoding: 'utf8', env: env() });

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
      await fs.mkdir(reviewDir, { recursive: true });
      await fs.writeFile(seedPath, JSON.stringify(seed, null, 2));
      await fs.writeFile(reviewJsonPath, JSON.stringify(existingReview, null, 2));
      const before = await fs.readFile(reviewJsonPath, 'utf8');
      await fs.writeFile(reviewWorkbookPath, workbook);

      expect(() => execFileSync('node', ['scripts/spell-import-review.mjs'], { encoding: 'utf8', env: env() })).toThrow();

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
      await fs.mkdir(reviewDir, { recursive: true });
      await fs.writeFile(seedPath, JSON.stringify(seed, null, 2));
      await fs.writeFile(reviewJsonPath, JSON.stringify(existingReview, null, 2));
      await fs.writeFile(reviewWorkbookPath, workbook);

      expect(() => execFileSync('node', ['scripts/spell-import-review.mjs'], { encoding: 'utf8', env: env() })).not.toThrow();

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
