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
  const pages = data.pageSummaries || [];
  const spellPages = pages.filter((p) => p.spellPage).map((p) => `${p.sourceFile}:${p.sourcePage} (${p.candidates})`);
  console.log(`\nSpell pages detected (${spellPages.length}):`);
  spellPages.slice(0, 80).forEach((line) => console.log(`- ${line}`));
  console.log('\nDetected headings:');
  (data.detectedSpellSectionRanges || []).slice(0,80).forEach((r) => { if ((r.headings||[]).length) console.log(`- ${r.sourceFile}:${r.sourcePage} => ${(r.headings||[]).map((h)=>h.heading).join(' | ')}`); });
  console.log('\nFalse-positive-like headings:');
  (data.falsePositiveLikeHeadings || []).slice(0, 60).forEach((f) => console.log(`- ${f.sourceFile}:${f.sourcePage} => ${f.headings.join(' | ')}`));
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
