import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const testRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'review-spells-guardrails-'));
const seedPath = path.resolve(testRoot, 'data/spells/seed-basic-expert.json');
const contextPath = path.resolve(testRoot, 'data/spells/review/spell-detail-context.json');
const reviewJsonPath = path.resolve(testRoot, 'data/spells/review/spells-review.json');
const reviewCsvPath = path.resolve(testRoot, 'data/spells/review/spells-review.csv');
const unmatchedPath = path.resolve(testRoot, 'private/generated/unmatched-description-candidates.json');
const env = () => ({ ...process.env, SPELLS_SEED_PATH: seedPath, SPELLS_CONTEXT_PATH: contextPath, SPELLS_REVIEW_JSON_PATH: reviewJsonPath, SPELLS_REVIEW_CSV_PATH: reviewCsvPath, SPELLS_REVIEW_DIR: path.dirname(reviewJsonPath), SPELLS_UNMATCHED_CANDIDATES_PATH: unmatchedPath });

async function readJsonMaybe(file) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return undefined; }
}

describe.sequential('review:spells guardrails', () => {
  it('uses seed rows as authoritative source and ignores OCR-only garbage rows', async () => {
    const originalSeed = await fs.readFile(seedPath, 'utf8').catch(() => undefined);
    const originalContext = await readJsonMaybe(contextPath);
    const originalReview = await readJsonMaybe(reviewJsonPath);
    const originalReviewCsv = await fs.readFile(reviewCsvPath, 'utf8').catch(() => undefined);
    const originalUnmatched = await readJsonMaybe(unmatchedPath);

    const seedRows = [
      { spellKey: 'magic-missile', name: 'Magic Missile', spellClass: 'Magic-User', spellLevel: 1, sourceBook: 'Basic', sourcePage: 42, reversible: false, reverseName: '', needsDetails: true },
      { spellKey: 'cure-light-wounds', name: 'Cure Light Wounds', spellClass: 'Cleric', spellLevel: 1, sourceBook: 'Basic', sourcePage: 43, reversible: false, reverseName: '', needsDetails: true }
    ];

    const contexts = {
      contexts: [
        { spellKey: 'magic-missile', spellClass: 'Magic-User', spellLevel: 1, candidatePage: 99, nearbyRangeLines: ['150 feet'], nearbyDurationLines: ['1 turn'], nearbyEffectLines: ['Creates darts'], nearbySaveReferences: ['None'], nearbyTextBlock: 'known' },
        { spellKey: 'druid', spellClass: 'Cleric', spellLevel: 9, candidatePage: 9, nearbyRangeLines: ['Oak'], nearbyDurationLines: ['Evergreen trees'], nearbyEffectLines: ['Other trees'], nearbySaveReferences: ['Number of'], nearbyTextBlock: 'Lying Questions Insanity Knowing' }
      ]
    };

    try {
      await fs.mkdir(path.dirname(seedPath), { recursive: true });
      await fs.writeFile(seedPath, JSON.stringify({ spells: seedRows }, null, 2));
      await fs.mkdir(path.dirname(contextPath), { recursive: true });
      await fs.writeFile(contextPath, JSON.stringify(contexts, null, 2));
      await fs.writeFile(reviewJsonPath, JSON.stringify([], null, 2));

      execFileSync('node', ['scripts/review-spells.mjs'], { encoding: 'utf8', env: env() });

      const reviewRows = JSON.parse(await fs.readFile(reviewJsonPath, 'utf8'));
      const reviewCsv = await fs.readFile(reviewCsvPath, 'utf8');
      const unmatched = JSON.parse(await fs.readFile(unmatchedPath, 'utf8'));

      expect(reviewRows).toHaveLength(seedRows.length);
      expect(reviewRows.map((r) => `${r.spellKey}|${r.spellClass}|${r.spellLevel}`)).toEqual(seedRows.map((r) => `${r.spellKey}|${r.spellClass}|${r.spellLevel}`));
      expect(reviewRows.every((r) => r.spellKey !== 'druid')).toBe(true);
      expect(reviewCsv.includes('"druid"')).toBe(false);
      expect(reviewRows.find((r) => r.spellKey === 'magic-missile')?.suggestedRange).toBe('150 feet');
      expect(reviewRows.find((r) => r.spellKey === 'cure-light-wounds')?.suggestedRange).toBe('');
      expect(unmatched.candidates.some((c) => c.spellKey === 'druid')).toBe(true);
    } finally {
      if (originalSeed == null) await fs.rm(seedPath, { force: true });
      else await fs.writeFile(seedPath, originalSeed);
      if (originalContext == null) await fs.rm(contextPath, { force: true });
      else await fs.writeFile(contextPath, JSON.stringify(originalContext, null, 2));
      if (originalReview == null) await fs.rm(reviewJsonPath, { force: true });
      else await fs.writeFile(reviewJsonPath, JSON.stringify(originalReview, null, 2));
      if (originalReviewCsv == null) await fs.rm(reviewCsvPath, { force: true });
      else await fs.writeFile(reviewCsvPath, originalReviewCsv);
      if (originalUnmatched == null) await fs.rm(unmatchedPath, { force: true });
      else await fs.writeFile(unmatchedPath, JSON.stringify(originalUnmatched, null, 2));
    }
  });
});
