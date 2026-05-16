import fs from 'node:fs/promises';
import path from 'node:path';
import { mergeSpellSuggestionsIntoReview } from '../module/spells/local-spell-pipeline.mjs';

const seedFile = path.resolve('data/spells/seed-basic-expert.json');
const suggestionsFile = path.resolve('private/generated/spell-detail-suggestions.json');
const reviewDir = path.resolve('private/review');
const reviewJson = path.join(reviewDir, 'spells-review.json');
const reviewCsv = path.join(reviewDir, 'spells-review.csv');
const header = ['spellKey','name','spellClass','spellLevel','sourceBook','sourcePage','reversible','reverseName','needsDetails','range','duration','effect','save','tags','manualNotes','pageVerified','reviewed','confidence','needsReview','suggestions'];

async function maybeReadSuggestions() { try { const data = JSON.parse(await fs.readFile(suggestionsFile, 'utf8')); return data.suggestions || []; } catch { return []; } }

async function main() {
  const seed = JSON.parse(await fs.readFile(seedFile, 'utf8'));
  const seedRows = (Array.isArray(seed) ? seed : (seed.spells || [])).map((s) => ({ ...s, range: '', duration: '', effect: '', save: '', tags: '', manualNotes: '', pageVerified: false, reviewed: false, confidence: 1, needsReview: true }));
  const suggestions = await maybeReadSuggestions();
  const rows = mergeSpellSuggestionsIntoReview(seedRows, suggestions);
  await fs.mkdir(reviewDir, { recursive: true });
  await fs.writeFile(reviewJson, JSON.stringify(rows, null, 2));
  await fs.writeFile(reviewCsv, [header.join(','), ...rows.map((r) => header.map((k) => JSON.stringify(k === 'suggestions' ? (r.suggestions ? '[suggested]' : '') : (r[k] ?? ''))).join(','))].join('\n'));
  console.log(`Review files written:\n- ${reviewJson}\n- ${reviewCsv}`);
}

main().catch((error) => { console.error(`review:spells failed: ${error.message}`); process.exitCode = 1; });
