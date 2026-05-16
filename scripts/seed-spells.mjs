import fs from 'node:fs/promises';
import path from 'node:path';

const seedFile = path.resolve('data/spells/seed-basic-expert.json');
const reviewDir = path.resolve('private/review');
const reviewJson = path.join(reviewDir, 'spells-review.json');
const reviewCsv = path.join(reviewDir, 'spells-review.csv');
const header = ['spellKey','name','spellClass','spellLevel','sourceBook','sourcePage','reversible','reverseName','needsDetails','range','duration','effect','save','tags','manualNotes','pageVerified','reviewed','confidence','needsReview'];

async function main() {
  const raw = JSON.parse(await fs.readFile(seedFile, 'utf8'));
  const spells = Array.isArray(raw) ? raw : (raw.spells || []);
  const rows = spells.map((s) => ({ ...s, range: '', duration: '', effect: '', save: '', tags: '', manualNotes: '', pageVerified: false, reviewed: false, confidence: 1, needsReview: true }));
  await fs.mkdir(reviewDir, { recursive: true });
  await fs.writeFile(reviewJson, JSON.stringify(rows, null, 2));
  await fs.writeFile(reviewCsv, [header.join(','), ...rows.map((r) => header.map((k) => JSON.stringify(r[k] ?? '')).join(','))].join('\n'));
  console.log(`Seed review files written:\n- ${reviewJson}\n- ${reviewCsv}`);
}

main().catch((error) => { console.error(`seed:spells failed: ${error.message}`); process.exitCode = 1; });
