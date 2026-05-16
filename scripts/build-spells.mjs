import fs from 'node:fs/promises';
import path from 'node:path';
import { sanitizeCanonicalRows, validateCanonicalRows } from '../module/spells/local-spell-pipeline.mjs';

const reviewJson = path.resolve('private/review/spells-review.json');
const outFile = path.resolve('data/spells/canonical.json');

async function main() {
  const reviewRows = JSON.parse(await fs.readFile(reviewJson, 'utf8'));
  const filtered = reviewRows.filter((row) => !row.needsReview);
  const canonical = sanitizeCanonicalRows(filtered);
  const errors = validateCanonicalRows(canonical);
  if (errors.length) throw new Error(`Validation failed:\n${errors.join('\n')}`);
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, JSON.stringify({ generatedAt: new Date().toISOString(), spells: canonical }, null, 2));
  console.log(`Sanitized canonical spells written: ${outFile}`);
  console.log('Next step: npm run validate:spells');
}

main().catch((error) => {
  console.error(`build:spells failed: ${error.message}`);
  process.exitCode = 1;
});
