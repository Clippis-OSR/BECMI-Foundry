import fs from 'node:fs/promises';
import path from 'node:path';

const seedFile = path.resolve('data/spells/seed-basic-expert.json');
const suggestionsFile = path.resolve('private/generated/spell-detail-suggestions.json');

async function main() {
  const seed = JSON.parse(await fs.readFile(seedFile, 'utf8'));
  const seedRows = Array.isArray(seed) ? seed : (seed.spells || []);
  let suggestions = [];
  try { suggestions = (JSON.parse(await fs.readFile(suggestionsFile, 'utf8')).suggestions || []); } catch { suggestions = []; }

  const byKey = new Set(suggestions.map((s) => s.spellKey));
  const missing = seedRows.filter((r) => !byKey.has(r.spellKey)).length;
  const ambiguous = suggestions.filter((s) => s.ambiguousMatch).length;
  const low = suggestions.filter((s) => Object.values(s.confidenceByField || {}).some((v) => Number(v) < 0.5)).length;
  const r = suggestions.filter((s) => s.suggested?.range).length;
  const d = suggestions.filter((s) => s.suggested?.duration).length;
  const e = suggestions.filter((s) => s.suggested?.effect).length;
  const rev = suggestions.filter((s) => s.suggested?.reversible === true || s.suggested?.reverseName).length;

  const dupes = new Map();
  for (const row of seedRows) { const k = String(row.name || '').toLowerCase(); dupes.set(k, (dupes.get(k) || 0) + 1); }

  console.log(`seed rows total: ${seedRows.length}`);
  console.log(`suggestions matched: ${suggestions.length}`);
  console.log(`suggestions missing: ${missing}`);
  console.log(`ambiguous matches: ${ambiguous}`);
  console.log(`range fill rate: ${r}/${seedRows.length}`);
  console.log(`duration fill rate: ${d}/${seedRows.length}`);
  console.log(`effect fill rate: ${e}/${seedRows.length}`);
  console.log(`reversible suggestions: ${rev}`);
  console.log(`low-confidence suggestions: ${low}`);
  console.log('duplicate/ambiguous spell names:');
  for (const [k, c] of [...dupes.entries()].filter(([, c]) => c > 1)) console.log(`- ${k}: ${c}`);
}

main().catch((error) => { console.error(`debug:spells failed: ${error.message}`); process.exitCode = 1; });
