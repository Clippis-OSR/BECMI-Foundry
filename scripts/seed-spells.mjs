import fs from 'node:fs/promises';
import path from 'node:path';

const seedFile = path.resolve('data/spells/seed-basic-expert.json');
const reviewDir = path.resolve('private/review');
const reviewJson = path.join(reviewDir, 'spells-review.json');
const reviewCsv = path.join(reviewDir, 'spells-review.csv');
const header = ['spellKey','name','spellClass','spellLevel','sourceBook','sourcePage','reversible','reverseName','needsDetails','range','duration','effect','save','tags','manualNotes','pageVerified','reviewed','confidence','needsReview'];
const CLASS_LEVELS = new Map([
  ['Cleric', new Set([1,2,3,4,5])],
  ['Magic-User', new Set([1,2,3,4,5,6])],
]);
const EXPECTED_COUNTS = new Map([
  ['Cleric:1', 7], ['Cleric:2', 7], ['Cleric:3', 7], ['Cleric:4', 6], ['Cleric:5', 6],
  ['Magic-User:1', 12], ['Magic-User:2', 12], ['Magic-User:3', 12], ['Magic-User:4', 12], ['Magic-User:5', 9], ['Magic-User:6', 11],
]);

function validateSeedRows(spells) {
  const errors = [];
  const seen = new Set();
  for (const [i, s] of spells.entries()) {
    const prefix = `row ${i + 1}`;
    if (!s?.name) errors.push(`${prefix}: missing name`);
    if (!s?.spellClass) errors.push(`${prefix}: missing spellClass`);
    if (!Number.isInteger(s?.spellLevel)) errors.push(`${prefix}: missing/invalid spellLevel`);
    if (s?.spellClass && !CLASS_LEVELS.has(s.spellClass)) errors.push(`${prefix}: non-canonical spellClass '${s.spellClass}'`);
    if (CLASS_LEVELS.has(s?.spellClass) && !CLASS_LEVELS.get(s.spellClass).has(s.spellLevel)) {
      errors.push(`${prefix}: invalid spellLevel ${s.spellLevel} for class ${s.spellClass}`);
    }
    const key = `${s?.spellKey}:${s?.spellClass}:${s?.spellLevel}`;
    if (seen.has(key)) errors.push(`${prefix}: duplicate spellKey+spellClass+spellLevel '${key}'`);
    seen.add(key);
  }
  return errors;
}

function summarizeCoverage(spells) {
  const actual = new Map();
  for (const s of spells) {
    const key = `${s.spellClass}:${s.spellLevel}`;
    actual.set(key, (actual.get(key) || 0) + 1);
  }

  console.log('\ncount by class/level:');
  [...actual.entries()].sort().forEach(([k, count]) => console.log(`- ${k}: ${count}`));

  console.log('\nexpected vs actual Basic+Expert coverage:');
  for (const [k, expected] of [...EXPECTED_COUNTS.entries()].sort()) {
    const count = actual.get(k) || 0;
    const status = count === expected ? 'OK' : 'MISMATCH';
    console.log(`- ${k}: expected ${expected}, actual ${count} [${status}]`);
  }
}

async function main() {
  const raw = JSON.parse(await fs.readFile(seedFile, 'utf8'));
  const spells = Array.isArray(raw) ? raw : (raw.spells || []);

  const errors = validateSeedRows(spells);
  if (errors.length) throw new Error(`seed validation failed:\n${errors.join('\n')}`);

  const rows = spells.map((s) => ({ ...s, range: '', duration: '', effect: '', save: '', tags: '', manualNotes: '', pageVerified: false, reviewed: false, confidence: 1, needsReview: true }));
  await fs.mkdir(reviewDir, { recursive: true });
  await fs.writeFile(reviewJson, JSON.stringify(rows, null, 2));
  await fs.writeFile(reviewCsv, [header.join(','), ...rows.map((r) => header.map((k) => JSON.stringify(r[k] ?? '')).join(','))].join('\n'));
  console.log(`Seed review files written:\n- ${reviewJson}\n- ${reviewCsv}`);
  summarizeCoverage(spells);
}

main().catch((error) => { console.error(`seed:spells failed: ${error.message}`); process.exitCode = 1; });
