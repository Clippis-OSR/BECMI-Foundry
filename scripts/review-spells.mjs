import fs from 'node:fs/promises';
import path from 'node:path';
import { mergeSpellIndexAndDescriptions, toReviewRows } from '../module/spells/local-spell-pipeline.mjs';

const indexFile = path.resolve('private/generated/spell-index.json');
const blocksFile = path.resolve('private/generated/spell-description-blocks.json');
const reviewDir = path.resolve('private/review');
const reviewJson = path.join(reviewDir, 'spells-review.json');
const reviewCsv = path.join(reviewDir, 'spells-review.csv');
const header = ['sourceBook','sourceFile','sourcePage','spellName','spellKey','spellClass','spellLevel','range','duration','effect','reversible','reverseName','save','tags','manualNotes','confidence','needsReview'];

async function main() {
  const index = JSON.parse(await fs.readFile(indexFile, 'utf8'));
  const blocks = JSON.parse(await fs.readFile(blocksFile, 'utf8'));
  const rows = toReviewRows(mergeSpellIndexAndDescriptions(index.indexRows || [], blocks.blocks || []));
  await fs.mkdir(reviewDir, { recursive: true });
  await fs.writeFile(reviewJson, JSON.stringify(rows, null, 2));
  await fs.writeFile(reviewCsv, [header.join(','), ...rows.map((r) => header.map((k) => JSON.stringify(Array.isArray(r[k]) ? r[k].join('|') : r[k] ?? '')).join(','))].join('\n'));
  console.log(`Review files written:\n- ${reviewJson}\n- ${reviewCsv}`);
}

main().catch((error) => { console.error(`review:spells failed: ${error.message}`); process.exitCode = 1; });
