import fs from 'node:fs/promises';
import path from 'node:path';
import { validateCanonicalRows } from '../module/spells/local-spell-pipeline.mjs';

const file = path.resolve('data/spells/canonical.json');

async function main() {
  const payload = JSON.parse(await fs.readFile(file, 'utf8'));
  const rows = payload.spells || [];
  const errors = validateCanonicalRows(rows);
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`validate:spells passed for ${rows.length} spells.`);
  console.log('Pipeline complete.');
}

main().catch((error) => {
  console.error(`validate:spells failed: ${error.message}`);
  process.exitCode = 1;
});
