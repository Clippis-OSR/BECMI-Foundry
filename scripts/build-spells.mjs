import fs from 'node:fs/promises';
import path from 'node:path';
import { sanitizeCanonicalRows, validateCanonicalRows } from '../module/spells/local-spell-pipeline.mjs';

const reviewJson = path.resolve('private/review/spells-review.json');
const outFile = path.resolve('data/spells/canonical.json');
const forced = process.argv.includes('--force');

async function main() {
  const reviewRows = JSON.parse(await fs.readFile(reviewJson, 'utf8'));
  await enforceQualityGate(reviewRows);
  const filtered = reviewRows.filter((row) => !row.needsReview);
  const invalidReviewed = filtered.filter((row) => (!row.spellName || !row.sourcePage || !row.spellLevel || row.spellLevel <= 0 || !row.spellClass || row.spellClass === "unknown" || (!(row.range || row.duration || row.effect) && row.needsReview !== true)));
  if (invalidReviewed.length) throw new Error(`Reviewed rows missing required spell fields: ${invalidReviewed.length}.`);
  const canonical = sanitizeCanonicalRows(filtered);
  const errors = validateCanonicalRows(canonical);
  if (errors.length) throw new Error(`Validation failed:\n${errors.join('\n')}`);
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, JSON.stringify({ generatedAt: new Date().toISOString(), spells: canonical }, null, 2));
  console.log(`Sanitized canonical spells written: ${outFile}`);
  console.log('Next step: npm run validate:spells');
}

async function enforceQualityGate(reviewRows) {
  if (forced) return;
  const total = reviewRows.length;
  const missingCore = reviewRows.filter((row) => !row.spellClass || !row.spellLevel || !row.spellName).length;
  const unknownClass = reviewRows.filter((row) => !row.spellClass || row.spellClass === "unknown").length;
  const unknownRatio = total ? unknownClass / total : 0;
  if (unknownRatio > 0.25) { throw new Error(`Extraction quality gate failed: unknown spellClass ratio ${(unknownRatio*100).toFixed(1)}% > 25%. Use --force to override.`); }
  if (total < 20 || missingCore > total * 0.4) {
    throw new Error(`Extraction quality gate failed (candidates=${total}, missingCore=${missingCore}). Re-run extraction and inspect diagnostics, or use --force to override.`);
  }
}

main().catch((error) => {
  console.error(`build:spells failed: ${error.message}`);
  process.exitCode = 1;
});
