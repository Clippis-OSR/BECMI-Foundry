import fs from 'node:fs/promises';
import path from 'node:path';
import { sanitizeCanonicalRows, validateCanonicalRows } from '../module/spells/local-spell-pipeline.mjs';

const reviewJson = path.resolve('private/review/spells-review.json');
const diagnosticsJson = path.resolve('private/generated/spell-extraction-diagnostics.json');
const outFile = path.resolve('data/spells/canonical.json');
const forced = process.argv.includes('--force');

async function main() {
  const reviewRows = JSON.parse(await fs.readFile(reviewJson, 'utf8'));
  await enforceQualityGate(reviewRows);
  const filtered = reviewRows.filter((row) => !row.needsReview);
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
  let diagnostics = null;
  try { diagnostics = JSON.parse(await fs.readFile(diagnosticsJson, 'utf8')); } catch { diagnostics = null; }
  const total = reviewRows.length;
  const missingCore = reviewRows.filter((row) => !row.spellClass || !row.spellLevel || !row.spellName).length;
  const skippedPages = diagnostics?.skippedPagesWithSpellListHeadings?.length || 0;
  if (total < 80 || missingCore > total * 0.4 || skippedPages > 10) {
    throw new Error(`Extraction quality gate failed (candidates=${total}, missingCore=${missingCore}, skippedSpellListPages=${skippedPages}). Re-run extraction and inspect diagnostics, or use --force to override.`);
  }
}

main().catch((error) => {
  console.error(`build:spells failed: ${error.message}`);
  process.exitCode = 1;
});
