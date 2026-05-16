import fs from 'node:fs/promises';
import path from 'node:path';
import { slugifySpellKey } from '../module/spells/local-spell-pipeline.mjs';

const contextFile = path.resolve('private/review/spell-detail-context.json');
const arg = process.argv.find((a) => a.startsWith('--spell='));
const spell = arg ? arg.slice('--spell='.length) : '';
if (!spell) { console.error('Usage: npm run inspect:spell -- --spell="Fire Ball"'); process.exit(1); }

const key = slugifySpellKey(spell);
const data = JSON.parse(await fs.readFile(contextFile, 'utf8'));
const matches = (data.contexts || []).filter((c) => c.spellKey === key || String(c.name || '').toLowerCase() === spell.toLowerCase());
if (!matches.length) { console.log(`No context found for: ${spell}`); process.exit(0); }
for (const c of matches) {
  console.log(`Spell: ${c.name} (${c.spellKey})`);
  console.log(`Candidate page: ${c.sourceFile}:${c.candidatePage} | heading confidence=${c.headingConfidence}`);
  console.log('Likely lines:');
  console.log(`- Range: ${(c.nearbyRangeLines || []).join(' | ') || '(none)'}`);
  console.log(`- Duration: ${(c.nearbyDurationLines || []).join(' | ') || '(none)'}`);
  console.log(`- Effect: ${(c.nearbyEffectLines || []).join(' | ') || '(none)'}`);
  console.log('Nearby OCR text:');
  console.log(c.nearbyTextBlock || '(none)');
}
