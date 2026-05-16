import fs from 'node:fs/promises';
import path from 'node:path';

const diagnosticsFile = path.resolve('private/generated/spell-extraction-diagnostics.json');
const indexFile = path.resolve('private/generated/spell-index.json');
const blocksFile = path.resolve('private/generated/spell-description-blocks.json');

async function main() {
  const diagnostics = JSON.parse(await fs.readFile(diagnosticsFile, 'utf8'));
  const index = JSON.parse(await fs.readFile(indexFile, 'utf8'));
  const blocks = JSON.parse(await fs.readFile(blocksFile, 'utf8'));
  const rows = index.indexRows || [];

  print('count by sourceBook', tally(rows, (r) => r.sourceBook || 'unknown'));
  print('count by spellClass', tally(rows, (r) => r.spellClass || 'unknown'));
  print('count by spellLevel', tally(rows, (r) => String(r.spellLevel || 0)));

  const blocksByKey = new Map((blocks.blocks || []).map((b) => [b.spellKey, b]));
  const missingRde = rows.filter((r) => { const b = blocksByKey.get(r.spellKey); return !b || !b.range || !b.duration || !b.effect; });
  console.log(`\ncount with missing range/duration/effect: ${missingRde.length}`);

  const dupes = new Map();
  for (const r of rows) { const k = `${r.spellKey}:${r.spellClass}:${r.spellLevel}`; dupes.set(k, (dupes.get(k) || 0) + 1); }
  console.log('\nduplicate spellKey/class/level:');
  [...dupes.entries()].filter(([,c])=>c>1).forEach(([k,c])=>console.log(`- ${k} => ${c}`));

  console.log('\nsection headings falsely extracted:');
  (diagnostics.rejectedHeadings || []).slice(0, 100).forEach((h) => console.log(`- ${h.sourceFile}:${h.sourcePage} => ${h.name}`));

  console.log('\npages used for spell index:');
  (diagnostics.indexPages || []).slice(0, 100).forEach((p) => console.log(`- ${p}`));
  console.log('\npages used for spell descriptions:');
  (diagnostics.descriptionPages || []).slice(0, 100).forEach((p) => console.log(`- ${p}`));
}

function tally(items, fn) { const m = new Map(); for (const i of items) { const k = fn(i); m.set(k, (m.get(k)||0)+1); } return [...m.entries()].sort((a,b)=>b[1]-a[1]); }
function print(label, rows) { console.log(`\n${label}:`); rows.forEach(([k,v])=>console.log(`- ${k}: ${v}`)); }

main().catch((error) => { console.error(`debug:spells failed: ${error.message}`); process.exitCode = 1; });
