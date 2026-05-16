import fs from 'node:fs/promises';
import path from 'node:path';
import { toReviewRows } from '../module/spells/local-spell-pipeline.mjs';

const rawFile = path.resolve('private/generated/spells.raw.json');
const reviewDir = path.resolve('private/review');
const reviewJson = path.join(reviewDir, 'spells-review.json');
const reviewCsv = path.join(reviewDir, 'spells-review.csv');

const header = ['sourceBook','sourceFile','sourcePage','spellName','spellKey','spellClass','spellLevel','range','duration','effect','reversible','reverseName','save','tags','manualNotes','confidence','needsReview'];

async function main() {
  const raw = JSON.parse(await fs.readFile(rawFile, 'utf8'));
  await fs.mkdir(reviewDir, { recursive: true });
  const rows = toReviewRows(raw.candidates || []);
  await writeWithBackup(reviewJson, JSON.stringify(rows, null, 2));
  const csv = [header.join(','), ...rows.map(toCsvLine)].join('\n');
  await writeWithBackup(reviewCsv, csv);
  console.log(`Review files written:\n- ${reviewJson}\n- ${reviewCsv}`);
  console.log('Next step: manually review/edit private/review/spells-review.json then run npm run build:spells');
}

function toCsvLine(row) {
  return header.map((key) => JSON.stringify(Array.isArray(row[key]) ? row[key].join('|') : row[key] ?? '')).join(',');
}

async function writeWithBackup(file, content) {
  try {
    await fs.access(file);
    const backup = `${file}.bak.${Date.now()}`;
    await fs.copyFile(file, backup);
  } catch {
    // no existing file to back up
  }
  await fs.writeFile(file, content);
}

main().catch((error) => {
  console.error(`review:spells failed: ${error.message}`);
  process.exitCode = 1;
});
