import fs from 'node:fs/promises';
import path from 'node:path';

const seedFile = path.resolve('data/spells/seed-basic-expert.json');
const contextFile = path.resolve('private/review/spell-detail-context.json');

async function main() {
  const seed = JSON.parse(await fs.readFile(seedFile, 'utf8'));
  const seedRows = Array.isArray(seed) ? seed : (seed.spells || []);
  let contexts = [];
  try { contexts = (JSON.parse(await fs.readFile(contextFile, 'utf8')).contexts || []); } catch { contexts = []; }

  const withContext = contexts.filter((c) => c.candidatePage != null).length;
  const noPage = contexts.filter((c) => c.candidatePage == null).length;
  const r = contexts.filter((c) => (c.nearbyRangeLines || []).length > 0).length;
  const d = contexts.filter((c) => (c.nearbyDurationLines || []).length > 0).length;
  const e = contexts.filter((c) => (c.nearbyEffectLines || []).length > 0).length;

  console.log(`seed rows total: ${seedRows.length}`);
  console.log(`rows with context found: ${withContext}`);
  console.log(`rows with no likely page: ${noPage}`);
  console.log(`rows with possible Range matches: ${r}`);
  console.log(`rows with possible Duration matches: ${d}`);
  console.log(`rows with possible Effect matches: ${e}`);
}

main().catch((error) => { console.error(`debug:spells failed: ${error.message}`); process.exitCode = 1; });
