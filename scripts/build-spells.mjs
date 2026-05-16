import fs from 'node:fs/promises';
import path from 'node:path';
import { sanitizeCanonicalRows, validateCanonicalRows } from '../module/spells/local-spell-pipeline.mjs';

const reviewJson = path.resolve('private/review/spells-review.json');
const outFile = path.resolve('data/spells/canonical.json');
const allowUnreviewed = process.argv.includes('--allow-unreviewed');

async function main() {
  const reviewRows = JSON.parse(await fs.readFile(reviewJson, 'utf8'));
  enforceReviewGate(reviewRows);
  const filtered = reviewRows.filter((row) => allowUnreviewed || row.reviewed === true);
  const invalidReviewed = filtered.filter((row) => (!row.name || !row.spellLevel || row.spellLevel <= 0 || !row.spellClass || !(row.range || row.duration || row.effect)));
  if (invalidReviewed.length) throw new Error(`Reviewed rows missing required spell fields: ${invalidReviewed.length}.`);
  const canonical = sanitizeCanonicalRows(filtered);
  const errors = validateCanonicalRows(canonical);
  if (errors.length) throw new Error(`Validation failed:\n${errors.join('\n')}`);
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, JSON.stringify({ generatedAt: new Date().toISOString(), spells: canonical }, null, 2));
  console.log(`Sanitized canonical spells written: ${outFile}`);
  console.log('Next step: npm run validate:spells');
}

function enforceReviewGate(reviewRows) {
  if (allowUnreviewed) return;
  const unreviewed = reviewRows.filter((row) => row.reviewed !== true);
  if (unreviewed.length) throw new Error(`Refusing build: ${unreviewed.length} rows have reviewed=false. Use --allow-unreviewed to override.`);

}

main().catch((error) => {
  console.error(`build:spells failed: ${error.message}`);
  process.exitCode = 1;
});
