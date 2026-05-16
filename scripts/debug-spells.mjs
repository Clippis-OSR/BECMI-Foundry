import fs from 'node:fs/promises';
import path from 'node:path';

const diagnosticsFile = path.resolve('private/generated/spell-extraction-diagnostics.json');

async function main() {
  const data = JSON.parse(await fs.readFile(diagnosticsFile, 'utf8'));
  const candidates = Array.isArray(data.candidates) ? data.candidates : [];
  printCounts('source', tally(candidates, (c) => c.sourceFile || 'unknown'));
  printCounts('class', tally(candidates, (c) => c.spellClass || 'unknown'));
  printCounts('level', tally(candidates, (c) => String(c.spellLevel || 0)));
  const suspicious = candidates.filter((c) => !c.range || !c.duration || !c.effect || !c.spellClass || !c.spellLevel);
  console.log(`\nSuspiciously empty fields: ${suspicious.length}`);
  const missed = (data.skippedPagesWithSpellListHeadings || []).map((p) => `${p.sourceFile}:${p.sourcePage}`);
  console.log(`Likely missed spell pages (${missed.length}):`);
  missed.slice(0, 40).forEach((line) => console.log(`- ${line}`));
}

function tally(items, keyFn) {
  const out = new Map();
  for (const item of items) {
    const key = keyFn(item);
    out.set(key, (out.get(key) || 0) + 1);
  }
  return [...out.entries()].sort((a, b) => b[1] - a[1]);
}

function printCounts(label, entries) {
  console.log(`\nTotal candidates by ${label}:`);
  entries.forEach(([key, count]) => console.log(`- ${key}: ${count}`));
}

main().catch((error) => {
  console.error(`debug:spells failed: ${error.message}`);
  process.exitCode = 1;
});
