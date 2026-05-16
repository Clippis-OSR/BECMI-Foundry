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
  const unknownClass = reviewRows.filter((row) => !row.spellClass || row.spellClass === "unknown").length;
  const unknownRatio = total ? unknownClass / total : 0;
  const missingRde = reviewRows.filter((row) => !row.range || !row.duration || !row.effect).length;
  const missingRdeRatio = total ? missingRde / total : 0;
  const badHeading = reviewRows.find((row) => /(level\s+magic-?user\s+spells|level\s+cleric\s+spells|spell\s+table|saving\s+throw|experience\s+table|hit\s+chart|combat|equipment)/i.test(row.spellName || ""));
  const beRows = reviewRows.filter((row) => /basic|expert/i.test(String(row.sourceBook || row.sourceFile || "")));
  if (beRows.length < 50) throw new Error(`Extraction quality gate failed: Basic+Expert candidates ${beRows.length} < 50. Use --force to override.`);
  if (unknownRatio > 0.10) throw new Error(`Extraction quality gate failed: missing spellClass ratio ${(unknownRatio*100).toFixed(1)}% > 10%. Use --force to override.`);
  if (missingRdeRatio > 0.25) throw new Error(`Extraction quality gate failed: missing range/duration/effect ratio ${(missingRdeRatio*100).toFixed(1)}% > 25%. Use --force to override.`);
  if (badHeading) throw new Error(`Extraction quality gate failed: section heading extracted as spellName (${badHeading.spellName}). Use --force to override.`);
}

main().catch((error) => {
  console.error(`build:spells failed: ${error.message}`);
  process.exitCode = 1;
});
